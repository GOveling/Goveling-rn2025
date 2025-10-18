# Fix: Trip titles y inviter names en notificaciones

## Problemas Encontrados

### 1. ✅ RESUELTO: Column profiles.display_name does not exist
**Error:** `column profiles.display_name does not exist`
**Causa:** La columna en la tabla `profiles` se llama `full_name`, no `display_name`
**Solución:** Cambiado en ambos archivos:
- `src/components/home/NotificationBell.tsx` 
- `src/hooks/useNotifications.ts`

```typescript
// ANTES (incorrecto)
.select('id, display_name, email')
p.display_name || p.email

// DESPUÉS (correcto)
.select('id, full_name, email')
p.full_name || p.email
```

### 2. ⚠️ PENDIENTE: Trips query returns empty array

**Error:** `Fetched trips: [] Error: null`
**Causa:** Row Level Security (RLS) está bloqueando la consulta

**Diagnóstico:**
```sql
-- Ejecuta esto en Supabase SQL Editor para verificar:
SELECT id, title, owner_id 
FROM trips 
WHERE id IN (
  'c7914f09-df04-4096-9803-ec52fa006b16',
  '2e57b445-ec22-4477-aad2-934ba81f81b6'
);
```

Si esto devuelve los trips, entonces RLS está bloqueando.

**Solución:** Agregar política RLS que permita leer trips donde el usuario es colaborador:

```sql
-- Política para permitir leer trips donde eres colaborador
CREATE POLICY "Users can read trips where they are collaborators"
ON public.trips
FOR SELECT
USING (
  id IN (
    SELECT trip_id 
    FROM trip_collaborators 
    WHERE user_id = auth.uid()
  )
  OR
  id IN (
    SELECT trip_id
    FROM trip_invitations
    WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);
```

## Archivos Modificados

1. **src/components/home/NotificationBell.tsx**
   - Agregado `useEffect` para enriquecer invitaciones
   - Cambiado `display_name` a `full_name`
   - Agregados logs detallados de debugging

2. **src/hooks/useNotifications.ts**
   - Cambiado `display_name` a `full_name`
   - Agregados logs detallados

## Próximos Pasos

1. ✅ Recargar app con Cmd+Shift+R
2. ⏳ Verificar que error de `display_name` desapareció
3. ⏳ Ejecutar query SQL diagnóstico
4. ⏳ Si query devuelve trips, aplicar política RLS
5. ⏳ Recargar y verificar que aparezcan nombres

## Logs Esperados (después del fix)

```
🔔 [NotificationBell] Fetched profiles: [{id: '...', full_name: 'Admin', email: 'info@goveling.com'}] Error: null
🔔 [NotificationBell] Profile map: {'8d8d65a0-...': 'info@goveling.com'}
```

Y si RLS se arregla:
```
🔔 [NotificationBell] Fetched trips: [{id: '...', title: 'Test Invites 17/10'}] Error: null
🔔 [NotificationBell] Trip map: {'2e57b445-...': 'Test Invites 17/10'}
```

## Fecha
18 de octubre de 2025
