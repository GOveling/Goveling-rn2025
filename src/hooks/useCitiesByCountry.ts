import { useState, useCallback } from 'react';

import { apiService } from '../lib/apiService';
import { CityResult } from '../types/geo';

interface UseCitiesByCountryReturn {
  cities: CityResult[];
  allCities: CityResult[];
  loading: boolean;
  error: string | null;
  loadCitiesForCountry: (countryCode: string) => Promise<void>;
  clearResults: () => void;
  searchCities: (query: string) => void;
  hasApiData: boolean; // Indica si los datos vienen del API o del fallback
  supportsManualEntry: boolean; // Indica si se debe permitir entrada manual
}

/**
 * Hook para cargar y gestionar ciudades por país
 * Incluye funcionalidad de búsqueda local y manejo inteligente de fallbacks
 */
export const useCitiesByCountry = (): UseCitiesByCountryReturn => {
  const [allCities, setAllCities] = useState<CityResult[]>([]);
  const [cities, setCities] = useState<CityResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasApiData, setHasApiData] = useState(false);
  const [supportsManualEntry, setSupportsManualEntry] = useState(false);

  const loadCitiesForCountry = useCallback(async (countryCode: string) => {
    if (!countryCode || countryCode.trim() === '') {
      clearResults();
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setHasApiData(false);
      setSupportsManualEntry(false);

      console.log(`🏙️ Loading cities for country: ${countryCode}`);
      const citiesData = await apiService.getCitiesByCountry(countryCode);

      // Ordenar ciudades alfabéticamente con locale español
      const sortedCities = citiesData.sort((a, b) =>
        a.city.localeCompare(b.city, 'es', { sensitivity: 'base' })
      );

      setAllCities(sortedCities);
      setCities(sortedCities);
      setHasApiData(true);
      setSupportsManualEntry(false);
      console.log(
        `✅ Successfully loaded ${sortedCities.length} cities from API for ${countryCode}`
      );
    } catch (err) {
      // Ignorar AbortError - es esperado cuando se cancela una request anterior
      if (err instanceof Error && err.name === 'AbortError') {
        console.log(`🔄 City fetch aborted for ${countryCode} (normal behavior)`);
        return;
      }

      const errorMessage =
        err instanceof Error ? err.message : 'Error desconocido al cargar ciudades';
      console.error(`❌ Error loading cities for ${countryCode}:`, err);

      // Intentar fallback para países comunes
      const fallbackCities = getFallbackCities(countryCode);
      if (fallbackCities.length > 0) {
        console.log(`📋 Using fallback cities for ${countryCode}: ${fallbackCities.length} cities`);
        setAllCities(fallbackCities);
        setCities(fallbackCities);
        setHasApiData(false);
        setSupportsManualEntry(false);
        setError(null); // No mostrar error si tenemos fallback
      } else {
        console.log(`⚠️ No fallback cities available for ${countryCode}, enabling manual entry`);
        // Para países sin fallback, habilitar entrada manual
        setAllCities([]);
        setCities([]);
        setHasApiData(false);
        setSupportsManualEntry(true);
        setError(null); // No mostrar como error, es comportamiento esperado
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setAllCities([]);
    setCities([]);
    setError(null);
    setLoading(false);
    setHasApiData(false);
    setSupportsManualEntry(false);
  }, []);

  const searchCities = useCallback(
    (query: string) => {
      if (!query.trim() || query.length < 2) {
        setCities(allCities);
        return;
      }

      const normalizedQuery = query.toLowerCase().trim();
      const filteredCities = allCities.filter((city) =>
        city.city.toLowerCase().includes(normalizedQuery)
      );

      setCities(filteredCities);
      console.log(`🔍 Filtered cities: ${filteredCities.length} results for "${query}"`);
    },
    [allCities]
  );

  return {
    cities,
    allCities,
    loading,
    error,
    loadCitiesForCountry,
    clearResults,
    searchCities,
    hasApiData,
    supportsManualEntry,
  };
};

// Función para obtener ciudades fallback para países comunes
const getFallbackCities = (countryCode: string): CityResult[] => {
  const fallbacks: { [key: string]: CityResult[] } = {
    ES: [
      {
        city: 'Madrid',
        latitude: 40.4168,
        longitude: -3.7038,
        population: 3223334,
        country_code: 'ES',
      },
      {
        city: 'Barcelona',
        latitude: 41.3851,
        longitude: 2.1734,
        population: 1620343,
        country_code: 'ES',
      },
      {
        city: 'Valencia',
        latitude: 39.4699,
        longitude: -0.3763,
        population: 791413,
        country_code: 'ES',
      },
      {
        city: 'Sevilla',
        latitude: 37.3891,
        longitude: -5.9845,
        population: 688711,
        country_code: 'ES',
      },
      {
        city: 'Zaragoza',
        latitude: 41.6488,
        longitude: -0.8891,
        population: 674317,
        country_code: 'ES',
      },
      {
        city: 'Málaga',
        latitude: 36.7213,
        longitude: -4.4214,
        population: 574654,
        country_code: 'ES',
      },
      {
        city: 'Murcia',
        latitude: 37.9922,
        longitude: -1.1307,
        population: 447182,
        country_code: 'ES',
      },
      {
        city: 'Palma',
        latitude: 39.5696,
        longitude: 2.6502,
        population: 416065,
        country_code: 'ES',
      },
      {
        city: 'Las Palmas',
        latitude: 28.1248,
        longitude: -15.43,
        population: 378998,
        country_code: 'ES',
      },
      {
        city: 'Bilbao',
        latitude: 43.2627,
        longitude: -2.9253,
        population: 345821,
        country_code: 'ES',
      },
    ],
    MX: [
      {
        city: 'Ciudad de México',
        latitude: 19.4326,
        longitude: -99.1332,
        population: 9209944,
        country_code: 'MX',
      },
      {
        city: 'Guadalajara',
        latitude: 20.6597,
        longitude: -103.3496,
        population: 1385629,
        country_code: 'MX',
      },
      {
        city: 'Monterrey',
        latitude: 25.6866,
        longitude: -100.3161,
        population: 1135512,
        country_code: 'MX',
      },
      {
        city: 'Puebla',
        latitude: 19.0414,
        longitude: -98.2063,
        population: 1576259,
        country_code: 'MX',
      },
      {
        city: 'Tijuana',
        latitude: 32.5149,
        longitude: -117.0382,
        population: 1810645,
        country_code: 'MX',
      },
      {
        city: 'León',
        latitude: 21.1619,
        longitude: -101.6921,
        population: 1579803,
        country_code: 'MX',
      },
      {
        city: 'Juárez',
        latitude: 31.6904,
        longitude: -106.4245,
        population: 1391180,
        country_code: 'MX',
      },
      {
        city: 'Torreón',
        latitude: 25.5428,
        longitude: -103.4068,
        population: 720848,
        country_code: 'MX',
      },
      {
        city: 'Querétaro',
        latitude: 20.5888,
        longitude: -100.3899,
        population: 1049777,
        country_code: 'MX',
      },
      {
        city: 'Mérida',
        latitude: 20.9674,
        longitude: -89.5926,
        population: 1035238,
        country_code: 'MX',
      },
    ],
    US: [
      {
        city: 'New York',
        latitude: 40.7128,
        longitude: -74.006,
        population: 8398748,
        country_code: 'US',
      },
      {
        city: 'Los Angeles',
        latitude: 34.0522,
        longitude: -118.2437,
        population: 3990456,
        country_code: 'US',
      },
      {
        city: 'Chicago',
        latitude: 41.8781,
        longitude: -87.6298,
        population: 2705994,
        country_code: 'US',
      },
      {
        city: 'Houston',
        latitude: 29.7604,
        longitude: -95.3698,
        population: 2320268,
        country_code: 'US',
      },
      {
        city: 'Phoenix',
        latitude: 33.4484,
        longitude: -112.074,
        population: 1680992,
        country_code: 'US',
      },
      {
        city: 'Philadelphia',
        latitude: 39.9526,
        longitude: -75.1652,
        population: 1584138,
        country_code: 'US',
      },
      {
        city: 'San Antonio',
        latitude: 29.4241,
        longitude: -98.4936,
        population: 1547253,
        country_code: 'US',
      },
      {
        city: 'San Diego',
        latitude: 32.7157,
        longitude: -117.1611,
        population: 1423851,
        country_code: 'US',
      },
      {
        city: 'Dallas',
        latitude: 32.7767,
        longitude: -96.797,
        population: 1343573,
        country_code: 'US',
      },
      {
        city: 'San Jose',
        latitude: 37.3382,
        longitude: -121.8863,
        population: 1021795,
        country_code: 'US',
      },
    ],
    AR: [
      {
        city: 'Buenos Aires',
        latitude: -34.6118,
        longitude: -58.396,
        population: 2890151,
        country_code: 'AR',
      },
      {
        city: 'Córdoba',
        latitude: -31.4201,
        longitude: -64.1888,
        population: 1330023,
        country_code: 'AR',
      },
      {
        city: 'Rosario',
        latitude: -32.9442,
        longitude: -60.6505,
        population: 948312,
        country_code: 'AR',
      },
      {
        city: 'Mendoza',
        latitude: -32.8895,
        longitude: -68.8458,
        population: 115021,
        country_code: 'AR',
      },
      {
        city: 'San Miguel de Tucumán',
        latitude: -26.8241,
        longitude: -65.2226,
        population: 548866,
        country_code: 'AR',
      },
      {
        city: 'La Plata',
        latitude: -34.9215,
        longitude: -57.9545,
        population: 654324,
        country_code: 'AR',
      },
      {
        city: 'Mar del Plata',
        latitude: -38.0055,
        longitude: -57.5426,
        population: 614350,
        country_code: 'AR',
      },
      {
        city: 'Salta',
        latitude: -24.7821,
        longitude: -65.4232,
        population: 535303,
        country_code: 'AR',
      },
      {
        city: 'Santa Fe',
        latitude: -31.6333,
        longitude: -60.7,
        population: 391164,
        country_code: 'AR',
      },
      {
        city: 'San Juan',
        latitude: -31.5375,
        longitude: -68.5364,
        population: 447048,
        country_code: 'AR',
      },
    ],
    CO: [
      {
        city: 'Bogotá',
        latitude: 4.711,
        longitude: -74.0721,
        population: 7412566,
        country_code: 'CO',
      },
      {
        city: 'Medellín',
        latitude: 6.2442,
        longitude: -75.5812,
        population: 2508452,
        country_code: 'CO',
      },
      {
        city: 'Cali',
        latitude: 3.4516,
        longitude: -76.532,
        population: 2244536,
        country_code: 'CO',
      },
      {
        city: 'Barranquilla',
        latitude: 10.9639,
        longitude: -74.7964,
        population: 1274250,
        country_code: 'CO',
      },
      {
        city: 'Cartagena',
        latitude: 10.3932,
        longitude: -75.4832,
        population: 1028736,
        country_code: 'CO',
      },
      {
        city: 'Cúcuta',
        latitude: 7.8939,
        longitude: -72.5078,
        population: 650011,
        country_code: 'CO',
      },
      {
        city: 'Soledad',
        latitude: 10.9185,
        longitude: -74.7813,
        population: 645020,
        country_code: 'CO',
      },
      {
        city: 'Ibagué',
        latitude: 4.4389,
        longitude: -75.2322,
        population: 529635,
        country_code: 'CO',
      },
      {
        city: 'Bucaramanga',
        latitude: 7.1253,
        longitude: -73.1198,
        population: 581130,
        country_code: 'CO',
      },
      {
        city: 'Soacha',
        latitude: 4.5793,
        longitude: -74.2169,
        population: 522442,
        country_code: 'CO',
      },
    ],
    FR: [
      {
        city: 'Paris',
        latitude: 48.8566,
        longitude: 2.3522,
        population: 2161000,
        country_code: 'FR',
      },
      {
        city: 'Marseille',
        latitude: 43.2965,
        longitude: 5.3698,
        population: 861635,
        country_code: 'FR',
      },
      { city: 'Lyon', latitude: 45.764, longitude: 4.8357, population: 515695, country_code: 'FR' },
      {
        city: 'Toulouse',
        latitude: 43.6047,
        longitude: 1.4442,
        population: 471941,
        country_code: 'FR',
      },
      { city: 'Nice', latitude: 43.7102, longitude: 7.262, population: 342295, country_code: 'FR' },
      {
        city: 'Nantes',
        latitude: 47.2184,
        longitude: -1.5536,
        population: 309346,
        country_code: 'FR',
      },
      {
        city: 'Montpellier',
        latitude: 43.611,
        longitude: 3.8767,
        population: 285121,
        country_code: 'FR',
      },
      {
        city: 'Strasbourg',
        latitude: 48.5734,
        longitude: 7.7521,
        population: 280966,
        country_code: 'FR',
      },
      {
        city: 'Bordeaux',
        latitude: 44.8378,
        longitude: -0.5792,
        population: 254436,
        country_code: 'FR',
      },
      {
        city: 'Lille',
        latitude: 50.6292,
        longitude: 3.0573,
        population: 232741,
        country_code: 'FR',
      },
    ],
    IT: [
      {
        city: 'Rome',
        latitude: 41.9028,
        longitude: 12.4964,
        population: 2873494,
        country_code: 'IT',
      },
      {
        city: 'Milan',
        latitude: 45.4642,
        longitude: 9.19,
        population: 1396059,
        country_code: 'IT',
      },
      {
        city: 'Naples',
        latitude: 40.8518,
        longitude: 14.2681,
        population: 967069,
        country_code: 'IT',
      },
      {
        city: 'Turin',
        latitude: 45.0703,
        longitude: 7.6869,
        population: 870952,
        country_code: 'IT',
      },
      {
        city: 'Palermo',
        latitude: 38.1157,
        longitude: 13.3615,
        population: 673735,
        country_code: 'IT',
      },
      {
        city: 'Genoa',
        latitude: 44.4056,
        longitude: 8.9463,
        population: 583601,
        country_code: 'IT',
      },
      {
        city: 'Bologna',
        latitude: 44.4949,
        longitude: 11.3426,
        population: 388367,
        country_code: 'IT',
      },
      {
        city: 'Florence',
        latitude: 43.7696,
        longitude: 11.2558,
        population: 382258,
        country_code: 'IT',
      },
      {
        city: 'Bari',
        latitude: 41.1171,
        longitude: 16.8719,
        population: 320677,
        country_code: 'IT',
      },
      {
        city: 'Catania',
        latitude: 37.5079,
        longitude: 15.083,
        population: 311584,
        country_code: 'IT',
      },
    ],
    DE: [
      {
        city: 'Berlin',
        latitude: 52.52,
        longitude: 13.405,
        population: 3669491,
        country_code: 'DE',
      },
      {
        city: 'Hamburg',
        latitude: 53.5511,
        longitude: 9.9937,
        population: 1899160,
        country_code: 'DE',
      },
      {
        city: 'Munich',
        latitude: 48.1351,
        longitude: 11.582,
        population: 1471508,
        country_code: 'DE',
      },
      {
        city: 'Cologne',
        latitude: 50.9375,
        longitude: 6.9603,
        population: 1085664,
        country_code: 'DE',
      },
      {
        city: 'Frankfurt',
        latitude: 50.1109,
        longitude: 8.6821,
        population: 753056,
        country_code: 'DE',
      },
      {
        city: 'Stuttgart',
        latitude: 48.7758,
        longitude: 9.1829,
        population: 634830,
        country_code: 'DE',
      },
      {
        city: 'Düsseldorf',
        latitude: 51.2277,
        longitude: 6.7735,
        population: 619294,
        country_code: 'DE',
      },
      {
        city: 'Leipzig',
        latitude: 51.3397,
        longitude: 12.3731,
        population: 587857,
        country_code: 'DE',
      },
      {
        city: 'Dortmund',
        latitude: 51.5136,
        longitude: 7.4653,
        population: 588250,
        country_code: 'DE',
      },
      {
        city: 'Essen',
        latitude: 51.4556,
        longitude: 7.0116,
        population: 579432,
        country_code: 'DE',
      },
    ],
    BR: [
      {
        city: 'São Paulo',
        latitude: -23.5558,
        longitude: -46.6396,
        population: 12325232,
        country_code: 'BR',
      },
      {
        city: 'Rio de Janeiro',
        latitude: -22.9068,
        longitude: -43.1729,
        population: 6748000,
        country_code: 'BR',
      },
      {
        city: 'Brasília',
        latitude: -15.8267,
        longitude: -47.9218,
        population: 3055149,
        country_code: 'BR',
      },
      {
        city: 'Salvador',
        latitude: -12.9714,
        longitude: -38.5014,
        population: 2886698,
        country_code: 'BR',
      },
      {
        city: 'Fortaleza',
        latitude: -3.7319,
        longitude: -38.5267,
        population: 2686612,
        country_code: 'BR',
      },
      {
        city: 'Belo Horizonte',
        latitude: -19.9191,
        longitude: -43.9386,
        population: 2521564,
        country_code: 'BR',
      },
      {
        city: 'Manaus',
        latitude: -3.119,
        longitude: -60.0217,
        population: 2219580,
        country_code: 'BR',
      },
      {
        city: 'Curitiba',
        latitude: -25.4244,
        longitude: -49.2654,
        population: 1948626,
        country_code: 'BR',
      },
      {
        city: 'Recife',
        latitude: -8.0476,
        longitude: -34.9011,
        population: 1653461,
        country_code: 'BR',
      },
      {
        city: 'Goiânia',
        latitude: -16.6869,
        longitude: -49.2648,
        population: 1536097,
        country_code: 'BR',
      },
    ],
    GB: [
      {
        city: 'London',
        latitude: 51.5074,
        longitude: -0.1278,
        population: 9002488,
        country_code: 'GB',
      },
      {
        city: 'Birmingham',
        latitude: 52.4862,
        longitude: -1.8904,
        population: 1141816,
        country_code: 'GB',
      },
      {
        city: 'Glasgow',
        latitude: 55.8642,
        longitude: -4.2518,
        population: 635640,
        country_code: 'GB',
      },
      {
        city: 'Liverpool',
        latitude: 53.4084,
        longitude: -2.9916,
        population: 552858,
        country_code: 'GB',
      },
      {
        city: 'Bristol',
        latitude: 51.4545,
        longitude: -2.5879,
        population: 463400,
        country_code: 'GB',
      },
      {
        city: 'Manchester',
        latitude: 53.4808,
        longitude: -2.2426,
        population: 547899,
        country_code: 'GB',
      },
      {
        city: 'Sheffield',
        latitude: 53.3811,
        longitude: -1.4701,
        population: 685368,
        country_code: 'GB',
      },
      {
        city: 'Leeds',
        latitude: 53.8008,
        longitude: -1.5491,
        population: 789194,
        country_code: 'GB',
      },
      {
        city: 'Edinburgh',
        latitude: 55.9533,
        longitude: -3.1883,
        population: 548227,
        country_code: 'GB',
      },
      {
        city: 'Leicester',
        latitude: 52.6369,
        longitude: -1.1398,
        population: 355218,
        country_code: 'GB',
      },
    ],
  };

  return fallbacks[countryCode] || [];
};
