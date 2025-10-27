export type LatLng = { latitude: number; longitude: number };
export type Polyline = LatLng[];

export type AppMapProps = {
  style?: any;
  center: LatLng;
  zoom?: number;
  markers?: Array<{ id: string; coord: LatLng; title?: string; color?: string }>;
  polylines?: Array<{ id: string; path: Polyline }>;
  onRegionChange?: (center: LatLng, zoom: number) => void;
  showUserLocation?: boolean;
  onLocationFound?: (location: LatLng) => void;
  onLocationError?: (error: string) => void;
  onMarkerPress?: (
    markerId: string,
    markerData: { id: string; coord: LatLng; title?: string; color?: string }
  ) => void;
};
