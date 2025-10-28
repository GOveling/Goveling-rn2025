/**
 * TravelModeContext - Context provider for Travel Mode
 * Exposes Travel Mode state and actions to the entire app
 */

import React, { createContext, useContext, ReactNode } from 'react';

import {
  useTravelModeSimple,
  TravelModeState,
  TravelModeActions,
} from '~/hooks/useTravelModeSimple';

interface TravelModeContextValue {
  state: TravelModeState;
  actions: TravelModeActions;
}

const TravelModeContext = createContext<TravelModeContextValue | undefined>(undefined);

interface TravelModeProviderProps {
  children: ReactNode;
}

export function TravelModeProvider({ children }: TravelModeProviderProps) {
  const [state, actions] = useTravelModeSimple();

  const value: TravelModeContextValue = {
    state,
    actions,
  };

  return <TravelModeContext.Provider value={value}>{children}</TravelModeContext.Provider>;
}

/**
 * Hook to use Travel Mode context
 */
export function useTravelMode(): TravelModeContextValue {
  const context = useContext(TravelModeContext);

  if (context === undefined) {
    throw new Error('useTravelMode must be used within a TravelModeProvider');
  }

  return context;
}

// Export types
export type { TravelModeState, TravelModeActions } from '~/hooks/useTravelModeSimple';
