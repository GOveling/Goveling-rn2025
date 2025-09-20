
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

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

// Manual state management for web to avoid process.env issues
let webState: Omit<State, 'setLanguage' | 'setUnits' | 'setTheme' | 'setMapStyleUrl'> = {
  language: null,
  units: 'c',
  theme: 'system',
  mapStyleUrl: null
};

// Load from localStorage if available
if (isWeb() && window.localStorage) {
  try {
    const stored = localStorage.getItem('goveling-settings');
    if (stored) {
      webState = { ...webState, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.warn('Failed to load settings from localStorage:', e);
  }
}

// Save to localStorage
const saveWebState = () => {
  if (isWeb() && window.localStorage) {
    try {
      localStorage.setItem('goveling-settings', JSON.stringify(webState));
    } catch (e) {
      console.warn('Failed to save settings to localStorage:', e);
    }
  }
};

// Web-safe store creation
const createWebSafeStore = () => {
  if (isWeb()) {
    // For web, use simple store with manual persistence
    return create<State>((set) => ({
      ...webState,
      setLanguage: (language) => {
        webState.language = language;
        saveWebState();
        set({ language });
      },
      setUnits: (units) => {
        webState.units = units;
        saveWebState();
        set({ units });
      },
      setTheme: (theme) => {
        webState.theme = theme;
        saveWebState();
        set({ theme });
      },
      setMapStyleUrl: (mapStyleUrl) => {
        webState.mapStyleUrl = mapStyleUrl;
        saveWebState();
        set({ mapStyleUrl });
      }
    }));
  } else {
    // For native, use normal persist middleware
    // Import AsyncStorage dynamically for native platforms only
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    
    return create<State>()(persist((set) => ({
      language: null,
      units: 'c',
      theme: 'system',
      mapStyleUrl: null,
      setLanguage: (language) => set({ language }),
      setUnits: (units) => set({ units }),
      setTheme: (theme) => set({ theme }),
      setMapStyleUrl: (mapStyleUrl) => set({ mapStyleUrl })
    }), {
      name: 'settings',
      storage: createJSONStorage(() => AsyncStorage)
    }));
  }
};

export const useSettingsStore = createWebSafeStore();
