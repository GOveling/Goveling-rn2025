import React, { useEffect, useRef } from 'react';

import { Platform, View, Text, StyleSheet } from 'react-native';

import { WebView } from 'react-native-webview';

// Intent: Estrategia multiplataforma optimizada:
// - Web y Android: MapLibre GL JS (mejor rendimiento, más personalizable)
// - iOS: Apple Maps (MapKit) - Cumple guidelines de Apple, mejor integración nativa
// - Fallback: WebView con MapLibre para Expo Go

// Importar AppleMap para iOS
let AppleMap: any = null;
try {
  AppleMap = require('./AppleMap').default;
} catch (e) {
  AppleMap = null;
}

interface PlaceLike {
  id?: string | number;
  name?: string;
  title?: string;
  coordinates?: { lat: number; lng: number };
}

interface UniversalMapProps {
  userLocation: { latitude: number; longitude: number } | null;
  places: PlaceLike[];
  style?: any;
}

let NativeMapLibre: any = null;
try {
  // @maplibre/maplibre-react-native es el paquete correcto instalado
  NativeMapLibre = require('@maplibre/maplibre-react-native');
} catch (e) {
  NativeMapLibre = null;
}

export const UniversalMap: React.FC<UniversalMapProps> = ({ userLocation, places, style }) => {
  // 1. Web: MapLibre GL JS directo
  if (Platform.OS === 'web') {
    return <WebDirectMap userLocation={userLocation} places={places} style={style} />;
  }

  // 2. iOS: Apple Maps (MapKit) para mejor integración nativa
  if (Platform.OS === 'ios' && AppleMap) {
    return <AppleMap userLocation={userLocation} places={places} style={style} />;
  }

  // 3. Android: MapLibre nativo (si está disponible)
  if (Platform.OS === 'android' && NativeMapLibre) {
    return <NativeMapLibreComponent userLocation={userLocation} places={places} style={style} />;
  }

  // 4. Fallback universal: WebView con MapLibre GL JS (Expo Go y otros casos)
  return <WebViewMap userLocation={userLocation} places={places} style={style} />;
};

/* ================= WEB (DOM) ================= */
const WebDirectMap: React.FC<UniversalMapProps> = ({ userLocation, places, style }) => {
  const divRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let map: any;
    let cancelled = false;

    (async () => {
      if (!divRef.current) return;

      // Cargar CSS si no existe
      if (typeof document !== 'undefined' && !document.getElementById('maplibre-gl-css')) {
        const link = document.createElement('link');
        link.id = 'maplibre-gl-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css';
        document.head.appendChild(link);
      }

      const maplibregl = await import('maplibre-gl');
      if (cancelled) return;

      const center = getInitialCenter(userLocation, places);

      map = new maplibregl.Map({
        container: divRef.current,
        style: 'https://demotiles.maplibre.org/style.json',
        center,
        zoom: 12,
      });

      map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');

      map.on('load', () => {
        // Marcador usuario
        if (userLocation) {
          const el = document.createElement('div');
          el.style.width = '18px';
          el.style.height = '18px';
          el.style.background = '#007AFF';
          el.style.borderRadius = '50%';
          el.style.boxShadow = '0 0 0 3px rgba(0,122,255,0.3)';
          new maplibregl.Marker(el)
            .setLngLat([userLocation.longitude, userLocation.latitude])
            .addTo(map);
        }
        // Marcadores lugares
        places
          .filter((p) => p.coordinates)
          .forEach((p, idx) => {
            const el = document.createElement('div');
            el.style.width = '24px';
            el.style.height = '24px';
            el.style.background = '#FF3B30';
            el.style.color = '#fff';
            el.style.fontSize = '12px';
            el.style.fontWeight = '600';
            el.style.display = 'flex';
            el.style.alignItems = 'center';
            el.style.justifyContent = 'center';
            el.style.borderRadius = '50%';
            el.style.border = '2px solid #fff';
            el.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3)';
            el.innerText = String(idx + 1);
            new maplibregl.Marker(el)
              .setLngLat([p.coordinates!.lng, p.coordinates!.lat])
              .addTo(map);
          });

        fitBoundsIfNeeded(map, maplibregl, userLocation, places);
      });
    })();

    return () => {
      cancelled = true;
      if (map) map.remove();
    };
  }, [
    userLocation?.latitude,
    userLocation?.longitude,
    JSON.stringify(places.map((p) => p.coordinates)),
  ]);

  return (
    <View style={[styles.flex, style]}>
      <div ref={divRef} style={{ width: '100%', height: '100%' }} />
    </View>
  );
};

