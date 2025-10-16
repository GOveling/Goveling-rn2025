import React, { createContext, useContext, useEffect, useState } from 'react';

import { router } from 'expo-router';

import { Session, User } from '@supabase/supabase-js';

import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: false,
  signOut: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  console.log('🚀 AuthProvider component mounting...');
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize session and subscribe to auth state changes
  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    const init = async () => {
      try {
        console.log('[Auth] Starting session check...');

        // Safety timeout - if init takes more than 5 seconds, stop loading
        timeoutId = setTimeout(() => {
          if (isMounted && loading) {
            console.warn('[Auth] Init timeout - stopping loading state');
            setLoading(false);
          }
        }, 5000);

        // 1) Get initial session from storage
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.warn('[Auth] getSession error:', error.message);
        } else {
          console.log('[Auth] Session check complete:', data?.session ? 'user found' : 'no user');
        }

        if (!isMounted) return;

        setSession(data?.session ?? null);
        setUser(data?.session?.user ?? null);

        clearTimeout(timeoutId);
      } catch (e) {
        console.error('[Auth] init error:', e);
      } finally {
        if (isMounted) {
          console.log('[Auth] Init complete - setting loading to false');
          setLoading(false);
        }
      }
    };

    init();

    // 2) Subscribe to auth state changes
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      console.log('[Auth] Auth state changed:', _event);
      // Update local state on any auth event
      setSession(newSession);
      setUser(newSession?.user ?? null);
    });

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      sub.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    console.log('🔐 AuthContext signOut called');
    console.log('🔐 Current user before signOut:', user?.email);
    console.log('🔐 Current session before signOut:', session?.user?.email);

    try {
      console.log('🔐 Calling supabase.auth.signOut()...');
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('🔐 ❌ Supabase signOut error:', error);
        throw error;
      }

      console.log('🔐 ✅ Supabase signOut completed successfully');
      // Clear local state immediately
      setSession(null);
      setUser(null);
      // Navigate to auth screen to show login/signup immediately
      try {
        router.replace('/auth');
      } catch {}
    } catch (error) {
      console.error('🔐 ❌ Error in AuthContext signOut:', error);
      throw error;
    }
  };

  const value = {
    user,
    session,
    loading,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
