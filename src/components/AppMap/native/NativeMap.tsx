import React from 'react';
import { View } from 'react-native';
import { AppMapProps } from '../types';
import { MAP_STYLE_URL } from '../../../config/maps';

let MapboxGL: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  MapboxGL = require('@maplibre/maplibre-react-native');
  if (MapboxGL?.setAccessToken) MapboxGL.setAccessToken(null);
} catch {
  MapboxGL = null;
}

export default function NativeMap({ center, zoom = 13, markers = [], polylines = [] }: AppMapProps) {
  if (!MapboxGL) return <View style={{ flex: 1 }} />;

  return (
    <View style={{ flex: 1 }}>
      <MapboxGL.MapView style={{ flex: 1 }} styleURL={MAP_STYLE_URL}>
        <MapboxGL.Camera zoomLevel={zoom} centerCoordinate={[center.longitude, center.latitude]} />
        {markers.map(m => (
          <MapboxGL.PointAnnotation key={m.id} id={m.id} coordinate={[m.coord.longitude, m.coord.latitude]} />
        ))}
        {polylines.map(pl => (
          <MapboxGL.ShapeSource
            key={pl.id}
            id={pl.id}
            shape={{
              type: 'Feature',
              geometry: { type: 'LineString', coordinates: pl.path.map(p => [p.longitude, p.latitude]) },
              properties: {}
            }}
          >
            <MapboxGL.LineLayer id={`${pl.id}-line`} style={{ lineWidth: 4, lineColor: '#007AFF' }} />
          </MapboxGL.ShapeSource>
        ))}
      </MapboxGL.MapView>
    </View>
  );
}
