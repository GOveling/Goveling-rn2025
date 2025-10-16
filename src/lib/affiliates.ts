// src/lib/affiliates.ts
// Centraliza construcción de deeplinks a afiliados. Lee variables EXPO_PUBLIC_*
// para que luego en Bolt puedas reemplazar fácilmente.
import * as Linking from 'expo-linking';

import { supabase } from './supabase';

async function logClickout(vertical: 'flights' | 'hotels' | 'esim', url: string, params: any) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const user_id = user?.id || null;
    await supabase.from('booking_clickouts').insert({ user_id, vertical, url, params });
  } catch (e) {
    /* noop */
  }
}

type FlightQuery = {
  from: string;
  to: string;
  depart: string;
  return?: string;
  pax?: number;
  cabin?: 'eco' | 'prem' | 'bus' | 'first';
};
type HotelQuery = {
  city: string;
  checkin: string;
  checkout: string;
  guests?: number;
  rooms?: number;
};
type EsimQuery = { countryCode: string; days?: number; dataGB?: number };

function open(url: string) {
  return Linking.openURL(url);
}

export const affiliates = {
  flights: {
    enabled: true,
    buildUrl(q: FlightQuery) {
      // Ejemplo (Skyscanner/TravelPayouts/etc). Reemplazar dominios/params en Bolt.
      const base =
        process.env.EXPO_PUBLIC_FLIGHTS_AFFIL_URL || 'https://example-flights.com/search';
      const u = new URL(base);
      u.searchParams.set('from', q.from);
      u.searchParams.set('to', q.to);
      u.searchParams.set('depart', q.depart);
      if (q.return) u.searchParams.set('return', q.return);
      if (q.pax) u.searchParams.set('pax', String(q.pax));
      if (q.cabin) u.searchParams.set('cabin', q.cabin);
      if (process.env.EXPO_PUBLIC_FLIGHTS_AFFIL_ID)
        u.searchParams.set('affid', process.env.EXPO_PUBLIC_FLIGHTS_AFFIL_ID);
      const url = u.toString();
      return url;
    },
    async open(q: FlightQuery) {
      const url = this.buildUrl(q);
      await logClickout('flights', url, q);
      return open(url);
    },
  },
  hotels: {
    enabled: true,
    buildUrl(q: HotelQuery) {
      const base = process.env.EXPO_PUBLIC_HOTELS_AFFIL_URL || 'https://example-hotels.com/search';
      const u = new URL(base);
      u.searchParams.set('city', q.city);
      u.searchParams.set('checkin', q.checkin);
      u.searchParams.set('checkout', q.checkout);
      if (q.guests) u.searchParams.set('guests', String(q.guests));
      if (q.rooms) u.searchParams.set('rooms', String(q.rooms));
      if (process.env.EXPO_PUBLIC_HOTELS_AFFIL_ID)
        u.searchParams.set('affid', process.env.EXPO_PUBLIC_HOTELS_AFFIL_ID);
      const url = u.toString();
      return url;
    },
    async open(q: HotelQuery) {
      const url = this.buildUrl(q);
      await logClickout('hotels', url, q);
      return open(url);
    },
  },
  esim: {
    enabled: true,
    buildUrl(q: EsimQuery) {
      const base = process.env.EXPO_PUBLIC_ESIM_AFFIL_URL || 'https://example-esim.com/plans';
      const u = new URL(base);
      u.searchParams.set('country', q.countryCode);
      if (q.days) u.searchParams.set('days', String(q.days));
      if (q.dataGB) u.searchParams.set('data', String(q.dataGB));
      if (process.env.EXPO_PUBLIC_ESIM_AFFIL_ID)
        u.searchParams.set('affid', process.env.EXPO_PUBLIC_ESIM_AFFIL_ID);
      const url = u.toString();
      return url;
    },
    async open(q: EsimQuery) {
      const url = this.buildUrl(q);
      await logClickout('esim', url, q);
      return open(url);
    },
  },
};
