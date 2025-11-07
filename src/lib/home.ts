import * as Location from 'expo-location';

import { supabase } from '~/lib/supabase';
import { logger } from '~/utils/logger';

import { LocationCache } from './weatherCache';

export type Trip = {
  id: string;
  name: string;
  start_date?: string | null;
  end_date?: string | null;
  cover_emoji?: string | null;
  created_at?: string | null;
};

// Helper function to parse date as local time instead of UTC
const parseLocalDate = (dateString: string): Date => {
  // If the date string is just YYYY-MM-DD, we want to treat it as local time, not UTC
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    // Parse as local time by appending local time zone
    return new Date(dateString + 'T00:00:00');
  }
  // If it already has time/timezone info, use as is
  return new Date(dateString);
};

export async function getToday() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export function isActiveTrip(t: Trip) {
  const now = new Date();
  if (!t.start_date || !t.end_date) return false;
  return parseLocalDate(t.start_date) <= now && now <= parseLocalDate(t.end_date);
}
export function isFutureTrip(t: Trip) {
  const now = new Date();
  if (!t.start_date) return false;
  return parseLocalDate(t.start_date) > now;
}

/**
 * OPTIMIZED: Consolidated function to get all trip data in a single set of queries
 * This replaces getPlanningTripsCount() and getUpcomingTripsCount() to reduce queries from 8 to 4
 *
 * Performance improvement: 50% reduction in database queries
 */
export interface TripsBreakdown {
  all: Trip[];
  upcoming: Trip[];
  planning: Trip[];
  active: Trip | null;
  counts: {
    total: number;
    upcoming: number;
    planning: number;
    active: number;
  };
}

export async function getUserTripsBreakdown(): Promise<TripsBreakdown> {
  logger.debug('🏠 getUserTripsBreakdown: Starting consolidated trip query...');

  const { data: u } = await supabase.auth.getUser();
  const uid = u?.user?.id;

  if (!uid) {
    logger.debug('🏠 getUserTripsBreakdown: No authenticated user, returning empty breakdown');
    return {
      all: [],
      upcoming: [],
      planning: [],
      active: null,
      counts: { total: 0, upcoming: 0, planning: 0, active: 0 },
    };
  }

  logger.debug('🏠 getUserTripsBreakdown: Fetching trips for user:', uid);

  // Execute all queries in parallel (4 queries total)
  const [ownResult, ownByOwnerIdResult, collabIdsResult] = await Promise.all([
    supabase
      .from('trips')
      .select('id,title,start_date,end_date,created_at')
      .eq('user_id', uid)
      .neq('status', 'cancelled'),
    supabase
      .from('trips')
      .select('id,title,start_date,end_date,created_at')
      .eq('owner_id', uid)
      .neq('status', 'cancelled'),
    supabase.from('trip_collaborators').select('trip_id').eq('user_id', uid),
  ]);

  const tripIds = (collabIdsResult.data || []).map((c) => c.trip_id);

  // Conditional 4th query only if there are collaborator trips
  const collabTripsResult =
    tripIds.length > 0
      ? await supabase
          .from('trips')
          .select('id,title,start_date,end_date,created_at')
          .in('id', tripIds)
          .neq('status', 'cancelled')
      : { data: [] };

  logger.debug(
    '🏠 getUserTripsBreakdown: Query results - own:',
    ownResult.data?.length,
    'ownByOwnerId:',
    ownByOwnerIdResult.data?.length,
    'collab:',
    collabTripsResult.data?.length
  );

  // Combine and deduplicate trips
  const allTripsRaw = [
    ...(ownResult.data || []),
    ...(ownByOwnerIdResult.data || []),
    ...(collabTripsResult.data || []),
  ];

  // Remove duplicates by id using Map
  const tripsMap = new Map<string, Trip>();
  allTripsRaw.forEach((t) => {
    if (!tripsMap.has(t.id)) {
      tripsMap.set(t.id, {
        id: t.id,
        name: t.title,
        start_date: t.start_date,
        end_date: t.end_date,
        created_at: t.created_at,
      });
    }
  });

  const allTrips = Array.from(tripsMap.values());
  logger.debug(
    '🏠 getUserTripsBreakdown: Total unique trips after deduplication:',
    allTrips.length
  );

  // Classify trips once
  const planning: Trip[] = [];
  const upcoming: Trip[] = [];
  let active: Trip | null = null;

  allTrips.forEach((trip) => {
    // Planning: no dates set
    if (!trip.start_date || !trip.end_date) {
      planning.push(trip);
      return;
    }

    // Active: currently in progress
    if (isActiveTrip(trip)) {
      if (!active) active = trip; // Only set first active trip
      return;
    }

    // Upcoming: future trips
    if (isFutureTrip(trip)) {
      upcoming.push(trip);
    }
  });

  const breakdown: TripsBreakdown = {
    all: allTrips,
    upcoming,
    planning,
    active,
    counts: {
      total: allTrips.length,
      upcoming: upcoming.length + planning.length, // Include planning trips in upcoming count
      planning: planning.length,
      active: active ? 1 : 0,
    },
  };

  logger.debug('🏠 getUserTripsBreakdown: Breakdown complete -', {
    total: breakdown.counts.total,
    upcoming: breakdown.counts.upcoming,
    planning: breakdown.counts.planning,
    active: breakdown.counts.active,
  });

  return breakdown;
}

