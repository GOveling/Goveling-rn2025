/**
 * Nominatim Service (OpenStreetMap)
 * Servicio GRATUITO de reverse geocoding
 * Usado como primera capa para obtener nombres de lugares
 */

export interface NominatimResult {
  name: string;
  displayName: string;
  latitude: number;
  longitude: number;
  type?: string;
  address?: {
    road?: string;
    city?: string;
    state?: string;
    country?: string;
    tourism?: string;
    amenity?: string;
    building?: string;
  };
}

class NominatimService {
  private static readonly BASE_URL = 'https://nominatim.openstreetmap.org';
  private static readonly USER_AGENT = 'Goveling/1.0 (Travel App)';
  private static lastRequestTime = 0;
  private static readonly MIN_REQUEST_INTERVAL = 1000; // 1 segundo entre requests (política de Nominatim)

  /**
   * Esperar el tiempo mínimo requerido entre requests
   */
  private static async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
      const waitTime = this.MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      console.log(`⏳ Nominatim rate limit: waiting ${waitTime}ms`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Reverse geocoding: convertir coordenadas en nombre de lugar
   */
  static async reverseGeocode(
    latitude: number,
    longitude: number
  ): Promise<NominatimResult | null> {
    try {
      console.log(`🗺️ Nominatim reverse geocoding: ${latitude}, ${longitude}`);

      // Respetar rate limit
      await this.waitForRateLimit();

      const url =
        `${this.BASE_URL}/reverse?` +
        `format=json` +
        `&lat=${latitude}` +
        `&lon=${longitude}` +
        `&zoom=18` + // Nivel de detalle máximo
        `&addressdetails=1` +
        `&accept-language=es`; // Preferir español

      const response = await fetch(url, {
        headers: {
          'User-Agent': this.USER_AGENT,
        },
      });

      if (!response.ok) {
        console.error(`❌ Nominatim HTTP error: ${response.status}`);
        return null;
      }

      const data = await response.json();

      if (!data || data.error) {
        console.error('❌ Nominatim error response:', data?.error);
        return null;
      }

      // Extraer el nombre más relevante del lugar
      const name = this.extractBestPlaceName(data);

      const result: NominatimResult = {
        name,
        displayName: data.display_name || '',
        latitude: parseFloat(data.lat),
        longitude: parseFloat(data.lon),
        type: data.type,
        address: {
          road: data.address?.road,
          city: data.address?.city || data.address?.town || data.address?.village,
          state: data.address?.state,
          country: data.address?.country,
          tourism: data.address?.tourism,
          amenity: data.address?.amenity,
          building: data.address?.building,
        },
      };

      console.log(`✅ Nominatim found: "${result.name}"`);
      return result;
    } catch (error) {
      console.error('❌ Nominatim reverse geocode error:', error);
      return null;
    }
  }

  /**
   * Extraer el nombre más significativo del resultado de Nominatim
   * Prioriza: turismo > amenidades > edificios > calles > ciudad
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static extractBestPlaceName(data: any): string {
    // 1. Si tiene nombre propio, usarlo
    if (data.name && data.name !== data.address?.road) {
      return data.name;
    }

    const addr = data.address || {};

    // 2. Lugares turísticos o puntos de interés
    if (addr.tourism) {
      return addr.tourism;
    }

    if (addr.attraction) {
      return addr.attraction;
    }

    // 3. Amenidades (restaurantes, hoteles, etc.)
    if (addr.amenity) {
      return addr.amenity;
    }

    // 4. Edificios con nombre
    if (addr.building && typeof addr.building === 'string' && addr.building !== 'yes') {
      return addr.building;
    }

    // 5. Calle + número
    if (addr.road) {
      const houseNumber = addr.house_number ? `${addr.house_number} ` : '';
      return `${houseNumber}${addr.road}`;
    }

    // 6. Vecindario o suburbio
    if (addr.neighbourhood || addr.suburb) {
      return addr.neighbourhood || addr.suburb;
    }

    // 7. Ciudad
    if (addr.city || addr.town || addr.village) {
      return addr.city || addr.town || addr.village;
    }

    // 8. Estado/Región
    if (addr.state) {
      return addr.state;
    }

    // 9. País (último recurso)
    if (addr.country) {
      return addr.country;
    }

    // 10. Fallback
    return 'Ubicación sin nombre';
  }

  /**
   * Buscar lugares por nombre (search)
   * Útil para autocompletado
   */
  static async search(
    query: string,
    options?: {
      limit?: number;
      countrycodes?: string; // ISO 3166-1alpha2 codes (ej: "us,mx,es")
      bounded?: boolean;
      viewbox?: string; // "x1,y1,x2,y2"
    }
  ): Promise<NominatimResult[]> {
    try {
      console.log(`🔍 Nominatim search: "${query}"`);

      await this.waitForRateLimit();

      const params = new URLSearchParams({
        format: 'json',
        q: query,
        addressdetails: '1',
        'accept-language': 'es',
        limit: (options?.limit || 5).toString(),
      });

      if (options?.countrycodes) {
        params.append('countrycodes', options.countrycodes);
      }

      if (options?.bounded) {
        params.append('bounded', '1');
      }

      if (options?.viewbox) {
        params.append('viewbox', options.viewbox);
      }

      const url = `${this.BASE_URL}/search?${params.toString()}`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': this.USER_AGENT,
        },
      });

      if (!response.ok) {
        console.error(`❌ Nominatim search HTTP error: ${response.status}`);
        return [];
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        return [];
      }

      const results: NominatimResult[] = data.map((item) => ({
        name: this.extractBestPlaceName(item),
        displayName: item.display_name || '',
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
        type: item.type,
        address: {
          road: item.address?.road,
          city: item.address?.city || item.address?.town || item.address?.village,
          state: item.address?.state,
          country: item.address?.country,
          tourism: item.address?.tourism,
          amenity: item.address?.amenity,
          building: item.address?.building,
        },
      }));

      console.log(`✅ Nominatim search found ${results.length} results`);
      return results;
    } catch (error) {
      console.error('❌ Nominatim search error:', error);
      return [];
    }
  }
}

export default NominatimService;
