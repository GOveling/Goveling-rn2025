// src/hooks/usePopularPlacesV2.ts
import { useState, useEffect, useCallback, useRef } from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

import { supabase } from '~/lib/supabase';

export interface PopularPlace {
  id: string;
  name: string;
  category: string;
  address?: string;
  city?: string;
  country_code?: string;
  continent?: string;
  lat: number;
  lng: number;
  description?: string;
  photo_url?: string;
  saves_1h: number;
  saves_6h: number;
  saves_24h: number;
  unique_users: number;
  countries_count: number;
  trending_score: number;
  badge: '🔥 HOT NOW' | '📈 TRENDING' | '⭐ POPULAR' | '🌟 RISING';
  traffic_level: 1 | 2 | 3 | 4;
  emoji: string;
  location_display: string;
}

export interface UsePopularPlacesOptions {
  userCountryCode?: string;
  userContinent?: string;
  maxResults?: number;
  enableAutoRefresh?: boolean;
}

const CACHE_KEY = '@goveling:popular_places_v2';

// Fallback places for when no real data is available
const FALLBACK_PLACES: PopularPlace[] = [
  {
    id: 'fallback_1',
    name: 'Torre Eiffel',
    category: 'tourist_attraction',
    city: 'París',
    country_code: 'FR',
    continent: 'Europa',
    lat: 48.8584,
    lng: 2.2945,
    description:
      'El ícono más reconocible de París y uno de los monumentos más visitados del mundo',
    saves_1h: 0,
    saves_6h: 0,
    saves_24h: 0,
    unique_users: 0,
    countries_count: 0,
    trending_score: 0,
    badge: '⭐ POPULAR',
    traffic_level: 4,
    emoji: '🗼',
    location_display: 'París, FR',
  },
  {
    id: 'fallback_2',
    name: 'Machu Picchu',
    category: 'tourist_attraction',
    city: 'Cusco',
    country_code: 'PE',
    continent: 'América',
    lat: -13.1631,
    lng: -72.545,
    description: 'Antigua ciudad inca en los Andes peruanos, Maravilla del Mundo Moderno',
    saves_1h: 0,
    saves_6h: 0,
    saves_24h: 0,
    unique_users: 0,
    countries_count: 0,
    trending_score: 0,
    badge: '⭐ POPULAR',
    traffic_level: 4,
    emoji: '⛰️',
    location_display: 'Cusco, PE',
  },
  {
    id: 'fallback_3',
    name: 'Gran Muralla China',
    category: 'tourist_attraction',
    city: 'Beijing',
    country_code: 'CN',
    continent: 'Asia',
    lat: 40.4319,
    lng: 116.5704,
    description: 'Antigua fortificación china, visible desde el espacio',
    saves_1h: 0,
    saves_6h: 0,
    saves_24h: 0,
    unique_users: 0,
    countries_count: 0,
    trending_score: 0,
    badge: '⭐ POPULAR',
    traffic_level: 4,
    emoji: '🏯',
    location_display: 'Beijing, CN',
  },
  {
    id: 'fallback_4',
    name: 'Coliseo Romano',
    category: 'tourist_attraction',
    city: 'Roma',
    country_code: 'IT',
    continent: 'Europa',
    lat: 41.8902,
    lng: 12.4922,
    description: 'Anfiteatro antiguo más grande del mundo',
    saves_1h: 0,
    saves_6h: 0,
    saves_24h: 0,
    unique_users: 0,
    countries_count: 0,
    trending_score: 0,
    badge: '⭐ POPULAR',
    traffic_level: 4,
    emoji: '🏛️',
    location_display: 'Roma, IT',
  },
  {
    id: 'fallback_5',
    name: 'Cristo Redentor',
    category: 'tourist_attraction',
    city: 'Río de Janeiro',
    country_code: 'BR',
    continent: 'América',
    lat: -22.9519,
    lng: -43.2105,
    description: 'Estatua icónica en la cima del Corcovado',
    saves_1h: 0,
    saves_6h: 0,
    saves_24h: 0,
    unique_users: 0,
    countries_count: 0,
    trending_score: 0,
    badge: '⭐ POPULAR',
    traffic_level: 4,
    emoji: '⛪',
    location_display: 'Río de Janeiro, BR',
  },
  {
    id: 'fallback_6',
    name: 'Santorini Sunset',
    category: 'tourist_attraction',
    city: 'Santorini',
    country_code: 'GR',
    continent: 'Europa',
    lat: 36.4618,
    lng: 25.3753,
    description: 'Uno de los atardeceres más fotografiados del mundo',
    saves_1h: 0,
    saves_6h: 0,
    saves_24h: 0,
    unique_users: 0,
    countries_count: 0,
    trending_score: 0,
    badge: '⭐ POPULAR',
    traffic_level: 4,
    emoji: '🌅',
    location_display: 'Santorini, GR',
  },
  {
    id: 'fallback_7',
    name: 'Taj Mahal',
    category: 'tourist_attraction',
    city: 'Agra',
    country_code: 'IN',
    continent: 'Asia',
    lat: 27.1751,
    lng: 78.0421,
    description: 'Mausoleo de mármol blanco, símbolo del amor eterno',
    saves_1h: 0,
    saves_6h: 0,
    saves_24h: 0,
    unique_users: 0,
    countries_count: 0,
    trending_score: 0,
    badge: '⭐ POPULAR',
    traffic_level: 4,
    emoji: '🕌',
    location_display: 'Agra, IN',
  },
  {
    id: 'fallback_8',
    name: 'Ópera de Sydney',
    category: 'tourist_attraction',
    city: 'Sydney',
    country_code: 'AU',
    continent: 'Oceanía',
    lat: -33.8568,
    lng: 151.2153,
    description: 'Obra maestra de la arquitectura moderna',
    saves_1h: 0,
    saves_6h: 0,
    saves_24h: 0,
    unique_users: 0,
    countries_count: 0,
    trending_score: 0,
    badge: '⭐ POPULAR',
    traffic_level: 4,
    emoji: '🎭',
    location_display: 'Sydney, AU',
  },
];

