/**
 * Travel Mode Module Exports
 */

// Components
export { TravelModeModal } from './TravelModeModal';

// Context
export { TravelModeProvider, useTravelMode } from '~/contexts/TravelModeContext';
export type { TravelModeState, TravelModeActions } from '~/contexts/TravelModeContext';

// Services
export { backgroundTravelManager } from '~/services/travelMode/BackgroundTravelManager';
export { travelNotificationService } from '~/services/travelMode/TravelNotificationService';
export { navigationService } from '~/services/travelMode/NavigationService';
export { deviationDetectionService } from '~/services/travelMode/DeviationDetectionService';
export { unifiedSpeedTracker } from '~/services/travelMode/UnifiedSpeedTracker';

// Types
export type {
  TravelMode,
  NavigationRoute,
  WaypointPlace,
} from '~/services/travelMode/NavigationService';
export type { EnergyMode, MovementType } from '~/services/travelMode/UnifiedSpeedTracker';
export type { SavedPlace, NearbyPlace } from '~/hooks/useTravelModeSimple';
