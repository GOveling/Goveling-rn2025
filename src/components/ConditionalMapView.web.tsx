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

// Web version always uses SimpleMap
export default function ConditionalMapView({ accommodations, style }: ConditionalMapViewProps) {
  return <SimpleMap accommodations={accommodations} style={style} />;
}
