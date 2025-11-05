/**
 * Geo detection system - Public API
 */

// Main hook
export { useGeoDetection } from './useGeoDetection';
export type { GeoDetectionResult } from './useGeoDetection';

// Cache utilities
export { getCachedGeoResult, setCachedGeoResult, clearAllGeoCache, getCacheStats } from './cache';
export type { CacheValue } from './cache';

// Histeresis types
export type { GeoReading, HisteresisState } from './histeresis';

// Country bboxes
export { COUNTRY_BBOXES, getCandidateCountries } from './countryBBoxes';

// Distance utilities
export { haversineDistance, isWithinBBox } from './distance';
export type { BBox } from './distance';
