# Sistema de Geo-Detección con Histéresis

## Descripción General

Sistema completo de detección de país/región con precisión Point-in-Polygon (PIP) y mecanismo anti-rebote (histéresis) para prevenir detecciones erróneas en fronteras.

## Arquitectura

### Componentes

```
src/lib/geo/
├── index.ts              # Exports públicos
├── useGeoDetection.ts    # Hook principal React
├── cache.ts              # Cache local AsyncStorage (30 días TTL)
├── geohash.ts            # Codificación geohash para cache keys
├── distance.ts           # Cálculos Haversine y bbox
├── nearBorder.ts         # Detección de proximidad a fronteras
├── countryBBoxes.ts      # Pre-filtrado con bounding boxes
└── histeresis.ts         # Sistema anti-rebote
```

### Backend (Edge Function)

```
supabase/functions/
├── geo-lookup/           # Edge Function con Turf.js PIP
├── _shared/
│   ├── cache.ts          # Cache utilities para PostgreSQL
│   └── geohash.ts        # Server-side geohash
└── ...
```

## Flujo de Detección

```
┌─────────────────┐
│ GPS Location    │
│ (expo-location) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Accuracy Check  │ ────→ Reject if > 100m
│ (MIN_ACCURACY)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Cache Lookup    │ ────→ HIT: Return cached
│ (AsyncStorage)  │       MISS: Continue ↓
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ BBox Pre-filter │ ────→ getCandidateCountries()
│ (countryBBoxes) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Decision Point  │
│ Near Border?    │
│ Multiple Match? │
└────┬────────┬───┘
     │        │
     │ YES    │ NO (Single match, far from border)
     ▼        ▼
┌─────────┐  ┌──────────┐
│ PRECISE │  │ FAST     │
│ Edge    │  │ BBox     │
│ Function│  │ Result   │
│ (PIP)   │  │          │
└────┬────┘  └────┬─────┘
     │            │
     └────┬───────┘
          ▼
    ┌─────────────┐
    │ Cache Result│
    └──────┬──────┘
           ▼
    ┌─────────────┐
    │ Add Reading │
    │ to Buffer   │
    │ (WINDOW=4)  │
    └──────┬──────┘
           ▼
    ┌─────────────┐
    │ Histeresis  │ ────→ Check:
    │ Analysis    │       - Buffer full? (4 readings)
    └──────┬──────┘       - Majority vote? (3/4 matches)
           │              - Dwell time? (60s in country)
           │              - Distance moved? (>300m)
           ▼
    ┌─────────────┐
    │ Update      │ ────→ Only if all conditions met
    │ Country     │
    └─────────────┘
```

## Configuración

### Constantes Principales

```typescript
// useGeoDetection.ts
MIN_ACCURACY_M = 100; // Accuracy mínima aceptable
POLLING_INTERVAL_MS = 10000; // Intervalo GPS (10s)
EDGE_FUNCTION_TIMEOUT_MS = 5000; // Timeout Edge Function

// histeresis.ts
WINDOW_SIZE = 4; // Ventana de lecturas
MIN_MATCHES = 3; // Mínimo coincidencias (3/4 = 75%)
DWELL_TIME_MS = 60000; // Tiempo de permanencia (60s)
MIN_DISTANCE_M = 300; // Distancia mínima para lectura válida

// nearBorder.ts
NEAR_BORDER_THRESHOLD_KM = 20; // Umbral de proximidad a frontera

// cache.ts
TTL_SECONDS = 2592000; // 30 días de cache
```

## Uso

### Hook Principal

```typescript
import { useGeoDetection } from '@/lib/geo';

function MyComponent() {
  const {
    currentCountry,    // 'CL', 'AR', etc. o null
    currentRegion,     // 'Antofagasta', etc. o null
    isDetecting,       // true mientras procesa
    error,             // string de error o null
    accuracy,          // accuracy del GPS en metros
    isNearBorder,      // true si está cerca de frontera
    debugInfo          // información de depuración
  } = useGeoDetection(true); // enabled = true

  return (
    <View>
      <Text>País: {currentCountry || 'Detectando...'}</Text>
      <Text>Región: {currentRegion || 'N/A'}</Text>
      {isNearBorder && <Text>⚠️ Cerca de frontera</Text>}
      {debugInfo.usedPreciseDetection && <Text>✓ PIP usado</Text>}
    </View>
  );
}
```

### API de Cache

```typescript
import { getCachedGeoResult, setCachedGeoResult, clearAllGeoCache } from '@/lib/geo';

// Obtener resultado cacheado
const cached = await getCachedGeoResult(-23.65, -70.4);
// { country: 'CL', region: 'Antofagasta' } o null

// Guardar en cache
await setCachedGeoResult(-23.65, -70.4, {
  country: 'CL',
  region: 'Antofagasta',
});

// Limpiar cache
await clearAllGeoCache();
```