/**
 * @deprecated Use getUserTripsBreakdown() instead for better performance
 * This function makes redundant queries that are also executed by getUpcomingTripsCount()
 */
export async function getPlanningTripsCount(): Promise<number> {
  logger.debug('🏠 getPlanningTripsCount: Starting...');

  const { data: u } = await supabase.auth.getUser();
  const uid = u?.user?.id;

  if (!uid) {
    logger.debug('🏠 getPlanningTripsCount: No authenticated user, returning 0');
    return 0;
  }

  // Get all trips where user is owner or collaborator (excluding cancelled trips)
  const { data: own } = await supabase
    .from('trips')
    .select('id,title,start_date,end_date')
    .eq('user_id', uid)
    .neq('status', 'cancelled');
  const { data: ownByOwnerId } = await supabase
    .from('trips')
    .select('id,title,start_date,end_date')
    .eq('owner_id', uid)
    .neq('status', 'cancelled');
  const { data: collabIds } = await supabase
    .from('trip_collaborators')
    .select('trip_id')
    .eq('user_id', uid);

  const tripIds = (collabIds || []).map((c) => c.trip_id);
  const { data: collabTrips } =
    tripIds.length > 0
      ? await supabase
          .from('trips')
          .select('id,title,start_date,end_date')
          .in('id', tripIds)
          .neq('status', 'cancelled')
      : { data: [] };

  const allTrips = [
    ...(own || []).map((t) => ({
      id: t.id,
      name: t.title,
      start_date: t.start_date,
      end_date: t.end_date,
    })),
    ...(ownByOwnerId || []).map((t) => ({
      id: t.id,
      name: t.title,
      start_date: t.start_date,
      end_date: t.end_date,
    })),
    ...(collabTrips || []).map((t) => ({
      id: t.id,
      name: t.title,
      start_date: t.start_date,
      end_date: t.end_date,
    })),
  ];

  // Remove duplicates by id
  const uniqueTrips = allTrips.filter(
    (trip, index, self) => index === self.findIndex((t) => t.id === trip.id)
  );

  // Count trips in planning state (no start_date or end_date)
  const planningTrips = uniqueTrips.filter((trip) => {
    return !trip.start_date || !trip.end_date;
  });

  logger.debug('🏠 getPlanningTripsCount: Planning trips count:', planningTrips.length);
  logger.debug(
    '🏠 getPlanningTripsCount: Planning trips:',
    planningTrips.map((t) => t.name)
  );

  return planningTrips.length;
}

/**
 * @deprecated Use getUserTripsBreakdown() instead for better performance
 * This function makes redundant queries that are also executed by getPlanningTripsCount()
 */
