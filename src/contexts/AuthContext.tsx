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

  // MFA check — run once per login (guarded by mfaChecked ref to avoid re-runs on token refresh)
  const mfaCheckRef = { running: false };
  useEffect(() => {
    if (!user || hasProfile !== true || mfaChecked) return;
    checkMfaStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, hasProfile]); // intentionally exclude mfaChecked from deps — it's only a guard

  const checkMfaStatus = async () => {
    // Guard: don't run twice concurrently
    if (mfaCheckRef.running) return;
    mfaCheckRef.running = true;

    let cancelled = false;

    // Safety net: 8s timeout — only fires if check() hangs completely.
    // Uses 'cancelled' flag so it can't override result after check() succeeds.
    const timeoutId = setTimeout(() => {
      if (!cancelled) {
        console.warn('MFA check timed out — unblocking UI');
        setNeedsMfa(false);
        setMfaChecked(true);
      }
    }, 8000);

    try {
      const { data: aalData, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      cancelled = true; // prevent timeout from firing after this point
      clearTimeout(timeoutId);

      if (error) {
        // Non-fatal: session might be refreshing — let user through gracefully
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
        // User has an enrolled + verified MFA factor — needs to verify this session
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
            console.log('Dispositivo confiável encontrado. Bypass MFA ativo.');
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
        // Already fully authenticated
        setMfaVerified(true);
        setNeedsMfa(false);
        setMfaChecked(true);
        return;
      }

      // currentLevel === aal1, nextLevel === aal1:
      // User has no verified MFA factor at all — must enroll
      // NOTE: Do NOT unenroll any factors here. If an unverified factor exists, it means
      // MfaSetup is in the middle of enrollment. Let MfaSetup handle it.
      setNeedsMfa(true);
      setMfaVerified(false);
      setMfaChecked(true);

    } catch (err) {
      cancelled = true;
      clearTimeout(timeoutId);
      console.error('MFA check exception:', err);
      // On unexpected error — do NOT let the user through without MFA
      // Instead, force MFA setup (safer than bypassing)
      setNeedsMfa(true);
      setMfaVerified(false);
      setMfaChecked(true);
    } finally {
      mfaCheckRef.running = false;
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
