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
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session?.user) {
        setMfaVerified(false);
        setNeedsMfa(false);
        setHasProfile(null);
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
      } else if ((data as any).disabled) {
        setHasProfile(false);
      } else {
        setHasProfile(true);
      }
    };
    checkProfile();
  }, [user]);

  // Check MFA status when user is set and has profile
  useEffect(() => {
    if (!user || hasProfile !== true) return;
    checkMfaStatus();
  }, [user, hasProfile]);

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
    <AuthContext.Provider value={{ user, session, loading, mfaVerified, needsMfa, hasProfile, setMfaVerified, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
