import React from 'react';
import MapTilerMap from '../MapTilerMap';
import type { AppMapProps } from './types';

export default function AppMap(props: AppMapProps) {
  // Convertir AppMapProps a MapTilerMapProps
  const markers = props.markers?.map((marker, index) => ({
    id: `marker-${index}`,
    coordinate: {
      latitude: marker.coord.latitude,
      longitude: marker.coord.longitude
    },
    title: marker.title || `Marcador ${index + 1}`,
    description: `Marcador ${index + 1}` // AppMap markers no tienen description
  })) || [];

  const center = {
    latitude: props.center.latitude,
    longitude: props.center.longitude
  };

  return (
    <MapTilerMap
      center={center}
      markers={markers}
      zoom={props.zoom}
      showUserLocation={props.showUserLocation}
      style={{ flex: 1 }}
    />
  );
}
