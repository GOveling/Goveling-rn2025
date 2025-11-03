import { supabase } from './supabase';
import { getTripWithTeamRPC } from './teamHelpers';
import { getTripCollaborators } from './userUtils';

export interface TripStats {
  collaboratorsCount: number;
  placesCount: number;
  countries: string[];
  countryCodes: string[];
  categories: string[];
  collaborators: Array<{
    id: string;
    full_name?: string;
    avatar_url?: string;
    email?: string;
  }>;
  firstPlaceImage?: string;
}

// Helper function to get country from coordinates using reverse geocoding
const getCountryFromCoordinates = async (lat: number, lng: number): Promise<string | null> => {
  try {
    console.log(`🗺️ getCountryFromCoordinates: Checking coordinates lat: ${lat}, lng: ${lng}`);

    // Note: In a real implementation, you would use Google Geocoding API
    // For now, we'll implement a simple heuristic based on coordinates

    // Mexico coordinate ranges (approximate)
    if (lat >= 14.5 && lat <= 32.7 && lng >= -118.4 && lng <= -86.7) {
      console.log('🗺️ getCountryFromCoordinates: Matched Mexico (MX)');
      return 'MX';
    }

    // USA coordinate ranges (approximate)
    if (lat >= 24.5 && lat <= 49.4 && lng >= -125.0 && lng <= -66.9) {
      console.log('🗺️ getCountryFromCoordinates: Matched USA (US)');
      return 'US';
    }

    // Chile coordinate ranges (approximate) - Check Chile before Brazil to avoid overlap
    if (lat >= -56.0 && lat <= -17.5 && lng >= -75.6 && lng <= -66.4) {
      console.log('🗺️ getCountryFromCoordinates: Matched Chile (CL)');
      return 'CL';
    }

    // Peru coordinate ranges (approximate) - Added to prevent Chile overlap
    if (lat >= -18.4 && lat <= 0.0 && lng >= -81.4 && lng <= -68.7) {
      console.log('🗺️ getCountryFromCoordinates: Matched Peru (PE)');
      return 'PE';
    }

    // Argentina coordinate ranges (approximate) - Check Argentina before Brazil
    if (lat >= -55.1 && lat <= -21.8 && lng >= -73.6 && lng <= -53.6) {
      console.log('🗺️ getCountryFromCoordinates: Matched Argentina (AR)');
      return 'AR';
    }

    // Brazil coordinate ranges (approximate) - More restrictive to avoid Argentina overlap
    if (lat >= -33.7 && lat <= 5.3 && lng >= -73.0 && lng <= -34.8) {
      console.log('🗺️ getCountryFromCoordinates: Matched Brazil (BR)');
      return 'BR';
    }

    // Turkey coordinate ranges (approximate)
    if (lat >= 35.8 && lat <= 42.1 && lng >= 25.7 && lng <= 44.8) {
      console.log('🗺️ getCountryFromCoordinates: Matched Turkey (TR)');
      return 'TR';
    }

    // France coordinate ranges (approximate)
    if (lat >= 41.3 && lat <= 51.1 && lng >= -5.2 && lng <= 9.6) {
      console.log('🗺️ getCountryFromCoordinates: Matched France (FR)');
      return 'FR';
    }

    // Spain coordinate ranges (approximate)
    if (lat >= 27.6 && lat <= 43.8 && lng >= -18.2 && lng <= 4.3) {
      console.log('🗺️ getCountryFromCoordinates: Matched Spain (ES)');
      return 'ES';
    }

    // Italy coordinate ranges (approximate)
    if (lat >= 35.5 && lat <= 47.1 && lng >= 6.6 && lng <= 18.5) {
      console.log('🗺️ getCountryFromCoordinates: Matched Italy (IT)');
      return 'IT';
    }

    // Germany coordinate ranges (approximate)
    if (lat >= 47.3 && lat <= 55.1 && lng >= 5.9 && lng <= 15.0) {
      console.log('🗺️ getCountryFromCoordinates: Matched Germany (DE)');
      return 'DE';
    }

    // United Kingdom coordinate ranges (approximate)
    if (lat >= 49.9 && lat <= 60.9 && lng >= -8.2 && lng <= 1.8) {
      console.log('🗺️ getCountryFromCoordinates: Matched United Kingdom (GB)');
      return 'GB';
    }

    console.log('🗺️ getCountryFromCoordinates: No country match found');
    return null;
  } catch (error) {
    console.error('Error getting country from coordinates:', error);
    return null;
  }
};

