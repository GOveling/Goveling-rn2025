
import { useState, useEffect } from 'react';

type Units = 'c'|'f';
type ThemeMode = 'system'|'light'|'dark';

type State = {
  language: string | null;
  units: Units;
  theme: ThemeMode;
  mapStyleUrl: string | null;
  setLanguage: (lang:string|null)=>void;
  setUnits: (u:Units)=>void;
  setTheme: (m:ThemeMode)=>void;
  setMapStyleUrl: (u:string|null)=>void;
};

// Safe environment detection that works in all contexts
const isBrowser = () => {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
};

const isNative = () => {
  return !isBrowser() && typeof require !== 'undefined';
};

// State management without any external dependencies
class SettingsStore {
  private state: Omit<State, 'setLanguage' | 'setUnits' | 'setTheme' | 'setMapStyleUrl'> = {
    language: null,
    units: 'c',
    theme: 'system',
    mapStyleUrl: null
  };

  private listeners: Set<() => void> = new Set();
  private initialized = false;

  constructor() {
    this.loadInitialState();
  }

  private async loadInitialState() {
    if (this.initialized) return;
    
    try {
      if (isBrowser()) {
        // Browser environment
        const stored = localStorage.getItem('goveling-settings');
        if (stored) {
          this.state = { ...this.state, ...JSON.parse(stored) };
        }
      } else if (isNative()) {
        // React Native environment
        try {
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          const stored = await AsyncStorage.getItem('goveling-settings');
          if (stored) {
            this.state = { ...this.state, ...JSON.parse(stored) };
          }
        } catch (e) {
          // AsyncStorage not available, continue with defaults
        }
      }
      this.initialized = true;
      this.notifyListeners();
    } catch (e) {
      console.warn('Failed to load settings from storage:', e);
      this.initialized = true;
    }
  }

  private async saveState() {
    try {
      const stateToSave = JSON.stringify(this.state);
      
      if (isBrowser()) {
        localStorage.setItem('goveling-settings', stateToSave);
      } else if (isNative()) {
        try {
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          await AsyncStorage.setItem('goveling-settings', stateToSave);
        } catch (e) {
          // AsyncStorage not available, continue without saving
        }
      }
    } catch (e) {
      console.warn('Failed to save settings to storage:', e);
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener());
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getState(): State {
    return {
      ...this.state,
      setLanguage: this.setLanguage.bind(this),
      setUnits: this.setUnits.bind(this),
      setTheme: this.setTheme.bind(this),
      setMapStyleUrl: this.setMapStyleUrl.bind(this)
    };
  }

  setLanguage(language: string | null) {
    this.state.language = language;
    this.saveState();
    this.notifyListeners();
  }

  setUnits(units: Units) {
    this.state.units = units;
    this.saveState();
    this.notifyListeners();
  }

  setTheme(theme: ThemeMode) {
    this.state.theme = theme;
    this.saveState();
    this.notifyListeners();
  }

  setMapStyleUrl(mapStyleUrl: string | null) {
    this.state.mapStyleUrl = mapStyleUrl;
    this.saveState();
    this.notifyListeners();
  }
}

// Create store instance
const settingsStore = new SettingsStore();

// Hook for React components
export const useSettingsStore = () => {
  const [state, setState] = useState(settingsStore.getState());

  useEffect(() => {
    const unsubscribe = settingsStore.subscribe(() => {
      setState(settingsStore.getState());
    });
    
    // Update state in case it was loaded after component mount
    setState(settingsStore.getState());
    
    return unsubscribe;
  }, []);

  return state;
};
