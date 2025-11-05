/**
 * Border proximity detection utilities
 */

import { distanceToBBoxEdge, isWithinBBox, BBox } from './distance';

// Threshold for considering a point "near border" in kilometers
const NEAR_BORDER_THRESHOLD_KM = 20;

/**
 * Check if point is near the border of any bbox
 * Returns true if within NEAR_BORDER_THRESHOLD_KM of edge
 */
export function isNearBorder(
  lat: number,
  lng: number,
  bbox: BBox,
  thresholdKm: number = NEAR_BORDER_THRESHOLD_KM
): boolean {
  // Point must be inside bbox
  if (!isWithinBBox(lat, lng, bbox)) {
    return false;
  }

  const distanceToEdge = distanceToBBoxEdge(lat, lng, bbox);
  return distanceToEdge <= thresholdKm;
}

/**
 * Check if point is near borders of multiple country bboxes
 * Returns array of country codes where point is near border
 */
export function findNearBorderCountries(
  lat: number,
  lng: number,
  countryBBoxes: Map<string, BBox>,
  thresholdKm: number = NEAR_BORDER_THRESHOLD_KM
): string[] {
  const nearBorderCountries: string[] = [];

  for (const [countryCode, bbox] of countryBBoxes.entries()) {
    if (isNearBorder(lat, lng, bbox, thresholdKm)) {
      nearBorderCountries.push(countryCode);
    }
  }

  return nearBorderCountries;
}

/**
 * Determine if PIP (Point-in-Polygon) check should be used
 * Use PIP when:
 * - Near border of any country bbox
 * - Point matches multiple country bboxes (overlap zone)
 */
export function shouldUsePreciseDetection(
  lat: number,
  lng: number,
  candidateCountries: string[],
  countryBBoxes: Map<string, BBox>
): boolean {
  // Multiple candidates = overlap zone, use precise detection
  if (candidateCountries.length > 1) {
    return true;
  }

  // Single candidate, check if near border
  if (candidateCountries.length === 1) {
    const bbox = countryBBoxes.get(candidateCountries[0]);
    if (bbox) {
      return isNearBorder(lat, lng, bbox);
    }
  }

  // No candidates or error, use precise detection
  return candidateCountries.length === 0;
}
