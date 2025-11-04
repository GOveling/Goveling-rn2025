/**
 * AppSettingsContext - Manages app-wide settings and preferences
 * - Language selection
 * - Theme (light/dark/auto)
 * - Measurement units (metric/imperial)
 * - Notification preferences
 * - Privacy settings
 * - Persists to AsyncStorage
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';

import i18n from '~/i18n';

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export type Language = 'es' | 'en' | 'pt' | 'fr' | 'it' | 'zh' | 'ja' | 'hi';
export type Theme = 'light' | 'dark' | 'auto';
export type Units = 'metric' | 'imperial';

export interface NotificationSettings {
  enabled: boolean;
  tripReminders: boolean;
  nearbyAlerts: boolean;
  teamUpdates: boolean;
  chatMessages: boolean;
}

export interface PrivacySettings {
  shareLocation: boolean;
  showOnlineStatus: boolean;
  publicProfile: boolean;
}

export interface AppSettings {
  language: Language;
  theme: Theme;
  units: Units;
  notifications: NotificationSettings;
  privacy: PrivacySettings;
}

// ═══════════════════════════════════════════════════════════════
// Storage Keys
// ═══════════════════════════════════════════════════════════════

const STORAGE_KEYS = {
  LANGUAGE: '@goveling_language',
  THEME: '@goveling_theme',
  UNITS: '@goveling_units',
  NOTIFICATIONS: '@goveling_notifications',
  PRIVACY: '@goveling_privacy',
};

// ═══════════════════════════════════════════════════════════════
// Default Settings
// ═══════════════════════════════════════════════════════════════

const defaultSettings: AppSettings = {
  language: 'es',
  theme: 'light',
  units: 'metric',
  notifications: {
    enabled: true,
    tripReminders: true,
    nearbyAlerts: true,
    teamUpdates: true,
    chatMessages: true,
  },
  privacy: {
    shareLocation: false,
    showOnlineStatus: true,
    publicProfile: false,
  },
};

// ═══════════════════════════════════════════════════════════════
// Context Type
// ═══════════════════════════════════════════════════════════════

interface AppSettingsContextType {
  settings: AppSettings;
  isLoading: boolean;
  setLanguage: (lang: Language) => Promise<void>;
  setTheme: (theme: Theme) => Promise<void>;
  setUnits: (units: Units) => Promise<void>;
  updateNotifications: (notifications: Partial<NotificationSettings>) => Promise<void>;
  updatePrivacy: (privacy: Partial<PrivacySettings>) => Promise<void>;
  resetSettings: () => Promise<void>;
}

// ═══════════════════════════════════════════════════════════════
// Context
// ═══════════════════════════════════════════════════════════════

const AppSettingsContext = createContext<AppSettingsContextType | undefined>(undefined);

// ═══════════════════════════════════════════════════════════════
// Provider
// ═══════════════════════════════════════════════════════════════

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [, forceUpdate] = useState(0); // Estado dummy para forzar re-renders

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  // ✅ Listener de cambios de idioma en i18n
  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      console.log('🌐 i18n language changed to:', lng);
      // Forzar re-render de todos los componentes que usen traducciones
      forceUpdate((prev) => prev + 1);
    };

    i18n.on('languageChanged', handleLanguageChange);

    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, []);

  const loadSettings = async () => {
    try {
      const [language, theme, units, notifications, privacy] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.LANGUAGE),
        AsyncStorage.getItem(STORAGE_KEYS.THEME),
        AsyncStorage.getItem(STORAGE_KEYS.UNITS),
        AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATIONS),
        AsyncStorage.getItem(STORAGE_KEYS.PRIVACY),
      ]);

      const loadedSettings: AppSettings = {
        language: (language as Language) || defaultSettings.language,
        theme: (theme as Theme) || defaultSettings.theme,
        units: (units as Units) || defaultSettings.units,
        notifications: notifications ? JSON.parse(notifications) : defaultSettings.notifications,
        privacy: privacy ? JSON.parse(privacy) : defaultSettings.privacy,
      };

      setSettings(loadedSettings);

      // ✅ Aplicar idioma guardado a i18n
      if (loadedSettings.language && loadedSettings.language !== i18n.language) {
        await i18n.changeLanguage(loadedSettings.language);
        console.log('✅ Applied saved language:', loadedSettings.language);
      }
    } catch (error) {
      console.error('Error loading app settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setLanguage = async (lang: Language) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LANGUAGE, lang);
      await AsyncStorage.setItem('app.lang', lang); // También guardar en el storage de i18n

      // ✅ Cambiar idioma en i18n PRIMERO
      await i18n.changeLanguage(lang);

      // LUEGO actualizar el estado (esto forzará re-render)
      setSettings((prev) => ({ ...prev, language: lang }));

      console.log('✅ Language changed to:', lang);
    } catch (error) {
      console.error('Error setting language:', error);
      throw error;
    }
  };

  const setTheme = async (theme: Theme) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.THEME, theme);
      setSettings((prev) => ({ ...prev, theme }));

      // TODO: Apply theme to app components
      console.log('Theme changed to:', theme);
    } catch (error) {
      console.error('Error setting theme:', error);
      throw error;
    }
  };

  const setUnits = async (units: Units) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.UNITS, units);
      setSettings((prev) => ({ ...prev, units }));
    } catch (error) {
      console.error('Error setting units:', error);
      throw error;
    }
  };

  const updateNotifications = async (notifications: Partial<NotificationSettings>) => {
    try {
      const newNotifications = { ...settings.notifications, ...notifications };
      await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(newNotifications));
      setSettings((prev) => ({ ...prev, notifications: newNotifications }));
    } catch (error) {
      console.error('Error updating notifications:', error);
      throw error;
    }
  };

  const updatePrivacy = async (privacy: Partial<PrivacySettings>) => {
    try {
      const newPrivacy = { ...settings.privacy, ...privacy };
      await AsyncStorage.setItem(STORAGE_KEYS.PRIVACY, JSON.stringify(newPrivacy));
      setSettings((prev) => ({ ...prev, privacy: newPrivacy }));
    } catch (error) {
      console.error('Error updating privacy:', error);
      throw error;
    }
  };

  const resetSettings = async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.LANGUAGE),
        AsyncStorage.removeItem(STORAGE_KEYS.THEME),
        AsyncStorage.removeItem(STORAGE_KEYS.UNITS),
        AsyncStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS),
        AsyncStorage.removeItem(STORAGE_KEYS.PRIVACY),
      ]);
      setSettings(defaultSettings);
    } catch (error) {
      console.error('Error resetting settings:', error);
      throw error;
    }
  };

  return (
    <AppSettingsContext.Provider
      value={{
        settings,
        isLoading,
        setLanguage,
        setTheme,
        setUnits,
        updateNotifications,
        updatePrivacy,
        resetSettings,
      }}
    >
      {children}
    </AppSettingsContext.Provider>
  );
}

// ═══════════════════════════════════════════════════════════════
// Hook
// ═══════════════════════════════════════════════════════════════

export function useAppSettings() {
  const context = useContext(AppSettingsContext);
  if (context === undefined) {
    throw new Error('useAppSettings must be used within AppSettingsProvider');
  }
  return context;
}
