# Guía de Integración: Sistema de Geo-Detección Precisa

## PASO 6: Integración con Sistema Existente

### ✅ Completado

1. **Método `detectCountryPrecise()` agregado a `CountryDetectionService`**
   - Ubicación: `src/services/travelMode/CountryDetectionService.ts` línea ~1248
   - Uso: Detección manual precisa bypass bbox
   - Edge Function: geo-lookup con PIP
   - Retorna: `CountryInfo` con metadata completa

2. **Feature Flags creados**
   - Archivo: `src/config/featureFlags.ts`
   - `USE_PRECISE_GEO_DETECTION`: false (default OFF)
   - `SHOW_GEO_DEBUG_PANEL`: __DEV__ (solo desarrollo)
   - `FORCE_EDGE_FUNCTION_DETECTION`: false (testing only)

---

## Ejemplo 1: Uso Directo del Hook (Nuevo Sistema)

### En cualquier componente React:

```typescript
import { useGeoDetection } from '@/lib/geo';
import { isFeatureEnabled } from '@/config/featureFlags';

function MyTravelComponent() {
  // Solo activar si feature flag está habilitado
  const usePreciseDetection = isFeatureEnabled('USE_PRECISE_GEO_DETECTION');
  
  const geoDetection = useGeoDetection(usePreciseDetection);
  
  useEffect(() => {
    if (geoDetection.currentCountry) {
      console.log('País detectado:', geoDetection.currentCountry);
      console.log('Región:', geoDetection.currentRegion);
      console.log('Cerca de frontera:', geoDetection.isNearBorder);
      console.log('Accuracy GPS:', geoDetection.accuracy, 'm');
      
      // Debug info
      console.log('Cache hit:', geoDetection.debugInfo.cacheHit);
      console.log('Usó PIP:', geoDetection.debugInfo.usedPreciseDetection);
      console.log('Buffer histéresis:', geoDetection.debugInfo.bufferSize, '/4');
    }
  }, [geoDetection.currentCountry]);
  
  return (
    <View>
      <Text>País: {geoDetection.currentCountry || 'Detectando...'}</Text>
      {geoDetection.isNearBorder && (
        <Text>⚠️ Cerca de frontera - Usando detección precisa</Text>
      )}
      {geoDetection.error && (
        <Text>Error: {geoDetection.error}</Text>
      )}
    </View>
  );
}
```

---

## Ejemplo 2: Uso Híbrido (Legacy + Nuevo)

### Integración gradual con sistema existente:

```typescript
import { countryDetectionService } from '@/services/travelMode/CountryDetectionService';
import { useGeoDetection } from '@/lib/geo';
import { isFeatureEnabled } from '@/config/featureFlags';

function TravelModeContainer() {
  const usePrecise = isFeatureEnabled('USE_PRECISE_GEO_DETECTION');
  
  // Nuevo sistema (con feature flag)
  const preciseGeo = useGeoDetection(usePrecise);
  
  // Sistema legacy (siempre activo como fallback)
  const [legacyCountry, setLegacyCountry] = useState<string | null>(null);
  
  useEffect(() => {
    const checkLocation = async () => {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      if (usePrecise) {
        // Usar nuevo sistema
        // El hook se encarga de todo automáticamente
        console.log('Usando sistema preciso:', preciseGeo.currentCountry);
      } else {
        // Usar sistema legacy
        const event = await countryDetectionService.checkCountryChange({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        
        if (event) {
          setLegacyCountry(event.countryInfo.countryCode);
        }
      }
    };
    
    checkLocation();
  }, [usePrecise, preciseGeo.currentCountry]);
  
  const currentCountry = usePrecise ? preciseGeo.currentCountry : legacyCountry;
  
  return (
    <View>
      <Text>País actual: {currentCountry}</Text>
      {usePrecise && (
        <Text>✓ Detección precisa habilitada</Text>
      )}
    </View>
  );
}
```

---

## Ejemplo 3: Detección Manual Precisa

### Usar el método directo del servicio:

```typescript
import { countryDetectionService } from '@/services/travelMode/CountryDetectionService';

async function detectCurrentLocation() {
  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });
  
  // Opción 1: Detección legacy (Nominatim + bbox)
  const countryInfo = await countryDetectionService.detectCountry({
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
  });
  
  // Opción 2: Detección precisa (Edge Function PIP)
  const preciseInfo = await countryDetectionService.detectCountryPrecise(
    location.coords.latitude,
    location.coords.longitude
  );
  
  console.log('Legacy:', countryInfo?.countryCode);
  console.log('Precise:', preciseInfo?.countryCode);
  
  return preciseInfo || countryInfo;
}
```

