/**
 * Unit Conversion Utilities
 * Provides hooks for converting distances, temperatures, and speeds
 * based on user's unit preference (metric/imperial)
 */

import { useAppSettings } from '~/contexts/AppSettingsContext';

/**
 * Hook for distance conversion (km ↔ miles)
 */
export function useDistanceUnit() {
  const { settings } = useAppSettings();
  const isMetric = settings.units === 'metric';

  const convert = (km: number) => {
    if (isMetric) {
      return { value: km, unit: 'km' };
    }
    return { value: km * 0.621371, unit: 'mi' };
  };

  const convertMeters = (meters: number) => {
    if (isMetric) {
      if (meters >= 1000) {
        return { value: meters / 1000, unit: 'km' };
      }
      return { value: meters, unit: 'm' };
    } else {
      const miles = (meters / 1000) * 0.621371;
      if (miles >= 0.1) {
        return { value: miles, unit: 'mi' };
      }
      // For distances < 0.1 miles, show in feet
      return { value: meters * 3.28084, unit: 'ft' };
    }
  };

  return {
    /**
     * Convert kilometers to the user's preferred unit
     * @param km Distance in kilometers
     * @returns Object with value and unit
     */
    convert,

    /**
     * Format kilometers as a string in the user's preferred unit
     * @param km Distance in kilometers
     * @param decimals Number of decimal places (default: 1)
     * @returns Formatted string like "5.0 km" or "3.1 mi"
     */
    format: (km: number, decimals: number = 1) => {
      const { value, unit } = convert(km);
      return `${value.toFixed(decimals)} ${unit}`;
    },

    /**
     * Convert meters to the user's preferred unit
     * @param meters Distance in meters
     * @returns Object with value and unit
     */
    convertMeters,

    /**
     * Format meters as a string in the user's preferred unit
     * @param meters Distance in meters
     * @returns Formatted string like "1.5 km", "900 m", "2.3 mi", or "150 ft"
     */
    formatMeters: (meters: number) => {
      const { value, unit } = convertMeters(meters);

      if (unit === 'm' || unit === 'ft') {
        return `${Math.round(value)} ${unit}`;
      }
      return `${value.toFixed(1)} ${unit}`;
    },

    /**
     * Get the unit symbol for the user's preference
     */
    getUnit: () => (isMetric ? 'km' : 'mi'),

    /**
     * Check if user prefers metric system
     */
    isMetric,
  };
}

/**
 * Hook for temperature conversion (°C ↔ °F)
 */
export function useTemperatureUnit() {
  const { settings } = useAppSettings();
  const isMetric = settings.units === 'metric';

  const convert = (celsius: number) => {
    if (isMetric) {
      return { value: celsius, unit: '°C' };
    }
    return { value: (celsius * 9) / 5 + 32, unit: '°F' };
  };

  return {
    /**
     * Convert Celsius to the user's preferred unit
     * @param celsius Temperature in Celsius
     * @returns Object with value and unit
     */
    convert,

    /**
     * Format Celsius as a string in the user's preferred unit
     * @param celsius Temperature in Celsius
     * @param decimals Number of decimal places (default: 1)
     * @returns Formatted string like "25.0°C" or "77.0°F"
     */
    format: (celsius: number, decimals: number = 1) => {
      const { value, unit } = convert(celsius);
      return `${value.toFixed(decimals)}${unit}`;
    },

    /**
     * Get the unit symbol for the user's preference
     */
    getUnit: () => (isMetric ? '°C' : '°F'),

    /**
     * Check if user prefers metric system
     */
    isMetric,
  };
}

/**
 * Hook for speed conversion (km/h ↔ mph)
 */
export function useSpeedUnit() {
  const { settings } = useAppSettings();
  const isMetric = settings.units === 'metric';

  const convert = (kmh: number) => {
    if (isMetric) {
      return { value: kmh, unit: 'km/h' };
    }
    return { value: kmh * 0.621371, unit: 'mph' };
  };

  return {
    /**
     * Convert km/h to the user's preferred unit
     * @param kmh Speed in km/h
     * @returns Object with value and unit
     */
    convert,

    /**
     * Format speed as a string in the user's preferred unit
     * @param kmh Speed in km/h
     * @param decimals Number of decimal places (default: 1)
     * @returns Formatted string like "50.0 km/h" or "31.1 mph"
     */
    format: (kmh: number, decimals: number = 1) => {
      const { value, unit } = convert(kmh);
      return `${value.toFixed(decimals)} ${unit}`;
    },

    /**
     * Get the unit symbol for the user's preference
     */
    getUnit: () => (isMetric ? 'km/h' : 'mph'),

    /**
     * Check if user prefers metric system
     */
    isMetric,
  };
}
