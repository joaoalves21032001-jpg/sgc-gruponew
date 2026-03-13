import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  mfaVerified: boolean;
  needsMfa: boolean;
  mfaChecked: boolean;
  hasProfile: boolean | null;
  cargo: string | null;
  perfil: string | null;
  setMfaVerified: (v: boolean) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  mfaVerified: false,
  needsMfa: false,
  mfaChecked: false,
  hasProfile: null,
  cargo: null,
  perfil: null,
  setMfaVerified: () => { },
  signOut: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [mfaVerified, setMfaVerified] = useState(false);
  const [needsMfa, setNeedsMfa] = useState(false);
  const [mfaChecked, setMfaChecked] = useState(false);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [cargo, setCargo] = useState<string | null>(null);
  const [perfil, setPerfil] = useState<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const prevUser = user;

      // When session becomes null (SIGNED_OUT, token revoked after password reset, etc.)
      if (_event === 'SIGNED_OUT' || !session) {
        setSession(null);
        setUser(null);
        setMfaVerified(false);
        setNeedsMfa(false);
        setMfaChecked(false);
        setHasProfile(null);
        if (prevUser) {
          supabase.from('audit_logs').insert({
            user_id: prevUser.id,
            user_name: prevUser.email,
            action: 'logout',
          } as any).then(() => { });
        }
        setLoading(false);
        return;
      }

      setSession(session);
      setUser(session.user);

      if (!prevUser && _event === 'SIGNED_IN') {
        supabase.from('audit_logs').insert({
          user_id: session.user.id,
          user_name: session.user.email,
          action: 'login',
        } as any).then(() => { });
      }

      // When user changes (e.g. password was reset), reset MFA check state
      if (prevUser && prevUser.id === session.user.id && _event === 'USER_UPDATED') {
        setMfaChecked(false);
        setMfaVerified(false);
      }

      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Check if user has a profile (is authorized)
  useEffect(() => {
    if (!user) { setHasProfile(null); return; }

    const checkProfile = async () => {
      // First: check if profile exists (essential columns only)
      const { data, error } = await supabase
        .from('profiles')
        .select('id, disabled')
        .eq('id', user.id)
        .maybeSingle();

      if (error || !data) {
        setHasProfile(false);
        setCargo(null);
        setPerfil(null);
        return;
      }
      if ((data as any).disabled) {
        setHasProfile(false);
        setCargo(null);
        setPerfil(null);
        return;
      }

      setHasProfile(true);

      // Second: try to fetch cargo/perfil (non-blocking, won't break login if columns don't exist)
      try {
        const { data: extraData } = await supabase
          .from('profiles')
          .select('cargo, perfil')
          .eq('id', user.id)
          .maybeSingle();
        if (extraData) {
          setCargo((extraData as any).cargo ?? null);
          setPerfil((extraData as any).perfil ?? null);
        }
      } catch {
        // cargo/perfil columns may not exist yet — ignore silently
      }
    };
    checkProfile();
  }, [user]);

  // MFA check — require MFA verification after login
  useEffect(() => {
    if (!user || hasProfile !== true) return;
    checkMfaStatus();
  }, [user, hasProfile]);

  const checkMfaStatus = async () => {
    // Safety net: if anything hangs for more than 5s, unblock the UI gracefully
    const timeout = new Promise<void>((resolve) =>
      setTimeout(() => {
        setNeedsMfa(false);
        setMfaChecked(true);
        resolve();
      }, 5000)
    );

    const check = async () => {
      try {
        const { data: aalData, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

        // If we get an auth error, the session was invalidated — sign the user out
        if (error) {
          await supabase.auth.signOut();
          return;
        }

        if (!aalData) {
          setNeedsMfa(false);
          setMfaChecked(true);
          return;
        }

        const { currentLevel, nextLevel } = aalData;

        if (nextLevel === 'aal2' && currentLevel === 'aal1') {
          const deviceHash = localStorage.getItem('mfa_device_hash');
          if (deviceHash) {
            const { data: trusted } = await supabase
              .from('mfa_trusted_devices')
              .select('trusted_until')
              .eq('user_id', user!.id)
              .eq('device_hash', deviceHash)
              .gte('trusted_until', new Date().toISOString())
              .maybeSingle();

            if (trusted) {
              const { data: factors } = await supabase.auth.mfa.listFactors();
              if (factors?.totp?.[0]) {
                setMfaVerified(true);
                setNeedsMfa(false);
                setMfaChecked(true);
                return;
              }
            }
          }
          setNeedsMfa(true);
          setMfaVerified(false);
        } else if (currentLevel === 'aal2') {
          setMfaVerified(true);
          setNeedsMfa(false);
        } else {
          const { data: factors } = await supabase.auth.mfa.listFactors();
          if (!factors?.totp || factors.totp.length === 0) {
             setNeedsMfa(true);
             setMfaVerified(false);
          } else {
             const unverified = factors.totp.find(f => f.status === 'unverified');
             if (unverified) {
               await supabase.auth.mfa.unenroll({ factorId: unverified.id });
               setNeedsMfa(true);
               setMfaVerified(false);
             } else {
               setNeedsMfa(true);
               setMfaVerified(false);
             }
          }
        }
        setMfaChecked(true);
      } catch {
        // On unexpected error, don't block the user — let them through
        setNeedsMfa(false);
        setMfaChecked(true);
      }
    };

    await Promise.race([check(), timeout]);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setMfaVerified(false);
    setNeedsMfa(false);
    setHasProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, mfaVerified, needsMfa, mfaChecked, hasProfile, cargo, perfil, setMfaVerified, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