export async function getUpcomingTripsCount(): Promise<number> {
  logger.debug('🏠 getUpcomingTripsCount: Starting...');

  const { data: u } = await supabase.auth.getUser();
  const uid = u?.user?.id;
  logger.debug('🏠 getUpcomingTripsCount: User ID:', uid || 'NOT FOUND');

  if (!uid) {
    logger.debug('🏠 getUpcomingTripsCount: No authenticated user, returning 0');
    return 0;
  }

  // Get all trips where user is owner or collaborator (excluding cancelled trips)
  const { data: own } = await supabase
    .from('trips')
    .select('id,title,start_date,end_date')
    .eq('user_id', uid)
    .neq('status', 'cancelled');
  const { data: ownByOwnerId } = await supabase
    .from('trips')
    .select('id,title,start_date,end_date')
    .eq('owner_id', uid)
    .neq('status', 'cancelled');
  const { data: collabIds } = await supabase
    .from('trip_collaborators')
    .select('trip_id')
    .eq('user_id', uid);

  const tripIds = (collabIds || []).map((c) => c.trip_id);
  const { data: collabTrips } =
    tripIds.length > 0
      ? await supabase
          .from('trips')
          .select('id,title,start_date,end_date')
          .in('id', tripIds)
          .neq('status', 'cancelled')
      : { data: [] };

  const allTrips = [
    ...(own || []).map((t) => ({
      id: t.id,
      name: t.title,
      start_date: t.start_date,
      end_date: t.end_date,
    })),
    ...(ownByOwnerId || []).map((t) => ({
      id: t.id,
      name: t.title,
      start_date: t.start_date,
      end_date: t.end_date,
    })),
    ...(collabTrips || []).map((t) => ({
      id: t.id,
      name: t.title,
      start_date: t.start_date,
      end_date: t.end_date,
    })),
  ];

  // Remove duplicates by id
  const uniqueTrips = allTrips.filter(
    (trip, index, self) => index === self.findIndex((t) => t.id === trip.id)
  );

  logger.debug('🏠 getUpcomingTripsCount: Total unique trips found:', uniqueTrips.length);

  const now = new Date();

  // Count trips that are:
  // 1. Planning (no start_date or end_date) - these are upcoming
  // 2. Future (start_date is in the future) - these are upcoming
  // Exclude:
  // - Completed (end_date is in the past)
  // - Traveling (currently between start_date and end_date)

  const upcomingTrips = uniqueTrips.filter((trip) => {
    logger.debug(`🏠 Evaluating trip "${trip.name}":`, {
      start_date: trip.start_date,
      end_date: trip.end_date,
    });

    // Planning trips (no dates set) - these count as upcoming
    if (!trip.start_date || !trip.end_date) {
      logger.debug(`  ✅ Planning trip (no dates): ${trip.name}`);
      return true;
    }

    const startDate = parseLocalDate(trip.start_date);
    const endDate = parseLocalDate(trip.end_date);

    // Future trips (start date is in the future) - these count as upcoming
    if (now < startDate) {
      logger.debug(
        `  ✅ Future trip: ${trip.name} starts in ${Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))} days`
      );
      return true;
    }

    // Currently traveling (between start and end dates) - don't count
    if (now >= startDate && now <= endDate) {
      logger.debug(`  ❌ Currently traveling: ${trip.name}`);
      return false;
    }

    // Completed trips (end date is in the past) - don't count
    if (now > endDate) {
      logger.debug(
        `  ❌ Completed trip: ${trip.name} ended ${Math.ceil((now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24))} days ago`
      );
      return false;
    }

    return false;
  });

  logger.debug('🏠 getUpcomingTripsCount: Upcoming trips count:', upcomingTrips.length);
  logger.debug(
    '🏠 getUpcomingTripsCount: Upcoming trips:',
    upcomingTrips.map((t) => t.name)
  );

  return upcomingTrips.length;
}

export async function getActiveOrNextTrip(): Promise<Trip | null> {
  const { data: u } = await supabase.auth.getUser();
  const uid = u?.user?.id;
  if (!uid) return null;
  const { data: own } = await supabase
    .from('trips')
    .select('id,title,start_date,end_date')
    .eq('user_id', uid)
    .neq('status', 'cancelled');
  const { data: ownByOwnerId } = await supabase
    .from('trips')
    .select('id,title,start_date,end_date')
    .eq('owner_id', uid)
    .neq('status', 'cancelled');
  const { data: collabIds } = await supabase
    .from('trip_collaborators')
    .select('trip_id')
    .eq('user_id', uid);
  const tripIds = (collabIds || []).map((c) => c.trip_id);
  const { data: collabTrips } =
    tripIds.length > 0
      ? await supabase
          .from('trips')
          .select('id,title,start_date,end_date')
          .in('id', tripIds)
          .neq('status', 'cancelled')
      : { data: [] };
  const trips: Trip[] = [
    ...(own || []).map((t) => ({
      id: t.id,
      name: t.title,
      start_date: t.start_date,
      end_date: t.end_date,
    })),
    ...(ownByOwnerId || []).map((t) => ({
      id: t.id,
      name: t.title,
      start_date: t.start_date,
      end_date: t.end_date,
    })),
    ...(collabTrips || []).map((t) => ({
      id: t.id,
      name: t.title,
      start_date: t.start_date,
      end_date: t.end_date,
    })),
  ];

  // Remove duplicates by id
  const uniqueTrips = trips.filter(
    (trip, index, self) => index === self.findIndex((t) => t.id === trip.id)
  );

  if (!uniqueTrips.length) return null;
  // active first
  const active = uniqueTrips.find(isActiveTrip);
  if (active) return active as Trip;
  // next future
  const future = uniqueTrips
    .filter(isFutureTrip)
    .sort(
      (a, b) =>
        parseLocalDate(a.start_date || '2099').getTime() -
        parseLocalDate(b.start_date || '2099').getTime()
    )[0];
  return future || null;
}

