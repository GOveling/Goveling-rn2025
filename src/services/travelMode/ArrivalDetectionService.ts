/**
 * ArrivalDetectionService - Smart proximity detection for place arrivals
 * Optimized for large venues (airports, stadiums, parks) and small locations (restaurants, cafes)
 * Includes dwelling time logic to prevent false positives
 * iOS & Android native hardware optimized
 */

import { calculateHaversineDistance } from './geoUtils';
import { getAdaptiveRadius, isLargeVenue } from './VenueSizeHeuristics';

export interface PlaceArrival {
  placeId: string;
  placeName: string;
  distance: number; // meters
  enteredAt: Date;
  isWithinRadius: boolean;
  dwellingTimeSeconds: number; // time user has been within radius
  detectionRadius: number; // radius used for detection
}

interface PlaceProximityState {
  placeId: string;
  enteredAt: Date | null;
  lastDistance: number;
  consecutiveReadings: number; // How many consecutive readings within radius
  skipNotification: boolean; // User skipped this place
  isBlocked: boolean; // Blocked due to nearby place detection
  blockedUntil: Date | null; // When block expires
}

interface ArrivalDetectionConfig {
  dwellingTimeThresholdSeconds: number; // Minimum time to confirm arrival
  consecutiveReadingsRequired: number; // Minimum consecutive readings within radius
  exitDistanceMultiplier: number; // Distance multiplier to consider user has left
  blockDurationMs: number; // How long to block nearby places
}

const DEFAULT_CONFIG: ArrivalDetectionConfig = {
  dwellingTimeThresholdSeconds: 15, // 15 seconds minimum (reduced from 30 for faster detection)
  consecutiveReadingsRequired: 2, // 2 consecutive readings (reduced from 3 for faster detection)
  exitDistanceMultiplier: 1.5, // 1.5x radius to exit
  blockDurationMs: 5 * 60 * 1000, // 5 minutes
};

export class ArrivalDetectionService {
  private proximityStates: Map<string, PlaceProximityState> = new Map();
  private arrivedPlaces: Set<string> = new Set(); // Places user has already arrived at
  private activeArrivalPlaceId: string | null = null; // Currently showing modal
  private config: ArrivalDetectionConfig;

