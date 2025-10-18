# Fix: Contador de Lugares Guardados Incorrecto - 18 Octubre 2025

## 🐛 Problema Identificado

**Síntoma:** El HomeTab muestra "6 lugares guardados" cuando el usuario solo tiene 1 trip activo con 4 lugares.

**Causa Raíz:** Los 2 lugares adicionales pertenecen a trips que fueron:
- Cancelados o eliminados por el owner
- PERO el usuario sigue siendo colaborador en la tabla `trip_collaborators`
- Y los lugares siguen existiendo en la tabla `trip_places`

## 🔍 Análisis Técnico

### Flujo Anterior (Incorrecto)

```typescript
// 1. Obtiene trips donde es owner (con filtro de status)
SELECT id FROM trips WHERE user_id = ? AND status != 'cancelled'
SELECT id FROM trips WHERE owner_id = ? AND status != 'cancelled'

// 2. Obtiene trips donde es colaborador (SIN filtro de status) ❌
SELECT trip_id FROM trip_collaborators WHERE user_id = ?

// 3. Combina TODOS los trip IDs
uniqueTripIds = [...ownTrips, ...collabTrips]

// 4. Obtiene lugares de TODOS los trips ❌
SELECT * FROM trip_places WHERE trip_id IN (uniqueTripIds)
```

**Problema:** El paso 2 no verifica si los trips existen o están cancelados.

### Escenario Real

```
Usuario: araos.sebastian@gmail.com

Trips en trip_collaborators:
- trip_1: activo ✅ (4 lugares)
- trip_2: cancelado ❌ (1 lugar huérfano)
- trip_3: eliminado ❌ (1 lugar huérfano)

Resultado anterior: 4 + 1 + 1 = 6 lugares ❌
Resultado correcto: 4 lugares ✅
```

## ✅ Solución Implementada

### Archivo Modificado
`/Users/sebastianaraos/Desktop/Goveling-rn2025/src/lib/home.ts`

### Cambio Aplicado

Se agregó un paso adicional de validación después de obtener todos los trip IDs:

```typescript
// NUEVO: Verificar que los trips existan y no estén cancelados
if (uniqueTripIds.length > 0) {
  const { data: validTrips, error: validTripsError } = await supabase
    .from('trips')
    .select('id')
    .in('id', uniqueTripIds)
    .neq('status', 'cancelled');
  
  if (validTripsError) {
    logger.error('🏠 getSavedPlaces: Error validating trips:', validTripsError);
  } else {
    const validTripIds = (validTrips || []).map((t) => t.id);
    const removedCount = uniqueTripIds.length - validTripIds.length;
    
    if (removedCount > 0) {
      logger.debug(
        `🏠 getSavedPlaces: Filtered out ${removedCount} cancelled/deleted trips`,
        uniqueTripIds.filter((id) => !validTripIds.includes(id))
      );
    }
    
    // Actualizar con solo los trips válidos
    uniqueTripIds.length = 0;
    uniqueTripIds.push(...validTripIds);
  }
}
```

### Flujo Nuevo (Correcto)

```typescript
// 1. Obtiene trips donde es owner (con filtro de status)
SELECT id FROM trips WHERE user_id = ? AND status != 'cancelled'
SELECT id FROM trips WHERE owner_id = ? AND status != 'cancelled'

// 2. Obtiene trips donde es colaborador (sin filtro inicial)
SELECT trip_id FROM trip_collaborators WHERE user_id = ?

// 3. Combina TODOS los trip IDs
uniqueTripIds = [...ownTrips, ...collabTrips]

// 4. ✅ NUEVO: Valida que los trips existan y no estén cancelados
SELECT id FROM trips WHERE id IN (uniqueTripIds) AND status != 'cancelled'
validTripIds = [solo los que pasaron la validación]

// 5. Obtiene lugares solo de trips válidos ✅
SELECT * FROM trip_places WHERE trip_id IN (validTripIds)
```

## 📊 Logs de Depuración

Se agregaron logs detallados para facilitar el debugging:

```
🏠 getSavedPlaces: Total unique trip IDs (before filtering): 3
🏠 getSavedPlaces: Filtered out 2 cancelled/deleted trips: [trip_2, trip_3]
🏠 getSavedPlaces: Total unique trip IDs (after filtering): 1
🏠 getSavedPlaces: Trip IDs: [trip_1]
🏠 getSavedPlaces: Returning 4 places
```

## ✅ Resultado Esperado

Después del fix:

**Antes:**
- Muestra: "6 lugares guardados"
- Incluye: 4 lugares válidos + 2 lugares huérfanos

**Después:**
- Muestra: "4 lugares guardados" ✅
- Incluye: Solo los 4 lugares del trip activo

## 🧪 Testing

Para verificar el fix:

1. **Recargar la app** (presiona `r` en Expo)
2. **Pull to refresh** en el HomeTab
3. **Verificar** que el contador de "Lugares Guardados" muestre solo los lugares de trips activos

### Verificación en Base de Datos

Si quieres confirmar cuántos lugares huérfanos existen:

```sql
-- Encontrar lugares huérfanos
SELECT 
  tp.id,
  tp.name,
  tp.trip_id,
  t.title as trip_title,
  t.status
FROM trip_places tp
LEFT JOIN trips t ON tp.trip_id = t.id
WHERE t.status = 'cancelled' OR t.id IS NULL;
```

## 🔧 Consideraciones Adicionales

### Limpieza de Datos (Opcional)

Si quieres limpiar los datos huérfanos de la base de datos:

```sql
-- Eliminar colaboradores de trips cancelados/eliminados
DELETE FROM trip_collaborators
WHERE trip_id IN (
  SELECT id FROM trips WHERE status = 'cancelled'
) OR trip_id NOT IN (
  SELECT id FROM trips
);

-- Eliminar lugares de trips cancelados/eliminados
DELETE FROM trip_places
WHERE trip_id IN (
  SELECT id FROM trips WHERE status = 'cancelled'
) OR trip_id NOT IN (
  SELECT id FROM trips
);
```

**⚠️ Advertencia:** Esta limpieza es permanente. Asegúrate de hacer un backup primero.

### Prevención Futura

Considera implementar:

1. **Cascading deletes** en la base de datos:
   ```sql
   ALTER TABLE trip_places
   ADD CONSTRAINT fk_trip
   FOREIGN KEY (trip_id) REFERENCES trips(id)
   ON DELETE CASCADE;
   ```

2. **Cleanup automático** cuando un trip se cancela:
   - Trigger en la base de datos
   - O lógica en la aplicación al cancelar un trip

## 📝 Notas

- El fix es **backward compatible** - no afecta trips activos
- Los logs adicionales facilitan el debugging en producción
- La validación adicional tiene un costo mínimo de performance (1 query extra)
