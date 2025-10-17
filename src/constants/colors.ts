/**
 * Color System for Goveling App
 * Centralized color constants for consistent theming
 *
 * Usage:
 * import { COLORS } from '~/constants/colors';
 * backgroundColor: COLORS.background.primary
 */

export const COLORS = {
  // Primary Brand Colors
  primary: {
    main: '#8B5CF6', // Purple - Main brand color
    light: '#A855F7', // Light purple
    dark: '#7C3AED', // Dark purple
    violet: '#5B21B6', // Deep violet
    deepIndigo: '#3730A3', // Deep indigo
    indigo: '#4B0082', // Indigo
    blue: '#6366F1', // Indigo blue
  },

  // Secondary/Accent Colors
  secondary: {
    orange: '#FF6B35', // Bright orange
    orangeMain: '#F97316', // Orange main
    orangeDark: '#EA580C', // Dark orange
    amber: '#F59E0B', // Amber
    amberLight: '#FDBA74', // Light amber
    amberDark: '#92400E', // Dark amber/brown
    amberMedium: '#A16207', // Medium amber
  },

  // Background Colors
  background: {
    primary: '#FFFFFF', // White background
    secondary: '#F8F9FA', // Light gray background
    tertiary: '#F9FAFB', // Very light gray
    gray: '#F3F4F6', // Gray background
    dark: '#1A1A1A', // Dark background
    purple: {
      light: '#EDE9FE', // Light purple background
      veryLight: '#F5F3FF', // Very light purple
      ultraLight: '#EEF2FF', // Ultra light purple/indigo
    },
    amber: {
      light: '#FEF3C7', // Light amber background
      veryLight: '#FFF7ED', // Very light amber/orange
    },
    transparent: 'transparent',
    // Backgrounds with opacity
    whiteOpacity: {
      light: 'rgba(255,255,255,0.1)',
      medium: 'rgba(255,255,255,0.2)',
      strong: 'rgba(255,255,255,0.9)',
      veryStrong: 'rgba(255,255,255,0.95)',
    },
    blackOpacity: {
      light: 'rgba(0,0,0,0.1)',
      medium: 'rgba(0,0,0,0.3)',
      strong: 'rgba(0,0,0,0.7)',
      veryStrong: 'rgba(0,0,0,0.8)',
    },
    errorOpacity: {
      light: 'rgba(220,38,38,0.2)',
      medium: 'rgba(254,226,226,0.9)',
    },
  },

  // Text Colors
  text: {
    primary: '#1A1A1A', // Dark text (almost black)
    secondary: '#666666', // Medium gray text
    tertiary: '#6B7280', // Lighter gray text
    dark: '#111827', // Very dark text
    darkGray: '#1F2937', // Dark gray text
    mediumDarkGray: '#374151', // Medium dark gray
    slateGray: '#4B5563', // Slate gray text
    white: '#FFFFFF', // White text
    lightGray: '#9CA3AF', // Light gray text
    mediumGray: '#333', // Medium gray (#333)
    grayish: '#666', // Grayish text
  },

  // Border Colors
  border: {
    light: '#ddd', // Light border
    gray: '#D1D5DB', // Gray border
    dark: '#E5E7EB', // Dark border
    purple: '#4B0082', // Purple border
    purpleLight: '#C7D2FE', // Light purple border
    blue: '#007aff', // Blue border
    indigo: '#6366F1', // Indigo border
    opacity: 'rgba(0,0,0,0.05)', // Transparent border
    whiteOpacity: {
      light: 'rgba(255,255,255,0.3)',
      medium: 'rgba(255,255,255,0.5)',
    },
    blackOpacity: {
      light: 'rgba(0,0,0,0.2)',
      medium: 'rgba(0,0,0,0.3)',
    },
  },

  // Status Colors
  status: {
    success: '#10B981', // Green
    successDark: '#059669', // Dark green
    successLight: '#D1FAE5', // Light green background
    warning: '#F59E0B', // Amber/Orange
    error: '#EF4444', // Red
    errorDark: '#DC2626', // Dark red
    errorLight: '#FCA5A5', // Light red
    info: '#3B82F6', // Blue
    infoDark: '#1D4ED8', // Dark blue
  },

  // Utility Colors
  utility: {
    white: '#FFFFFF',
    white2: '#fff',
    black: '#000',
    black2: '#000000',
    transparent: 'transparent',
    shadow: {
      black: '#000',
      gray: 'rgba(0,0,0,0.1)',
      light: 'rgba(0,0,0,0.05)',
    },
  },

  // Gradient Arrays (for LinearGradient)
  gradients: {
    purple: ['#8B5CF6', '#A855F7'],
    orange: ['#F97316', '#EA580C'],
    blue: ['#3B82F6', '#2563EB'],
    green: ['#10B981', '#059669'],
    blueInfo: ['#3B82F6', '#1D4ED8'],
  },

  // Decorative Colors (for confetti, animations, etc.)
  decorative: {
    coral: '#FF6B6B',
    turquoise: '#4ECDC4',
    skyBlue: '#45B7D1',
    sage: '#96CEB4',
    vanilla: '#FFEAA7',
    plum: '#DDA0DD',
    mint: '#98D8C8',
  },
} as const;

// Type for autocomplete support
export type ColorPath = typeof COLORS;

/**
 * Helper function to get color with opacity
 * @param color - Base color
 * @param opacity - Opacity value (0-1)
 */
export const withOpacity = (color: string, opacity: number): string => {
  // If already rgba, return as is
  if (color.startsWith('rgba')) return color;

  // Convert hex to rgba
  if (color.startsWith('#')) {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }

  return color;
};
