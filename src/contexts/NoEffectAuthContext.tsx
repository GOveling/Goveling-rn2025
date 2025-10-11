import React, { createContext, useContext, useState } from 'react';

interface AuthContextType {
  user: any | null;
  session: any | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: false, // Set to false immediately
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
  console.log('🚀 NO-EFFECT AuthProvider component mounting...');
  const [user, setUser] = useState<any | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(false); // Start with false immediately

  console.log('🚀 NO-EFFECT AuthProvider initial state - loading:', false);

  // NO useEffect - just immediate state
  
  const signOut = async () => {
    console.log('🔐 NO-EFFECT AuthContext signOut called');
  };

  const value = {
    user,
    session,
    loading,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};