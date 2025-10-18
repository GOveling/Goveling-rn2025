# Fix: Mostrar nombre del trip y quién envía la invitación

## Problema
Cuando se recibía una invitación a un trip, la notificación mostraba:
- ✅ "Invitación a viaje" 
- ✅ "Has sido invitado como Editor/Viewer"
- ❌ **NO mostraba el nombre del trip**
- ❌ **NO mostraba quién envió la invitación**

## Causa Raíz
La función `fetchInvitations` en `src/hooks/useNotifications.ts` intentaba obtener el nombre del trip y el nombre del invitador de las notificaciones existentes en lugar de consultar directamente las tablas de la base de datos.

El flujo anterior era:
1. Buscar en notificaciones previas (tipo `invite_sent`) → ❌ Poco confiable
2. Fallback a perfiles solo para `inviter_name` → ⚠️ Incompleto

## Solución Implementada

### Cambios en `src/hooks/useNotifications.ts`

**Antes:**
```typescript
// Intentaba obtener trip_title de notificaciones existentes
const notifTripName = new Map<string, string | null>();
for (const n of notifications) {
  const d = typeof (n as any).data === 'string' ? safeParse((n as any).data) : (n as any).data || {};
  if (d?.type === 'invite_sent' && d?.trip_id) {
    if (d.trip_name && !notifTripName.has(d.trip_id))
      notifTripName.set(d.trip_id, d.trip_name);
  }
}
```

**Después:**
```typescript
// 1) Consulta directa a la tabla trips para obtener títulos
const tripIds = Array.from(new Set(baseInv.map((i) => i.trip_id)));
let tripTitleMap = new Map<string, string>();
if (tripIds.length > 0) {
  const { data: tripsRes } = await supabase
    .from('trips')
    .select('id, title')
    .in('id', tripIds);
  if (Array.isArray(tripsRes)) {
    tripTitleMap = new Map(
      (tripsRes as any[]).map((row) => [row.id, row.title || null])
    );
  }
}

// 2) Consulta directa a profiles para obtener nombres de invitadores
const inviterIds = Array.from(
  new Set(baseInv.map((i) => i.inviter_id).filter(Boolean))
) as string[];
let inviterMap = new Map<string, string>();
if (inviterIds.length > 0) {
  const { data: ownersRes } = await supabase
    .from('profiles')
    .select('id,display_name,email')
    .in('id', inviterIds);
  if (Array.isArray(ownersRes)) {
    inviterMap = new Map(
      (ownersRes as any[]).map((row) => [row.id, row.display_name || row.email || null])
    );
  }
}

// Enriquecer invitaciones con datos obtenidos directamente
const enriched = baseInv.map((i) => {
  const tripTitle = tripTitleMap.get(i.trip_id) || null;
  const inviterName = i.inviter_id ? inviterMap.get(i.inviter_id) || null : null;
  return {
    ...i,
    trip_title: tripTitle,
    inviter_name: inviterName,
  };
});
```

### Mejoras Implementadas

1. ✅ **Consulta directa a `trips` table** - Obtiene el nombre real del trip
2. ✅ **Consulta directa a `profiles` table** - Obtiene el nombre del invitador usando `inviter_id`
3. ✅ **Eliminada dependencia de notificaciones previas** - Método más confiable
4. ✅ **Removed dependency on `notifications` array** - Simplificó el código y las dependencias

### Componente de Visualización

El componente `NotificationBell.tsx` ya tenía el código correcto para mostrar esta información:

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

### Traducciones Existentes (en `es.json`)

```json
{
  "invited_by_to_trip": "Por {{inviter}} a {{trip}}",
  "someone": "Alguien",
  "a_trip": "un viaje"
}
```

## Resultado

Ahora cuando un usuario recibe una invitación, verá:

```
📍 Invitación a viaje
Has sido invitado como Editor
Por info@goveling.com a Mi Viaje a París
18/10/2025
```

En lugar de solo:
```
📍 Invitación a viaje
Has sido invitado como Editor
18/10/2025
```

## Pruebas Recomendadas

1. ✅ Enviar una nueva invitación desde info@goveling.com a araos.sebastian@gmail.com
2. ✅ Verificar que aparezca el nombre del trip
3. ✅ Verificar que aparezca el nombre/email del invitador
4. ✅ Aceptar/Rechazar la invitación y verificar que funcione correctamente

## Archivos Modificados

- `src/hooks/useNotifications.ts` - Lógica mejorada para obtener trip_title e inviter_name

## Fecha
18 de octubre de 2025
