# 🔧 Trip Status Filter Fix

## Problema Identificado

### Problema 1: Filtrado Incompleto de Estados
El contador de viajes en la pantalla de inicio estaba mostrando viajes que no deberían aparecer porque solo filtraba viajes con `status = 'cancelled'`, pero no filtraba:

- ✅ Viajes completados (`status = 'completed'`)
- ✅ Viajes ocultos (`status = 'hidden'`)  
- ✅ Viajes eliminados (`status = 'deleted'`)

### Problema 2: Inconsistencia en Conteo de Viajes "Próximos"
La función `getUserTripsBreakdown()` **NO estaba contando** los viajes en planificación (sin fechas) como "upcoming", mientras que `getUpcomingTripsCount()` **SÍ los contaba**.

Esto causaba que:
- El HomeTab mostrara **0 próximos** cuando había viajes sin fechas
- El contador no coincidía con la lógica de negocio esperada

## Solución Implementada

### Fix 1: Filtrado de Estados en Base de Datos

Se actualizaron **4 funciones** para filtrar correctamente los viajes en la base de datos:

#### 1. `getUserTripsBreakdown()` (Línea ~75-85)
**Antes:**
```typescript
.neq('status', 'cancelled')
```

**Después:**
```typescript
.not('status', 'in', '("cancelled","completed","hidden","deleted")')
```

#### 2. `getPlanningTripsCount()` (Línea ~175-181)
**Antes:**
```typescript
// Get all trips where user is owner or collaborator (excluding cancelled trips)
const { data: own } = await supabase.from('trips').select('id,title,start_date,end_date').eq('user_id', uid).neq('status', 'cancelled');
```

**Después:**
```typescript
// Get all trips where user is owner or collaborator (excluding cancelled, completed, hidden, deleted trips)
const { data: own } = await supabase.from('trips').select('id,title,start_date,end_date').eq('user_id', uid).not('status', 'in', '("cancelled","completed","hidden","deleted")');
```

#### 3. `getUpcomingTripsCount()` (Línea ~221-227)
Mismo cambio que `getPlanningTripsCount()`

#### 4. `getActiveOrNextTrip()` (Línea ~297-301)
Mismo cambio que las funciones anteriores

### Fix 2: Conteo Consistente de Viajes "Próximos"

Se corrigió la función `getUserTripsBreakdown()` para que el contador `counts.upcoming` incluya AMBOS:
- Viajes futuros (con fechas en el futuro)
- Viajes en planificación (sin fechas)

**Antes:**
```typescript
counts: {
  total: allTrips.length,
  upcoming: upcoming.length,  // ❌ Solo viajes futuros
  planning: planning.length,
  active: active ? 1 : 0
}
```

**Después:**
```typescript
counts: {
  total: allTrips.length,
  // ✅ Upcoming incluye viajes futuros + viajes en planificación
  upcoming: upcoming.length + planning.length,
  planning: planning.length,
  active: active ? 1 : 0
}
```

**Documentación actualizada:**
```typescript
export interface TripsBreakdown {
  all: Trip[];
  upcoming: Trip[];   // Solo viajes futuros con fechas
  planning: Trip[];   // Viajes sin fechas
  active: Trip | null;
  counts: {
    total: number;
    upcoming: number;   // upcoming.length + planning.length ✅
    planning: number;   // planning.length
    active: number;     // active ? 1 : 0
  };
}
```

### Comentarios Actualizados

Se actualizaron los comentarios en la lógica de filtrado para reflejar el comportamiento correcto:

```typescript
// Count trips that are:
// 1. Planning (no start_date or end_date) - these are upcoming
// 2. Future (start_date is in the future) - these are upcoming
// 
// Already excluded at database level:
// - Cancelled trips (status = 'cancelled')
// - Completed trips (status = 'completed')
// - Hidden trips (status = 'hidden')
// - Deleted trips (status = 'deleted')
// 
// Also exclude:
// - Traveling (currently between start_date and end_date)
```

## Lógica Final de Filtrado

### En la Base de Datos (WHERE clause)
```sql
WHERE status NOT IN ('cancelled', 'completed', 'hidden', 'deleted')
```