export const getTripStats = async (tripId: string): Promise<TripStats> => {
  try {
    console.log('🔍 getTripStats: Starting for trip ID:', tripId);

    // Obtener colaboradores: preferir RPC (bypass RLS para owners), con fallback a client-side
    console.log('👥 getTripStats: Fetching collaborators via RPC getTripWithTeamRPC...');
    let collaboratorsSafe = [] as Array<{
      id: string;
      full_name?: string;
      avatar_url?: string;
      email?: string;
    }>;
    try {
      const team = await getTripWithTeamRPC(tripId);
      collaboratorsSafe = (team.collaborators || []).map((c) => ({
        id: c.id,
        full_name: c.full_name,
        avatar_url: c.avatar_url,
        email: c.email,
      }));
      console.log('👥 getTripStats: Collaborators via RPC count:', collaboratorsSafe.length);
    } catch (e) {
      console.warn(
        'getTripStats: RPC getTripWithTeamRPC failed, falling back to getTripCollaborators',
        e
      );
      collaboratorsSafe = await getTripCollaborators(tripId);
      console.log('👥 getTripStats: Collaborators via fallback count:', collaboratorsSafe.length);
    }

    // Obtener lugares del trip
    const { data: places, error: placesError } = await supabase
      .from('trip_places')
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: true });

    console.log('📍 getTripStats: Places query result:', { places, error: placesError });
    console.log('📍 getTripStats: Places found:', places?.length || 0);

    if (places) {
      places.forEach((place, index) => {
        console.log(`📍 Place ${index + 1}:`, {
          name: place.name,
          lat: place.lat,
          lng: place.lng,
          country_code: place.country_code,
          id: place.id,
        });
      });
    }

    // Obtener códigos de país únicos por lugar usando múltiples fuentes (code, nombre, coordenadas)
    const countryCodesPromises =
      places?.map(async (place, index) => {
        console.log(`🔍 Processing place ${index + 1}: ${place.name}`);

        // 1) Usar country_code si viene en el registro
        if (place.country_code) {
          console.log(`✅ Place ${index + 1}: Found country_code: ${place.country_code}`);
          return String(place.country_code).toUpperCase();
        }

        // 2) Intentar inferir desde el nombre del país si existe
        if (place.country) {
          const inferred = getCountryCodeByName(String(place.country));
          if (inferred) {
            console.log(
              `✅ Place ${index + 1}: Inferred from country name "${place.country}": ${inferred}`
            );
            return inferred.toUpperCase();
          }
          console.log(`⚠️ Place ${index + 1}: Could not infer from country name: ${place.country}`);
        }

        // 3) Fallback: inferir desde coordenadas (heurístico)
        if (place.lat && place.lng) {
          console.log(
            `🌍 Place ${index + 1}: Trying coordinates lat: ${place.lat}, lng: ${place.lng}`
          );
          const countryFromCoords = await getCountryFromCoordinates(place.lat, place.lng);
          if (countryFromCoords) {
            console.log(
              `✅ Place ${index + 1}: Found country from coordinates: ${countryFromCoords}`
            );
            return countryFromCoords.toUpperCase();
          }
          console.log(`❌ Place ${index + 1}: No country found from coordinates`);
        }

        console.log(`❌ Place ${index + 1}: No country found using any method`);
        return null;
      }) || [];

    const resolvedCountryCodes = await Promise.all(countryCodesPromises);

    // Normalizar y extraer códigos únicos (en mayúsculas)
    const countryCodes = Array.from(
      new Set((resolvedCountryCodes.filter(Boolean) as string[]).map((c) => c.toUpperCase()))
    );

    console.log('🌍 getTripStats: Extracted country codes:', countryCodes);

    const countries = countryCodes.map((code) => getCountryName(code)).filter(Boolean) as string[];

    console.log('🌍 getTripStats: Country names:', countries);

    // Extraer categorías únicas
    const categories = Array.from(
      new Set(places?.map((place) => place.category).filter(Boolean) || [])
    ) as string[];

    // Formatear colaboradores en el shape esperado (ya vienen formateados en collaboratorsSafe)
    const formattedCollaborators = collaboratorsSafe.map((c) => ({
      id: c.id,
      full_name: c.full_name,
      avatar_url: c.avatar_url,
      email: c.email,
    }));

    // Obtener imagen del primer lugar (si existe)
    let firstPlaceImage: string | undefined;
    if (places && places.length > 0 && places[0].country_code) {
      firstPlaceImage = getCountryImage(places[0].country_code);
    }

    const result = {
      collaboratorsCount: collaboratorsSafe.length + 1, // +1 por el owner
      placesCount: places?.length || 0,
      countries: countries.length > 0 ? countries : [],
      countryCodes: countryCodes.length > 0 ? countryCodes : [],
      categories,
      collaborators: formattedCollaborators,
      firstPlaceImage,
    };

    console.log('✅ getTripStats: Final result:', result);

    return result;
  } catch (error) {
    console.error('Error getting trip stats:', error);
    return {
      collaboratorsCount: 1,
      placesCount: 0,
      countries: [],
      countryCodes: [],
      categories: [],
      collaborators: [],
      firstPlaceImage: undefined,
    };
  }
};

