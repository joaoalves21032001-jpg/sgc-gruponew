import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session, AuthenticatorAssuranceLevels } from '@supabase/supabase-js';
import { generateDeviceHash } from '@/pages/MfaSetup';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  mfaVerified: boolean;
  needsMfa: boolean;
  setMfaVerified: (v: boolean) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  mfaVerified: false,
  needsMfa: false,
  setMfaVerified: () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [mfaVerified, setMfaVerified] = useState(false);
  const [needsMfa, setNeedsMfa] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session?.user) {
        setMfaVerified(false);
        setNeedsMfa(false);
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

  // Check MFA status when user is set
  useEffect(() => {
    if (!user) return;
    checkMfaStatus();
  }, [user]);

  const checkMfaStatus = async () => {
    try {
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (!aalData) return;

      const { currentLevel, nextLevel } = aalData;

      if (nextLevel === 'aal2' && currentLevel === 'aal1') {
        // MFA is enrolled but not verified this session - check trusted device
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
            // Device is trusted, auto-verify by challenging
            const { data: factors } = await supabase.auth.mfa.listFactors();
            if (factors?.totp?.[0]) {
              // Trusted device - skip MFA
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
        // No MFA enrolled yet - will need setup
        setNeedsMfa(true);
        setMfaVerified(false);
      }
    } catch {
      // If MFA check fails, require it
      setNeedsMfa(true);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setMfaVerified(false);
    setNeedsMfa(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, mfaVerified, needsMfa, setMfaVerified, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
