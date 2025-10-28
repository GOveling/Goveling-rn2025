/**
 * UnifiedSpeedTracker - Analyzes user movement speed and classifies movement type
 * Optimizes battery consumption by adjusting tracking frequency based on movement
 */

import { Coordinates, calculateHaversineDistance } from './geoUtils';

export type MovementType = 'stationary' | 'walking' | 'running' | 'vehicle';
export type EnergyMode = 'normal' | 'saving' | 'ultra-saving';

interface SpeedReading {
  timestamp: number;
  location: Coordinates;
  speed: number; // meters per second
  accuracy?: number;
}

interface MovementAnalysis {
  movementType: MovementType;
  currentSpeed: number; // m/s
  averageSpeed: number; // m/s
  suggestedEnergyMode: EnergyMode;
  isStationary: boolean;
  stationaryDuration: number; // milliseconds
}

class UnifiedSpeedTracker {
  private speedReadings: SpeedReading[] = [];
  private readonly MAX_READINGS = 20;
  private readonly STATIONARY_THRESHOLD = 0.5; // m/s
  private readonly WALKING_THRESHOLD = 2.0; // m/s
  private readonly RUNNING_THRESHOLD = 4.0; // m/s
  private readonly STATIONARY_TIME_FOR_ULTRA_SAVING = 5 * 60 * 1000; // 5 minutes

  private lastStationaryCheck: number = Date.now();
  private stationaryStartTime: number | null = null;

  /**
   * Add a new GPS reading to the tracker
   * @param location Current location
   * @param accuracy GPS accuracy in meters
   */
  addReading(location: Coordinates, accuracy?: number): void {
    const now = Date.now();

    // Calculate speed if we have a previous reading
    let speed = 0;
    if (this.speedReadings.length > 0) {
      const lastReading = this.speedReadings[this.speedReadings.length - 1];
      const distance = calculateHaversineDistance(lastReading.location, location);
      const timeDelta = (now - lastReading.timestamp) / 1000; // seconds

      if (timeDelta > 0) {
        speed = distance / timeDelta; // m/s
      }
    }

    // Add new reading
    this.speedReadings.push({
      timestamp: now,
      location,
      speed,
      accuracy,
    });

    // Keep only the last MAX_READINGS
    if (this.speedReadings.length > this.MAX_READINGS) {
      this.speedReadings.shift();
    }

    // Update stationary tracking
    if (speed < this.STATIONARY_THRESHOLD) {
      if (this.stationaryStartTime === null) {
        this.stationaryStartTime = now;
      }
    } else {
      this.stationaryStartTime = null;
    }
  }

  /**
   * Get current movement analysis
   * @returns Movement analysis object
   */
  getMovementAnalysis(): MovementAnalysis {
    if (this.speedReadings.length === 0) {
      return {
        movementType: 'stationary',
        currentSpeed: 0,
        averageSpeed: 0,
        suggestedEnergyMode: 'normal',
        isStationary: true,
        stationaryDuration: 0,
      };
    }

    // Get recent readings (last 10 or all if less)
    const recentReadings = this.speedReadings.slice(-10);

    // Calculate average speed from recent readings
    const averageSpeed =
      recentReadings.reduce((sum, reading) => sum + reading.speed, 0) / recentReadings.length;

    // Get current speed (last reading)
    const currentSpeed = this.speedReadings[this.speedReadings.length - 1].speed;

    // Classify movement type based on average speed
    let movementType: MovementType;
    if (averageSpeed < this.STATIONARY_THRESHOLD) {
      movementType = 'stationary';
    } else if (averageSpeed < this.WALKING_THRESHOLD) {
      movementType = 'walking';
    } else if (averageSpeed < this.RUNNING_THRESHOLD) {
      movementType = 'running';
    } else {
      movementType = 'vehicle';
    }

    // Calculate stationary duration
    const stationaryDuration =
      this.stationaryStartTime !== null ? Date.now() - this.stationaryStartTime : 0;

    // Determine if truly stationary
    const isStationary = movementType === 'stationary';

    // Suggest energy mode
    let suggestedEnergyMode: EnergyMode;
    if (isStationary && stationaryDuration > this.STATIONARY_TIME_FOR_ULTRA_SAVING) {
      suggestedEnergyMode = 'ultra-saving';
    } else if (isStationary || movementType === 'walking') {
      suggestedEnergyMode = 'saving';
    } else {
      suggestedEnergyMode = 'normal';
    }

    return {
      movementType,
      currentSpeed,
      averageSpeed,
      suggestedEnergyMode,
      isStationary,
      stationaryDuration,
    };
  }

  /**
   * Get current movement type
   * @returns Movement type
   */
  getMovementType(): MovementType {
    return this.getMovementAnalysis().movementType;
  }

  /**
   * Get suggested energy mode based on current movement
   * @returns Suggested energy mode
   */
  getSuggestedEnergyMode(): EnergyMode {
    return this.getMovementAnalysis().suggestedEnergyMode;
  }

  /**
   * Check if user has been stationary for a significant time
   * @returns True if stationary for 5+ minutes
   */
  isStationaryForLongTime(): boolean {
    const analysis = this.getMovementAnalysis();
    return (
      analysis.isStationary && analysis.stationaryDuration > this.STATIONARY_TIME_FOR_ULTRA_SAVING
    );
  }

  /**
   * Reset the tracker (clear all readings)
   */
  reset(): void {
    this.speedReadings = [];
    this.stationaryStartTime = null;
    this.lastStationaryCheck = Date.now();
  }

  /**
   * Get all speed readings (for debugging)
   */
  getReadings(): SpeedReading[] {
    return [...this.speedReadings];
  }

  /**
   * Get readable movement summary
   */
  getMovementSummary(): string {
    const analysis = this.getMovementAnalysis();
    const speedKmh = (analysis.currentSpeed * 3.6).toFixed(1);

    switch (analysis.movementType) {
      case 'stationary':
        return `Parado (${speedKmh} km/h)`;
      case 'walking':
        return `Caminando (${speedKmh} km/h)`;
      case 'running':
        return `Corriendo (${speedKmh} km/h)`;
      case 'vehicle':
        return `En vehículo (${speedKmh} km/h)`;
      default:
        return `Desconocido (${speedKmh} km/h)`;
    }
  }
}

// Export singleton instance
export const unifiedSpeedTracker = new UnifiedSpeedTracker();
export default UnifiedSpeedTracker;