/* ============= NATIVE WEBVIEW FALLBACK (Expo Go) ============= */
const WebViewMap: React.FC<UniversalMapProps> = ({ userLocation, places, style }) => {
  const center = getInitialCenter(userLocation, places);
  const serialized = JSON.stringify({
    center,
    userLocation,
    places: places.map((p, i) => ({
      i,
      name: p.name || p.title || `Lugar ${i + 1}`,
      coord: p.coordinates || null,
    })),
  });

  const html = `<!DOCTYPE html><html lang='en'><head><meta charset='utf-8'/>
  <meta name='viewport' content='width=device-width,initial-scale=1'/>
  <link href='https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css' rel='stylesheet' />
  <style>html,body,#map{margin:0;padding:0;height:100%;font-family:-apple-system,system-ui,sans-serif;} .marker{width:24px;height:24px;background:#FF3B30;color:#fff;font-size:12px;font-weight:600;display:flex;align-items:center;justify-content:center;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.3);} .user{width:18px;height:18px;background:#007AFF;border-radius:50%;box-shadow:0 0 0 3px rgba(0,122,255,0.3);border:2px solid #fff;} </style>
  </head><body><div id='map'></div>
  <script src='https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js'></script>
  <script>const DATA=${serialized};
    const map = new maplibregl.Map({container:'map', style:'https://demotiles.maplibre.org/style.json', center: DATA.center, zoom:12});
    map.addControl(new maplibregl.NavigationControl({showCompass:true}), 'top-right');
    map.on('load', ()=>{ if(DATA.userLocation){ const u=document.createElement('div'); u.className='user'; new maplibregl.Marker(u).setLngLat([DATA.userLocation.longitude, DATA.userLocation.latitude]).addTo(map);} DATA.places.filter(p=>p.coord).forEach((p)=>{ const el=document.createElement('div'); el.className='marker'; el.textContent= String(p.i+1); new maplibregl.Marker(el).setLngLat([p.coord.lng, p.coord.lat]).addTo(map); });
      const bounds = new maplibregl.LngLatBounds(); let added=false; if(DATA.userLocation){bounds.extend([DATA.userLocation.longitude, DATA.userLocation.latitude]); added=true;} DATA.places.filter(p=>p.coord).forEach(p=>{bounds.extend([p.coord.lng,p.coord.lat]); added=true;}); if(added){ map.fitBounds(bounds, {padding:40, maxZoom:15, duration:600}); }
    });
  </script></body></html>`;

  return (
    <View style={[styles.flex, style]}>
      <WebView originWhitelist={['*']} source={{ html }} style={styles.flex} />
    </View>
  );
};

/* ============= NATIVE MAPLIBRE (Producción) ============= */
const NativeMapLibreComponent: React.FC<UniversalMapProps> = ({ userLocation, places, style }) => {
  if (!NativeMapLibre) return null;

  const center = getInitialCenter(userLocation, places);

  return (
    <View style={[styles.flex, style]}>
      <NativeMapLibre.MapView
        style={styles.flex}
        styleURL="https://demotiles.maplibre.org/style.json"
        logoEnabled={false}
        attributionEnabled={false}
      >
        <NativeMapLibre.Camera
          zoomLevel={12}
          centerCoordinate={center}
          animationMode="moveTo"
          animationDuration={1000}
        />

        {userLocation && (
          <NativeMapLibre.PointAnnotation
            id="user-location"
            coordinate={[userLocation.longitude, userLocation.latitude]}
          >
            <View style={styles.userDot} />
          </NativeMapLibre.PointAnnotation>
        )}

        {places
          .filter((p) => p.coordinates)
          .map((place, idx) => (
            <NativeMapLibre.PointAnnotation
              id={`place-${idx}`}
              key={`place-${idx}`}
              coordinate={[place.coordinates!.lng, place.coordinates!.lat]}
            >
              <View style={styles.placeDot}>
                <Text style={styles.placeDotText}>{idx + 1}</Text>
              </View>
            </NativeMapLibre.PointAnnotation>
          ))}
      </NativeMapLibre.MapView>
    </View>
  );
};

/* ============= Helpers ============= */
function getInitialCenter(
  userLocation: { latitude: number; longitude: number } | null,
  places: PlaceLike[]
): [number, number] {
  if (userLocation) return [userLocation.longitude, userLocation.latitude];
  const first = places.find((p) => p.coordinates);
  if (first?.coordinates) return [first.coordinates.lng, first.coordinates.lat];
  return [-3.7038, 40.4168]; // Madrid
}

function fitBoundsIfNeeded(
  map: any,
  maplibregl: any,
  userLocation: { latitude: number; longitude: number } | null,
  places: PlaceLike[]
) {
  const bounds = new maplibregl.LngLatBounds();
  let added = false;
  if (userLocation) {
    bounds.extend([userLocation.longitude, userLocation.latitude]);
    added = true;
  }
  places.forEach((p) => {
    if (p.coordinates) {
      bounds.extend([p.coordinates.lng, p.coordinates.lat]);
      added = true;
    }
  });
  if (added) {
    map.fitBounds(bounds, { padding: 40, maxZoom: 15, duration: 600 });
  }
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  placeDot: {
    alignItems: 'center',
    backgroundColor: '#FF3B30',
    borderColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  placeDotText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  userDot: {
    backgroundColor: '#007AFF',
    borderColor: '#fff',
    borderRadius: 9,
    borderWidth: 2,
    height: 18,
    width: 18,
  },
});

export default UniversalMap;