### En el Código (JavaScript filter)
```typescript
// Planning trips: Sin fechas definidas
if (!trip.start_date || !trip.end_date) return true;

// Future trips: Fecha de inicio en el futuro
if (now < startDate) return true;

// Active trips: Entre start_date y end_date (no cuenta como "upcoming")
if (now >= startDate && now <= endDate) return false;

// Past trips: Fecha de fin en el pasado (no cuenta)
if (now > endDate) return false;
```

## Resultado

El contador de viajes ahora muestra correctamente:

- ✅ **Viajes en Planificación** (sin fechas) - **Cuentan como "Próximos"**
- ✅ **Viajes Próximos** (fecha de inicio en el futuro) - **Cuentan como "Próximos"**
- ❌ **NO muestra viajes completados** (status o fecha pasada)
- ❌ **NO muestra viajes cancelados**
- ❌ **NO muestra viajes ocultos**
- ❌ **NO muestra viajes eliminados**
- ❌ **NO muestra viajes activos en el contador "Próximos"** (se muestran en otro componente)

### Importante: Lógica de "Próximos Viajes"

**Desde la perspectiva del usuario:**
- Un viaje **sin fechas** (en planificación) = **Próximo viaje** ✅
- Un viaje **con fecha futura** = **Próximo viaje** ✅
- Un viaje **activo** (viajando ahora) = **NO es próximo** ❌
- Un viaje **completado** = **NO es próximo** ❌

Por lo tanto:
```typescript
counts.upcoming = (viajes futuros) + (viajes en planificación)
```

## Archivos Modificados

- ✅ `src/lib/home.ts` (Múltiples cambios):
  - 4 funciones de queries actualizadas con filtros de status
  - 1 interface `TripsBreakdown` documentada
  - 1 tipo `Trip` expandido con campos adicionales
  - 1 contador `counts.upcoming` corregido
  - 4 funciones actualizadas para seleccionar campos completos (id, title, start_date, end_date, created_at, owner_id, user_id, cover_emoji, description)
- ✅ `docs/TRIP_STATUS_FILTER_FIX.md` (documentación actualizada)

## Corrección Adicional: Campos Completos en Queries

### Problema 3: Queries Incompletas
Las queries de `getUserTripsBreakdown()` y funciones relacionadas solo seleccionaban campos básicos (`id,title,start_date,end_date`), pero el TripsTab necesitaba más campos:
- `created_at` - Para ordenar viajes sin fechas
- `owner_id`, `user_id` - Para determinar permisos
- `cover_emoji`, `description` - Para mostrar información completa

### Solución
Se actualizaron todas las queries para seleccionar el conjunto completo de campos:

```typescript
// ANTES
.select('id,title,start_date,end_date')

// DESPUÉS
.select('id,title,start_date,end_date,created_at,owner_id,user_id,cover_emoji,description')
```

**Tipo `Trip` actualizado:**
```typescript
export type Trip = { 
  id: string; 
  name: string; 
  start_date?: string | null; 
  end_date?: string | null; 
  cover_emoji?: string | null;
  created_at?: string | null;      // ✅ Nuevo
  owner_id?: string | null;        // ✅ Nuevo
  user_id?: string | null;         // ✅ Nuevo
  description?: string | null;     // ✅ Nuevo
};
```

Esto asegura que:
- Los viajes se muestren correctamente en TripsTab
- El ordenamiento funcione (usa `created_at` para viajes sin fechas)
- Los permisos se determinen correctamente (usa `owner_id`, `user_id`)
- La información completa esté disponible para renderizar

## Testing Recomendado

1. ✅ Verificar que viajes con `status = 'completed'` no aparezcan en el contador
2. ✅ Verificar que viajes con `status = 'hidden'` no aparezcan en el contador
3. ✅ Verificar que viajes con `status = 'deleted'` no aparezcan en el contador
4. ✅ Verificar que viajes con `status = 'cancelled'` no aparezcan en el contador
5. ✅ Verificar que viajes en planificación (sin fechas) sí aparezcan
6. ✅ Verificar que viajes futuros sí aparezcan
7. ✅ Verificar que viajes activos (en curso) NO aparezcan en "upcoming"

---

**Fecha:** 16 de octubre de 2025  
**Autor:** GitHub Copilot  
**Issue:** Contador de viajes mostrando viajes completados/ocultos/eliminados
