import { useTranslation } from 'react-i18next';
export const options = { headerLargeTitle: true, headerTitle: 'Booking', headerTransparent: true };
import { useTheme } from '~/lib/theme';

import React from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { BookingCard } from './components/BookingCard';
import { typography } from '~/src/lib/theme';

export default function Booking(){
  const { t } = useTranslation();

  const { colors, spacing } = useTheme();

  const router = useRouter();
  return (
    <View style={{ padding:16 }} accessibilityLabel='Booking hub' accessibilityRole='summary'>
      <Text accessibilityRole='header' style={{ fontWeight:'600', fontSize: typography.title, marginBottom:12 }}>{t('booking.title')}</Text>
      <BookingCard title="Flights" subtitle="Busca vuelos y abre tu afiliado" cta="Buscar vuelos" onPress={()=> router.push('/booking/flights')} />
      <BookingCard title="Hotels" subtitle="Hoteles por ciudad y fechas" cta="Buscar hoteles" onPress={()=> router.push('/booking/hotels')} />
      <BookingCard title="eSIMs" subtitle="Planes de datos por país" cta="Ver eSIMs" onPress={()=> router.push('/booking/esim')} />
    </View>
  );
}
