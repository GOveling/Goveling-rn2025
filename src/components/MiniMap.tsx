import React from 'react';
import MapTilerMap from './MapTilerMap';

type Props = {
  lat: number;
  lng: number;
  height?: number;
  title?: string;
};

export default function MiniMap({ lat, lng, height = 120, title }: Props) {
  const marker = {
    id: 'location',
    coordinate: {
      latitude: lat,
      longitude: lng
    },
    title: title || 'Ubicación'
  };

  const center = {
    latitude: lat,
    longitude: lng
  };

  return (
    <MapTilerMap
      center={center}
      markers={[marker]}
      zoom={14}
      showUserLocation={false}
      style={{
        height,
        borderRadius: 10,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#eee'
      }}
    />
  );
}