/**
 * Histeresis system to prevent "flickering" between countries
 * Uses sliding window with majority voting and dwell time
 */

import { haversineDistance } from './distance';

// Configuration constants
const WINDOW_SIZE = 4; // Number of readings to consider
const MIN_MATCHES = 3; // Minimum matches required for country change
const DWELL_TIME_MS = 60000; // 60 seconds - minimum time in country before change
const MIN_DISTANCE_M = 300; // 300 meters - minimum distance moved for valid reading

export interface GeoReading {
  countryCode: string;
  regionCode: string | null;
  lat: number;
  lng: number;
  timestamp: number;
  accuracy: number;
}

export interface HisteresisState {
  currentCountry: string | null;
  currentRegion: string | null;
  lastChangeTimestamp: number;
  readingBuffer: GeoReading[];
  lastPosition: { lat: number; lng: number } | null;
}

/**
 * Create initial histeresis state
 */
export function createHisteresisState(): HisteresisState {
  return {
    currentCountry: null,
    currentRegion: null,
    lastChangeTimestamp: 0,
    readingBuffer: [],
    lastPosition: null,
  };
}

/**
 * Check if reading should be ignored due to insufficient movement
 */
function shouldIgnoreReading(
  reading: GeoReading,
  lastPosition: { lat: number; lng: number } | null
): boolean {
  // Always accept first reading
  if (!lastPosition) {
    return false;
  }

  const distance = haversineDistance(lastPosition.lat, lastPosition.lng, reading.lat, reading.lng);

  // Ignore if movement is too small (likely GPS drift)
  return distance < MIN_DISTANCE_M;
}

/**
 * Add new reading to histeresis buffer
 * Returns updated state (immutable)
 */
export function addReading(state: HisteresisState, reading: GeoReading): HisteresisState {
  // Ignore readings with insufficient movement
  if (shouldIgnoreReading(reading, state.lastPosition)) {
    return state;
  }

  // Add reading to buffer
  const newBuffer = [...state.readingBuffer, reading];

  // Keep only last WINDOW_SIZE readings
  if (newBuffer.length > WINDOW_SIZE) {
    newBuffer.shift();
  }

  return {
    ...state,
    readingBuffer: newBuffer,
    lastPosition: { lat: reading.lat, lng: reading.lng },
  };
}

/**
 * Count occurrences of each country in buffer
 */
function countCountries(buffer: GeoReading[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const reading of buffer) {
    const current = counts.get(reading.countryCode) || 0;
    counts.set(reading.countryCode, current + 1);
  }

  return counts;
}

/**
 * Find most frequent country in buffer
 */
function getMajorityCountry(buffer: GeoReading[]): {
  countryCode: string;
  count: number;
} | null {
  if (buffer.length === 0) {
    return null;
  }

  const counts = countCountries(buffer);
  let maxCount = 0;
  let majorityCountry = '';

  for (const [country, count] of counts.entries()) {
    if (count > maxCount) {
      maxCount = count;
      majorityCountry = country;
    }
  }

  return { countryCode: majorityCountry, count: maxCount };
}

/**
 * Get most recent region for a country from buffer
 */
function getRegionForCountry(buffer: GeoReading[], countryCode: string): string | null {
  // Search backwards for most recent region
  for (let i = buffer.length - 1; i >= 0; i--) {
    if (buffer[i].countryCode === countryCode && buffer[i].regionCode) {
      return buffer[i].regionCode;
    }
  }

  return null;
}

/**
 * Determine if country should change based on histeresis rules
 * Returns new country/region or null if no change
 */
export function shouldChangeCountry(
  state: HisteresisState,
  now: number = Date.now()
): {
  shouldChange: boolean;
  newCountry: string | null;
  newRegion: string | null;
  reason: string;
} {
  // Need full buffer
  if (state.readingBuffer.length < WINDOW_SIZE) {
    return {
      shouldChange: false,
      newCountry: null,
      newRegion: null,
      reason: `Buffer not full (${state.readingBuffer.length}/${WINDOW_SIZE})`,
    };
  }

  const majority = getMajorityCountry(state.readingBuffer);

  if (!majority) {
    return {
      shouldChange: false,
      newCountry: null,
      newRegion: null,
      reason: 'No majority found',
    };
  }

  // If no current country, accept first majority
  if (!state.currentCountry) {
    const region = getRegionForCountry(state.readingBuffer, majority.countryCode);
    return {
      shouldChange: true,
      newCountry: majority.countryCode,
      newRegion: region,
      reason: 'Initial country detection',
    };
  }

  // Same country, no change needed
  if (majority.countryCode === state.currentCountry) {
    return {
      shouldChange: false,
      newCountry: null,
      newRegion: null,
      reason: 'Same country',
    };
  }

  // Different country detected

  // Check majority threshold
  if (majority.count < MIN_MATCHES) {
    return {
      shouldChange: false,
      newCountry: null,
      newRegion: null,
      reason: `Insufficient matches (${majority.count}/${MIN_MATCHES})`,
    };
  }

  // Check dwell time
  const timeSinceLastChange = now - state.lastChangeTimestamp;
  if (timeSinceLastChange < DWELL_TIME_MS) {
    return {
      shouldChange: false,
      newCountry: null,
      newRegion: null,
      reason: `Dwell time not met (${Math.round(timeSinceLastChange / 1000)}s/${Math.round(DWELL_TIME_MS / 1000)}s)`,
    };
  }

  // All conditions met, approve change
  const region = getRegionForCountry(state.readingBuffer, majority.countryCode);
  return {
    shouldChange: true,
    newCountry: majority.countryCode,
    newRegion: region,
    reason: `Majority vote (${majority.count}/${WINDOW_SIZE}) + dwell time met`,
  };
}

/**
 * Apply country change to state
 * Returns updated state (immutable)
 */
export function applyCountryChange(
  state: HisteresisState,
  newCountry: string,
  newRegion: string | null,
  timestamp: number = Date.now()
): HisteresisState {
  return {
    ...state,
    currentCountry: newCountry,
    currentRegion: newRegion,
    lastChangeTimestamp: timestamp,
    readingBuffer: [], // Clear buffer after successful change
  };
}

/**
 * Reset histeresis state (e.g., user manually changed country)
 */
export function resetHisteresisState(): HisteresisState {
  return createHisteresisState();
}
