/**
 * NavigationService - Provides guided navigation with multi-waypoint routes
 * Uses edge function for Google Directions API when needed
 * Optimized for native hardware
 */

import { Coordinates } from './geoUtils';

export type TravelMode = 'walking' | 'bicycling' | 'driving' | 'transit';

export interface NavigationStep {
  instruction: string;
  distance: number; // meters
  duration: number; // seconds
  startLocation: Coordinates;
  endLocation: Coordinates;
  maneuver?: string;
}

export interface RouteLeg {
  steps: NavigationStep[];
  distance: number; // meters
  duration: number; // seconds
  startAddress: string;
  endAddress: string;
  startLocation: Coordinates;
  endLocation: Coordinates;
  status: 'pending' | 'active' | 'completed';
}

export interface NavigationRoute {
  legs: RouteLeg[];
  totalDistance: number; // meters
  totalDuration: number; // seconds
  polyline: string; // Encoded polyline
  travelMode: TravelMode;
  currentLegIndex: number;
  currentStepIndex: number;
}

export interface WaypointPlace {
  id: string;
  name: string;
  location: Coordinates;
  address?: string;
}

interface DirectionsResponse {
  routes?: Array<{
    legs: Array<{
      distance: { value: number };
      duration: { value: number };
      steps: Array<{
        html_instructions: string;
        distance: { value: number };
        duration: { value: number };
        start_location: { lat: number; lng: number };
        end_location: { lat: number; lng: number };
        maneuver?: string;
      }>;
      start_address: string;
      end_address: string;
      start_location: { lat: number; lng: number };
      end_location: { lat: number; lng: number };
    }>;
    overview_polyline: { points: string };
  }>;
  status: string;
  error_message?: string;
}

class NavigationService {
  private readonly DIRECTIONS_EDGE_FUNCTION =
    'https://your-supabase-project.functions.supabase.co/google-directions-enhanced';