// New function to get all active trips
export async function getActiveTrips(): Promise<Trip[]> {
  const { data: u } = await supabase.auth.getUser();
  const uid = u?.user?.id;
  if (!uid) return [];

  const { data: own } = await supabase
    .from('trips')
    .select('id,title,start_date,end_date,created_at')
    .eq('user_id', uid)
    .neq('status', 'cancelled');
  const { data: ownByOwnerId } = await supabase
    .from('trips')
    .select('id,title,start_date,end_date,created_at')
    .eq('owner_id', uid)
    .neq('status', 'cancelled');
  const { data: collabIds } = await supabase
    .from('trip_collaborators')
    .select('trip_id')
    .eq('user_id', uid);
  const tripIds = (collabIds || []).map((c) => c.trip_id);
  const { data: collabTrips } =
    tripIds.length > 0
      ? await supabase
          .from('trips')
          .select('id,title,start_date,end_date,created_at')
          .in('id', tripIds)
          .neq('status', 'cancelled')
      : { data: [] };

  const trips: (Trip & { created_at?: string })[] = [
    ...(own || []).map((t) => ({
      id: t.id,
      name: t.title,
      start_date: t.start_date,
      end_date: t.end_date,
      created_at: t.created_at,
    })),
    ...(ownByOwnerId || []).map((t) => ({
      id: t.id,
      name: t.title,
      start_date: t.start_date,
      end_date: t.end_date,
      created_at: t.created_at,
    })),
    ...(collabTrips || []).map((t) => ({
      id: t.id,
      name: t.title,
      start_date: t.start_date,
      end_date: t.end_date,
      created_at: t.created_at,
    })),
  ];

  // Remove duplicates by id
  const uniqueTrips = trips.filter(
    (trip, index, self) => index === self.findIndex((t) => t.id === trip.id)
  );

  // Filter only active trips and sort by creation date (oldest first)
  const activeTrips = uniqueTrips
    .filter(isActiveTrip)
    .sort(
      (a, b) =>
        new Date(a.created_at || '2099').getTime() - new Date(b.created_at || '2099').getTime()
    );

  return activeTrips as Trip[];
}

export async function getTripPlaces(trip_id: string) {
  const { data, error } = await supabase
    .from('trip_places')
    .select('id, place_id, name, lat, lng, address, country_code, category')
    .eq('trip_id', trip_id);
  if (error) return [];
  return data || [];
}

