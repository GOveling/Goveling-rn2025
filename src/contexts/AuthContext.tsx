import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '~/lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { router } from 'expo-router';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
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
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('🔍 Initial session check:', session);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Don't auto-redirect during initial load to avoid conflicts with OAuth flow
      // Let individual screens handle their own routing logic
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state change:', event, session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Only handle specific events to avoid interfering with OAuth flow
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('✅ User signed in, redirecting to main app');
        router.replace('/(tabs)');
      } else if (event === 'SIGNED_OUT') {
        console.log('👋 User signed out, redirecting to auth');
        router.replace('/auth');
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('🔄 Token refreshed');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    loading,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
