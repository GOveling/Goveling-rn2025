import { supabase } from './supabase';

export interface TripStats {
  collaboratorsCount: number;
  placesCount: number;
  countries: string[];
  categories: string[];
}

export const getTripStats = async (tripId: string): Promise<TripStats> => {
  try {
    // Obtener colaboradores
    const { data: collaborators } = await supabase
      .from('trip_collaborators')
      .select('*')
      .eq('trip_id', tripId);

    // Obtener lugares del trip
    const { data: places } = await supabase
      .from('trip_places')
      .select('*')
      .eq('trip_id', tripId);

    // Extraer países únicos basado en country_code de los lugares
    const countries = Array.from(
      new Set(
        places?.map(place => getCountryName(place.country_code)).filter(Boolean) || []
      )
    ) as string[];

    // Extraer categorías únicas
    const categories = Array.from(
      new Set(
        places?.map(place => place.category).filter(Boolean) || []
      )
    ) as string[];

    return {
      collaboratorsCount: (collaborators?.length || 0) + 1, // +1 for owner
      placesCount: places?.length || 0,
      countries: countries.length > 0 ? countries : ['Chile'], // Default to Chile
      categories
    };
  } catch (error) {
    console.error('Error getting trip stats:', error);
    return {
      collaboratorsCount: 1,
      placesCount: 0,
      countries: ['Chile'],
      categories: []
    };
  }
};

// Mapeo de códigos de país a nombres
const getCountryName = (countryCode?: string): string | null => {
  if (!countryCode) return null;
  
  const countryMap: { [key: string]: string } = {
    'CL': 'Chile',
    'FR': 'France',
    'JP': 'Japan',
    'ES': 'Spain',
    'IT': 'Italy',
    'US': 'USA',
    'BR': 'Brazil',
    'AR': 'Argentina',
    'PE': 'Peru',
    'CO': 'Colombia',
    'MX': 'Mexico',
    'CA': 'Canada',
    'GB': 'Reino Unido',
    'DE': 'Germany',
    'NL': 'Netherlands',
    'BE': 'Belgium',
    'CH': 'Switzerland',
    'AT': 'Austria',
    'PT': 'Portugal',
    'GR': 'Greece',
    'TR': 'Turkey',
    'RU': 'Russia',
    'CN': 'China',
    'IN': 'India',
    'TH': 'Thailand',
    'VN': 'Vietnam',
    'KR': 'South Korea',
    'AU': 'Australia',
    'NZ': 'New Zealand',
    'ZA': 'South Africa',
    'EG': 'Egypt',
    'MA': 'Morocco',
    'KE': 'Kenya',
    'TZ': 'Tanzania',
  };
  
  return countryMap[countryCode.toUpperCase()] || null;
};

// Obtener emoji de bandera basado en código de país
export const getCountryFlag = (countryCode?: string): string => {
  if (!countryCode) return '🌍';
  
  const flagMap: { [key: string]: string } = {
    'CL': '🇨🇱',
    'FR': '🇫🇷',
    'JP': '🇯🇵',
    'ES': '🇪🇸',
    'IT': '🇮🇹',
    'US': '🇺🇸',
    'BR': '🇧🇷',
    'AR': '🇦🇷',
    'PE': '🇵🇪',
    'CO': '🇨🇴',
    'MX': '🇲🇽',
    'CA': '🇨🇦',
    'GB': '🇬🇧',
    'DE': '🇩🇪',
    'NL': '🇳🇱',
    'BE': '🇧🇪',
    'CH': '🇨🇭',
    'AT': '🇦🇹',
    'PT': '🇵🇹',
    'GR': '🇬🇷',
    'TR': '🇹🇷',
    'RU': '🇷🇺',
    'CN': '🇨🇳',
    'IN': '🇮🇳',
    'TH': '🇹🇭',
    'VN': '🇻🇳',
    'KR': '🇰🇷',
    'AU': '🇦🇺',
    'NZ': '🇳🇿',
    'ZA': '🇿🇦',
    'EG': '🇪🇬',
    'MA': '🇲🇦',
    'KE': '🇰🇪',
    'TZ': '🇹🇿',
  };
  
  return flagMap[countryCode.toUpperCase()] || '🌍';
};

// Obtener emoji de bandera basado en nombre de país
export const getCountryFlagByName = (countryName: string): string => {
  const flagMap: { [key: string]: string } = {
    'chile': '🇨🇱',
    'france': '🇫🇷',
    'japan': '🇯🇵',
    'spain': '🇪🇸',
    'italy': '🇮🇹',
    'usa': '🇺🇸',
    'brazil': '🇧🇷',
    'argentina': '🇦🇷',
    'peru': '🇵🇪',
    'colombia': '🇨🇴',
    'mexico': '🇲🇽',
    'canada': '🇨🇦',
    'reino unido': '🇬🇧',
    'germany': '🇩🇪',
    'netherlands': '🇳🇱',
    'belgium': '🇧🇪',
    'switzerland': '🇨🇭',
    'austria': '🇦🇹',
    'portugal': '🇵🇹',
    'greece': '🇬🇷',
    'turkey': '🇹🇷',
    'russia': '🇷🇺',
    'china': '🇨🇳',
    'india': '🇮🇳',
    'thailand': '🇹🇭',
    'vietnam': '🇻🇳',
    'south korea': '🇰🇷',
    'australia': '🇦🇺',
    'new zealand': '🇳🇿',
    'south africa': '🇿🇦',
    'egypt': '🇪🇬',
    'morocco': '🇲🇦',
    'kenya': '🇰🇪',
    'tanzania': '🇹🇿',
  };
  
  return flagMap[countryName.toLowerCase()] || '🌍';
};
