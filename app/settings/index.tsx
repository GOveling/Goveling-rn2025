import { useTranslation } from 'react-i18next';
import { setLanguage } from '../../src/i18n';
import React from 'react';
import { View, Text, TouchableOpacity, Appearance } from 'react-native';
import { supabase } from '~/lib/supabase';
import i18n from '~/i18n';

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
    <View style={{ flex: 1, padding: 12, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: '900' }}>Configuración</Text>

      <Text>Idioma</Text>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        {['en', 'es', 'pt', 'fr', 'it', 'zh', 'ja'].map((l) => (
          <TouchableOpacity
            key={l}
            onPress={() => setLang(l)}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: lang === l ? '#007aff' : '#ddd',
            }}
          >
            <Text>{l.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={{ marginTop: 8 }}>Tema</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity
          onPress={() => setDark(false)}
          style={{
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: !dark ? '#007aff' : '#ddd',
          }}
        >
          <Text>Claro</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setDark(true)}
          style={{
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: dark ? '#007aff' : '#ddd',
          }}
        >
          <Text>Oscuro</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={save}
        style={{ backgroundColor: '#007aff', padding: 12, borderRadius: 8, marginTop: 12 }}
      >
        <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '800' }}>Guardar</Text>
      </TouchableOpacity>
    </View>
  );
}

// v155 language picker
const languages = ['en', 'es', 'pt', 'fr', 'it', 'zh', 'ja'];

// v155: simple language buttons
// <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8 }}>
// {languages.map(l => <ThemedButton key={l} title={l.toUpperCase()} kind="tonal" onPress={()=> setLanguage(l)} />)}
// </View>
