import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react';
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

  // MFA check — run once per login
  const mfaCheckRef = useRef(false);
  useEffect(() => {
    if (!user || hasProfile !== true || mfaChecked) return;
    checkMfaStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, hasProfile]);

  const checkMfaStatus = async () => {
    if (mfaCheckRef.current) return;
    mfaCheckRef.current = true;

    let cancelled = false;

    const timeoutId = setTimeout(() => {
      if (!cancelled) {
        console.warn('MFA check timed out — unblocking UI');
        setNeedsMfa(false);
        setMfaChecked(true);
      }
    }, 8000);

    try {
      const { data: aalData, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      cancelled = true;
      clearTimeout(timeoutId);

      if (error) {
        console.warn('MFA AAL check error (non-fatal):', error.message);
        setNeedsMfa(false);
        setMfaChecked(true);
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
          const { data: trusted, error: trustedErr } = await supabase
            .from('mfa_trusted_devices')
            .select('trusted_until')
            .eq('user_id', user!.id)
            .eq('device_hash', deviceHash)
            .gte('trusted_until', new Date().toISOString())
            .maybeSingle();

          if (trustedErr) {
            console.error('Error fetching trusted device:', trustedErr);
          }

          if (trusted) {
            setMfaVerified(true);
            setNeedsMfa(false);
            setMfaChecked(true);
            return;
          }
        }
        setNeedsMfa(true);
        setMfaVerified(false);
        setMfaChecked(true);
        return;
      }

      if (currentLevel === 'aal2') {
        setMfaVerified(true);
        setNeedsMfa(false);
        setMfaChecked(true);
        return;
      }

      setNeedsMfa(true);
      setMfaVerified(false);
      setMfaChecked(true);

    } catch (err) {
      cancelled = true;
      clearTimeout(timeoutId);
      console.error('MFA check exception:', err);
      setNeedsMfa(true);
      setMfaVerified(false);
      setMfaChecked(true);
    } finally {
      mfaCheckRef.current = false;
    }
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
