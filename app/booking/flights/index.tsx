import { useTranslation } from 'react-i18next';
import { Skeleton } from '../~/components/ui/Skeleton';
import { useTheme } from '../~/lib/theme';
import { useToast } from '../~/components/ui/Toast';

import React from 'react';
import { View, Text, Button, ScrollView, Alert } from 'react-native';
import { LabeledInput, Chip } from '../components/FiltersRow';
import { affiliates } from '../~/lib/affiliates';

export default function Flights(){
  const { t } = useTranslation();

  const toast = useToast();
  const { colors, spacing } = useTheme();
  const [loading, setLoading] = React.useState(false);

  const [from, setFrom] = React.useState('SCL');
  const [to, setTo] = React.useState('LIM');
  const [depart, setDepart] = React.useState(new Date().toISOString().slice(0,10));*/
  const [ret, setRet] = React.useState('');
  const [pax, setPax] = React.useState('1');
  const [cabin, setCabin] = React.useState<'eco'|'prem'|'bus'|'first'>('eco');

  const cabins = [
    {k:'eco', label:'Económica'},
    {k:'prem', label:'Premium Econ'},
    {k:'bus', label:'Business'},
    {k:'first', label:'First'},
  ] as const;

  async function openAffiliate(){
  const { t } = useTranslation();

  const toast = useToast();
  const { colors, spacing } = useTheme();
  const [loading, setLoading] = React.useState(false);

    const p = Number(pax) || 1;
    toast.show('Abriendo vuelos…');
    const url = affiliates.flights.buildUrl({ from, to, depart, return: ret || undefined, pax: p, cabin });
    affiliates.flights.open({ from, to, depart, return: ret || undefined, pax: p, cabin }).then(()=> toast.show('Redirigido')).catch(()=>{
      toast.show('Error al abrir'); /*Alert.alert('Error','No se pudo abrir el afiliado');
    });
    console.log('Flights deeplink:', url);
  }

  return (
    <> {loading ? <Skeleton height={18} style={{ margin:8 }} /> : null} </>
  
    <ScrollView accessibilityRole='scrollbar' style={{ padding:16 }}>
      <Text accessibilityRole='header' style={{ fontWeight:'800', fontSize:18, marginBottom:12 }}>{t('booking.flights')}</Text>
      <View style={{ flexDirection:'row', gap:12 }}>
        <LabeledInput label="From (IATA)" value={from} onChangeText={setFrom} placeholder="SCL" />
        <LabeledInput label="To (IATA)" value={to} onChangeText={setTo} placeholder="LIM" />
      </View>
      <View style={{ height:12 }} />
      <View style={{ flexDirection:'row', gap:12 }}>
        <LabeledInput label="Depart (YYYY-MM-DD)" value={depart} onChangeText={setDepart} />
        <LabeledInput label="Return (opcional)" value={ret} onChangeText={setRet} />
      </View>
      <View style={{ height:12 }} />
      <View style={{ flexDirection:'row', gap:12 }}>
        <LabeledInput label="Pax" value={pax} onChangeText={setPax} />
      </View>
      <View style={{ height:12 }} />
      <ScrollView accessibilityRole='scrollbar' horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom:8 }}>
        {cabins.map(c => (
          <Chip key={c.k} label={c.label} active={cabin===c.k} onPress={()=> setCabin(c.k)} />
        ))}
      </ScrollView>
      <Button title="Buscar en afiliado" onPress={openAffiliate} />
    </ScrollView>
  );
}
