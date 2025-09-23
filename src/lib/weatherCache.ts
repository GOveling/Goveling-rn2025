import AsyncStorage from '@react-native-async-storage/async-storage';

const WEATHER_CACHE_KEY = 'weather_cache';
const LOCATION_CACHE_KEY = 'location_cache';
const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutos
const LOCATION_PRECISION = 3; // Decimal places for lat/lng grouping (≈111m precision)

interface WeatherCacheEntry {
  lat: number;
  lng: number;
  units: 'c' | 'f';
  data: {
    temp: number;
    code: number;
    location?: {
      city: string;
      country: string;
      region: string;
    };
  };
  timestamp: number;
}

interface LocationCacheEntry {
  lat: number;
  lng: number;
  location: string;
  source: 'weather' | 'expo' | 'bigdata' | 'coordinates';
  timestamp: number;
}

// Helper to round coordinates for cache grouping
function roundCoords(lat: number, lng: number) {
  return {
    lat: Math.round(lat * Math.pow(10, LOCATION_PRECISION)) / Math.pow(10, LOCATION_PRECISION),
    lng: Math.round(lng * Math.pow(10, LOCATION_PRECISION)) / Math.pow(10, LOCATION_PRECISION)
  };
}

// Helper to check if coordinates are close enough to use cached data
function coordsMatch(lat1: number, lng1: number, lat2: number, lng2: number): boolean {
  const rounded1 = roundCoords(lat1, lng1);
  const rounded2 = roundCoords(lat2, lng2);
  return rounded1.lat === rounded2.lat && rounded1.lng === rounded2.lng;
}

export class WeatherCache {
  private static cache: WeatherCacheEntry[] = [];
  private static initialized = false;

  private static async initialize() {
    if (this.initialized) return;
    try {
      const data = await AsyncStorage.getItem(WEATHER_CACHE_KEY);
      if (data) {
        this.cache = JSON.parse(data);
        // Clean expired entries
        const now = Date.now();
        this.cache = this.cache.filter(entry => now - entry.timestamp < CACHE_DURATION_MS);
      }
      this.initialized = true;
    } catch (error) {
      console.warn('Failed to load weather cache:', error);
      this.cache = [];
      this.initialized = true;
    }
  }

  static async get(lat: number, lng: number, units: 'c' | 'f') {
    await this.initialize();
    const now = Date.now();
    
    const entry = this.cache.find(item => 
      coordsMatch(item.lat, item.lng, lat, lng) &&
      item.units === units &&
      now - item.timestamp < CACHE_DURATION_MS
    );
    
    return entry?.data || null;
  }

  static async set(lat: number, lng: number, units: 'c' | 'f', data: WeatherCacheEntry['data']) {
    await this.initialize();
    const rounded = roundCoords(lat, lng);
    
    // Remove existing entry for same location/units
    this.cache = this.cache.filter(item => 
      !(coordsMatch(item.lat, item.lng, lat, lng) && item.units === units)
    );
    
    // Add new entry
    this.cache.push({
      lat: rounded.lat,
      lng: rounded.lng,
      units,
      data,
      timestamp: Date.now()
    });

    // Keep cache size reasonable (max 50 entries)
    if (this.cache.length > 50) {
      this.cache.sort((a, b) => b.timestamp - a.timestamp);
      this.cache = this.cache.slice(0, 50);
    }

    // Save to storage
    try {
      await AsyncStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(this.cache));
    } catch (error) {
      console.warn('Failed to save weather cache:', error);
    }
  }

  static async clear() {
    this.cache = [];
    try {
      await AsyncStorage.removeItem(WEATHER_CACHE_KEY);
    } catch (error) {
      console.warn('Failed to clear weather cache:', error);
    }
  }
}

export class LocationCache {
  private static cache: LocationCacheEntry[] = [];
  private static initialized = false;

  private static async initialize() {
    if (this.initialized) return;
    try {
      const data = await AsyncStorage.getItem(LOCATION_CACHE_KEY);
      if (data) {
        this.cache = JSON.parse(data);
        // Clean expired entries
        const now = Date.now();
        this.cache = this.cache.filter(entry => now - entry.timestamp < CACHE_DURATION_MS);
      }
      this.initialized = true;
    } catch (error) {
      console.warn('Failed to load location cache:', error);
      this.cache = [];
      this.initialized = true;
    }
  }

  static async get(lat: number, lng: number, source?: string) {
    await this.initialize();
    const now = Date.now();
    
    const entry = this.cache.find(item => 
      coordsMatch(item.lat, item.lng, lat, lng) &&
      (!source || item.source === source) &&
      now - item.timestamp < CACHE_DURATION_MS
    );
    
    return entry?.location || null;
  }

  static async set(lat: number, lng: number, location: string, source: LocationCacheEntry['source']) {
    await this.initialize();
    const rounded = roundCoords(lat, lng);
    
    // Remove existing entry for same location/source
    this.cache = this.cache.filter(item => 
      !(coordsMatch(item.lat, item.lng, lat, lng) && item.source === source)
    );
    
    // Add new entry
    this.cache.push({
      lat: rounded.lat,
      lng: rounded.lng,
      location,
      source,
      timestamp: Date.now()
    });

    // Keep cache size reasonable (max 100 entries)
    if (this.cache.length > 100) {
      this.cache.sort((a, b) => b.timestamp - a.timestamp);
      this.cache = this.cache.slice(0, 100);
    }

    // Save to storage
    try {
      await AsyncStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(this.cache));
    } catch (error) {
      console.warn('Failed to save location cache:', error);
    }
  }

  static async clear() {
    this.cache = [];
    try {
      await AsyncStorage.removeItem(LOCATION_CACHE_KEY);
    } catch (error) {
      console.warn('Failed to clear location cache:', error);
    }
  }
}
