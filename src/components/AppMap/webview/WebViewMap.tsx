import React, { useMemo } from 'react';
import { WebView } from 'react-native-webview';
import { AppMapProps } from '../types';

const buildHtml = (props: AppMapProps) => `<!doctype html><html><head>
<meta name=viewport content="initial-scale=1, width=device-width" />
<link href="https://unpkg.com/maplibre-gl/dist/maplibre-gl.css" rel="stylesheet" />
<style> html, body, #map { margin:0; height:100%; } </style>
</head><body><div id="map"></div>
<script src="https://unpkg.com/maplibre-gl/dist/maplibre-gl.js"></script>
<script>
 const props = ${JSON.stringify(props)};
 const map = new maplibregl.Map({
   container: 'map',
   style: 'https://demotiles.maplibre.org/style.json',
   center: [props.center.longitude, props.center.latitude],
   zoom: props.zoom || 13
 });
 map.on('load', ()=>{
   (props.markers||[]).forEach(m=>{ new maplibregl.Marker().setLngLat([m.coord.longitude, m.coord.latitude]).addTo(map); });
   (props.polylines||[]).forEach(pl=>{
     map.addSource(pl.id,{ type:'geojson', data:{ type:'Feature', geometry:{ type:'LineString', coordinates: pl.path.map(p=>[p.longitude,p.latitude]) }, properties:{} }});
     map.addLayer({ id: pl.id, type:'line', source: pl.id, paint:{ 'line-width':4, 'line-color':'#007AFF' } });
   });
 });
</script></body></html>`;

export default function WebViewMap(props: AppMapProps) {
  const html = useMemo(() => buildHtml(props), [JSON.stringify(props)]);
  return <WebView originWhitelist={['*']} source={{ html }} />;
}
