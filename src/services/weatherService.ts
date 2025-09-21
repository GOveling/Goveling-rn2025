import { getWeather } from '../lib/weather';

export interface WeatherLocation {
  city: string;
  country: string;
  region: string;
}

export interface WeatherData {
  temperature: number | null;
  code: number | null;
  location: WeatherLocation | null;
}

/**
 * Weather Service - Handles weather and location data
 * This service integrates with the Supabase Weather API Edge Function
 * to provide both weather data and location information
 */
export class WeatherService {
  
  /**
   * Get weather data with location information
   * @param lat - Latitude
   * @param lng - Longitude  
   * @param units - Temperature units ('c' for Celsius, 'f' for Fahrenheit)
   * @returns Promise<WeatherData>
   */
  static async getWeatherWithLocation(lat: number, lng: number, units: 'c' | 'f'): Promise<WeatherData> {
    try {
      console.log('🌤️ WeatherService: Getting weather for', lat, lng, units);
      
      const weatherResponse = await getWeather(lat, lng, units);
      
      // Map the API response to our internal structure
      const mappedData: WeatherData = {
        temperature: weatherResponse.temp,
        code: weatherResponse.code,
        location: weatherResponse.location ? {
          city: weatherResponse.location.city,  // ← Mapeo: API name → city (línea 44)
          country: weatherResponse.location.country,
          region: weatherResponse.location.region,
        } : null
      };
      
      console.log('🌤️ WeatherService: Mapped data', mappedData);
      return mappedData;
      
    } catch (error) {
      console.error('🌤️ WeatherService error:', error);
      throw error;
    }
  }
  
  /**
   * Get only location information from coordinates
   * @param lat - Latitude
   * @param lng - Longitude
   * @returns Promise<WeatherLocation | null>
   */
  static async getLocationFromCoordinates(lat: number, lng: number): Promise<WeatherLocation | null> {
    try {
      const weatherData = await this.getWeatherWithLocation(lat, lng, 'c');
      return weatherData.location;
    } catch (error) {
      console.error('🌍 Location service error:', error);
      return null;
    }
  }
}

export default WeatherService;