// Mapeo de códigos de país a nombres
export const getCountryName = (countryCode?: string): string | null => {
  if (!countryCode) return null;

  const countryMap: { [key: string]: string } = {
    CL: 'Chile',
    FR: 'France',
    JP: 'Japan',
    ES: 'Spain',
    IT: 'Italy',
    US: 'USA',
    BR: 'Brazil',
    AR: 'Argentina',
    PE: 'Peru',
    CO: 'Colombia',
    MX: 'Mexico',
    CA: 'Canada',
    GB: 'Reino Unido',
    DE: 'Germany',
    NL: 'Netherlands',
    BE: 'Belgium',
    CH: 'Switzerland',
    AT: 'Austria',
    PT: 'Portugal',
    GR: 'Greece',
    TR: 'Turkey',
    RU: 'Russia',
    CN: 'China',
    IN: 'India',
    TH: 'Thailand',
    VN: 'Vietnam',
    KR: 'South Korea',
    AU: 'Australia',
    NZ: 'New Zealand',
    ZA: 'South Africa',
    EG: 'Egypt',
    MA: 'Morocco',
    KE: 'Kenya',
    TZ: 'Tanzania',
  };

  return countryMap[countryCode.toUpperCase()] || null;
};

// Intentar obtener el código de país (ISO-2) a partir de un nombre de país
export const getCountryCodeByName = (countryName?: string): string | null => {
  if (!countryName) return null;

  // Normalizar: minúsculas, quitar acentos/diacríticos y espacios extra
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}+/gu, '')
      .trim();

  const name = normalize(countryName);

  const map: { [key: string]: string } = {
    // Inglés
    chile: 'CL',
    france: 'FR',
    japan: 'JP',
    spain: 'ES',
    italy: 'IT',
    'united states': 'US',
    'united states of america': 'US',
    usa: 'US',
    brazil: 'BR',
    argentina: 'AR',
    peru: 'PE',
    colombia: 'CO',
    mexico: 'MX',
    canada: 'CA',
    'united kingdom': 'GB',
    'great britain': 'GB',
    germany: 'DE',
    netherlands: 'NL',
    belgium: 'BE',
    switzerland: 'CH',
    austria: 'AT',
    portugal: 'PT',
    greece: 'GR',
    turkey: 'TR',
    russia: 'RU',
    china: 'CN',
    india: 'IN',
    thailand: 'TH',
    vietnam: 'VN',
    'south korea': 'KR',
    'korea, republic of': 'KR',
    australia: 'AU',
    'new zealand': 'NZ',
    'south africa': 'ZA',
    egypt: 'EG',
    morocco: 'MA',
    kenya: 'KE',
    tanzania: 'TZ',

    // Español
    'estados unidos': 'US',
    'reino unido': 'GB',
    alemania: 'DE',
    'paises bajos': 'NL',
    belgica: 'BE',
    suiza: 'CH',
    grecia: 'GR',
    turquia: 'TR',
    rusia: 'RU',
    tailandia: 'TH',
    'corea del sur': 'KR',
    'nueva zelanda': 'NZ',
    sudafrica: 'ZA',
    egipto: 'EG',
    marruecos: 'MA',
    kenia: 'KE',
  };

  return map[name] || null;
};

