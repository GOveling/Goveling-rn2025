/**
 * Distance calculation utilities for geo detection
 */

const EARTH_RADIUS_KM = 6371;

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in meters
 */
export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c * 1000; // Convert to meters
}

export interface BBox {
  latRange: [number, number];
  lngRange: [number, number];
}

/**
 * Calculate approximate distance from point to bbox edge
 * Returns distance in kilometers (approximate)
 */
export function distanceToBBoxEdge(lat: number, lng: number, bbox: BBox): number {
  const [minLat, maxLat] = bbox.latRange;
  const [minLng, maxLng] = bbox.lngRange;

  // Check if point is inside bbox
  if (lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng) {
    // Calculate distance to each edge
    const distToNorth = Math.abs(maxLat - lat) * 111; // ~111 km per degree latitude
    const distToSouth = Math.abs(lat - minLat) * 111;
    const distToEast = Math.abs(maxLng - lng) * 111 * Math.cos((lat * Math.PI) / 180);
    const distToWest = Math.abs(lng - minLng) * 111 * Math.cos((lat * Math.PI) / 180);

    // Return minimum distance to any edge
    return Math.min(distToNorth, distToSouth, distToEast, distToWest);
  }

  // Point is outside bbox
  return 0;
}

/**
 * Check if point is within bbox
 */
export function isWithinBBox(lat: number, lng: number, bbox: BBox): boolean {
  const [minLat, maxLat] = bbox.latRange;
  const [minLng, maxLng] = bbox.lngRange;

  return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
}
