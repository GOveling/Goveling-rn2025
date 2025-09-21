import * as Location from 'expo-location';
import { supabase } from '~/lib/supabase';

export type Trip = { id:string; name:string; start_date?:string|null; end_date?:string|null; cover_emoji?:string|null };

export async function getToday(){
  const d = new Date();
  return d.toISOString().slice(0,10);
}

export function isActiveTrip(t:Trip){
  const now = new Date();
  if (!t.start_date || !t.end_date) return false;
  return new Date(t.start_date) <= now && now <= new Date(t.end_date);
}
export function isFutureTrip(t:Trip){
  const now = new Date();
  if (!t.start_date) return false;
  return new Date(t.start_date) > now;
}

export async function getActiveOrNextTrip(): Promise<Trip|null>{
  const { data: u } = await supabase.auth.getUser();
  const uid = u?.user?.id;
  if (!uid) return null;
  const { data: own } = await supabase.from('trips').select('id,title,start_date,end_date').eq('user_id', uid);
  const { data: collabIds } = await supabase.from('trip_collaborators').select('trip_id').eq('user_id', uid);
  const tripIds = (collabIds || []).map(c => c.trip_id);
  const { data: collabTrips } = tripIds.length > 0 ? await supabase.from('trips').select('id,title,start_date,end_date').in('id', tripIds) : { data: [] };
  const trips: Trip[] = [ 
    ...((own||[]).map(t => ({ id: t.id, name: t.title, start_date: t.start_date, end_date: t.end_date }))), 
    ...((collabTrips||[]).map(t => ({ id: t.id, name: t.title, start_date: t.start_date, end_date: t.end_date })))
  ];
  if (!trips.length) return null;
  // active first
  const active = trips.find(isActiveTrip);
  if (active) return active as Trip;
  // next future
  const future = trips.filter(isFutureTrip).sort((a,b)=> new Date(a.start_date||'2099').getTime() - new Date(b.start_date||'2099').getTime())[0];
  return future || null;
}

export async function getTripPlaces(trip_id:string){
  const { data, error } = await supabase.from('trip_places').select('id, place_id, name, lat, lng, address, country_code, category').eq('trip_id', trip_id);
  if (error) return [];
  return data || [];
}

export async function getSavedPlaces(){
  const { data: u } = await supabase.auth.getUser();
  const uid = u?.user?.id;
  if (!uid) return [];
  
  // Get all trip IDs where user is owner or collaborator
  const { data: ownTrips } = await supabase.from('trips').select('id').eq('user_id', uid);
  const { data: collabTrips } = await supabase.from('trip_collaborators').select('trip_id').eq('user_id', uid);
  
  const tripIds = [
    ...((ownTrips || []).map(t => t.id)),
    ...((collabTrips || []).map(c => c.trip_id))
  ];
  
  if (tripIds.length === 0) return [];
  
  const { data, error } = await supabase.from('trip_places').select('id, place_id, name, lat, lng, address').in('trip_id', tripIds);
  if (error) return [];
  return data || [];
}

export function haversine(lat1:number, lon1:number, lat2:number, lon2:number){
  function toRad(d:number){ return d*Math.PI/180; }
  const R = 6371000;
  const dLat = toRad(lat2-lat1);
  const dLon = toRad(lon2-lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  const c = 2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R*c;
}

export async function getCurrentPosition(){
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return null;
  const pos = await Location.getCurrentPositionAsync({});
  return { lat: pos.coords.latitude, lng: pos.coords.longitude };
}

export async function reverseCity(lat:number, lng:number){
  try {
    const arr = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    const c = arr?.[0];
    if (!c) return null;
    // Build location string with available data
    const parts = [];
    if (c.city) parts.push(c.city);
    else if (c.subregion) parts.push(c.subregion);
    else if (c.region) parts.push(c.region);
    else if (c.district) parts.push(c.district);
    
    if (c.country) parts.push(c.country);
    else if (c.isoCountryCode) parts.push(c.isoCountryCode);
    
    return parts.length > 0 ? parts.join(', ') : 'Ubicación desconocida';
  } catch { return null; }
}
