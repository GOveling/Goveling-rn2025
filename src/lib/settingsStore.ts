
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

export const useSettingsStore = create<State>()(persist((set)=>({
  language: null,
  units: 'c',
  theme: 'system',
  mapStyleUrl: null,
  setLanguage: (language)=> set({ language }),
  setUnits: (units)=> set({ units }),
  setTheme: (theme)=> set({ theme }),
  setMapStyleUrl: (mapStyleUrl)=> set({ mapStyleUrl })
}), { name: 'settings', storage: createJSONStorage(()=> AsyncStorage) }));
