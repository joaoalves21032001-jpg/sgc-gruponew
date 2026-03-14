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
  
  // App starts loading
  const [loading, setLoading] = useState(true);
  
  // Profile state
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [cargo, setCargo] = useState<string | null>(null);
  const [perfil, setPerfil] = useState<string | null>(null);

  // MFA state
  const [mfaChecked, setMfaChecked] = useState(false);
  const [needsMfa, setNeedsMfa] = useState(false);
  const [mfaVerified, setMfaVerified] = useState(false);

  // Phase 1: Initialize Auth
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          if (!session) {
            setLoading(false); // If no user, stop loading immediately
            setHasProfile(false);
            setMfaChecked(true);
          }
        }
      } catch (err) {
        if (mounted) setLoading(false);
      }
    }

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;
      
      setSession(newSession);
      setUser(newSession?.user ?? null);
      
      if (event === 'SIGNED_OUT' || !newSession) {
        setHasProfile(false);
        setMfaChecked(true);
        setNeedsMfa(false);
        setMfaVerified(false);
        setLoading(false);
      } else if (event === 'SIGNED_IN') {
        // Reset check states to evaluate the new user
        setHasProfile(null);
        setMfaChecked(false);
        setLoading(true); // Restart loading flow for profile + mfa
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Phase 2: Load Profile (runs only when we have a user but don't know profile status)
  useEffect(() => {
    if (!user) return;
    if (hasProfile !== null) return; // Already checked

    async function checkProfile() {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, disabled, cargo, perfil')
          .eq('id', user!.id)
          .maybeSingle();

        if (error || !data || (data as any).disabled) {
          setHasProfile(false);
          setCargo(null);
          setPerfil(null);
        } else {
          setHasProfile(true);
          setCargo((data as any).cargo ?? null);
          setPerfil((data as any).perfil ?? null);
        }
      } catch {
        setHasProfile(false);
      }
    }
    
    checkProfile();
  }, [user, hasProfile]);

  // Phase 3: MFA Check (runs only when we know user has a profile, but haven't checked MFA)
  const mfaCheckInProgress = useRef(false);
  
  useEffect(() => {
    if (!user || hasProfile !== true) return;
    if (mfaChecked || mfaCheckInProgress.current) return;

    mfaCheckInProgress.current = true;

    async function performMfaCheck() {
      try {
        const { data: aalData, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (error || !aalData) {
          setNeedsMfa(false);
          setMfaChecked(true);
          setLoading(false);
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
              setMfaVerified(true);
              setNeedsMfa(false);
              setMfaChecked(true);
              setLoading(false);
              return;
            }
          }
          setNeedsMfa(true);
          setMfaVerified(false);
          setMfaChecked(true);
          setLoading(false);
          return;
        }

        if (currentLevel === 'aal2') {
          setMfaVerified(true);
          setNeedsMfa(false);
          setMfaChecked(true);
          setLoading(false);
          return;
        }

        setNeedsMfa(true);
        setMfaVerified(false);
        setMfaChecked(true);
        setLoading(false);
        
      } catch (err) {
        console.error('MFA validation error:', err);
        setNeedsMfa(false);
        setMfaChecked(true);
        setLoading(false);
      } finally {
        mfaCheckInProgress.current = false;
      }
    }

    performMfaCheck();
  }, [user, hasProfile, mfaChecked]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, mfaVerified, needsMfa, mfaChecked, hasProfile, cargo, perfil, setMfaVerified, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
