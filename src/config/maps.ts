import { API_KEYS, API_VALIDATORS } from './apiKeys';

// Maptiler configuration with secure key management
const getMaptilerKey = (): string | null => {
  return API_KEYS.maptiler;
};

// Safe URL generation - only create URL if key is available
export const getMapStyleURL = (): string => {
  const key = getMaptilerKey();

  if (!key || key === 'get_your_key_at_maptiler_dot_com') {
    console.warn('⚠️ Maptiler no configurado, usando OpenStreetMap style');
    // Return OpenStreetMap style as fallback (no API key required)
    return 'https://api.maptiler.com/maps/openstreetmap/style.json';
  }

  return `https://api.maptiler.com/maps/streets-v2/style.json?key=${key}`;
};

// Alternative styles generator
export const getAlternativeMapStyles = () => {
  const key = getMaptilerKey();

  if (!key) {
    return {
      basic: 'https://api.maptiler.com/maps/openstreetmap/style.json',
      satellite: 'https://api.maptiler.com/maps/openstreetmap/style.json',
      hybrid: 'https://api.maptiler.com/maps/openstreetmap/style.json',
    };
  }

  return {
    basic: `https://api.maptiler.com/maps/basic-v2/style.json?key=${key}`,
    satellite: `https://api.maptiler.com/maps/satellite/style.json?key=${key}`,
    hybrid: `https://api.maptiler.com/maps/hybrid/style.json?key=${key}`,
  };
};

// For backward compatibility
export const MAP_STYLE_URL = getMapStyleURL();
