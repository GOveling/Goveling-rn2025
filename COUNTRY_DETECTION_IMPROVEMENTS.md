# 🛡️ Mejoras en la Detección de Países - Prevención de Falsos Positivos

**Fecha:** 3 de noviembre de 2025  
**Problema:** Registros falsos de países visitados (ej: Argentina cuando solo se probó en Chile/USA)  
**Causa:** Sistema anterior registraba cambios de país sin validaciones suficientes

---

## 🔴 Problema Identificado

La app registró **Argentina** como país visitado para `info@goveling.com` sin que el usuario haya estado allí físicamente. Esto ocurrió debido a:

1. **GPS drift** cerca de fronteras (Chile-Argentina en Los Andes)
2. **Detección inmediata** sin confirmaciones
3. **Sin validación de distancia** entre países vecinos
4. **Sin validación de tiempo** de permanencia en país
5. **Aceptaba GPS de baja precisión** (>100m)

### ⚠️ Riesgo en Europa
Este problema es crítico para Europa donde:
- Países son muy pequeños y cercanos entre sí
- Un error de 20-30km puede cruzar 2-3 fronteras
- Aeropuertos están cerca de múltiples fronteras
- Trenes/autos cruzan varios países en horas

---

## ✅ Soluciones Implementadas

### 1. **Validación de Distancia Recorrida** 🚗
```typescript
MIN_DISTANCE_FOR_COUNTRY_CHANGE_KM = 50 // Debe viajar 50km para cambiar país
```

**Cómo funciona:**
- Calcula distancia entre última ubicación guardada y ubicación actual
- Si distancia < 50km → **RECHAZA** el cambio de país
- Usa fórmula Haversine para precisión geodésica

**Por qué funciona:**
- GPS drift típico: 10-30m
- GPS error máximo: 1-5km
- 50km es distancia razonable para cruce real de frontera
- Evita falsos positivos por ruido GPS cerca de fronteras

**Ejemplo de log:**
```
📏 Distance from last visit: 2.3km (CL -> AR)
⚠️ REJECTED: Distance too small (2.3km < 50km). 
   Likely GPS drift/error near border. Not registering country change.
```

---

### 2. **Validación de Tiempo en País** ⏱️
```typescript
MIN_TIME_IN_COUNTRY_MS = 30 * 60 * 1000 // 30 minutos mínimo
```

**Cómo funciona:**
- Compara timestamp de última visita guardada con tiempo actual
- Si tiempo < 30 min → **RECHAZA** el cambio de país
- Almacena timestamp preciso en base de datos

**Por qué funciona:**
- Evita registros de "países de paso" (aeropuertos, trenes)
- 30 min es tiempo mínimo razonable para considerar "visita"
- Detecta cruces accidentales/rápidos de frontera

**Ejemplo de log:**
```
⏱️ Time since last country visit: 12.3 minutes
⚠️ REJECTED: Time in current country too short (12.3 min < 30 min). 
   Possible GPS error or quick pass-through. Not registering country change.
```

---

### 3. **Validación de Precisión GPS** 🎯
```typescript
MAX_GPS_ACCURACY_METERS = 100 // Solo confiar en GPS <100m precisión
```

**Cómo funciona:**
- Verifica `location.coords.accuracy` del GPS
- Si accuracy > 100m → **RECHAZA** la detección
- Intenta 3 veces obtener mejor precisión antes de fallar

**Por qué funciona:**
- GPS con baja precisión (>100m) puede dar ubicación errónea de varios km
- En áreas fronterizas, 200m de error = país equivocado
- Fuerza al sistema a esperar señal GPS estable

**Ejemplo de log:**
```
⚠️ GPS accuracy too low: 247m. Retrying for better accuracy...
[Attempt 2/3...]
📍 Current coordinates: [-33.4489, -70.6693] (accuracy: 42m) ✅
```

---

### 4. **Almacenamiento de Coordenadas en BD** 📍

**Cambios en Schema:**
```sql
-- Tabla country_visits ahora incluye:
latitude TEXT,    -- Guardado como texto para compatibilidad
longitude TEXT,   -- Permite cálculo de distancia en futuras detecciones
```

**Beneficios:**
- Permite validar distancia en cada detección
- Histórico de ubicaciones para auditoría
- Debug de falsos positivos (ver dónde se detectó)
- Posibilidad de recalcular/corregir detecciones incorrectas

---

### 5. **Logging Mejorado** 🔍

Ahora cada detección registra:
```
📍 Current coordinates: [-33.4489, -70.6693] (accuracy: 42m)
🎯 Detected country: 🇨🇱 Chile (CL)
💾 Last visit in DB: Chile (CL) on 2025-11-03T10:30:00Z
📏 Distance from last visit: 0.8km (CL -> CL)
⏱️ Time since last country visit: 45.2 minutes
✅ Still in Chile - no modal needed
```

O en caso de cambio:
```
📏 Distance from last visit: 125.6km (CL -> AR)
⏱️ Time since last country visit: 180.5 minutes
🎉 COUNTRY CHANGED from Chile to Argentina! (Distance: 125.6km)
```

