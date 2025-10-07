import { supabase } from './supabase';

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
  }>;
  firstPlaceImage?: string;
}

export const getTripStats = async (tripId: string): Promise<TripStats> => {
  try {
    // Obtener colaboradores con información de perfil
    const { data: collaborators } = await supabase
      .from('trip_collaborators')
      .select(`
        *,
        profiles:user_id (
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('trip_id', tripId);

    // Obtener lugares del trip con códigos de país
    const { data: places } = await supabase
      .from('trip_places')
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: true });

    // Extraer países únicos basado en country_code de los lugares
    const countryCodes = Array.from(
      new Set(
        places?.map(place => place.country_code).filter(Boolean) || []
      )
    ) as string[];

    const countries = countryCodes.map(code => getCountryName(code)).filter(Boolean) as string[];

    // Extraer categorías únicas
    const categories = Array.from(
      new Set(
        places?.map(place => place.category).filter(Boolean) || []
      )
    ) as string[];

    // Formatear colaboradores
    const formattedCollaborators = collaborators?.map(collab => ({
      id: collab.user_id,
      full_name: (collab.profiles as any)?.full_name,
      avatar_url: (collab.profiles as any)?.avatar_url,
    })) || [];

    // Obtener imagen del primer lugar (si existe)
    let firstPlaceImage: string | undefined;
    if (places && places.length > 0 && places[0].country_code) {
      firstPlaceImage = getCountryImage(places[0].country_code);
    }

    return {
      collaboratorsCount: (collaborators?.length || 0) + 1, // +1 for owner
      placesCount: places?.length || 0,
      countries: countries.length > 0 ? countries : [],
      countryCodes: countryCodes.length > 0 ? countryCodes : [],
      categories,
      collaborators: formattedCollaborators,
      firstPlaceImage
    };
  } catch (error) {
    console.error('Error getting trip stats:', error);
    return {
      collaboratorsCount: 1,
      placesCount: 0,
      countries: [],
      countryCodes: [],
      categories: [],
      collaborators: [],
      firstPlaceImage: undefined
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

// Obtener imagen representativa de un país
export const getCountryImage = (countryCode: string): string | undefined => {
  const imageMap: { [key: string]: string } = {
    'CL': 'https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=400', // Torres del Paine
    'FR': 'https://images.unsplash.com/photo-1549144511-f099e773c147?w=400', // Torre Eiffel
    'JP': 'https://images.unsplash.com/photo-1480796927426-f609979314bd?w=400', // Monte Fuji
    'ES': 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=400', // Sagrada Familia
    'IT': 'https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b?w=400', // Coliseo
    'US': 'https://images.unsplash.com/photo-1485738422979-f5c462d49f74?w=400', // Estatua de la Libertad
    'BR': 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=400', // Cristo Redentor
    'AR': 'https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?w=400', // Buenos Aires
    'PE': 'https://images.unsplash.com/photo-1587595431973-160d0d94add1?w=400', // Machu Picchu
    'MX': 'https://images.unsplash.com/photo-1518105779142-d975f22f1b0a?w=400', // Chichen Itza
    'GB': 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400', // Big Ben
    'DE': 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=400', // Brandenburg Gate
    'AU': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400', // Sydney Opera House
    'TH': 'https://images.unsplash.com/photo-1551986782-d0169b3f8fa7?w=400', // Templos tailandeses
    'CN': 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=400', // Gran Muralla China
  };
  
  return imageMap[countryCode.toUpperCase()];
};
