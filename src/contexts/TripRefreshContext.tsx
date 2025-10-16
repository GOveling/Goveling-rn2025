import React, { createContext, useContext, useCallback, useRef } from 'react';

interface TripRefreshContextType {
  refreshCurrentTrip: () => void;
  registerRefreshFunction: (fn: () => void) => void;
}

const TripRefreshContext = createContext<TripRefreshContextType>({
  refreshCurrentTrip: () => {},
  registerRefreshFunction: () => {},
});

export const useTripRefresh = () => useContext(TripRefreshContext);

export const TripRefreshProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const refreshFunctionRef = useRef<(() => void) | null>(null);

  const registerRefreshFunction = useCallback((fn: () => void) => {
    refreshFunctionRef.current = fn;
  }, []);

  const refreshCurrentTrip = useCallback(() => {
    console.log('🔄 TripRefreshContext: Manual refresh triggered');
    if (refreshFunctionRef.current) {
      refreshFunctionRef.current();
    }
  }, []);

  return (
    <TripRefreshContext.Provider value={{ refreshCurrentTrip, registerRefreshFunction }}>
      {children}
    </TripRefreshContext.Provider>
  );
};
