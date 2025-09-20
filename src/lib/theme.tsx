
// src/lib/theme.ts
import React, { createContext, useContext } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';

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
  spacing: (n:number)=> number;
};

export const palettes = {
  light: {
    background: '#F7F7FA',
    card: '#FFFFFF',
    text: '#101114',
    textMuted: '#6B7280',
    // Zeppelin brand
    primary: '#DE3D00', /* Orange from blimp */
    primaryText: '#FFFFFF',
    border: '#E5E7EB',
    chipBg: '#ECECF1',
    chipBgActive: '#4B2A95', /* Purple accent */
    chipText: '#101114',
    chipTextActive: '#FFFFFF',
    accent: '#4B2A95'
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
    accent: '#6A3CC6'
  }
};

const ThemeCtx = createContext<AppTheme | null>(null);

export function ThemeProvider({ children }:{ children: React.ReactNode }){
  const scheme: ColorSchemeName = Appearance.getColorScheme() || 'light';
  const mode = scheme === 'dark' ? 'dark' : 'light';
  const p = mode === 'dark' ? palettes.dark : palettes.light;
  const value: AppTheme = {
    mode,
    colors: p,
    radius: { md: 10, lg: 16, xl: 24 },
    spacing: (n)=> n * 8,
  };
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme(){
  const t = useContext(ThemeCtx);
  if (!t) throw new Error('useTheme must be used within ThemeProvider');
  return t;
}


export const typography = {
  family: 'System',
  sizes: { largeTitle: 34, title: 28, headline: 17, body: 17, caption: 13 },
  weight: { regular: '400', semibold: '600', bold: '700' }
};

export const elevations = {
  card: { shadowColor:'#000', shadowOpacity:0.06, shadowRadius:12, elevation:2 },
  raised: { shadowColor:'#000', shadowOpacity:0.12, shadowRadius:20, elevation:4 }
};