---

## Ejemplo 4: UI con Panel Debug

### Componente con información de depuración:

```typescript
import { useGeoDetection } from '@/lib/geo';
import { isFeatureEnabled } from '@/config/featureFlags';

function GeoDebugPanel() {
  const showDebug = isFeatureEnabled('SHOW_GEO_DEBUG_PANEL');
  const geo = useGeoDetection(true);
  
  if (!showDebug) return null;
  
  return (
    <View style={styles.debugPanel}>
      <Text style={styles.debugTitle}>🐛 Geo Detection Debug</Text>
      
      <View style={styles.debugRow}>
        <Text>País: {geo.currentCountry || 'N/A'}</Text>
        <Text>Región: {geo.currentRegion || 'N/A'}</Text>
      </View>
      
      <View style={styles.debugRow}>
        <Text>Accuracy: {geo.accuracy ? `${Math.round(geo.accuracy)}m` : 'N/A'}</Text>
        <Text>Near Border: {geo.isNearBorder ? '⚠️ Yes' : '✓ No'}</Text>
      </View>
      
      <View style={styles.debugRow}>
        <Text>Buffer: {geo.debugInfo.bufferSize}/4</Text>
        <Text>Cache: {geo.debugInfo.cacheHit ? '✓ Hit' : '❌ Miss'}</Text>
      </View>
      
      <View style={styles.debugRow}>
        <Text>Method: {geo.debugInfo.usedPreciseDetection ? '🎯 PIP' : '⚡ BBox'}</Text>
        <Text>Status: {geo.isDetecting ? '⏳ Detecting' : '✓ Ready'}</Text>
      </View>
      
      {geo.error && (
        <Text style={styles.error}>Error: {geo.error}</Text>
      )}
      
      {geo.debugInfo.lastReading && (
        <Text style={styles.small}>
          Last: [{geo.debugInfo.lastReading.lat.toFixed(4)}, {geo.debugInfo.lastReading.lng.toFixed(4)}]
          @ {new Date(geo.debugInfo.lastReading.timestamp).toLocaleTimeString()}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  debugPanel: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 15,
    borderRadius: 10,
  },
  debugTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  debugRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 3,
  },
  error: {
    color: '#ff4444',
    marginTop: 5,
  },
  small: {
    color: '#888',
    fontSize: 10,
    marginTop: 5,
  },
});
```

---

## Ejemplo 5: Integración en TravelModeModal

### Agregar al modal existente:

```typescript
// src/components/travelMode/TravelModeModal.tsx

import { useGeoDetection } from '@/lib/geo';
import { isFeatureEnabled } from '@/config/featureFlags';

export function TravelModeModal({ visible, onClose, tripId, tripName }: TravelModeModalProps) {
  const { t } = useTranslation();
  const { state, actions } = useTravelMode();
  
  // ✅ NUEVO: Sistema de geo-detección precisa
  const usePreciseGeo = isFeatureEnabled('USE_PRECISE_GEO_DETECTION');
  const preciseGeo = useGeoDetection(usePreciseGeo && visible);
  
  // ✅ NUEVO: Notificar cuando cambia el país detectado
  useEffect(() => {
    if (usePreciseGeo && preciseGeo.currentCountry && visible) {
      console.log('🎯 País detectado (preciso):', preciseGeo.currentCountry);
      
      // Aquí puedes integrar con el flujo existente
      // Por ejemplo, mostrar el CountryWelcomeModal
      // o actualizar el estado del viaje
    }
  }, [usePreciseGeo, preciseGeo.currentCountry, visible]);
  
  // Resto del código existente...
  
  return (
    <Modal visible={visible} animationType="slide">
      {/* Contenido existente... */}
      
      {/* ✅ NUEVO: Panel de debug (solo desarrollo) */}
      {isFeatureEnabled('SHOW_GEO_DEBUG_PANEL') && usePreciseGeo && (
        <GeoDebugPanel geo={preciseGeo} />
      )}
      
      {/* ✅ NUEVO: Badge de near-border */}
      {usePreciseGeo && preciseGeo.isNearBorder && (
        <View style={styles.borderWarning}>
          <Text>⚠️ {t('travel.near_border')}</Text>
        </View>
      )}
    </Modal>
  );
}
```

