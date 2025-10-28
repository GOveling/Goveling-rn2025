/**
 * VenueSizeHeuristics - Adaptive radius calculation based on place type
 * Optimizes proximity detection for different venue types
 */

export type VenueType =
  | 'airport'
  | 'stadium'
  | 'park'
  | 'shopping_mall'
  | 'museum'
  | 'restaurant'
  | 'cafe'
  | 'hotel'
  | 'tourist_attraction'
  | 'point_of_interest'
  | 'establishment'
  | 'default';

interface VenueHeuristic {
  type: VenueType;
  radiusMeters: number;
  description: string;
}

const VENUE_HEURISTICS: Record<VenueType, VenueHeuristic> = {
  airport: {
    type: 'airport',
    radiusMeters: 2000,
    description: 'Large airport facility',
  },
  stadium: {
    type: 'stadium',
    radiusMeters: 500,
    description: 'Sports stadium or arena',
  },
  park: {
    type: 'park',
    radiusMeters: 300,
    description: 'Public park',
  },
  shopping_mall: {
    type: 'shopping_mall',
    radiusMeters: 200,
    description: 'Shopping mall or center',
  },
  museum: {
    type: 'museum',
    radiusMeters: 150,
    description: 'Museum or gallery',
  },
  restaurant: {
    type: 'restaurant',
    radiusMeters: 100,
    description: 'Restaurant or dining establishment',
  },
  cafe: {
    type: 'cafe',
    radiusMeters: 75,
    description: 'Cafe or coffee shop',
  },
  hotel: {
    type: 'hotel',
    radiusMeters: 150,
    description: 'Hotel or accommodation',
  },
  tourist_attraction: {
    type: 'tourist_attraction',
    radiusMeters: 200,
    description: 'Tourist attraction or landmark',
  },
  point_of_interest: {
    type: 'point_of_interest',
    radiusMeters: 150,
    description: 'General point of interest',
  },
  establishment: {
    type: 'establishment',
    radiusMeters: 100,
    description: 'Business establishment',
  },
  default: {
    type: 'default',
    radiusMeters: 100,
    description: 'Default venue',
  },
};

/**
 * Get adaptive radius for a venue type
 * @param types Array of place types from Google Places API
 * @returns Radius in meters
 */
export function getAdaptiveRadius(types?: string[]): number {
  if (!types || types.length === 0) {
    return VENUE_HEURISTICS.default.radiusMeters;
  }

  // Priority order for venue types
  const priorityTypes: VenueType[] = [
    'airport',
    'stadium',
    'shopping_mall',
    'tourist_attraction',
    'park',
    'museum',
    'hotel',
    'restaurant',
    'cafe',
    'point_of_interest',
    'establishment',
  ];

  for (const priorityType of priorityTypes) {
    if (types.includes(priorityType)) {
      return VENUE_HEURISTICS[priorityType].radiusMeters;
    }
  }

  return VENUE_HEURISTICS.default.radiusMeters;
}

/**
 * Get venue heuristic information
 * @param types Array of place types
 * @returns Venue heuristic object
 */
export function getVenueHeuristic(types?: string[]): VenueHeuristic {
  if (!types || types.length === 0) {
    return VENUE_HEURISTICS.default;
  }

  const priorityTypes: VenueType[] = [
    'airport',
    'stadium',
    'shopping_mall',
    'tourist_attraction',
    'park',
    'museum',
    'hotel',
    'restaurant',
    'cafe',
    'point_of_interest',
    'establishment',
  ];

  for (const priorityType of priorityTypes) {
    if (types.includes(priorityType)) {
      return VENUE_HEURISTICS[priorityType];
    }
  }

  return VENUE_HEURISTICS.default;
}

/**
 * Get all venue heuristics (for debugging or configuration)
 */
export function getAllVenueHeuristics(): Record<VenueType, VenueHeuristic> {
  return VENUE_HEURISTICS;
}
