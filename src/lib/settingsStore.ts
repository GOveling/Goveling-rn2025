
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

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

// Web-compatible storage fallback
const getStorage = () => {
  if (Platform.OS === 'web') {
    return {
      getItem: (key: string) => {
        try {
          return Promise.resolve(localStorage.getItem(key));
        } catch {
          return Promise.resolve(null);
        }
      },
      setItem: (key: string, value: string) => {
        try {
          localStorage.setItem(key, value);
          return Promise.resolve();
        } catch {
          return Promise.resolve();
        }
      },
      removeItem: (key: string) => {
        try {
          localStorage.removeItem(key);
          return Promise.resolve();
        } catch {
          return Promise.resolve();
        }
      }
    };
  }
  return AsyncStorage;
};

// Ensure process.env is available before creating the store
const safeCreateStore = () => {
  try {
    return create<State>()(persist((set)=>({
      language: null,
      units: 'c',
      theme: 'system',
      mapStyleUrl: null,
      setLanguage: (language)=> set({ language }),
      setUnits: (units)=> set({ units }),
      setTheme: (theme)=> set({ theme }),
      setMapStyleUrl: (mapStyleUrl)=> set({ mapStyleUrl })
    }), { 
      name: 'settings', 
      storage: createJSONStorage(() => getStorage())
    }));
  } catch (error) {
    console.warn('Failed to create persisted store, creating basic store:', error);
    // Fallback to basic store without persistence
    return create<State>()((set) => ({
      language: null,
      units: 'c',
      theme: 'system',
      mapStyleUrl: null,
      setLanguage: (language)=> set({ language }),
      setUnits: (units)=> set({ units }),
      setTheme: (theme)=> set({ theme }),
      setMapStyleUrl: (mapStyleUrl)=> set({ mapStyleUrl })
    }));
  }
};

export const useSettingsStore = safeCreateStore();