  constructor(config?: Partial<ArrivalDetectionConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Check if user has arrived at a place
   * Returns arrival event if conditions are met
   */
  checkArrival(
    placeId: string,
    placeName: string,
    placeCoordinates: { latitude: number; longitude: number },
    placeTypes: string[] | undefined,
    userCoordinates: { latitude: number; longitude: number },
    timestamp: Date = new Date()
  ): PlaceArrival | null {
    // Skip if there's already a modal open for another place
    if (this.activeArrivalPlaceId && this.activeArrivalPlaceId !== placeId) {
      console.log(
        `⏸️  ArrivalDetection: Skipping ${placeName} - Modal already open for another place (${this.activeArrivalPlaceId})`
      );
      return null;
    }

    // Skip if user has already arrived at this place
    if (this.arrivedPlaces.has(placeId)) {
      console.log(
        `⏸️  ArrivalDetection: Skipping ${placeName} - Already arrived/confirmed in this session`
      );
      return null;
    }

    // Calculate distance
    const distance = calculateHaversineDistance(userCoordinates, placeCoordinates);

    // Get adaptive radius for this place type
    const radius = getAdaptiveRadius(placeTypes);

    const isWithinRadius = distance <= radius;

    console.log(
      `📍 ArrivalDetection: Checking ${placeName}\n` +
        `   Distance: ${distance.toFixed(0)}m / Radius: ${radius}m\n` +
        `   Within radius: ${isWithinRadius ? 'YES ✅' : 'NO ❌'}\n` +
        `   Place types: ${placeTypes?.join(', ') || 'none'}`
    );

    // Get or create proximity state
    let state = this.proximityStates.get(placeId);

    if (!state) {
      state = {
        placeId,
        enteredAt: null,
        lastDistance: distance,
        consecutiveReadings: 0,
        skipNotification: false,
        isBlocked: false,
        blockedUntil: null,
      };
      this.proximityStates.set(placeId, state);
    }

    // Check if place is blocked
    if (state.isBlocked && state.blockedUntil) {
      if (timestamp < state.blockedUntil) {
        const remainingMs = state.blockedUntil.getTime() - timestamp.getTime();
        console.log(
          `🚫 ArrivalDetection: ${placeName} is BLOCKED\n` +
            `   Blocked until: ${state.blockedUntil.toISOString()}\n` +
            `   Time remaining: ${Math.ceil(remainingMs / 1000)}s`
        );
        return null;
      } else {
        console.log(`🔓 ArrivalDetection: ${placeName} UNBLOCKED - block expired`);
        state.isBlocked = false;
        state.blockedUntil = null;
      }
    }

    // Check if user skipped this place
    if (state.skipNotification) {
      console.log(
        `⏩ ArrivalDetection: ${placeName} was SKIPPED by user - will not trigger notification`
      );
      return null;
    }

    // Update state based on proximity
    if (isWithinRadius) {
      // User is within radius
      if (!state.enteredAt) {
        // First time entering radius
        state.enteredAt = timestamp;
        state.consecutiveReadings = 1;
        console.log(
          `🎯 ArrivalDetection: User entered radius for ${placeName}\n` +
            `   Distance: ${distance.toFixed(0)}m / Radius: ${radius}m\n` +
            `   Started tracking at: ${timestamp.toISOString()}`
        );
      } else {
        // Still within radius
        state.consecutiveReadings++;
        console.log(
          `🔄 ArrivalDetection: Still within radius for ${placeName}\n` +
            `   Distance: ${distance.toFixed(0)}m / Radius: ${radius}m\n` +
            `   Consecutive readings: ${state.consecutiveReadings}/${this.config.consecutiveReadingsRequired}\n` +
            `   Time elapsed: ${((timestamp.getTime() - state.enteredAt.getTime()) / 1000).toFixed(1)}s`
        );
      }

      state.lastDistance = distance;

      // Check if dwelling time and consecutive readings thresholds are met
      const dwellingTime = state.enteredAt
        ? (timestamp.getTime() - state.enteredAt.getTime()) / 1000
        : 0;

      // Adjust dwelling time threshold for large venues
      const dwellingThreshold = isLargeVenue(placeTypes)
        ? this.config.dwellingTimeThresholdSeconds * 1.5
        : this.config.dwellingTimeThresholdSeconds;

      // Log progress towards arrival confirmation
      console.log(
        `⏱️  ArrivalDetection Progress for ${placeName}:\n` +
          `   Dwelling time: ${dwellingTime.toFixed(1)}s / ${dwellingThreshold}s required\n` +
          `   Consecutive readings: ${state.consecutiveReadings}/${this.config.consecutiveReadingsRequired} required\n` +
          `   Distance: ${distance.toFixed(0)}m / ${radius}m radius\n` +
          `   Progress: ${Math.min(100, (dwellingTime / dwellingThreshold) * 100).toFixed(0)}% time, ` +
          `${Math.min(100, (state.consecutiveReadings / this.config.consecutiveReadingsRequired) * 100).toFixed(0)}% readings`
      );

      if (
        dwellingTime >= dwellingThreshold &&
        state.consecutiveReadings >= this.config.consecutiveReadingsRequired
      ) {
        // ARRIVAL CONFIRMED!
        console.log(
          `✅ ArrivalDetection: ARRIVAL CONFIRMED for ${placeName}\n` +
            `   Distance: ${distance.toFixed(0)}m (radius: ${radius}m)\n` +
            `   Dwelling time: ${dwellingTime.toFixed(0)}s\n` +
            `   Consecutive readings: ${state.consecutiveReadings}`
        );

        // Mark as active arrival
        this.activeArrivalPlaceId = placeId;

        // Block nearby places
        this.blockNearbyPlaces(placeId, timestamp);

        // Mark as arrived
        this.arrivedPlaces.add(placeId);

        return {
          placeId,
          placeName,
          distance,
          enteredAt: state.enteredAt,
          isWithinRadius: true,
          dwellingTimeSeconds: dwellingTime,
          detectionRadius: radius,
        };
      }

      // Still building up to arrival
      return null;
    } else {
      // User is outside radius
      const exitThreshold = radius * this.config.exitDistanceMultiplier;

      if (state.enteredAt && distance > exitThreshold) {
        // User has left the area, reset state
        console.log(
          `🚪 ArrivalDetection: User exited radius for ${placeName} (${distance.toFixed(0)}m > ${exitThreshold.toFixed(0)}m)`
        );
        state.enteredAt = null;
        state.consecutiveReadings = 0;
      }

      state.lastDistance = distance;
      return null;
    }
  }

  /**
   * Block nearby places when one is detected
   */
  private blockNearbyPlaces(detectedPlaceId: string, currentTime: Date): void {
    const blockUntil = new Date(currentTime.getTime() + this.config.blockDurationMs);

    this.proximityStates.forEach((state, placeId) => {
      if (placeId === detectedPlaceId) return;

      if (state.lastDistance < 200) {
        state.isBlocked = true;
        state.blockedUntil = blockUntil;
      }
    });
  }

  /**
   * Confirm user visit - marks place as permanently visited
   */
  confirmVisit(placeId: string): void {
    this.arrivedPlaces.add(placeId);
    this.proximityStates.delete(placeId);

    if (this.activeArrivalPlaceId === placeId) {
      this.activeArrivalPlaceId = null;
    }

    console.log(`✅ ArrivalDetection: Visit confirmed for ${placeId}`);
  }

  /**
   * Skip notification for a place (called when user taps "Saltar" in modal)
   */
  skipVisit(placeId: string): void {
    const state = this.proximityStates.get(placeId);
    if (state) {
      state.skipNotification = true;
    }

    if (this.activeArrivalPlaceId === placeId) {
      this.activeArrivalPlaceId = null;
    }
  }

  /**
   * Reset arrival state for a place (useful if user visits again)
   */
  resetPlace(placeId: string): void {
    this.proximityStates.delete(placeId);
    this.arrivedPlaces.delete(placeId);
    console.log(`🔄 ArrivalDetection: Reset place ${placeId} - can be detected again`);
  }

  /**
   * Reset all arrival states
   */
  resetAll(): void {
    this.proximityStates.clear();
    this.arrivedPlaces.clear();
    this.activeArrivalPlaceId = null;
    console.log('🔄 ArrivalDetection: Reset all states - fresh start');
  }

  /**
   * Get current proximity state for a place (for debugging)
   */
  getProximityState(placeId: string): PlaceProximityState | undefined {
    return this.proximityStates.get(placeId);
  }

  /**
   * Check if user has already arrived at a place
   */
  hasArrived(placeId: string): boolean {
    return this.arrivedPlaces.has(placeId);
  }

  /**
   * Get debugging statistics
   */
  getDebugStats(): {
    totalTrackedPlaces: number;
    arrivedPlaces: number;
    activeArrivalPlaceId: string | null;
    blockedPlaces: number;
    skippedPlaces: number;
    placesInProgress: Array<{
      placeId: string;
      enteredAt: Date | null;
      consecutiveReadings: number;
      isBlocked: boolean;
      skipNotification: boolean;
    }>;
  } {
    const blockedPlaces = Array.from(this.proximityStates.values()).filter(
      (s) => s.isBlocked
    ).length;
    const skippedPlaces = Array.from(this.proximityStates.values()).filter(
      (s) => s.skipNotification
    ).length;

    return {
      totalTrackedPlaces: this.proximityStates.size,
      arrivedPlaces: this.arrivedPlaces.size,
      activeArrivalPlaceId: this.activeArrivalPlaceId,
      blockedPlaces,
      skippedPlaces,
      placesInProgress: Array.from(this.proximityStates.entries()).map(([id, state]) => ({
        placeId: id,
        enteredAt: state.enteredAt,
        consecutiveReadings: state.consecutiveReadings,
        isBlocked: state.isBlocked,
        skipNotification: state.skipNotification,
      })),
    };
  }

  /**
   * Get all places user has arrived at
   */
  getArrivedPlaces(): string[] {
    return Array.from(this.arrivedPlaces);
  }
}

// Singleton instance
export const arrivalDetectionService = new ArrivalDetectionService();
