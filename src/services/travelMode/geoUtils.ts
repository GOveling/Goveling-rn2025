/**
 * Utility functions for geolocation calculations
 * Optimized for native hardware (iOS/Android)
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param coord1 First coordinate
 * @param coord2 Second coordinate
 * @returns Distance in meters
 */
export function calculateHaversineDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371000; // Earth's radius in meters
  const φ1 = toRadians(coord1.latitude);
  const φ2 = toRadians(coord2.latitude);
  const Δφ = toRadians(coord2.latitude - coord1.latitude);
  const Δλ = toRadians(coord2.longitude - coord1.longitude);

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Alias for calculateHaversineDistance (shorter name)
 */
export const haversineDistance = calculateHaversineDistance;

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Format distance in human-readable format
 * @param meters Distance in meters
 * @returns Formatted string (e.g., "1.5 km", "500 m")
 */
export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
}

/**
 * Calculate bearing between two coordinates
 * @param coord1 Start coordinate
 * @param coord2 End coordinate
 * @returns Bearing in degrees (0-360)
 */
export function calculateBearing(coord1: Coordinates, coord2: Coordinates): number {
  const φ1 = toRadians(coord1.latitude);
  const φ2 = toRadians(coord2.latitude);
  const Δλ = toRadians(coord2.longitude - coord1.longitude);

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  const θ = Math.atan2(y, x);
  const bearing = ((θ * 180) / Math.PI + 360) % 360;

  return bearing;
}

/**
 * Check if a coordinate is within a radius of another coordinate
 * @param center Center coordinate
 * @param point Point to check
 * @param radiusMeters Radius in meters
 * @returns True if point is within radius
 */
export function isWithinRadius(
  center: Coordinates,
  point: Coordinates,
  radiusMeters: number
): boolean {
  const distance = calculateHaversineDistance(center, point);
  return distance <= radiusMeters;
}

/**
 * Calculate the closest point on a line segment to a given point
 * @param point The point to project
 * @param lineStart Start of the line segment
 * @param lineEnd End of the line segment
 * @returns The closest point on the line segment
 */
export function projectPointToLineSegment(
  point: Coordinates,
  lineStart: Coordinates,
  lineEnd: Coordinates
): Coordinates {
  const A = point.latitude - lineStart.latitude;
  const B = point.longitude - lineStart.longitude;
  const C = lineEnd.latitude - lineStart.latitude;
  const D = lineEnd.longitude - lineStart.longitude;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;

  if (lenSq !== 0) {
    param = dot / lenSq;
  }

  let closestLat: number;
  let closestLng: number;

  if (param < 0) {
    closestLat = lineStart.latitude;
    closestLng = lineStart.longitude;
  } else if (param > 1) {
    closestLat = lineEnd.latitude;
    closestLng = lineEnd.longitude;
  } else {
    closestLat = lineStart.latitude + param * C;
    closestLng = lineStart.longitude + param * D;
  }

  return {
    latitude: closestLat,
    longitude: closestLng,
  };
}

/**
 * Decode a Google polyline string to coordinates
 * @param encoded Encoded polyline string
 * @returns Array of coordinates
 */
export function decodePolyline(encoded: string): Coordinates[] {
  const poly: Coordinates[] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    poly.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5,
    });
  }

  return poly;
}

/**
 * Smooth an array of coordinates using weighted average
 * @param coords Array of coordinates
 * @param windowSize Number of points to average
 * @returns Smoothed coordinates
 */
export function smoothCoordinates(coords: Coordinates[], windowSize = 3): Coordinates[] {
  if (coords.length < windowSize) {
    return coords;
  }

  const smoothed: Coordinates[] = [];

  for (let i = 0; i < coords.length; i++) {
    let sumLat = 0;
    let sumLng = 0;
    let count = 0;

    for (let j = Math.max(0, i - windowSize + 1); j <= i; j++) {
      // Recent points have more weight
      const weight = 1 + (j - Math.max(0, i - windowSize + 1));
      sumLat += coords[j].latitude * weight;
      sumLng += coords[j].longitude * weight;
      count += weight;
    }

    smoothed.push({
      latitude: sumLat / count,
      longitude: sumLng / count,
    });
  }

  return smoothed;
}
