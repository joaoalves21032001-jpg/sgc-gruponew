import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { QueryClient } from '@tanstack/react-query';
import type { User, Session } from '@supabase/supabase-js';

// Module-level singleton so AuthContext can clear it without prop drilling
let _queryClient: QueryClient | null = null;
export function registerQueryClient(qc: QueryClient) { _queryClient = qc; }


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
  const currentUserRef = useRef<string | null>(null);

  // Safety failsafe: never load infinitely
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(prev => {
        if (prev) {
          console.warn('AuthContext loading state forced to resolve after timeout.');
          return false;
        }
        return prev;
      });
    }, 3500);
    return () => clearTimeout(timer);
  }, []);

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
            setHasProfile(false);
            setMfaChecked(true);
            setLoading(false); // If no user, stop loading immediately
          }
        }
      } catch (err) {
        if (mounted) setLoading(false);
      }
    }

    initAuth();


    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;
      
      const newUserId = newSession?.user?.id ?? null;
      setSession(newSession);
      setUser(newSession?.user ?? null);
      
      if (event === 'SIGNED_OUT' || !newSession) {
        _queryClient?.clear();
        // Clear session-level MFA approval on logout
        sessionStorage.removeItem('mfa_verified_uid');
        setHasProfile(false);
        setMfaChecked(true);
        setNeedsMfa(false);
        setMfaVerified(false);
        setLoading(false);
        currentUserRef.current = null;
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        const isNewUser = currentUserRef.current !== newUserId;
        if (isNewUser) {
          _queryClient?.clear();
          // Clear session-level MFA approval only when user actually changes
          sessionStorage.removeItem('mfa_verified_uid');
          setHasProfile(null);
          setMfaChecked(false);
          setLoading(true);
          currentUserRef.current = newUserId;
        }
        // TOKEN_REFRESHED for SAME user: do NOT restart MFA check
        // The session-level MFA approval (sessionStorage) covers this case
      }
    });

    // Initial check to populate ref if sesssion already exists
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted && session?.user) {
        currentUserRef.current = session.user.id;
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Phase 2: Load Profile (runs only when we have a user but don't know profile status)
  useEffect(() => {
    if (!user) {
       // If there's no user, ensure we are not stuck loading profile
       if (hasProfile === null) setHasProfile(false);
       return; 
    }
    if (hasProfile !== null) return; // Already checked

    async function checkProfile() {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, disabled')
          .eq('id', user!.id)
          .maybeSingle();

        if (error) {
          console.error("AuthContext Profile Error:", error);
          setHasProfile(false);
          setCargo(null);
          setPerfil(null);
          return;
        }

        if (!data || (data as any).disabled) {
          setHasProfile(false);
          setCargo(null);
          setPerfil(null);
        } else {
          setHasProfile(true);
          
          // Fetch extra columns separately to avoid breaking login if columns don't exist yet
          try {
            const { data: extraData } = await supabase
              .from('profiles')
              .select('cargo')
              .eq('id', user!.id)
              .maybeSingle();
            if (extraData) {
              setCargo((extraData as any).cargo ?? null);
            }
          } catch {
             // Ignore silently
          }
        }
      } catch (err: any) {
        console.error("AuthContext Profile Fatal:", err);
        setHasProfile(false);
      }
    }
    
    checkProfile();
  }, [user, hasProfile]);

  // Phase 3: MFA Check (runs only when we know user has a profile, but haven't checked MFA)
  const mfaCheckInProgress = useRef(false);
  
  useEffect(() => {
    if (!user || hasProfile !== true) {
       // Stop loading if we don't need MFA check or user is invalid
       if (loading && hasProfile === false) {
          setLoading(false);
          setMfaChecked(true);
       }
       return;
    }
    if (mfaChecked || mfaCheckInProgress.current) {
        if (loading) setLoading(false);
        return;
    }

    mfaCheckInProgress.current = true;

    async function performMfaCheck() {
      try {
        // ── Fast path: MFA already verified in this tab session ──────────────
        const sessionVerifiedUid = sessionStorage.getItem('mfa_verified_uid');
        if (sessionVerifiedUid && sessionVerifiedUid === user!.id) {
          setMfaVerified(true);
          setNeedsMfa(false);
          setMfaChecked(true);
          setLoading(false);
          mfaCheckInProgress.current = false;
          return;
        }

        const { data: aalData, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (error || !aalData) {
          setNeedsMfa(false);
          setMfaChecked(true);
          setLoading(false);
          return;
        }

        const { currentLevel, nextLevel } = aalData;

        // User already authenticated at aal2 — fully verified
        if (currentLevel === 'aal2') {
          // Save to session so we don't re-check on token refresh
          sessionStorage.setItem('mfa_verified_uid', user!.id);
          setMfaVerified(true);
          setNeedsMfa(false);
          setMfaChecked(true);
          setLoading(false);
          return;
        }

        // Server requires aal2 (user has TOTP enrolled) but session is still aal1
        if (nextLevel === 'aal2') {
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
              // Device is trusted — save to session to avoid future calls
              sessionStorage.setItem('mfa_verified_uid', user!.id);
              setMfaVerified(true);
              setNeedsMfa(false);
              setMfaChecked(true);
              setLoading(false);
              return;
            }
          }
          // Must complete MFA verification
          setNeedsMfa(true);
          setMfaVerified(false);
          setMfaChecked(true);
          setLoading(false);
          return;
        }

        // nextLevel === 'aal1' — no MFA enrolled, prompt to enroll
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
    _queryClient?.clear();
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, mfaVerified, needsMfa, mfaChecked, hasProfile, cargo, perfil, setMfaVerified, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
