import React from 'react';
import SimpleMap from './SimpleMap';

interface Accommodation {
  id: string;
  name: string;
  type: string;
  address: string;
  latitude: number;
  longitude: number;
}

interface ConditionalMapViewProps {
  accommodations: Accommodation[];
  style?: any;
  mapRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
}

// Native version (iOS/Android) - Always use SimpleMap for now to avoid bundling issues
export default function ConditionalMapView({ accommodations, style }: ConditionalMapViewProps) {
  // For now, always use SimpleMap to avoid Metro bundling issues
  return (
    <SimpleMap 
      accommodations={accommodations}
      style={style}
    />
  );
}