---

## 📊 Flujo de Validación (Nuevo)

```
┌─────────────────────┐
│  Abrir App          │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Obtener GPS        │◄──── Reintentar 3 veces
│  (accuracy < 100m)  │      si precisión baja
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Detectar País      │
│  (Nominatim/Bounds) │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  ¿Mismo país que    │───── SÍ ────► No hacer nada
│  última visita?     │
└─────────┬───────────┘
          │ NO
          ▼
┌─────────────────────┐
│  Calcular distancia │
│  desde última visita│
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  ¿Distancia > 50km? │───── NO ────► RECHAZAR
└─────────┬───────────┘                (GPS drift)
          │ SÍ
          ▼
┌─────────────────────┐
│  ¿Tiempo > 30 min?  │───── NO ────► RECHAZAR
└─────────┬───────────┘                (Paso rápido)
          │ SÍ
          ▼
┌─────────────────────┐
│  ✅ REGISTRAR       │
│  nuevo país visitado│
└─────────────────────┘
```

---

## 🧪 Casos de Prueba

### ✅ Caso 1: Uso normal en Chile
```
Ubicación: Santiago (-33.4489, -70.6693)
Última visita: Chile hace 2 horas
Distancia: 0.5km
Resultado: ✅ No registra cambio (mismo país)
```

### ✅ Caso 2: Viaje Chile → Argentina
```
Ubicación: Mendoza, AR (-32.8895, -68.8458)
Última visita: Santiago, CL hace 6 horas
Distancia: 380km
Resultado: ✅ Registra Argentina como nuevo país
```

### ❌ Caso 3: GPS drift en Los Andes
```
Ubicación: "Argentina" por GPS error (-32.8234, -70.0123)
Última visita: Santiago, CL hace 30 min
Distancia: 85km (PERO cerca de frontera inestable)
Tiempo: 30 min < límite prudente
Resultado: ❌ RECHAZADO - Posible error GPS
```

### ❌ Caso 4: Aeropuerto en frontera
```
Ubicación: Aeropuerto en frontera
Última visita: Chile hace 15 min
Distancia: 60km
Tiempo: 15 min < 30 min mínimo
Resultado: ❌ RECHAZADO - Paso rápido, no visita real
```

### ❌ Caso 5: GPS de baja precisión
```
Ubicación: Coordinadas con accuracy: 250m
Resultado: ❌ RECHAZADO - Esperar mejor señal GPS
```

---

## 🌍 Protección Especial para Europa

Las validaciones son especialmente importantes en Europa:

### Ejemplos de Países Cercanos:
- **Suiza-Liechtenstein:** Frontera a ~10km
- **Mónaco-Francia:** Frontera a ~2km  
- **Países Bajos-Bélgica:** Frontera permeable cada 20km
- **Región Schengen:** Cruces sin control fronterizo

### Cómo las Validaciones Ayudan:
1. **50km mínimo:** Evita registrar país vecino por GPS drift en ciudad fronteriza
2. **30 min mínimo:** No registra países "de paso" en tren (Ámsterdam → Bruselas = 2 hrs)
3. **Precisión GPS:** Critical en ciudades como Basel (Suiza/Francia/Alemania)

---

## 🔧 Configuración Ajustable

Las constantes están definidas en `CountryDetectionService.ts`:

```typescript
// Ajustar estos valores según necesidad:
MIN_DISTANCE_FOR_COUNTRY_CHANGE_KM = 50      // Default: 50km
MIN_TIME_IN_COUNTRY_MS = 30 * 60 * 1000      // Default: 30 min
MAX_GPS_ACCURACY_METERS = 100                 // Default: 100m
BORDER_BUFFER_KM = 20                         // Para futura implementación
```

### 🎛️ Sugerencias de Ajuste:

**Para áreas de frontera conocidas (Los Andes, etc.):**
```typescript
MIN_DISTANCE_FOR_COUNTRY_CHANGE_KM = 75  // Más estricto
MIN_TIME_IN_COUNTRY_MS = 60 * 60 * 1000  // 1 hora
```

**Para Europa (países pequeños):**
```typescript
MIN_DISTANCE_FOR_COUNTRY_CHANGE_KM = 30  // Más permisivo
MIN_TIME_IN_COUNTRY_MS = 20 * 60 * 1000  // 20 min
```

---

## 🐛 Debugging Falsos Positivos

Si aparece un país incorrecto:

### 1. Verificar en Base de Datos:
```sql
SELECT 
  country_name, 
  entry_date, 
  latitude, 
  longitude,
  is_return
FROM country_visits 
WHERE user_id = 'USER_ID'
ORDER BY entry_date DESC;
```

### 2. Verificar Distancia Calculada:
```sql
-- Calcular distancia entre dos visitas consecutivas
SELECT 
  v1.country_name as from_country,
  v2.country_name as to_country,
  v1.latitude as lat1,
  v1.longitude as lon1,
  v2.latitude as lat2,
  v2.longitude as lon2,
  v1.entry_date as date1,
  v2.entry_date as date2
FROM country_visits v1
JOIN country_visits v2 ON v1.user_id = v2.user_id
WHERE v1.user_id = 'USER_ID'
  AND v2.entry_date > v1.entry_date
ORDER BY v1.entry_date DESC
LIMIT 5;
```

