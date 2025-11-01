/**
 * CityEnrichmentService - Enriquece información de ciudades usando Google Places API
 * Obtiene metadata rica: descripción, población, zona horaria, puntos de interés
 */

import { supabase } from '~/lib/supabase';

import { CityInfo } from './CityDetectionService';

interface GooglePlaceCityDetails {
  description?: string;
  population?: string;
  timezone?: string;
  formattedAddress?: string;
  types?: string[];
  photos?: string[]; // Array of photo URLs from Wikipedia
  rating?: number;
  userRatingsTotal?: number;
}

// Currency mapping by country code
const CURRENCY_MAP: Record<string, { code: string; symbol: string; name: string }> = {
  CL: { code: 'CLP', symbol: '$', name: 'Peso Chileno' },
  US: { code: 'USD', symbol: '$', name: 'US Dollar' },
  AR: { code: 'ARS', symbol: '$', name: 'Peso Argentino' },
  BR: { code: 'BRL', symbol: 'R$', name: 'Real Brasileño' },
  PE: { code: 'PEN', symbol: 'S/', name: 'Sol Peruano' },
  CO: { code: 'COP', symbol: '$', name: 'Peso Colombiano' },
  MX: { code: 'MXN', symbol: '$', name: 'Peso Mexicano' },
  ES: { code: 'EUR', symbol: '€', name: 'Euro' },
  FR: { code: 'EUR', symbol: '€', name: 'Euro' },
  DE: { code: 'EUR', symbol: '€', name: 'Euro' },
  IT: { code: 'EUR', symbol: '€', name: 'Euro' },
  GB: { code: 'GBP', symbol: '£', name: 'Libra Esterlina' },
  JP: { code: 'JPY', symbol: '¥', name: 'Yen Japonés' },
  CN: { code: 'CNY', symbol: '¥', name: 'Yuan Chino' },
  IN: { code: 'INR', symbol: '₹', name: 'Rupia India' },
  AU: { code: 'AUD', symbol: '$', name: 'Dólar Australiano' },
  CA: { code: 'CAD', symbol: '$', name: 'Dólar Canadiense' },
  NZ: { code: 'NZD', symbol: '$', name: 'Dólar Neozelandés' },
  ZA: { code: 'ZAR', symbol: 'R', name: 'Rand Sudafricano' },
  CH: { code: 'CHF', symbol: 'Fr', name: 'Franco Suizo' },
  SE: { code: 'SEK', symbol: 'kr', name: 'Corona Sueca' },
  NO: { code: 'NOK', symbol: 'kr', name: 'Corona Noruega' },
  DK: { code: 'DKK', symbol: 'kr', name: 'Corona Danesa' },
  TH: { code: 'THB', symbol: '฿', name: 'Baht Tailandés' },
  SG: { code: 'SGD', symbol: '$', name: 'Dólar de Singapur' },
  HK: { code: 'HKD', symbol: '$', name: 'Dólar de Hong Kong' },
  KR: { code: 'KRW', symbol: '₩', name: 'Won Surcoreano' },
  RU: { code: 'RUB', symbol: '₽', name: 'Rublo Ruso' },
  TR: { code: 'TRY', symbol: '₺', name: 'Lira Turca' },
  AE: { code: 'AED', symbol: 'د.إ', name: 'Dírham de EAU' },
  SA: { code: 'SAR', symbol: '﷼', name: 'Riyal Saudí' },
  EG: { code: 'EGP', symbol: '£', name: 'Libra Egipcia' },
  IL: { code: 'ILS', symbol: '₪', name: 'Nuevo Shekel' },
  PL: { code: 'PLN', symbol: 'zł', name: 'Zloty Polaco' },
  CZ: { code: 'CZK', symbol: 'Kč', name: 'Corona Checa' },
  HU: { code: 'HUF', symbol: 'Ft', name: 'Forinto Húngaro' },
  MY: { code: 'MYR', symbol: 'RM', name: 'Ringgit Malayo' },
  ID: { code: 'IDR', symbol: 'Rp', name: 'Rupia Indonesia' },
  PH: { code: 'PHP', symbol: '₱', name: 'Peso Filipino' },
  VN: { code: 'VND', symbol: '₫', name: 'Dong Vietnamita' },
};

/**
 * City Enrichment Service
 * Enriquece información básica de ciudades con datos de Google Places API
 */
class CityEnrichmentService {
  private cache: Map<string, GooglePlaceCityDetails> = new Map();
  private pendingRequests: Map<string, Promise<GooglePlaceCityDetails | null>> = new Map();

  /**
   * Get cache key for a city
   */
  private getCacheKey(cityName: string, countryCode: string): string {
    return `${cityName.toLowerCase()}_${countryCode.toUpperCase()}`;
  }