export async function getSavedPlaces() {
  logger.debug('🏠 getSavedPlaces: Starting...');

  const { data: u } = await supabase.auth.getUser();
  const uid = u?.user?.id;
  logger.debug('🏠 getSavedPlaces: User ID:', uid || 'NOT FOUND');

  if (!uid) {
    logger.debug('🏠 getSavedPlaces: No authenticated user, returning empty array');
    return [];
  }

  // Get all trip IDs where user is owner or collaborator
  logger.debug('🏠 getSavedPlaces: Fetching user trips...');

  // First, let's check what trips exist in general
  const { data: allTrips, error: allTripsError } = await supabase
    .from('trips')
    .select('id, user_id, owner_id, title')
    .limit(10);
  logger.debug(
    '🏠 getSavedPlaces: Sample trips in database:',
    allTrips?.length || 0,
    allTripsError ? `(Error: ${allTripsError.message})` : ''
  );
  if (allTrips && allTrips.length > 0) {
    allTrips.forEach((trip, idx) => {
      logger.debug(
        `  Trip ${idx + 1}: ID=${trip.id}, user_id=${trip.user_id}, owner_id=${trip.owner_id}, title=${trip.title}`
      );
    });
  }

  // Try both user_id and owner_id fields (excluding cancelled trips)
  const { data: ownTrips1, error: ownTripsError1 } = await supabase
    .from('trips')
    .select('id')
    .eq('user_id', uid)
    .neq('status', 'cancelled');
  const { data: ownTrips2, error: ownTripsError2 } = await supabase
    .from('trips')
    .select('id')
    .eq('owner_id', uid)
    .neq('status', 'cancelled');

  // Get collaborator trip IDs
  const { data: collabTrips, error: collabTripsError } = await supabase
    .from('trip_collaborators')
    .select('trip_id')
    .eq('user_id', uid);

  logger.debug(
    '🏠 getSavedPlaces: Own trips (user_id):',
    ownTrips1?.length || 0,
    ownTripsError1 ? `(Error: ${ownTripsError1.message})` : ''
  );
  logger.debug(
    '🏠 getSavedPlaces: Own trips (owner_id):',
    ownTrips2?.length || 0,
    ownTripsError2 ? `(Error: ${ownTripsError2.message})` : ''
  );
  logger.debug(
    '🏠 getSavedPlaces: Collaborative trips (raw):',
    collabTrips?.length || 0,
    collabTripsError ? `(Error: ${collabTripsError.message})` : ''
  );

  const tripIds = [
    ...(ownTrips1 || []).map((t) => t.id),
    ...(ownTrips2 || []).map((t) => t.id),
    ...(collabTrips || []).map((c) => c.trip_id),
  ];

  // Remove duplicates
  const uniqueTripIds = [...new Set(tripIds)];

  logger.debug(
    '🏠 getSavedPlaces: Total unique trip IDs (before filtering):',
    uniqueTripIds.length
  );

  // ✅ NUEVO: Verificar que los trips existan y no estén cancelados
  if (uniqueTripIds.length > 0) {
    const { data: validTrips, error: validTripsError } = await supabase
      .from('trips')
      .select('id')
      .in('id', uniqueTripIds)
      .neq('status', 'cancelled');

    if (validTripsError) {
      logger.error('🏠 getSavedPlaces: Error validating trips:', validTripsError);
    } else {
      const validTripIds = (validTrips || []).map((t) => t.id);
      const removedCount = uniqueTripIds.length - validTripIds.length;

      if (removedCount > 0) {
        logger.debug(
          `🏠 getSavedPlaces: Filtered out ${removedCount} cancelled/deleted trips`,
          uniqueTripIds.filter((id) => !validTripIds.includes(id))
        );
      }

      // Actualizar con solo los trips válidos
      uniqueTripIds.length = 0;
      uniqueTripIds.push(...validTripIds);
    }
  }

  logger.debug('🏠 getSavedPlaces: Total unique trip IDs (after filtering):', uniqueTripIds.length);
  logger.debug('🏠 getSavedPlaces: Trip IDs:', uniqueTripIds);

  if (uniqueTripIds.length === 0) {
    logger.debug('🏠 getSavedPlaces: No trips found for user, returning empty array');
    return [];
  }

  logger.debug('🏠 getSavedPlaces: Fetching places for trips...');
  const { data, error } = await supabase
    .from('trip_places')
    .select('id, place_id, name, lat, lng, address, trip_id')
    .in('trip_id', uniqueTripIds);

  logger.debug('🏠 getSavedPlaces: Places query result:');
  logger.debug('  Data count:', data?.length || 0);
  logger.debug('  Error:', error?.message || 'None');

  if (data && data.length > 0) {
    logger.debug('🏠 getSavedPlaces: Places breakdown by trip:');
    const tripCounts = {};
    data.forEach((place) => {
      tripCounts[place.trip_id] = (tripCounts[place.trip_id] || 0) + 1;
    });
    Object.entries(tripCounts).forEach(([tripId, count]) => {
      logger.debug(`  Trip ${tripId}: ${count} places`);
    });

    logger.debug('🏠 getSavedPlaces: Sample places:');
    data.slice(0, 3).forEach((place, idx) => {
      logger.debug(`  ${idx + 1}. ${place.name} (Trip: ${place.trip_id})`);
    });
  }

  if (error) {
    logger.debug('🏠 getSavedPlaces: Error occurred, returning empty array:', error.message);
    return [];
  }

  logger.debug('🏠 getSavedPlaces: Returning', (data || []).length, 'places');
  return data || [];
}