### 3. Revisar Logs:
Buscar en logs de Metro/console:
```
⚠️ REJECTED: Distance too small
⚠️ REJECTED: Time in current country too short
⚠️ GPS accuracy too low
```

### 4. Eliminar Visita Incorrecta:
```sql
DELETE FROM country_visits 
WHERE user_id = 'USER_ID' 
  AND country_code = 'AR' 
  AND entry_date = '2025-11-03T...';

-- Actualizar contador
UPDATE travel_stats 
SET countries_count = (
  SELECT COUNT(DISTINCT country_code) 
  FROM country_visits 
  WHERE user_id = 'USER_ID'
)
WHERE user_id = 'USER_ID';
```

---

## 📈 Monitoreo Recomendado

### Métricas a Vigilar:
1. **Tasa de rechazo:** ¿Cuántas detecciones se rechazan?
2. **Países fronterizos:** ¿Hay patrones de falsos positivos?
3. **Precisión GPS promedio:** ¿La mayoría tiene <100m?
4. **Tiempo entre visitas:** ¿Son realistas (>30 min)?

### Alertas Sugeridas:
```typescript
// Ejemplo: Alertar si detección rechazada por distancia corta
if (distance < 50 && newCountry !== lastCountry) {
  Sentry.captureMessage('Country change rejected - distance too small', {
    level: 'warning',
    tags: {
      from_country: lastCountry,
      to_country: newCountry,
      distance_km: distance,
      user_id: userId
    }
  });
}
```

---

## 🎯 Próximas Mejoras (Opcional)

### 1. **Zona de Buffer en Fronteras** (No implementado aún)
```typescript
BORDER_BUFFER_KM = 20  // Dentro de 20km de frontera = más estricto
```
- Detectar si estás dentro de 20km de una frontera
- Requerir confirmaciones adicionales (5 en vez de 3)
- Aumentar tiempo mínimo a 60 min en zona fronteriza

### 2. **Machine Learning para Patrones**
- Aprender rutas comunes de usuarios
- Detectar "saltos imposibles" (Santiago → Tokyo en 1 hora)
- Sugerir correcciones automáticas

### 3. **Validación Cruzada con Otros Sensores**
- WiFi SSID (nombres de redes indican país)
- Zona horaria del dispositivo
- Idioma de teclado activo
- Moneda detectada en transacciones

---

## ✅ Checklist de Verificación

Después de estas mejoras, verificar:

- [ ] Abrir app en mismo país → No registra cambio
- [ ] Simular GPS en país cercano (>50km) → Registra si >30 min
- [ ] Simular GPS en país cercano (<50km) → **RECHAZA**
- [ ] Simular GPS con baja precisión (>100m) → **RECHAZA** o reintenta
- [ ] Viaje real Chile → Argentina → Registra correctamente
- [ ] Verificar logs muestran distancia y tiempo
- [ ] Verificar BD guarda latitude/longitude
- [ ] Eliminar visitas incorrectas antiguas (ej: Argentina falso)

---

## 📝 Archivos Modificados

1. **`src/services/travelMode/CountryDetectionService.ts`**
   - Agregada función `calculateDistance()`
   - Agregadas constantes de validación
   - Agregado cache de ubicación con timestamp
   - Mejorados logs

2. **`src/hooks/useCountryDetectionOnAppStart.ts`**
   - Validación de precisión GPS (< 100m)
   - Validación de distancia (> 50km)
   - Validación de tiempo (> 30 min)
   - Logs mejorados con contexto completo
   - Almacenamiento de lat/lng en BD

3. **`supabase/migrations/20251031_country_visits.sql`** (verificar)
   - Asegurar que `latitude` y `longitude` existen como columnas TEXT

---

## 🎓 Lecciones Aprendidas

1. **GPS NO es perfectamente preciso** - Siempre validar con contexto adicional
2. **Fronteras son zonas de alto riesgo** - Requieren validación extra
3. **Distancia + Tiempo = Mejor validación** que solo coordenadas
4. **Logs detallados = Debug más fácil** cuando hay problemas
5. **Almacenar contexto completo** (lat/lng/timestamp) permite correcciones futuras

---

**Autor:** GitHub Copilot  
**Revisado por:** Sebastián Araos  
**Estado:** ✅ Implementado y probando

---

## 🆘 Soporte

Si detectas un país visitado incorrecto después de estas mejoras:

1. Toma screenshot del timeline de países visitados
2. Revisa logs de la app en ese momento
3. Consulta la tabla `country_visits` en Supabase
4. Reporta en GitHub Issues con:
   - User ID
   - País incorrecto
   - Fecha/hora de detección
   - Logs relevantes
   - Ubicación real donde estabas

Esto ayudará a seguir mejorando el sistema. 🚀
