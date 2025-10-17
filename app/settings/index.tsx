import React from 'react';

import { View, Text, TouchableOpacity, Appearance, StyleSheet } from 'react-native';

import { useTranslation } from 'react-i18next';

import { COLORS } from '~/constants/colors';
import i18n from '~/i18n';
import { supabase } from '~/lib/supabase';

import { setLanguage } from '../../src/i18n';

export default function Settings() {
  const { t } = useTranslation();

  const [lang, setLang] = React.useState(i18n.language);
  const [dark, setDark] = React.useState(Appearance.getColorScheme() === 'dark');

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
    <View style={styles.container}>
      <Text style={styles.title}>Configuración</Text>

      <Text>Idioma</Text>
      <View style={styles.row}>
        {['en', 'es', 'pt', 'fr', 'it', 'zh', 'ja'].map((l) => (
          <TouchableOpacity
            key={l}
            onPress={() => setLang(l)}
            style={[
              styles.optionButton,
              lang === l ? styles.optionButtonActive : styles.optionButtonInactive,
            ]}
          >
            <Text>{l.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Tema</Text>
      <View style={styles.rowNoWrap}>
        <TouchableOpacity
          onPress={() => setDark(false)}
          style={[
            styles.optionButton,
            !dark ? styles.optionButtonActive : styles.optionButtonInactive,
          ]}
        >
          <Text>Claro</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setDark(true)}
          style={[
            styles.optionButton,
            dark ? styles.optionButtonActive : styles.optionButtonInactive,
          ]}
        >
          <Text>Oscuro</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={save} style={styles.saveButton}>
        <Text style={styles.saveButtonText}>Guardar</Text>
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

  // Labels
  label: {
    marginTop: 8,
  },

  // Language/Theme Row
  row: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  rowNoWrap: {
    flexDirection: 'row',
    gap: 8,
  },

  // Option Button Base
  optionButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  optionButtonActive: {
    borderColor: COLORS.border.blue,
  },
  optionButtonInactive: {
    borderColor: COLORS.border.light,
  },

  // Save Button
  saveButton: {
    backgroundColor: COLORS.border.blue,
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  saveButtonText: {
    color: COLORS.utility.white2,
    textAlign: 'center',
    fontWeight: '800',
  },
});

// v155 language picker
const languages = ['en', 'es', 'pt', 'fr', 'it', 'zh', 'ja'];

// v155: simple language buttons
// <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8 }}>
// {languages.map(l => <ThemedButton key={l} title={l.toUpperCase()} kind="tonal" onPress={()=> setLanguage(l)} />)}
// </View>
