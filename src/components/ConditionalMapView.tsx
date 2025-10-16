import React from 'react';

import MapTilerMap from './MapTilerMap';

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

export default function ConditionalMapView({
  accommodations,
  style,
  mapRegion,
}: ConditionalMapViewProps) {
  // Convertir accommodations a markers para MapTilerMap
  const markers = accommodations.map((acc) => ({
    id: acc.id,
    coordinate: {
      latitude: acc.latitude,
      longitude: acc.longitude,
    },
    title: acc.name,
    description: `${acc.type} - ${acc.address}`,
  }));

  // Usar el centro de la región si está disponible
  const center = mapRegion
    ? {
        latitude: mapRegion.latitude,
        longitude: mapRegion.longitude,
      }
    : undefined;

  return <MapTilerMap markers={markers} center={center} style={style} showUserLocation={true} />;
}
