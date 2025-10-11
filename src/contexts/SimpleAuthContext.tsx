import React, { createContext, useContext, useEffect, useState } from 'react';

interface AuthContextType {
  user: any | null;
  session: any | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => { },
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  console.log('🚀 SIMPLE AuthProvider component mounting...');
  const [user, setUser] = useState<any | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  console.log('🚀 SIMPLE AuthProvider initial state - loading:', true);

  // Simple useEffect test
  useEffect(() => {
    console.log('🚀 SIMPLE AuthProvider useEffect executing...');
    console.log('🚀 SIMPLE AuthProvider setting loading to false in 2 seconds...');

    setTimeout(() => {
      console.log('🚀 SIMPLE AuthProvider loading set to false');
      setLoading(false);
    }, 2000);
  }, []);

  const signOut = async () => {
    console.log('🔐 SIMPLE AuthContext signOut called');
  };

  const value = {
    user,
    session,
    loading,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};