// Obtener emoji de bandera basado en código de país
export const getCountryFlag = (countryCode?: string): string => {
  if (!countryCode) return '🌍';

  const flagMap: { [key: string]: string } = {
    CL: '🇨🇱',
    FR: '🇫🇷',
    JP: '🇯🇵',
    ES: '🇪🇸',
    IT: '🇮🇹',
    US: '🇺🇸',
    BR: '🇧🇷',
    AR: '🇦🇷',
    PE: '🇵🇪',
    CO: '🇨🇴',
    MX: '🇲🇽',
    CA: '🇨🇦',
    GB: '🇬🇧',
    DE: '🇩🇪',
    NL: '🇳🇱',
    BE: '🇧🇪',
    CH: '🇨🇭',
    AT: '🇦🇹',
    PT: '🇵🇹',
    GR: '🇬🇷',
    TR: '🇹🇷',
    RU: '🇷🇺',
    CN: '🇨🇳',
    IN: '🇮🇳',
    TH: '🇹🇭',
    VN: '🇻🇳',
    KR: '🇰🇷',
    AU: '🇦🇺',
    NZ: '🇳🇿',
    ZA: '🇿🇦',
    EG: '🇪🇬',
    MA: '🇲🇦',
    KE: '🇰🇪',
    TZ: '🇹🇿',
  };

  return flagMap[countryCode.toUpperCase()] || '🌍';
};

// Obtener emoji de bandera basado en nombre de país
export const getCountryFlagByName = (countryName: string): string => {
  const flagMap: { [key: string]: string } = {
    chile: '🇨🇱',
    france: '🇫🇷',
    japan: '🇯🇵',
    spain: '🇪🇸',
    italy: '🇮🇹',
    usa: '🇺🇸',
    brazil: '🇧🇷',
    argentina: '🇦🇷',
    peru: '🇵🇪',
    colombia: '🇨🇴',
    mexico: '🇲🇽',
    canada: '🇨🇦',
    'reino unido': '🇬🇧',
    germany: '🇩🇪',
    netherlands: '🇳🇱',
    belgium: '🇧🇪',
    switzerland: '🇨🇭',
    austria: '🇦🇹',
    portugal: '🇵🇹',
    greece: '🇬🇷',
    turkey: '🇹🇷',
    russia: '🇷🇺',
    china: '🇨🇳',
    india: '🇮🇳',
    thailand: '🇹🇭',
    vietnam: '🇻🇳',
    'south korea': '🇰🇷',
    australia: '🇦🇺',
    'new zealand': '🇳🇿',
    'south africa': '🇿🇦',
    egypt: '🇪🇬',
    morocco: '🇲🇦',
    kenya: '🇰🇪',
    tanzania: '🇹🇿',
  };

  return flagMap[countryName.toLowerCase()] || '🌍';
};

// Obtener imagen representativa de un país desde Supabase Storage o fallback
export const getCountryImage = (countryCode: string): string | undefined => {
  if (!countryCode) return undefined;

  // Construir URL desde Supabase Storage
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;

  if (supabaseUrl) {
    // Intentar obtener imagen desde Supabase Storage primero
    const countryImagePath = `country-images/${countryCode.toUpperCase()}.jpg`;
    return `${supabaseUrl}/storage/v1/object/public/public/${countryImagePath}`;
  }

  // Fallback a Unsplash si no hay Supabase configurado
  const imageMap: { [key: string]: string } = {
    CL: 'https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?w=400', // Torres del Paine
    FR: 'https://images.unsplash.com/photo-1502602898536-47ad22581b52?w=400', // Torre Eiffel
    JP: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=400', // Monte Fuji
    ES: 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=400', // Sagrada Familia
    IT: 'https://images.unsplash.com/photo-1525874684015-58379d421a52?w=400', // Coliseo Romano
    US: 'https://images.unsplash.com/photo-1485738422979-f5c462d49f74?w=400', // Estatua de la Libertad
    BR: 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=400', // Cristo Redentor
    AR: 'https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?w=400', // Buenos Aires
    PE: 'https://images.unsplash.com/photo-1587595431973-160d0d94add1?w=400', // Machu Picchu
    MX: 'https://images.unsplash.com/photo-1518105779142-d975f22f1b0a?w=400', // Chichen Itza
    GB: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400', // Big Ben
    DE: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=400', // Brandenburg Gate
    CO: 'https://images.unsplash.com/photo-1605722243979-fe0be8158232?w=400', // Cartagena
    AU: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400', // Sydney Opera House
    TH: 'https://images.unsplash.com/photo-1551986782-d0169b3f8fa7?w=400', // Templos tailandeses
    CN: 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=400', // Gran Muralla China
  };

  return imageMap[countryCode.toUpperCase()];
};