export function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  function toRad(d: number) {
    return (d * Math.PI) / 180;
  }
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function getCurrentPosition() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return null;
  const pos = await Location.getCurrentPositionAsync({});
  return { lat: pos.coords.latitude, lng: pos.coords.longitude };
}

// Simple coordinate-based location detection
export async function getLocationFromCoordinates(lat: number, lng: number): Promise<string | null> {
  // Basic geographic region detection based on coordinates
  const regions = [
    { lat: [-90, -60], lng: [-180, 180], name: 'Antártida' },
    { lat: [-60, -23.5], lng: [-70, -30], name: 'Argentina' },
    { lat: [-23.5, 12], lng: [-82, -34], name: 'Brasil' },
    { lat: [32, 42], lng: [-125, -66], name: 'Estados Unidos' },
    { lat: [25, 49], lng: [-8, 40], name: 'Europa' },
    { lat: [-35, -10], lng: [-80, -65], name: 'Chile' },
    { lat: [-56, -17], lng: [-110, -25], name: 'Sudamérica' },
    { lat: [36, 71], lng: [-10, 70], name: 'Europa/África' },
    { lat: [-35, 37], lng: [110, 180], name: 'Oceanía' },
  ];

  for (const region of regions) {
    if (
      lat >= region.lat[0] &&
      lat <= region.lat[1] &&
      lng >= region.lng[0] &&
      lng <= region.lng[1]
    ) {
      return region.name;
    }
  }

  // If no specific region, give general location
  if (lat > 0) {
    return lng > 0 ? 'Europa/Asia' : 'América del Norte';
  } else {
    return lng > 0 ? 'África/Oceanía' : 'América del Sur';
  }
}

// Alternative geocoding using BigDataCloud (same as weather API)
export async function reverseGeocodeCoordinates(lat: number, lng: number): Promise<string | null> {
  try {
    const geocodeUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=es`;

    const response = await fetch(geocodeUrl);
    if (!response.ok) {
      return null;
    }

    const geocodeData = await response.json();

    // Try different location fields in order of preference
    let locationName = null;

    if (geocodeData.city) {
      locationName = geocodeData.city;
    } else if (geocodeData.locality) {
      locationName = geocodeData.locality;
    } else if (geocodeData.principalSubdivision) {
      locationName = geocodeData.principalSubdivision;
    } else if (geocodeData.countryName) {
      locationName = geocodeData.countryName;
    }

    if (locationName && geocodeData.countryName && locationName !== geocodeData.countryName) {
      return `${locationName}, ${geocodeData.countryName}`;
    } else if (locationName) {
      return locationName;
    }

    return null;
  } catch (error) {
    return null;
  }
}

// Cached version of reverseCity
export async function reverseCityCached(lat: number, lng: number): Promise<string | null> {
  // Try cache first
  const cached = await LocationCache.get(lat, lng, 'expo');
  if (cached) {
    return cached;
  }

  try {
    const result = await reverseCity(lat, lng);
    if (result) {
      await LocationCache.set(lat, lng, result, 'expo');
    }
    return result;
  } catch (error) {
    return null;
  }
}

// Cached version of reverseGeocodeCoordinates
export async function reverseGeocodeCoordinatesCached(
  lat: number,
  lng: number
): Promise<string | null> {
  // Try cache first
  const cached = await LocationCache.get(lat, lng, 'bigdata');
  if (cached) {
    return cached;
  }

  try {
    const result = await reverseGeocodeCoordinates(lat, lng);
    if (result) {
      await LocationCache.set(lat, lng, result, 'bigdata');
    }
    return result;
  } catch (error) {
    return null;
  }
}

// getLocationFromCoordinates is local computation, no need for cache
export { getLocationFromCoordinates as getLocationFromCoordinatesCached };

export async function reverseCity(lat: number, lng: number) {
  try {
    const arr = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    const c = arr?.[0];
    if (!c) {
      return null;
    }

    // Build location string with available data
    const parts = [];
    if (c.city) parts.push(c.city);
    else if (c.subregion) parts.push(c.subregion);
    else if (c.region) parts.push(c.region);
    else if (c.district) parts.push(c.district);
    else if (c.name) parts.push(c.name);
    else if (c.street) parts.push(c.street);

    if (c.country && parts.length > 0) parts.push(c.country);
    else if (c.isoCountryCode && parts.length > 0) parts.push(c.isoCountryCode);

    const result = parts.length > 0 ? parts.join(', ') : null;
    return result;
  } catch (error) {
    return null;
  }
}
