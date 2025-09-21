
import { create } from 'zustand';

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

// Safe platform detection without requiring process.env
const isWeb = () => {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
};

// Universal state object for both web and native
let universalState: Omit<State, 'setLanguage' | 'setUnits' | 'setTheme' | 'setMapStyleUrl'> = {
  language: null,
  units: 'c',
  theme: 'system',
  mapStyleUrl: null
};

// Load initial state from storage
const loadInitialState = async () => {
  try {
    if (isWeb()) {
      // Web: use localStorage
      if (window.localStorage) {
        const stored = localStorage.getItem('goveling-settings');
        if (stored) {
          universalState = { ...universalState, ...JSON.parse(stored) };
        }
      }
    } else {
      // Native: use AsyncStorage
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const stored = await AsyncStorage.getItem('goveling-settings');
      if (stored) {
        universalState = { ...universalState, ...JSON.parse(stored) };
      }
    }
  } catch (e) {
    console.warn('Failed to load settings from storage:', e);
  }
};

// Save state to storage
const saveState = async () => {
  try {
    const stateToSave = JSON.stringify(universalState);
    
    if (isWeb()) {
      // Web: use localStorage
      if (window.localStorage) {
        localStorage.setItem('goveling-settings', stateToSave);
      }
    } else {
      // Native: use AsyncStorage
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem('goveling-settings', stateToSave);
    }
  } catch (e) {
    console.warn('Failed to save settings to storage:', e);
  }
};

// Load initial state immediately
loadInitialState();

// Create store without any middleware that might access process.env
const createUniversalStore = () => {
  return create<State>((set) => ({
    ...universalState,
    setLanguage: (language) => {
      universalState.language = language;
      saveState();
      set({ language });
    },
    setUnits: (units) => {
      universalState.units = units;
      saveState();
      set({ units });
    },
    setTheme: (theme) => {
      universalState.theme = theme;
      saveState();
      set({ theme });
    },
    setMapStyleUrl: (mapStyleUrl) => {
      universalState.mapStyleUrl = mapStyleUrl;
      saveState();
      set({ mapStyleUrl });
    }
  }));
};

export const useSettingsStore = createUniversalStore();
