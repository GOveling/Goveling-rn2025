// Simple Nominatim geocoding helper (forward + reverse)
// NOTE: Respect Nominatim usage policy: add proper User-Agent & email (configure via env or constant)

export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
  city?: string;
  state?: string;
  country?: string;
  countryCode?: string;
  boundingBox?: [number, number, number, number]; // [south, north, west, east]
}

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'GovelingApp/1.0 (contact@goveling.example)';

async function jsonFetch(url: string) {
  const resp = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
  });
  if (!resp.ok) throw new Error('Geocoding HTTP ' + resp.status);
  return resp.json();
}

export async function reverseGeocode(lat: number, lng: number): Promise<GeocodeResult | null> {
  try {
    const data = await jsonFetch(`${NOMINATIM_BASE}/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
    const addr = data.address || {};
    return {
      lat,
      lng,
      displayName: data.display_name,
      city: addr.city || addr.town || addr.village,
      state: addr.state,
      country: addr.country,
      countryCode: addr.country_code,
      boundingBox: Array.isArray(data.boundingbox)
        ? [
            parseFloat(data.boundingbox[0]),
            parseFloat(data.boundingbox[1]),
            parseFloat(data.boundingbox[2]),
            parseFloat(data.boundingbox[3]),
          ]
        : undefined,
    };
  } catch {
    return null;
  }
}

export async function forwardGeocode(query: string, limit = 1): Promise<GeocodeResult[]> {
  try {
    const data = await jsonFetch(
      `${NOMINATIM_BASE}/search?format=jsonv2&q=${encodeURIComponent(query)}&limit=${limit}`
    );
    if (!Array.isArray(data)) return [];
    return data.map((d: any) => ({
      lat: parseFloat(d.lat),
      lng: parseFloat(d.lon),
      displayName: d.display_name,
      city: d.address?.city || d.address?.town || d.address?.village,
      state: d.address?.state,
      country: d.address?.country,
      countryCode: d.address?.country_code,
      boundingBox: Array.isArray(d.boundingbox)
        ? [
            parseFloat(d.boundingbox[0]),
            parseFloat(d.boundingbox[1]),
            parseFloat(d.boundingbox[2]),
            parseFloat(d.boundingbox[3]),
          ]
        : undefined,
    }));
  } catch {
    return [];
  }
}
