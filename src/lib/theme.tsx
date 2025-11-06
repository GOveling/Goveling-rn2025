// src/lib/theme.ts
import React, { createContext, useContext, useState, useEffect } from 'react';

import { Appearance, ColorSchemeName } from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemePreference = 'light' | 'dark' | 'auto';

export type AppTheme = {
  mode: 'light' | 'dark';
  colors: {
    background: string;
    card: string;
    text: string;
    textMuted: string;
    primary: string;
    primaryText: string;
    border: string;
    chipBg: string;
    chipBgActive: string;
    chipText: string;
    chipTextActive: string;
  };
  radius: { md: number; lg: number; xl: number };
  spacing: (n: number) => number;
};

export const palettes = {
  light: {
    background: '#F7F7FA',
    card: '#FFFFFF',
    text: '#101114',
    textMuted: '#6B7280',
    // Zeppelin brand
    primary: '#DE3D00' /* Orange from blimp */,
    primaryText: '#FFFFFF',
    border: '#E5E7EB',
    chipBg: '#ECECF1',
    chipBgActive: '#4B2A95' /* Purple accent */,
    chipText: '#101114',
    chipTextActive: '#FFFFFF',
    accent: '#4B2A95',
  },
  dark: {
    background: '#0B0B0E',
    card: '#1C1C21',
    text: '#FFFFFF',
    textMuted: '#A1A1AA',
    primary: '#DE3D00',
    primaryText: '#FFFFFF',
    border: '#2C2C2E',
    chipBg: '#2A2A31',
    chipBgActive: '#6A3CC6',
    chipText: '#FFFFFF',
    chipTextActive: '#FFFFFF',
    accent: '#6A3CC6',
  },
};

const THEME_KEY = '@goveling_theme'; // Sync with AppSettingsContext

type ThemeContextType = {
  theme: AppTheme;
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => Promise<void>;
};

const ThemeCtx = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>('auto');
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName>(Appearance.getColorScheme());

  // Escuchar cambios en el tema del sistema
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme);
    });
    return () => subscription.remove();
  }, []);

  // Cargar preferencia guardada al inicio
  useEffect(() => {
    loadPreference();
  }, []);

  const loadPreference = async () => {
    try {
      const saved = await AsyncStorage.getItem(THEME_KEY);
      if (saved && ['light', 'dark', 'auto'].includes(saved)) {
        setPreferenceState(saved as ThemePreference);
      }
    } catch (error) {
      console.error('[Theme] Error loading theme preference:', error);
    }
  };

  const setPreference = async (pref: ThemePreference) => {
    try {
      console.log('[Theme] Setting preference to:', pref);
      await AsyncStorage.setItem(THEME_KEY, pref);
      setPreferenceState(pref);
      console.log('[Theme] Preference saved and state updated:', pref);
    } catch (error) {
      console.error('[Theme] Error saving theme preference:', error);
    }
  };

  // Determinar el modo efectivo basado en la preferencia
  const getEffectiveMode = (): 'light' | 'dark' => {
    if (preference === 'auto') {
      const mode = systemScheme === 'dark' ? 'dark' : 'light';
      console.log('[Theme] Auto mode -> using system:', mode);
      return mode;
    }
    console.log('[Theme] Manual mode:', preference);
    return preference;
  };

  const mode = getEffectiveMode();
  const p = mode === 'dark' ? palettes.dark : palettes.light;

  console.log('[Theme] Rendering with mode:', mode, 'preference:', preference);

  const theme: AppTheme = {
    mode,
    colors: p,
    radius: { md: 10, lg: 16, xl: 24 },
    spacing: (n) => n * 8,
  };

  const value: ThemeContextType = {
    theme,
    preference,
    setPreference,
  };

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx.theme;
}

export function useThemeControl() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error('useThemeControl must be used within ThemeProvider');
  return {
    preference: ctx.preference,
    setPreference: ctx.setPreference,
    currentMode: ctx.theme.mode,
  };
}

export const typography = {
  family: 'System',
  sizes: { largeTitle: 34, title: 28, headline: 17, body: 17, caption: 13 },
  weight: { regular: '400', semibold: '600', bold: '700' },
};

export const elevations = {
  card: { boxShadow: '0px 0px 12px rgba(0, 0, 0, 0.06)', elevation: 2 },
  raised: { boxShadow: '0px 0px 20px rgba(0, 0, 0, 0.12)', elevation: 4 },
};
