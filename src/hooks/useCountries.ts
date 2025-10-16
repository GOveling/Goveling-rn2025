import { useState, useEffect } from 'react';

import { apiService } from '../lib/apiService';
import { Country } from '../types/geo';

interface UseCountriesReturn {
  countries: Country[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook para cargar y gestionar la lista de países
 * Se ejecuta automáticamente al montar el componente
 */
export const useCountries = (): UseCountriesReturn => {
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCountries = async () => {
    try {
      setLoading(true);
      setError(null);

      const countriesData = await apiService.getCountries();
      setCountries(countriesData);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Error desconocido al cargar países';
      setError(errorMessage);
      console.error('Error loading countries:', err);
    } finally {
      setLoading(false);
    }
  };

  // Cargar países automáticamente al montar el hook
  useEffect(() => {
    loadCountries();
  }, []);

  return {
    countries,
    loading,
    error,
    refresh: loadCountries,
  };
};
