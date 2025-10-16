# Fix: Corrección del conteo de Viajes Grupales

## Problema identificado
- El contador de "Viajes Grupales" en la sección Trips mostraba incorrectamente 1 viaje grupal cuando el viaje existente era individual (solo tenía 1 viajero).

## Causa del problema
- La consulta SQL original utilizaba una sintaxis incorrecta: `trip_collaborators(count)` que retornaba un objeto en lugar de un array.
- La lógica de filtrado intentaba acceder a `.length` en un objeto que no era un array.
- La consulta usaba `OR` con `user_id` que podía causar confusión en la lógica.

## Solución implementada
1. **Simplificación de la consulta**: Se cambió a obtener solo trips donde el usuario es `owner_id`.
2. **Consulta separada de colaboradores**: Para cada trip, se hace una consulta específica a `trip_collaborators`.
3. **Lógica clara de conteo**: Un viaje es grupal si y solo si tiene colaboradores (`collaborators.length > 0`).

## Archivos modificados
- `app/(tabs)/trips.tsx`: Corregida la lógica de carga y conteo de viajes grupales.

## Resultado
- ✅ El contador de "Viajes Grupales" ahora muestra 0 correctamente cuando no hay viajes con colaboradores.
- ✅ La lógica es más robusta y mantenible.
- ✅ Se eliminaron todos los archivos de debug creados durante la resolución.

## Lógica final implementada
```typescript
// 1. Obtener trips donde el usuario es owner
const trips = await supabase.from('trips').select('*').eq('owner_id', userId);

// 2. Para cada trip, obtener colaboradores
const collaborators = await supabase.from('trip_collaborators').select('*').eq('trip_id', tripId);

// 3. Contar como grupal solo si tiene colaboradores
const isGroupTrip = collaborators.length > 0;
```

Fecha de resolución: 8 de octubre de 2025