export function usePopularPlacesV2(options: UsePopularPlacesOptions = {}) {
  const { userCountryCode, userContinent, maxResults = 8, enableAutoRefresh = true } = options;

  const [places, setPlaces] = useState<PopularPlace[]>(FALLBACK_PLACES);
  const [isLive, setIsLive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [trafficLevel, setTrafficLevel] = useState<1 | 2 | 3 | 4>(4);
  const [refreshInterval, setRefreshInterval] = useState(30 * 60 * 1000); // 30 min default

  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isOnlineRef = useRef(true);

  // Determine refresh interval based on traffic level
  const getRefreshInterval = (level: 1 | 2 | 3 | 4): number => {
    switch (level) {
      case 1:
        return 3 * 60 * 1000; // 3 minutes (ULTRA HOT)
      case 2:
        return 10 * 60 * 1000; // 10 minutes (TRENDING)
      case 3:
        return 30 * 60 * 1000; // 30 minutes (POPULAR)
      default:
        return 60 * 60 * 1000; // 60 minutes (RISING)
    }
  };

  // Determine cache TTL
  const getCacheTTL = (level: 1 | 2 | 3 | 4): number => {
    switch (level) {
      case 1:
        return 2 * 60 * 1000; // 2 minutes
      case 2:
        return 5 * 60 * 1000; // 5 minutes
      case 3:
        return 15 * 60 * 1000; // 15 minutes
      default:
        return 30 * 60 * 1000; // 30 minutes
    }
  };

  // Load from cache
  const loadFromCache = useCallback(async (): Promise<PopularPlace[] | null> => {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (!cached) return null;

      const { data, timestamp, traffic_level } = JSON.parse(cached);
      const age = Date.now() - timestamp;
      const ttl = getCacheTTL(traffic_level);

      if (age < ttl) {
        console.log(`📦 Popular places: Using cache (level ${traffic_level}, TTL ${ttl / 1000}s)`);
        return data;
      }

      console.log('⏰ Popular places: Cache expired');
      return null;
    } catch (e) {
      console.error('Popular places: Error reading cache:', e);
      return null;
    }
  }, []);

  // Save to cache
  const saveToCache = useCallback(async (data: PopularPlace[], level: 1 | 2 | 3 | 4) => {
    try {
      await AsyncStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          data,
          timestamp: Date.now(),
          traffic_level: level,
        })
      );
    } catch (e) {
      console.error('Popular places: Error saving cache:', e);
    }
  }, []);

  // Main fetch function
  const fetchPopularPlaces = useCallback(
    async (showLoading = true) => {
      if (showLoading) setIsLoading(true);
      setError(null);

      try {
        // 1. Check connectivity
        const netInfo = await NetInfo.fetch();
        isOnlineRef.current = netInfo.isConnected ?? false;

        if (!isOnlineRef.current) {
          console.log('📵 Popular places: Offline, using cache or fallback');
          const cached = await loadFromCache();
          if (cached && cached.length >= 3) {
            setPlaces(cached);
            setIsLive(false);
          } else {
            setPlaces(FALLBACK_PLACES);
            setIsLive(false);
          }
          if (showLoading) setIsLoading(false);
          return;
        }

        // 2. Try cache first
        const cachedPlaces = await loadFromCache();
        if (cachedPlaces && cachedPlaces.length >= 3) {
          setPlaces(cachedPlaces);
          setIsLive(true);
          setTrafficLevel(cachedPlaces[0]?.traffic_level || 4);
          setLastUpdated(new Date());
          if (showLoading) setIsLoading(false);
          return;
        }

        // 3. Call RPC
        console.log('🌐 Popular places: Fetching live data...');
        const startTime = Date.now();

        const { data, error: rpcError } = await supabase.rpc('get_popular_places_v2', {
          user_country_code: userCountryCode || null,
          user_continent: userContinent || null,
          max_results: maxResults,
          exclude_place_ids: [],
        });

        const responseTime = Date.now() - startTime;
        console.log(`⚡ Popular places: RPC responded in ${responseTime}ms`);

        if (rpcError) throw rpcError;

        if (data && data.length >= 3) {
          const detectedLevel = data[0]?.traffic_level || 4;
          const newInterval = getRefreshInterval(detectedLevel);

          setPlaces(data);
          setIsLive(true);
          setTrafficLevel(detectedLevel);
          setRefreshInterval(newInterval);
          setLastUpdated(new Date());

          await saveToCache(data, detectedLevel);

          console.log(
            `✅ Popular places: ${data.length} places | Level ${detectedLevel} | Next refresh in ${newInterval / 60000} min`
          );
        } else {
          console.log('📋 Popular places: Using fallback (insufficient data)');
          setPlaces(FALLBACK_PLACES);
          setIsLive(false);
          setTrafficLevel(4);
        }
      } catch (err) {
        console.error('❌ Popular places: Error fetching:', err);
        setError('Error al cargar lugares populares');

        // Try cache as last resort
        const cached = await loadFromCache();
        if (cached && cached.length >= 3) {
          setPlaces(cached);
          setIsLive(false);
        } else {
          setPlaces(FALLBACK_PLACES);
          setIsLive(false);
        }
      } finally {
        if (showLoading) setIsLoading(false);
      }
    },
    [userCountryCode, userContinent, maxResults, loadFromCache, saveToCache]
  );

  // Manual refresh
  const refresh = useCallback(() => {
    console.log('🔄 Popular places: Manual refresh');
    fetchPopularPlaces(false);
  }, [fetchPopularPlaces]);

  // Setup auto-refresh
  useEffect(() => {
    if (!enableAutoRefresh) return;

    fetchPopularPlaces();

    refreshTimerRef.current = setInterval(() => {
      if (isOnlineRef.current) {
        console.log(`⏰ Popular places: Auto-refresh (every ${refreshInterval / 60000} min)`);
        fetchPopularPlaces(false);
      }
    }, refreshInterval);

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [fetchPopularPlaces, refreshInterval, enableAutoRefresh]);

  // Monitor connectivity changes
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const wasOffline = !isOnlineRef.current;
      isOnlineRef.current = state.isConnected ?? false;

      // If connection restored, refresh
      if (wasOffline && isOnlineRef.current) {
        console.log('🔌 Popular places: Connection restored, refreshing...');
        fetchPopularPlaces(false);
      }
    });

    return () => unsubscribe();
  }, [fetchPopularPlaces]);

  return {
    places,
    isLive,
    isLoading,
    error,
    lastUpdated,
    trafficLevel,
    refreshInterval,
    refresh,
  };
}
