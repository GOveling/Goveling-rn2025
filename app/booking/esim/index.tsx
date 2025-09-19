import { useTranslation } from 'react-i18next';
import { Skeleton } from '~/components/ui/Skeleton';
import { useTheme } from '~/lib/theme';
import { useToast } from '~/components/ui/Toast';

import React from 'react';
import { View, Text, Button, ScrollView, Alert } from 'react-native';
import { LabeledInput, Chip } from '../components/FiltersRow';
import { affiliates } from '~/lib/affiliates';

export default function Esim(){
  const { t } = useTranslation();

  const toast = useToast();
  const { colors, spacing } = useTheme();
  const [loading, setLoading] = React.useState(false);

  const [countryCode, setCountryCode] = React.useState('CL');
  const [days, setDays] = React.useState('7');
  const [dataGB, setDataGB] = React.useState('5');
  const presets = [
    { label:'5 GB / 7 días', d:'7', g:'5' },
    { label:'10 GB / 15 días', d:'15', g:'10' },
    { label:'20 GB / 30 días', d:'30', g:'20' },
  ];

  async function openAffiliate(){


    toast.show('Abriendo eSIM…');
    const url = affiliates.esim.buildUrl({
      countryCode,
      days: Number(days)||7,
      dataGB: Number(dataGB)||5
    });
    affiliates.esim.open({
      countryCode,
      days: Number(days)||7,
      dataGB: Number(dataGB)||5
    }).then(()=> toast.show('Redirigido')).catch(()=> toast.show('Error al abrir'));
    console.log('eSIM deeplink:', url);
  }

  return (
    <ScrollView accessibilityRole='scrollbar' style={{ padding:16 }}>
      <Text accessibilityRole='header' style={{ fontWeight:'800', fontSize:18, marginBottom:12 }}>{t('booking.esim')}</Text>
      <View style={{ flexDirection:'row', gap:12 }}>
        <LabeledInput label="Country code (ISO-2)" value={countryCode} onChangeText={setCountryCode} placeholder="CL" />
        <LabeledInput label="Days" value={days} onChangeText={setDays} />
        <LabeledInput label="Data (GB)" value={dataGB} onChangeText={setDataGB} />
      </View>
      <ScrollView accessibilityRole='scrollbar' horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical:12 }}>
        {presets.map(p=> (
          <Chip key={p.label} label={p.label} onPress={()=> { setDays(p.d); setDataGB(p.g); }} />
        ))}
      </ScrollView>
      <Button title="Ver planes en afiliado" onPress={openAffiliate} />
    </ScrollView>
  );
}
