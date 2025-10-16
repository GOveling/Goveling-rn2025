import React from 'react';

import MapTilerMap from '../../../src/components/MapTilerMap';

type Coord = { lat: number; lng: number };

export default function PolylineMap({
  coords,
  origin,
  dest,
  refitKey,
}: {
  coords: Coord[];
  origin?: Coord;
  dest?: Coord;
  refitKey?: any;
}) {
  // Convertir coordenadas a markers
  const markers = [];

  if (origin) {
    markers.push({
      id: 'origin',
      coordinate: { latitude: origin.lat, longitude: origin.lng },
      title: 'Origen',
      description: 'Punto de partida',
    });
  }

  if (dest) {
    markers.push({
      id: 'destination',
      coordinate: { latitude: dest.lat, longitude: dest.lng },
      title: 'Destino',
      description: 'Punto de llegada',
    });
  }

  // Si hay puntos intermedios, agregarlos también
  coords.forEach((coord, index) => {
    if (coord.lat !== origin?.lat || coord.lng !== origin?.lng) {
      if (coord.lat !== dest?.lat || coord.lng !== dest?.lng) {
        markers.push({
          id: `waypoint-${index}`,
          coordinate: { latitude: coord.lat, longitude: coord.lng },
          title: `Punto ${index + 1}`,
          description: 'Punto de ruta',
        });
      }
    }
  });

  // Calcular centro basado en todos los puntos
  const allCoords = [...coords];
  if (origin) allCoords.push(origin);
  if (dest) allCoords.push(dest);

  const center =
    allCoords.length > 0
      ? {
          latitude: allCoords.reduce((sum, coord) => sum + coord.lat, 0) / allCoords.length,
          longitude: allCoords.reduce((sum, coord) => sum + coord.lng, 0) / allCoords.length,
        }
      : { latitude: 0, longitude: 0 };

  return (
    <MapTilerMap
      center={center}
      markers={markers}
      showUserLocation={false}
      zoom={12}
      style={{ height: 300, borderRadius: 12 }}
    />
  );
}
