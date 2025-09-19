import { useTranslation } from 'react-i18next';
import { Skeleton } from '../~/components/ui/Skeleton';
import { useTheme } from '../~/lib/theme';
import { useToast } from '../~/components/ui/Toast';

import React from 'react';
import { View, Text, Button, ScrollView, Alert } from 'react-native';
import { LabeledInput } from '../components/FiltersRow';
import { affiliates } from '../~/lib/affiliates';

export default function Hotels(){
  const { t } = useTranslation();

  const toast = useToast();
  const { colors, spacing } = useTheme();
  const [loading, setLoading] = React.useState(false);

  const [city, setCity] = React.useState('Santiago');
  const [checkin, setCheckin] = React.useState(new Date().toISOString().slice(0,10));
  const [checkout, setCheckout] = React.useState(new Date(Date.now()+86400000).toISOString().slice(0,10));
  const [guests, setGuests] = React.useState('2');
  const [rooms, setRooms] = React.useState('1');

  async function openAffiliate(){
  const { t } = useTranslation();

  const toast = useToast();
  const { colors, spacing } = useTheme();
  const [loading, setLoading] = React.useState(false);

    toast.show('Abriendo hoteles…');
    const url = affiliates.hotels.buildUrl({
      city,
      checkin,
      checkout,
      guests: Number(guests)||1,
      rooms: Number(rooms)||1
    });
    affiliates.hotels.open({
      city,
      checkin,
      checkout,
      guests: Number(guests)||1,
      rooms: Number(rooms)||1
    }).then(()=> toast.show('Redirigido')).catch(()=> toast.show('Error al abrir'));
    console.log('Hotels deeplink:', url);
  }

  return (
    <ScrollView accessibilityRole='scrollbar' style={{ padding:16 }}>
      <Text accessibilityRole='header' style={{ fontWeight:'800', fontSize:18, marginBottom:12 }}>{t('booking.hotels')}</Text>
      <View style={{ flexDirection:'row', gap:12 }}>
        <LabeledInput label="City" value={city} onChangeText={setCity} placeholder="Santiago" />
      </View>
      <View style={{ height:12 }} />
      <View style={{ flexDirection:'row', gap:12 }}>
        <LabeledInput label="Check-in" value={checkin} onChangeText={setCheckin} />
        <LabeledInput label="Check-out" value={checkout} onChangeText={setCheckout} />
      </View>
      <View style={{ height:12 }} />
      <View style={{ flexDirection:'row', gap:12 }}>
        <LabeledInput label="Guests" value={guests} onChangeText={setGuests} />
        <LabeledInput label="Rooms" value={rooms} onChangeText={setRooms} />
      </View>
      <Button title="Buscar en afiliado" onPress={openAffiliate} />
    </ScrollView>
  );
}
