# 🔧 CORRECCIÓN: Conteo de Próximos Viajes - Exclusión de Viajes Ocultos/Eliminados

## 🔍 PROBLEMA IDENTIFICADO

**Confirmación**: Sí, el conteo de "Próximos viajes" incluía viajes que habían sido eliminados/ocultos de la lista de trips pero seguían en la base de datos como viajes "cancelados".

### Inconsistencia encontrada:

1. **En `/app/(tabs)/trips.tsx`**: ✅ **CORRECTO**
   - Filtraba viajes cancelados: `.neq('status', 'cancelled')`
   - Solo mostraba viajes activos en la lista

2. **En `/src/lib/home.ts`**: ❌ **INCORRECTO**
   - NO filtraba viajes cancelados
   - Incluía TODOS los viajes en el conteo de "Próximos viajes"

## 🔧 SOLUCIÓN IMPLEMENTADA

### Archivos modificados:

**`/src/lib/home.ts`** - Funciones actualizadas:

1. **`getUpcomingTripsCount()`**:
   ```typescript
   // ANTES
   const { data: own } = await supabase.from('trips').select('id,title,start_date,end_date').eq('user_id', uid);
   
   // DESPUÉS 
   const { data: own } = await supabase.from('trips').select('id,title,start_date,end_date').eq('user_id', uid).neq('status', 'cancelled');
   ```

2. **`getActiveOrNextTrip()`**:
   ```typescript
   // ANTES
   const { data: own } = await supabase.from('trips').select('id,title,start_date,end_date').eq('user_id', uid);
   
   // DESPUÉS
   const { data: own } = await supabase.from('trips').select('id,title,start_date,end_date').eq('user_id', uid).neq('status', 'cancelled');
   ```

3. **`getSavedPlaces()`**:
   - También actualizado para consistencia en el manejo de datos

### Filtros aplicados:

- **Trips propios (user_id)**: `.neq('status', 'cancelled')`
- **Trips propios (owner_id)**: `.neq('status', 'cancelled')`  
- **Trips como colaborador**: `.neq('status', 'cancelled')`

## ✅ RESULTADO

Ahora el conteo de "Próximos viajes" es **100% consistente** con la lista de viajes mostrada en la tab Trips:

- **Solo cuenta viajes activos** (Planning + Upcoming)
- **Excluye viajes cancelados** (hidden/deleted)
- **Mantiene lógica existente**: Planning (sin fechas) + Upcoming (fecha futura)
- **Excluye**: Traveling (actualmente en curso) + Completed (terminados) + Cancelled (eliminados)

## 🔄 ESTADO DE LA BASE DE DATOS

El campo `status` en la tabla `trips` tiene los siguientes valores:
- `'draft'`: Borrador (se cuenta como upcoming)
- `'active'`: Activo (se cuenta como upcoming si es futuro)
- `'completed'`: Completado (NO se cuenta)
- `'cancelled'`: Cancelado/Eliminado (NO se cuenta) ⭐ **CLAVE**

## 📊 IMPACTO

- **Conteo más preciso** de viajes realmente disponibles
- **Consistencia UI/UX** entre contador y lista
- **Mejor experiencia de usuario** sin discrepancias
- **Datos más confiables** en estadísticas

---
**✨ Fix completado**: El conteo de "Próximos viajes" ahora refleja exactamente los viajes visibles en la lista de Trips.