## Sistema de Histéresis

### Propósito

Prevenir "flickering" (cambios rápidos) cuando el usuario está cerca de una frontera debido a:

- Errores de GPS
- Solapamiento de bboxes
- Movimiento real pero transitorio

### Mecanismo

1. **Ventana Deslizante**: Mantiene últimas 4 lecturas
2. **Voto Mayoritario**: Requiere 3/4 coincidencias (75%)
3. **Tiempo de Permanencia**: 60 segundos en país antes de cambiar
4. **Filtro de Distancia**: Ignora lecturas con movimiento < 300m (GPS drift)

### Ejemplo

```
Ubicación: Frontera Chile-Argentina
Buffer: ['CL', 'CL', 'AR', 'CL']
Mayoría: CL (3/4) ✓
Tiempo desde último cambio: 65s ✓
Resultado: Acepta cambio a CL
```

## Performance

### Tiempos Esperados

| Escenario                          | Tiempo     | Cache Hit     |
| ---------------------------------- | ---------- | ------------- |
| Cache hit                          | ~50-100ms  | ✓             |
| BBox match (lejos de frontera)     | ~100-200ms | ✗ (se cachea) |
| Edge Function (cerca de frontera)  | ~300-500ms | ✗ (se cachea) |
| Edge Function (cached en servidor) | ~60-100ms  | Parcial       |

### Cache Hit Rate Esperado

- **Urbano (mismo lugar)**: >95%
- **Viaje por carretera**: ~60-70%
- **Cruce de frontera**: ~40-50%

### Reducción de Llamadas Edge Function

Con BBox pre-filtering:

- **Sin pre-filter**: 100% de llamadas a Edge Function
- **Con pre-filter**: ~10-30% de llamadas (solo cerca de fronteras)

## Debug Info

El hook retorna `debugInfo` con información útil:

```typescript
debugInfo: {
  lastReading: {
    countryCode: 'CL',
    regionCode: 'Antofagasta',
    lat: -23.65,
    lng: -70.40,
    timestamp: 1699123456789,
    accuracy: 35
  },
  bufferSize: 3,           // Lecturas en buffer (0-4)
  cacheHit: true,          // true si vino de cache
  usedPreciseDetection: false // true si usó Edge Function
}
```

## Casos de Prueba

### Test Locations

```typescript
// Antofagasta, Chile (lejos de frontera)
{ lat: -23.65, lng: -70.40 } → CL (bbox fast path)

// Santiago, Chile (lejos de frontera)
{ lat: -33.45, lng: -70.67 } → CL (bbox fast path)

// Mendoza, Argentina (cerca de frontera)
{ lat: -32.89, lng: -68.82 } → AR (PIP precise)

// Paso Los Libertadores (frontera)
{ lat: -32.82, lng: -70.08 } → CL o AR (PIP precise)

// Offshore Pacífico
{ lat: -30.0, lng: -100.0 } → OFFSHORE
```

## Troubleshooting

### "Low accuracy" error

**Causa**: GPS accuracy > 100m
**Solución**: Esperar a que el GPS obtenga mejor señal (cielo despejado)

### "Location permission denied"

**Causa**: Usuario no otorgó permisos
**Solución**: Verificar permisos en configuración del dispositivo

### Detección lenta

**Causa**: Buffer de histéresis no lleno (primeras lecturas)
**Solución**: Normal, requiere 4 lecturas válidas (~40s)

### Cambios no persistentes

**Causa**: Histéresis bloquea cambio (tiempo de permanencia)
**Solución**: Normal, requiere 60s en nuevo país

## Integración con Sistema Existente

Para integrar con `CountryDetectionService`:

```typescript
// src/services/travelMode/CountryDetectionService.ts

import { useGeoDetection } from '@/lib/geo';

// Agregar método
async detectCountryPrecise(lat: number, lng: number): Promise<string> {
  // Usar Edge Function directamente para detección manual
  const { data } = await supabase.functions.invoke('geo-lookup', {
    body: { latitude: lat, longitude: lng }
  });
  return data.country;
}
```

## Feature Flag (Opt-in)

Para habilitar el nuevo sistema gradualmente:

```typescript
// config/features.ts
export const USE_PRECISE_DETECTION = false; // Default OFF

// En componente
const useLegacy = !USE_PRECISE_DETECTION;
const geoDetection = useGeoDetection(!useLegacy);
```

## Próximos Pasos

1. ✅ Implementar sistema completo (Fase 2)
2. ⏳ Integrar con `CountryDetectionService`
3. ⏳ Agregar UI de debug en `TravelModeModal`
4. ⏳ Tests unitarios para histéresis
5. ⏳ Tests de integración E2E
6. ⏳ Beta testing con usuarios reales
7. ⏳ Monitoreo de performance en producción

## Licencia

Parte del proyecto Goveling-rn2025