  /**
   * Enrich city info with Google Places API data
   * Returns enriched CityInfo with additional metadata
   */
  async enrichCityInfo(cityInfo: CityInfo): Promise<CityInfo> {
    const cacheKey = this.getCacheKey(cityInfo.cityName, cityInfo.countryCode);

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      console.log(`✅ Using cached enrichment for ${cityInfo.cityName}`);
      return this.mergeCityData(cityInfo, cached);
    }

    // Check if request is already pending
    const pending = this.pendingRequests.get(cacheKey);
    if (pending) {
      console.log(`⏳ Waiting for pending enrichment request for ${cityInfo.cityName}`);
      const details = await pending;
      return this.mergeCityData(cityInfo, details);
    }

    // Make new request
    console.log(`🔍 Enriching city info for ${cityInfo.cityName} via Google Places API...`);
    const requestPromise = this.fetchCityDetails(cityInfo);
    this.pendingRequests.set(cacheKey, requestPromise);

    try {
      const details = await requestPromise;
      if (details) {
        this.cache.set(cacheKey, details);
      }
      return this.mergeCityData(cityInfo, details);
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  /**
   * Fetch city details from Google Places API via Supabase Edge Function
   */
  private async fetchCityDetails(cityInfo: CityInfo): Promise<GooglePlaceCityDetails | null> {
    try {
      // Build search query (city + country for better results)
      const searchQuery = `${cityInfo.cityName}, ${cityInfo.countryName}`;

      console.log(`📡 Calling google-places-city-details for: "${searchQuery}"`);

      // Call Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('google-places-city-details', {
        body: {
          cityName: cityInfo.cityName,
          stateName: cityInfo.stateName,
          countryName: cityInfo.countryName,
          countryCode: cityInfo.countryCode,
        },
      });

      if (error) {
        console.error('❌ Error calling google-places-city-details:', error);
        return null;
      }

      if (!data || data.status !== 'OK') {
        console.warn('⚠️ google-places-city-details did not return OK status:', data);
        return null;
      }

      console.log(`✅ Received city details for ${cityInfo.cityName}:`, data.details);

      // DEBUG: Check photos specifically
      if (data.details) {
        console.log('🖼️ Photos from Edge Function:', {
          hasPhotos: !!data.details.photos,
          photosCount: data.details.photos?.length || 0,
          photosUrls: data.details.photos,
        });
      }

      return data.details || null;
    } catch (error) {
      console.error('❌ Exception fetching city details:', error);
      return null;
    }
  }

  /**
   * Extract population from Wikipedia description if available
   * Prioritizes description data over Google Places API data
   */
  private extractPopulationFromDescription(description?: string): string | null {
    if (!description) return null;

    // Match patterns like "401.096 habitantes" or "1.5 millones de habitantes"
    const patterns = [
      /(\d{1,3}(?:\.\d{3})+)\s+habitantes/i, // 401.096 habitantes
      /(\d+(?:\.\d+)?)\s+millones?\s+(?:de\s+)?habitantes/i, // 1.5 millones habitantes
      /población\s+de\s+(\d{1,3}(?:\.\d{3})+)/i, // población de 401.096
      /(\d{1,3}(?:,\d{3})+)\s+habitantes/i, // 401,096 habitantes (comma format)
    ];

    for (const pattern of patterns) {
      const match = description.match(pattern);
      if (match) {
        const value = match[1];
        // If it's in millions format, keep as is
        if (description.match(/millones?/i)) {
          return value + ' millones';
        }
        // Otherwise return the number (it's already formatted with dots/commas)
        return value;
      }
    }

    return null;
  }

  /**
   * Get currency info for a country code
   */
  private getCurrencyInfo(countryCode: string): { code: string; symbol: string } | null {
    const currency = CURRENCY_MAP[countryCode.toUpperCase()];
    if (currency) {
      return { code: currency.code, symbol: currency.symbol };
    }
    return null;
  }

  /**
   * Merge basic city info with enriched details
   * Prioritizes Wikipedia description data over Google Places API
   */
  private mergeCityData(basicInfo: CityInfo, details: GooglePlaceCityDetails | null): CityInfo {
    if (!details) {
      // Even without API details, add currency info
      const currencyInfo = this.getCurrencyInfo(basicInfo.countryCode);
      return {
        ...basicInfo,
        currency: currencyInfo?.code,
        currencySymbol: currencyInfo?.symbol,
      };
    }

    // Try to extract population from description first (more accurate)
    const descriptionPopulation = this.extractPopulationFromDescription(details.description);

    // Get currency info
    const currencyInfo = this.getCurrencyInfo(basicInfo.countryCode);

    return {
      ...basicInfo,
      description: details.description || basicInfo.description,
      population: descriptionPopulation || details.population || basicInfo.population,
      timezone: details.timezone || basicInfo.timezone,
      rating: details.rating,
      currency: currencyInfo?.code,
      currencySymbol: currencyInfo?.symbol,
      photos: details.photos || [],
    };
  }

  /**
   * Clear cache (useful for testing or memory management)
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🗑️ City enrichment cache cleared');
  }
}

// Export singleton instance
export const cityEnrichmentService = new CityEnrichmentService();
