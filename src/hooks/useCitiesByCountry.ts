import { useState, useCallback } from 'react';
import { CityResult } from '../types/geo';
import { apiService } from '../lib/apiService';

interface UseCitiesByCountryReturn {
  cities: CityResult[];
  allCities: CityResult[];
  loading: boolean;
  error: string | null;
  loadCitiesForCountry: (countryCode: string) => Promise<void>;
  clearResults: () => void;
  searchCities: (query: string) => void;
}

/**
 * Hook para cargar y gestionar ciudades por país
 * Incluye funcionalidad de búsqueda local
 */
export const useCitiesByCountry = (): UseCitiesByCountryReturn => {
  const [allCities, setAllCities] = useState<CityResult[]>([]);
  const [cities, setCities] = useState<CityResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCitiesForCountry = useCallback(async (countryCode: string) => {
    if (!countryCode || countryCode.trim() === '') {
      clearResults();
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const citiesData = await apiService.getCitiesByCountry(countryCode);
      
      // Ordenar ciudades alfabéticamente
      const sortedCities = citiesData.sort((a, b) => a.city.localeCompare(b.city));
      
      setAllCities(sortedCities);
      setCities(sortedCities);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido al cargar ciudades';
      setError(errorMessage);
      console.error('Error loading cities:', err);
      
      // Limpiar resultados en caso de error
      setAllCities([]);
      setCities([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setAllCities([]);
    setCities([]);
    setError(null);
    setLoading(false);
  }, []);

  const searchCities = useCallback((query: string) => {
    if (!query.trim()) {
      setCities(allCities);
      return;
    }

    const normalizedQuery = query.toLowerCase().trim();
    const filteredCities = allCities.filter(city =>
      city.city.toLowerCase().includes(normalizedQuery)
    );

    setCities(filteredCities);
  }, [allCities]);

  return {
    cities,
    allCities,
    loading,
    error,
    loadCitiesForCountry,
    clearResults,
    searchCities
  };
};
