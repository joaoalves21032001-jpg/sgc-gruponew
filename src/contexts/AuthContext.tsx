import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  mfaVerified: boolean;
  needsMfa: boolean;
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
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [cargo, setCargo] = useState<string | null>(null);
  const [perfil, setPerfil] = useState<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const prevUser = user;
      setSession(session);
      setUser(session?.user ?? null);
      if (!session?.user) {
        setMfaVerified(false);
        setNeedsMfa(false);
        setHasProfile(null);
        // Log logout
        if (prevUser) {
          supabase.from('audit_logs').insert({
            user_id: prevUser.id,
            user_name: prevUser.email,
            action: 'logout',
          } as any).then(() => { });
        }
      } else if (!prevUser && session?.user && _event === 'SIGNED_IN') {
        // Log login
        supabase.from('audit_logs').insert({
          user_id: session.user.id,
          user_name: session.user.email,
          action: 'login',
        } as any).then(() => { });
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

  // MFA disabled for now
  // useEffect(() => {
  //   if (!user || hasProfile !== true) return;
  //   checkMfaStatus();
  // }, [user, hasProfile]);

  const checkMfaStatus = async () => {
    try {
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (!aalData) return;

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
        setNeedsMfa(true);
        setMfaVerified(false);
      }
    } catch {
      setNeedsMfa(true);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setMfaVerified(false);
    setNeedsMfa(false);
    setHasProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, mfaVerified, needsMfa, hasProfile, cargo, perfil, setMfaVerified, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
