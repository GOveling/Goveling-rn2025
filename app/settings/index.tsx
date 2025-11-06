import React from 'react';

import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

import { useTranslation } from 'react-i18next';

import { useAppSettings } from '~/contexts/AppSettingsContext';
import i18n from '~/i18n';
import { supabase } from '~/lib/supabase';
import { useTheme, useThemeControl } from '~/lib/theme';

export default function Settings() {
  console.log('🚀 Settings Screen MOUNTED');

  const { t } = useTranslation();
  const theme = useTheme();
  const { setPreference: setThemeInProvider } = useThemeControl();
  const { settings, setTheme: setThemeInSettings } = useAppSettings();

  console.log('📊 Current theme from hook:', theme.mode);
  console.log('📊 Current settings.theme:', settings.theme);

  const [lang, setLang] = React.useState(i18n.language);

  // Función para cambiar tema en ambos lugares
  const changeTheme = async (newTheme: 'light' | 'dark' | 'auto') => {
    console.log('🌟 Changing theme to:', newTheme);
    // 1. Actualizar ThemeProvider primero (cambio inmediato)
    await setThemeInProvider(newTheme);
    // 2. Actualizar AppSettingsContext (persistencia)
    await setThemeInSettings(newTheme);
    console.log('✅ Theme changed successfully');
  };

  // Debug: Log cuando cambia el tema
  React.useEffect(() => {
    console.log('🎨 Settings Screen - Theme mode:', theme.mode);
    console.log('🎨 Settings Screen - Background:', theme.colors.background);
    console.log('🎨 Settings Screen - Text:', theme.colors.text);
  }, [theme.mode, theme.colors.background, theme.colors.text]);

  const save = async () => {
    i18n.changeLanguage(lang);
    // persist in profile if desired
    const { data: u } = await supabase.auth.getUser();
    const uid = u?.user?.id;
    if (uid)
      await supabase
        .from('profiles')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', uid);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.title, { color: theme.colors.text }]}>Configuración</Text>

      <Text style={{ color: theme.colors.text }}>Idioma</Text>
      <View style={styles.row}>
        {['en', 'es', 'pt', 'fr', 'it', 'zh', 'ja'].map((l) => (
          <TouchableOpacity
            key={l}
            onPress={() => setLang(l)}
            style={[
              styles.optionButton,
              {
                borderColor: lang === l ? theme.colors.primary : theme.colors.border,
                backgroundColor: lang === l ? theme.colors.chipBgActive : theme.colors.card,
              },
            ]}
          >
            <Text style={{ color: lang === l ? theme.colors.chipTextActive : theme.colors.text }}>
              {l.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tema */}
      <Text style={{ color: theme.colors.text }}>{t('settings.theme')}</Text>
      <View style={styles.row}>
        <TouchableOpacity
          style={[
            styles.optionButton,
            {
              borderColor: settings.theme === 'light' ? theme.colors.primary : theme.colors.border,
              backgroundColor:
                settings.theme === 'light' ? theme.colors.chipBgActive : theme.colors.card,
            },
          ]}
          onPress={() => {
            console.log('☀️ Switching to LIGHT theme');
            changeTheme('light');
          }}
        >
          <Text
            style={{
              color: settings.theme === 'light' ? theme.colors.chipTextActive : theme.colors.text,
            }}
          >
            {t('settings.theme_light')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.optionButton,
            {
              borderColor: settings.theme === 'dark' ? theme.colors.primary : theme.colors.border,
              backgroundColor:
                settings.theme === 'dark' ? theme.colors.chipBgActive : theme.colors.card,
            },
          ]}
          onPress={() => {
            console.log('🌙 Switching to DARK theme');
            changeTheme('dark');
          }}
        >
          <Text
            style={{
              color: settings.theme === 'dark' ? theme.colors.chipTextActive : theme.colors.text,
            }}
          >
            {t('settings.theme_dark')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.optionButton,
            {
              borderColor: settings.theme === 'auto' ? theme.colors.primary : theme.colors.border,
              backgroundColor:
                settings.theme === 'auto' ? theme.colors.chipBgActive : theme.colors.card,
            },
          ]}
          onPress={() => {
            console.log('🔄 Switching to AUTO theme');
            changeTheme('auto');
          }}
        >
          <Text
            style={{
              color: settings.theme === 'auto' ? theme.colors.chipTextActive : theme.colors.text,
            }}
          >
            {t('settings.theme_auto')}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={save}
        style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
      >
        <Text style={[styles.saveButtonText, { color: theme.colors.primaryText }]}>Guardar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  // Main Container
  container: {
    flex: 1,
    padding: 12,
    gap: 12,
  },

  // Header
  title: {
    fontSize: 22,
    fontWeight: '900',
  },

  // Language/Theme Row
  row: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },

  // Option Button Base
  optionButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },

  // Save Button
  saveButton: {
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  saveButtonText: {
    textAlign: 'center',
    fontWeight: '800',
  },
});
