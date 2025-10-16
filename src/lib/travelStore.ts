import { useState, useEffect } from 'react';

type TravelState = {
  enabled: boolean;
  setEnabled: (v: boolean) => void;
};

// Manual travel state management without Zustand
class TravelStore {
  private state: { enabled: boolean } = {
    enabled: false,
  };

  private listeners: Set<() => void> = new Set();

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener());
  }

  getState(): TravelState {
    return {
      enabled: this.state.enabled,
      setEnabled: this.setEnabled.bind(this),
    };
  }

  setEnabled(enabled: boolean) {
    this.state.enabled = enabled;
    this.notifyListeners();
  }
}

// Create store instance
const travelStore = new TravelStore();

// Hook for React components
export const useTravel = () => {
  const [state, setState] = useState(travelStore.getState());

  useEffect(() => {
    const unsubscribe = travelStore.subscribe(() => {
      setState(travelStore.getState());
    });

    // Update state in case it was loaded after component mount
    setState(travelStore.getState());

    return unsubscribe;
  }, []);

  return state;
};
