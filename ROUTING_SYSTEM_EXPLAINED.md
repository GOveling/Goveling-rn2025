# Sistema de Ruteo Inteligente - Explicación Técnica

## ⚡ Actualizaciones Recientes (7 nov 2025)

### 🎯 Nueva Política de Fallback por Modo
- **Walking & Cycling**: SIEMPRE usa OSRM (ORS solo si OSRM falla completamente)
- **Driving**: Mantiene validación de calidad (detour factor)
- **Objetivo**: Costo $0 para rutas a pie y bicicleta

### 🔄 Recalculación Dinámica
- Nueva función `recalculateRoute()` en cliente
- Permite actualizar rutas mientras el usuario se mueve
- Detección automática de desviación
- Hook `useRouteNavigation` con navegación completa
- 100% OSRM para walking/cycling = recalculaciones ilimitadas gratis

Ver: `DYNAMIC_ROUTE_RECALCULATION.md` para detalles completos

---

## Resumen Ejecutivo

El sistema utiliza **OSRM (gratuito)** como motor principal y **OpenRouteService (ORS)** como fallback de calidad, con validación inteligente de rutas basada en el factor de desvío.

## Arquitectura

```
Cliente (useDirections.ts)
    ↓
Edge Function (directions/index.ts)
    ↓
1. Intenta OSRM (gratis) ✅
    ↓
2. Valida calidad de ruta
    ↓
    ├─→ ✅ Buena calidad (detour < 5x) → Retorna OSRM
    └─→ ⚠️ Mala calidad (detour > 5x)  → Intenta ORS (fallback)
```

## Validación de Calidad

### Fórmula Haversine (Distancia en línea recta)
```typescript
const R = 6371; // Radio de la Tierra en km
const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) + 
          Math.cos(lat1) * Math.cos(lat2) * 
          Math.sin(deltaLon/2) * Math.sin(deltaLon/2);
const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
const straightDistance = R * c;
```

### Factor de Desvío
```typescript
const detourFactor = routeDistance_km / straightDistance_km;
```

### Umbrales de Decisión
```typescript
const needsBetterRoute = 
  routeDistance > 1 &&  // Solo validar rutas >1km
  ((straightDistance > 10 && detourFactor > 3) ||  // Rutas largas con desvío >3x
   detourFactor > 5);  // Cualquier ruta con desvío >5x
```

## Ejemplo Real: Sangucheria Casa 23

### Escenario
- **Origen**: Mi ubicación actual `[-70.401368, -23.527549]`
- **Destino**: Sangucheria Casa 23 `[-70.3964266, -23.5286059]`

### Resultados

#### OSRM (Rechazado por calidad)
```
Distancia en línea recta: 0.517 km
Distancia de ruta:        6.433 km
Detour factor:           12.43x ❌
```
**Razón del rechazo**: La ruta da una vuelta enorme (12x más larga que la línea recta)

#### ORS (Usado como fallback)
```
Distancia en línea recta: 0.517 km
Distancia de ruta:        0.700 km
Detour factor:           1.35x ✅
```
**Razón de uso**: Ruta mucho más directa y eficiente

### Test CURL

```bash
# OSRM - Ruta larga (6.4km)
curl "https://router.project-osrm.org/route/v1/driving/-70.401368,-23.527549;-70.3964266,-23.5286059?overview=full&geometries=geojson&steps=true&alternatives=true"

# Resultado: 6.4km con 12.43x detour factor → Rechazado
```

## Casos de Uso

### ✅ OSRM se usa cuando:
- Distancia de ruta < 1km (sin validar calidad)
- Detour factor < 5x para rutas de 1-10km
- Detour factor < 3x para rutas > 10km

### 🔄 ORS se usa cuando:
- OSRM falla o no responde
- OSRM devuelve ruta con detour factor muy alto (>5x)
- OSRM devuelve ruta larga con desvío excesivo (>10km && >3x)

## Ventajas del Sistema

1. **Ahorro de costos**: Usa OSRM (gratis) siempre que sea posible
2. **Calidad garantizada**: Detecta rutas malas y usa ORS cuando es necesario
3. **Transparencia**: Campo `source` indica qué motor se usó
4. **Fallback automático**: Si OSRM falla, usa ORS sin intervención

## Logs de Depuración

```javascript
// Cliente (PlaceDetailModal.tsx)
console.log('🚗 [Routing Engine] Used:', result.source === 'osrm' ? 'OSRM (gratis)' : 'ORS (fallback)');

// Edge Function (directions/index.ts)
console.log('📏 Straight-line distance:', straightDistance, 'km');
console.log('📊 Route quality check:', { detour_factor });
console.log('✅ OSRM route quality is good, using it');
// o
console.log('⚠️ OSRM route quality questionable, falling back to ORS...');
```

## Métricas Esperadas

- **Uso de OSRM**: ~70-80% de las rutas (mayoría)
- **Uso de ORS**: ~20-30% de las rutas (fallback)
- **Cache hit rate**: ~40-60% (rutas populares)

## Optimizaciones OSRM

### Parámetros
```typescript
const osrmUrl = `${OSRM_BASE_URL}/route/v1/${profile}/${coords}?
  overview=full&
  geometries=geojson&
  steps=true&
  alternatives=true&            // Obtener rutas alternativas
  continue_straight=default&    // Permitir giros naturales
  annotations=true`;            // Datos de velocidad/duración
```

### Selección de Mejor Ruta
```typescript
// Si hay alternativas, seleccionar la mejor combinación de duración y distancia
const score = route.duration + (route.distance / 100);
const bestRoute = routes.reduce((best, current) => 
  currentScore < bestScore ? current : best
);
```

## Mejoras Futuras

1. **Cache geográfico**: Almacenar rutas por región
2. **ML predictions**: Predecir qué motor usar antes de intentar
3. **Métricas en tiempo real**: Dashboard de uso OSRM vs ORS
4. **A/B testing**: Comparar calidad de rutas entre motores

## Conclusión

El sistema funciona **exactamente como debe**:
- Prioriza OSRM (gratis) cuando la calidad es buena
- Usa ORS (pago) solo cuando es necesario para calidad
- Transparente con el campo `source` para debugging
- Robusto con validación inteligente de rutas

---
**Fecha**: 7 de noviembre de 2025  
**Versión Edge Function**: 27.37kB  
**Estado**: ✅ Funcionando correctamente
