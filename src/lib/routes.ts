import { supabase } from '~/lib/supabase';

export async function loadRouteCache(trip_id: string, day: string) {
  const { data, error } = await supabase
    .from('route_cache')
    .select('*')
    .eq('trip_id', trip_id)
    .eq('day', day)
    .maybeSingle();
  if (error) return null;
  return data;
}

export async function saveRouteCache(trip_id: string, day: string, places: any, summary?: any) {
  const row = {
    trip_id,
    day,
    places,
    summary: summary || null,
    created_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from('route_cache')
    .upsert(row, { onConflict: 'trip_id,day' })
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data;
}
