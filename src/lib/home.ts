import * as Location from 'expo-location';
import { supabase } from '~/lib/supabase';
import { LocationCache } from './weatherCache';

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

// Simple coordinate-based location detection
export async function getLocationFromCoordinates(lat: number, lng: number): Promise<string | null> {
  // Basic geographic region detection based on coordinates
  const regions = [
    { lat: [-90, -60], lng: [-180, 180], name: "Antártida" },
    { lat: [-60, -23.5], lng: [-70, -30], name: "Argentina" },
    { lat: [-23.5, 12], lng: [-82, -34], name: "Brasil" },
    { lat: [32, 42], lng: [-125, -66], name: "Estados Unidos" },
    { lat: [25, 49], lng: [-8, 40], name: "Europa" },
    { lat: [-35, -10], lng: [-80, -65], name: "Chile" },
    { lat: [-56, -17], lng: [-110, -25], name: "Sudamérica" },
    { lat: [36, 71], lng: [-10, 70], name: "Europa/África" },
    { lat: [-35, 37], lng: [110, 180], name: "Oceanía" },
  ];
  
  for (const region of regions) {
    if (lat >= region.lat[0] && lat <= region.lat[1] && 
        lng >= region.lng[0] && lng <= region.lng[1]) {
      return region.name;
    }
  }
  
  // If no specific region, give general location
  if (lat > 0) {
    return lng > 0 ? "Europa/Asia" : "América del Norte";
  } else {
    return lng > 0 ? "África/Oceanía" : "América del Sur";
  }
}

// Alternative geocoding using BigDataCloud (same as weather API)
export async function reverseGeocodeCoordinates(lat: number, lng: number): Promise<string | null> {
  try {
    const geocodeUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=es`;
    
    const response = await fetch(geocodeUrl);
    if (!response.ok) {
      return null;
    }
    
    const geocodeData = await response.json();
    
    // Try different location fields in order of preference
    let locationName = null;
    
    if (geocodeData.city) {
      locationName = geocodeData.city;
    } else if (geocodeData.locality) {
      locationName = geocodeData.locality;
    } else if (geocodeData.principalSubdivision) {
      locationName = geocodeData.principalSubdivision;
    } else if (geocodeData.countryName) {
      locationName = geocodeData.countryName;
    }
    
    if (locationName && geocodeData.countryName && locationName !== geocodeData.countryName) {
      return `${locationName}, ${geocodeData.countryName}`;
    } else if (locationName) {
      return locationName;
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

// Cached version of reverseCity
export async function reverseCityCached(lat: number, lng: number): Promise<string | null> {
  // Try cache first
  const cached = await LocationCache.get(lat, lng, 'expo');
  if (cached) {
    return cached;
  }

  try {
    const result = await reverseCity(lat, lng);
    if (result) {
      await LocationCache.set(lat, lng, result, 'expo');
    }
    return result;
  } catch (error) {
    return null;
  }
}

// Cached version of reverseGeocodeCoordinates
export async function reverseGeocodeCoordinatesCached(lat: number, lng: number): Promise<string | null> {
  // Try cache first
  const cached = await LocationCache.get(lat, lng, 'bigdata');
  if (cached) {
    return cached;
  }

  try {
    const result = await reverseGeocodeCoordinates(lat, lng);
    if (result) {
      await LocationCache.set(lat, lng, result, 'bigdata');
    }
    return result;
  } catch (error) {
    return null;
  }
}

// getLocationFromCoordinates is local computation, no need for cache
export { getLocationFromCoordinates as getLocationFromCoordinatesCached };

export async function reverseCity(lat:number, lng:number){
  try {
    const arr = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    const c = arr?.[0];
    if (!c) {
      return null;
    }
    
    // Build location string with available data
    const parts = [];
    if (c.city) parts.push(c.city);
    else if (c.subregion) parts.push(c.subregion);
    else if (c.region) parts.push(c.region);
    else if (c.district) parts.push(c.district);
    else if (c.name) parts.push(c.name);
    else if (c.street) parts.push(c.street);
    
    if (c.country && parts.length > 0) parts.push(c.country);
    else if (c.isoCountryCode && parts.length > 0) parts.push(c.isoCountryCode);
    
    const result = parts.length > 0 ? parts.join(', ') : null;
    return result;
  } catch (error) { 
    return null; 
  }
}