  /**
   * Strip HTML tags from instructions
   * @param html HTML string
   * @returns Plain text
   */
  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
  }

  /**
   * Get enhanced directions between multiple waypoints
   * @param waypoints Array of places to visit
   * @param travelMode Travel mode
   * @returns Navigation route
   */
  async getEnhancedDirections(
    waypoints: WaypointPlace[],
    travelMode: TravelMode = 'walking'
  ): Promise<NavigationRoute | null> {
    if (waypoints.length < 2) {
      console.error('❌ At least 2 waypoints required for navigation');
      return null;
    }

    try {
      console.log(`🧭 Fetching directions for ${waypoints.length} waypoints (${travelMode})`);

      // Build waypoints string for API
      const origin = `${waypoints[0].location.latitude},${waypoints[0].location.longitude}`;
      const destination = `${waypoints[waypoints.length - 1].location.latitude},${waypoints[waypoints.length - 1].location.longitude}`;

      const waypointsParam =
        waypoints.length > 2
          ? waypoints
              .slice(1, -1)
              .map((wp) => `${wp.location.latitude},${wp.location.longitude}`)
              .join('|')
          : undefined;

      // Call edge function
      const url = new URL(this.DIRECTIONS_EDGE_FUNCTION);
      url.searchParams.set('origin', origin);
      url.searchParams.set('destination', destination);
      url.searchParams.set('mode', travelMode);
      if (waypointsParam) {
        url.searchParams.set('waypoints', waypointsParam);
      }

      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: DirectionsResponse = await response.json();

      if (data.status !== 'OK' || !data.routes || data.routes.length === 0) {
        console.error('❌ No routes found:', data.status, data.error_message);
        return null;
      }

      const route = data.routes[0];

      // Parse legs
      const legs: RouteLeg[] = route.legs.map((leg, index) => ({
        steps: leg.steps.map((step) => ({
          instruction: this.stripHtml(step.html_instructions),
          distance: step.distance.value,
          duration: step.duration.value,
          startLocation: {
            latitude: step.start_location.lat,
            longitude: step.start_location.lng,
          },
          endLocation: {
            latitude: step.end_location.lat,
            longitude: step.end_location.lng,
          },
          maneuver: step.maneuver,
        })),
        distance: leg.distance.value,
        duration: leg.duration.value,
        startAddress: leg.start_address,
        endAddress: leg.end_address,
        startLocation: {
          latitude: leg.start_location.lat,
          longitude: leg.start_location.lng,
        },
        endLocation: {
          latitude: leg.end_location.lat,
          longitude: leg.end_location.lng,
        },
        status: index === 0 ? 'active' : 'pending',
      }));

      // Calculate totals
      const totalDistance = legs.reduce((sum, leg) => sum + leg.distance, 0);
      const totalDuration = legs.reduce((sum, leg) => sum + leg.duration, 0);

      const navigationRoute: NavigationRoute = {
        legs,
        totalDistance,
        totalDuration,
        polyline: route.overview_polyline.points,
        travelMode,
        currentLegIndex: 0,
        currentStepIndex: 0,
      };

      console.log(`✅ Directions fetched: ${legs.length} legs, ${totalDistance}m total`);

      return navigationRoute;
    } catch (error) {
      console.error('❌ Error fetching directions:', error);
      return null;
    }
  }

  /**
   * Get simple directions between two points (without API)
   * Uses straight-line approximation for offline navigation
   * @param origin Origin coordinate
   * @param destination Destination coordinate
   * @param travelMode Travel mode
   * @returns Simple navigation route
   */
  async getSimpleDirections(
    origin: Coordinates,
    destination: Coordinates,
    travelMode: TravelMode = 'walking'
  ): Promise<NavigationRoute | null> {
    try {
      console.log('🧭 Creating simple directions (offline mode)');

      // Calculate straight-line distance
      const distance = this.calculateDistance(origin, destination);

      // Estimate duration based on travel mode
      const avgSpeed = this.getAverageSpeed(travelMode); // m/s
      const duration = Math.ceil(distance / avgSpeed);

      // Create single step
      const step: NavigationStep = {
        instruction: `Dirígete hacia el destino`,
        distance,
        duration,
        startLocation: origin,
        endLocation: destination,
      };

      // Create single leg
      const leg: RouteLeg = {
        steps: [step],
        distance,
        duration,
        startAddress: 'Tu ubicación',
        endAddress: 'Destino',
        startLocation: origin,
        endLocation: destination,
        status: 'active',
      };

      const route: NavigationRoute = {
        legs: [leg],
        totalDistance: distance,
        totalDuration: duration,
        polyline: '', // No polyline for simple directions
        travelMode,
        currentLegIndex: 0,
        currentStepIndex: 0,
      };

      console.log(`✅ Simple directions created: ${distance}m, ${duration}s`);

      return route;
    } catch (error) {
      console.error('❌ Error creating simple directions:', error);
      return null;
    }
  }

  /**
   * Calculate distance using Haversine formula
   */
  private calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
    const R = 6371000; // Earth's radius in meters
    const φ1 = (coord1.latitude * Math.PI) / 180;
    const φ2 = (coord2.latitude * Math.PI) / 180;
    const Δφ = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
    const Δλ = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Get average speed for travel mode (m/s)
   */
  private getAverageSpeed(travelMode: TravelMode): number {
    switch (travelMode) {
      case 'walking':
        return 1.4; // 5 km/h
      case 'bicycling':
        return 4.2; // 15 km/h
      case 'driving':
        return 13.9; // 50 km/h
      case 'transit':
        return 8.3; // 30 km/h
      default:
        return 1.4;
    }
  }

  /**
   * Format duration in human-readable format
   * @param seconds Duration in seconds
   * @returns Formatted string
   */
  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes}min`;
  }

  /**
   * Format distance in human-readable format
   * @param meters Distance in meters
   * @returns Formatted string
   */
  formatDistance(meters: number): string {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${Math.round(meters)} m`;
  }

  /**
   * Get current navigation instruction
   * @param route Navigation route
   * @returns Current instruction
   */
  getCurrentInstruction(route: NavigationRoute): string {
    const currentLeg = route.legs[route.currentLegIndex];
    if (!currentLeg) {
      return 'Sin instrucciones';
    }

    const currentStep = currentLeg.steps[route.currentStepIndex];
    if (!currentStep) {
      return 'Sin instrucciones';
    }

    return currentStep.instruction;
  }

  /**
   * Get distance to next step
   * @param route Navigation route
   * @returns Distance in meters
   */
  getDistanceToNextStep(route: NavigationRoute): number {
    const currentLeg = route.legs[route.currentLegIndex];
    if (!currentLeg) {
      return 0;
    }

    const currentStep = currentLeg.steps[route.currentStepIndex];
    if (!currentStep) {
      return 0;
    }

    return currentStep.distance;
  }

  /**
   * Update route progress
   * @param route Current route
   * @param completed True if current step is completed
   * @returns Updated route
   */
  updateProgress(route: NavigationRoute, completed: boolean): NavigationRoute {
    if (!completed) {
      return route;
    }

    const currentLeg = route.legs[route.currentLegIndex];

    // Move to next step
    if (route.currentStepIndex < currentLeg.steps.length - 1) {
      return {
        ...route,
        currentStepIndex: route.currentStepIndex + 1,
      };
    }

    // Move to next leg
    if (route.currentLegIndex < route.legs.length - 1) {
      const updatedLegs = route.legs.map((leg, index) => {
        if (index === route.currentLegIndex) {
          return { ...leg, status: 'completed' as const };
        }
        if (index === route.currentLegIndex + 1) {
          return { ...leg, status: 'active' as const };
        }
        return leg;
      });

      return {
        ...route,
        legs: updatedLegs,
        currentLegIndex: route.currentLegIndex + 1,
        currentStepIndex: 0,
      };
    }

    // Route completed
    return route;
  }
}

// Export singleton instance
export const navigationService = new NavigationService();
export default NavigationService;
