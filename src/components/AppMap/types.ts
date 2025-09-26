export type LatLng = { latitude: number; longitude: number };
export type Polyline = LatLng[];

export type AppMapProps = {
  style?: any;
  center: LatLng;
  zoom?: number;
  markers?: Array<{ id: string; coord: LatLng; title?: string }>;
  polylines?: Array<{ id: string; path: Polyline }>;
  onRegionChange?: (center: LatLng, zoom: number) => void;
};
