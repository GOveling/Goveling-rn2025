# Debug: Invitaciones no muestran nombre del trip ni invitador

## Estado Actual
Los cambios están implementados en `src/hooks/useNotifications.ts` pero es posible que haya un problema de caché o que los datos no se estén refrescando correctamente.

## Logs Agregados para Debug

He agregado logs detallados en el hook `useNotifications` para identificar el problema:

1. **Log de invitaciones base:** Muestra lo que viene directamente de la DB
2. **Log de consulta de trips:** Muestra qué trip IDs se buscan y qué resultados se obtienen
3. **Log de consulta de profiles:** Muestra qué inviter IDs se buscan y qué resultados se obtienen
4. **Log de enriquecimiento:** Muestra cómo se mapean los datos para cada invitación
5. **Log final:** Muestra el array completo de invitaciones enriquecidas

## Pasos para Debug

### 1. Recargar la Aplicación
**IMPORTANTE:** La aplicación necesita refrescarse para cargar el nuevo código.

**Si estás en navegador web:**
```
Cmd + Shift + R (macOS)
Ctrl + Shift + R (Windows/Linux)
```

**Si estás en Expo Go app:**
- Presiona `r` en el terminal donde corre `npx expo start`
- O sacude el dispositivo y selecciona "Reload"

### 2. Abrir la Consola del Navegador
1. Click derecho en la página → "Inspeccionar" o "Inspect"
2. Ve a la pestaña "Console"
3. Filtra por `[useNotifications]` para ver solo los logs relevantes

### 3. Revisar los Logs
Cuando abras la campana de notificaciones, deberías ver en la consola:

```
[useNotifications] Base invitations from DB: [...]
[useNotifications] Fetching trip titles for IDs: [...]
[useNotifications] Trips query result: {...}
[useNotifications] Trip title map: {...}
[useNotifications] Fetching inviter profiles for IDs: [...]
[useNotifications] Profiles query result: {...}
[useNotifications] Inviter name map: {...}
[useNotifications] Enriched invitation: {...}
[useNotifications] Setting invitations: [...]
```

### 4. Verificar Datos

**Verifica en los logs:**

✅ **Base invitations** - Debe tener `trip_id` e `inviter_id`
```javascript
{
  id: 123,
  trip_id: "uuid-del-trip",
  inviter_id: "uuid-del-inviter", // ← Debe estar presente
  email: "araos.sebastian@gmail.com",
  role: "editor",
  status: "pending"
}
```

✅ **Trips query result** - Debe devolver el trip con su título
```javascript
{
  tripsRes: [
    { id: "uuid-del-trip", title: "Mi Viaje a París" }
  ],
  tripsError: null
}
```

✅ **Profiles query result** - Debe devolver el perfil del invitador
```javascript
{
  ownersRes: [
    { id: "uuid-del-inviter", display_name: "Admin", email: "info@goveling.com" }
  ],
  ownersError: null
}
```

✅ **Enriched invitation** - Debe tener ambos campos poblados
```javascript
{
  id: 123,
  trip_id: "uuid-del-trip",
  trip_title: "Mi Viaje a París", // ← Debe aparecer
  inviter_id: "uuid-del-inviter",
  inviter_name: "info@goveling.com" // ← Debe aparecer
}
```

## Posibles Problemas y Soluciones

### Problema 1: `inviter_id` es null
**Síntoma:** Los logs muestran `inviter_id: null` en base invitations
**Causa:** La invitación no tiene el campo `inviter_id` guardado
**Solución:** Verificar que la función de enviar invitaciones esté guardando el `inviter_id`

### Problema 2: Trip query devuelve vacío
**Síntoma:** `tripsRes: []` o `tripsError: {...}`
**Causa:** El trip no existe o hay un problema de permisos RLS
**Solución:** Verificar que el trip existe en la base de datos y que RLS permite leerlo

### Problema 3: Profile query devuelve vacío
**Síntoma:** `ownersRes: []` o `ownersError: {...}`
**Causa:** El perfil no existe o hay un problema de permisos RLS
**Solución:** Verificar que el perfil existe y que RLS permite leerlo

### Problema 4: Los datos no se refrescan
**Síntoma:** Los logs muestran datos correctos pero la UI no cambia
**Causa:** Caché del navegador o React no re-renderiza
**Solución:** 
1. Hard refresh: Cmd+Shift+R (macOS) o Ctrl+Shift+R (Windows)
2. Cerrar y reabrir la campana de notificaciones
3. Verificar que el componente NotificationBell lee correctamente `inv.trip_title` e `inv.inviter_name`

## Verificación en NotificationBell.tsx

El componente ya tiene el código correcto (líneas 731-743):

```typescript
{(inv.inviter_name || inv.trip_title) && (
  <Text style={styles.invitationDetails}>
    {t(
      'notifications.invited_by_to_trip',
      'By {{inviter}} to {{trip}}',
      {
        inviter: inv.inviter_name || t('notifications.someone', 'Someone'),
        trip: inv.trip_title || t('notifications.a_trip', 'a trip'),
      }
    )}
  </Text>
)}
```

**Importante:** Esta línea solo se muestra SI al menos uno de los dos campos existe:
- `inv.inviter_name` 
- `inv.trip_title`

Si AMBOS son null, esa línea NO aparecerá.

## Próximos Pasos

1. ✅ Recargar la app (Cmd+Shift+R o presionar 'r' en terminal Expo)
2. ✅ Abrir consola del navegador
3. ✅ Abrir la campana de notificaciones
4. ✅ Revisar los logs y compartir lo que ves en:
   - `[useNotifications] Base invitations from DB`
   - `[useNotifications] Enriched invitation`
   - `[useNotifications] Setting invitations`

## Comando para Verificar en Base de Datos (Opcional)

Si los logs muestran que `inviter_id` es null, ejecuta en Supabase SQL Editor:

```sql
-- Ver las invitaciones recientes
SELECT 
  id,
  trip_id,
  email,
  inviter_id,
  owner_id,
  status,
  created_at
FROM trip_invitations
WHERE email = 'araos.sebastian@gmail.com'
ORDER BY created_at DESC
LIMIT 5;

-- Ver si el trip existe
SELECT id, title, owner_id
FROM trips
WHERE id IN (
  SELECT trip_id FROM trip_invitations 
  WHERE email = 'araos.sebastian@gmail.com' 
  AND status = 'pending'
);
```

## Fecha
18 de octubre de 2025
