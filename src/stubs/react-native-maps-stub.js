// Stub for react-native-maps when running on web
// This prevents Metro from trying to bundle the incompatible native module

export default function MapView() {
  return null;
}

export function Marker() {
  return null;
}

export const PROVIDER_GOOGLE = 'google';

// Default export for the MapView
export { MapView as default };