---

## Configuración de Rollout Gradual

### 1. Fase de Testing Interno (1-2 semanas)

```typescript
// src/config/featureFlags.ts
export const FeatureFlags = {
  USE_PRECISE_GEO_DETECTION: __DEV__, // Solo desarrollo
  SHOW_GEO_DEBUG_PANEL: __DEV__,
};
```

### 2. Beta Testing (1 mes)

```typescript
// Agregar lógica de usuario beta
import { getCurrentUser } from '@/lib/auth';

export async function isFeatureEnabled(flag: FeatureFlagKey): Promise<boolean> {
  const user = await getCurrentUser();
  
  if (flag === 'USE_PRECISE_GEO_DETECTION') {
    // 10% de usuarios + todos los beta testers
    const isBetaTester = user?.metadata?.betaTester === true;
    const isInSample = (user?.id?.charCodeAt(0) ?? 0) % 10 === 0; // 10% sample
    
    return isBetaTester || isInSample;
  }
  
  return FeatureFlags[flag];
}
```

### 3. Rollout Gradual (2-3 meses)

```typescript
// Incrementar gradualmente el porcentaje
export const PRECISE_GEO_ROLLOUT_PERCENTAGE = 10; // Start with 10%

export async function isFeatureEnabled(flag: FeatureFlagKey): Promise<boolean> {
  const user = await getCurrentUser();
  
  if (flag === 'USE_PRECISE_GEO_DETECTION') {
    const userId = user?.id ?? '';
    const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const isInRollout = (hash % 100) < PRECISE_GEO_ROLLOUT_PERCENTAGE;
    
    return isInRollout;
  }
  
  return FeatureFlags[flag];
}
```

### 4. Producción Completa

```typescript
// src/config/featureFlags.ts
export const FeatureFlags = {
  USE_PRECISE_GEO_DETECTION: true, // Habilitado para todos
  SHOW_GEO_DEBUG_PANEL: false,
};
```

---

## Monitoreo y Métricas

### Agregar analytics:

```typescript
import { useGeoDetection } from '@/lib/geo';
import { analytics } from '@/lib/analytics';

function MonitoredGeoDetection() {
  const geo = useGeoDetection(true);
  
  useEffect(() => {
    if (geo.currentCountry) {
      analytics.track('geo_detection_success', {
        country: geo.currentCountry,
        region: geo.currentRegion,
        method: geo.debugInfo.usedPreciseDetection ? 'pip' : 'bbox',
        cached: geo.debugInfo.cacheHit,
        accuracy: geo.accuracy,
        nearBorder: geo.isNearBorder,
      });
    }
    
    if (geo.error) {
      analytics.track('geo_detection_error', {
        error: geo.error,
        accuracy: geo.accuracy,
      });
    }
  }, [geo.currentCountry, geo.error]);
  
  return null; // Monitoring only
}
```

---

## Troubleshooting Común

### Error: "No data returned from geo-lookup"

**Causa**: Edge Function no disponible o error de red
**Solución**: Verificar deployment del Edge Function

```bash
cd supabase/functions
supabase functions deploy geo-lookup
```

### Error: "Low accuracy: XXXm"

**Causa**: GPS con accuracy > 100m (indoor, túneles)
**Solución**: Esperar a mejor señal o ajustar umbral

```typescript
// En useGeoDetection.ts, cambiar:
const MIN_ACCURACY_M = 150; // Más tolerante
```

### País no cambia después de cruzar frontera

**Causa**: Sistema de histéresis esperando 60s + 3/4 confirmaciones
**Solución**: Normal, es por diseño. Para testing:

```typescript
// En histeresis.ts, reducir temporalmente:
const DWELL_TIME_MS = 10000; // 10s en lugar de 60s
const MIN_MATCHES = 2; // 2 en lugar de 3
```

---

## Próximos Pasos

1. ✅ Feature flags implementados
2. ✅ Método detectCountryPrecise() agregado
3. ⏳ Integrar en TravelModeModal (UI)
4. ⏳ Tests unitarios
5. ⏳ Beta testing con usuarios reales
6. ⏳ Monitoreo de métricas
7. ⏳ Rollout gradual a producción

---

**Estado**: ✅ PASO 6 COMPLETADO - Listo para Paso 7 (UI Enhancements)
