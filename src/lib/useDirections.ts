import { useState, useCallback } from 'react';

type LatLng = { lat: number; lng: number };
export type Step = {
  travel_mode: string;
  instruction?: string;
  distance_m?: number;
  duration_s?: number;
  polyline?: number[][]; // [lng,lat][]
  transit?: {
    line?: { short_name?: string; name?: string; color?: string; agency?: string };
    headsign?: string;
    num_stops?: number;
    departure_stop?: string;
    arrival_stop?: string;
  } | null;
};
export type DirResult = {
  summary?: string;
  distance_m?: number;
  duration_s?: number;
  arrival_time?: string;
  departure_time?: string;
  overview_polyline?: number[][];
  steps: Step[];
} | null;

export function useDirections() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DirResult>(null);
  const [cached, setCached] = useState<boolean>(false);

  const fetchDirections = useCallback(
    async (
      origin: LatLng,
      destination: LatLng,
      mode: 'walking' | 'driving' | 'bicycling' | 'transit',
      departure_time?: number
    ) => {
      setLoading(true);
      setError(null);
      try {
        const base = process.env.EXPO_PUBLIC_SUPABASE_URL;
        const r = await fetch(`${base}/functions/v1/google-directions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ origin, destination, mode, departure_time }),
        });
        const j = await r.json();
        if (!r.ok || !j?.ok) throw new Error(j?.error || 'directions_failed');
        setResult(j.result);
        setCached(!!j.cached);
      } catch (e: any) {
        setError(e.message || 'error');
        setResult(null);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { loading, error, result, cached, fetchDirections };
}

export async function fetchBestMode(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  preferred: ('walking' | 'driving' | 'bicycling' | 'transit')[] = [
    'transit',
    'walking',
    'bicycling',
    'driving',
  ]
) {
  const base = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
  let best: any = null;
  let bestMode: any = null;
  for (const m of preferred) {
    try {
      const r = await fetch(`${base}/functions/v1/google-directions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin,
          destination,
          mode: m,
          departure_time: m === 'transit' ? Math.floor(Date.now() / 1000) : undefined,
        }),
      });
      const j = await r.json();
      if (!r.ok || !j?.ok) continue;
      const dur = j.result?.duration_s ?? 1e12;
      if (!best || dur < (best.result?.duration_s ?? 1e12)) {
        best = j;
        bestMode = m;
      }
    } catch (e) {}
  }
  if (!best) throw new Error('no_route_any_mode');
  return { mode: bestMode, result: best.result };
}
