import React from 'react';

import MapTilerMap from '../MapTilerMap';
import type { AppMapProps } from './types';

export default function AppMap(props: AppMapProps) {
  // Convertir AppMapProps a MapTilerMapProps
  const markers =
    props.markers?.map((marker, index) => ({
      id: `marker-${index}`,
      coordinate: {
        latitude: marker.coord.latitude,
        longitude: marker.coord.longitude,
      },
      title: marker.title || `Marcador ${index + 1}`,
      description: `Marcador ${index + 1}`, // AppMap markers no tienen description
      color: marker.color, // Pasar la información de color
    })) || [];

  const center = {
    latitude: props.center.latitude,
    longitude: props.center.longitude,
  };

  // Manejar el clic en marcador
  const handleMarkerPress = (markerId: string) => {
    if (props.onMarkerPress && props.markers) {
      // Extraer el índice del ID del marcador (formato: marker-0, marker-1, etc.)
      const markerIndex = parseInt(markerId.split('-')[1]);
      if (!isNaN(markerIndex) && markerIndex < props.markers.length) {
        const markerData = props.markers[markerIndex];
        props.onMarkerPress(markerId, markerData);
      }
    }
  };

  return (
    <MapTilerMap
      center={center}
      markers={markers}
      zoom={props.zoom}
      showUserLocation={props.showUserLocation}
      onLocationFound={props.onLocationFound}
      onLocationError={props.onLocationError}
      onMarkerPress={handleMarkerPress}
      style={{ flex: 1 }}
    />
  );
}
