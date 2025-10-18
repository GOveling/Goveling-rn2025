# Correcciones Sistema de Invitaciones - 18 Octubre 2025

## Problemas Identificados y Corregidos

### 1. ✅ Trips Aceptados No se Renderizan

**Problema:** 
Cuando un usuario aceptaba una invitación, el trip no aparecía en su lista de trips porque el caché de RTK Query no se estaba invalidando.

**Solución:**
Se agregó la invalidación del caché de RTK Query en todos los puntos donde se acepta o rechaza una invitación:

#### a) `app/accept-invitation.tsx`
```typescript
// Después de aceptar la invitación
store.dispatch(tripsApi.util.invalidateTags(['TripBreakdown', 'Trips']));
```

#### b) `src/components/home/NotificationBell.tsx`
```typescript
// En handleAcceptInvitation
store.dispatch(tripsApi.util.invalidateTags(['TripBreakdown', 'Trips']));

// En handleRejectInvitation  
store.dispatch(tripsApi.util.invalidateTags(['TripBreakdown', 'Trips']));
```

**Resultado:** Ahora cuando un usuario acepta una invitación, el trip aparece inmediatamente en su lista de trips después de que se invalida y recarga el caché.

---

### 2. ✅ Badge de Invitación Pendiente Incorrecto

**Problema:**
El badge amarillo mostraba "1 pendiente" incluso cuando la invitación ya había sido rechazada o aceptada. Esto ocurría porque la query no filtraba por estado.

**Solución:**
Se modificó la función `fetchPendingInvites` en ambos componentes para que solo cuente invitaciones con status 'pending':

#### a) `src/components/TripCard.tsx`
```typescript
const fetchPendingInvites = async () => {
  try {
    const { data, error } = await supabase
      .from('trip_invitations')
      .select('id')
      .eq('trip_id', trip.id)
      .eq('status', 'pending'); // ← AGREGADO: Solo contar pendientes
    if (error) throw error;
    setPendingInvites(data?.length || 0);
  } catch (e) {
    console.warn('TripCard: Failed to fetch pending invites', e);
  }
};
```

#### b) `src/components/TripDetailsModal.tsx`
```typescript
const fetchPendingInvites = async () => {
  try {
    const { data, error } = await supabase
      .from('trip_invitations')
      .select('id')
      .eq('trip_id', trip.id)
      .eq('status', 'pending'); // ← AGREGADO: Solo contar pendientes
    if (error) throw error;
    setPendingInvites(data?.length || 0);
  } catch (e) {
    console.warn('⚠️ TripDetailsModal: Failed to fetch pending invites', e);
  }
};
```

**Resultado:** El badge amarillo ahora solo muestra el número correcto de invitaciones que están realmente pendientes (ni aceptadas ni rechazadas).

---

### 3. ⚠️ Historial de Invitaciones Vacío (Análisis)

**Problema Reportado:**
En el viaje del owner (info@goveling.com), no hay evidencia de que se hayan enviado invitaciones o que hayan sido aceptadas en la sección "Historial" dentro de "Gestionar grupo".

**Análisis:**
Este componente (`ManageTeamModal.tsx`) ya filtra correctamente las invitaciones aceptadas y rechazadas:

```typescript
const historyInvitations = invitations.filter(
  (i) => (i.status || '') === 'accepted' || (i.status || '') === 'declined'
);
```

**Posibles Causas:**
1. Las invitaciones están siendo aceptadas correctamente (se crea el registro en `trip_collaborators`)
2. El status de la invitación se actualiza a 'accepted'
3. **PERO**: Puede haber un problema de sincronización en tiempo real o el componente no está recargando después de la aceptación

**Verificación Necesaria:**
- Revisar la tabla `trip_invitations` en la base de datos para confirmar que el status está como 'accepted'
- Verificar si hay subscripciones en tiempo real funcionando en `ManageTeamModal.tsx`

---

## Archivos Modificados

1. **`app/accept-invitation.tsx`**
   - Agregado: Imports de `store` y `tripsApi`
   - Agregado: Invalidación de caché después de aceptar invitación

2. **`src/components/home/NotificationBell.tsx`**
   - Agregado: Imports de `store` y `tripsApi`
   - Agregado: Invalidación de caché en `handleAcceptInvitation`
   - Agregado: Invalidación de caché en `handleRejectInvitation`

3. **`src/components/TripCard.tsx`**
   - Modificado: `fetchPendingInvites` para filtrar solo invitaciones pendientes

4. **`src/components/TripDetailsModal.tsx`**
   - Modificado: `fetchPendingInvites` para filtrar solo invitaciones pendientes

---

## Testing Recomendado

### Test 1: Aceptar Invitación
1. Usuario A (info@goveling.com) envía invitación a Usuario B (araos.sebastian@gmail.com)
2. Usuario B acepta la invitación
3. **Verificar:**
   - ✅ El trip aparece inmediatamente en la lista de trips de Usuario B
   - ✅ El badge de "pendiente" desaparece en el TripCard de Usuario A
   - ✅ Usuario B aparece en la lista de colaboradores del trip

### Test 2: Rechazar Invitación  
1. Usuario A envía invitación a Usuario B
2. Usuario B rechaza la invitación
3. **Verificar:**
   - ✅ El badge de "pendiente" desaparece en el TripCard de Usuario A
   - ✅ La invitación aparece en el historial como "rechazada"
   - ✅ Usuario B NO aparece en la lista de colaboradores

### Test 3: Historial de Invitaciones
1. Usuario A abre "Gestionar grupo" del trip
2. Navega a la pestaña "Historial"
3. **Verificar:**
   - ⚠️ Las invitaciones aceptadas/rechazadas aparecen en el historial
   - ⚠️ Se muestra el estado correcto (aceptada/rechazada)
   - ⚠️ Se muestra la información del invitado

---

## Próximos Pasos

Si el problema del historial persiste:

1. **Verificar en la base de datos:**
   ```sql
   SELECT id, email, status, accepted_at, accepted_by, created_at
   FROM trip_invitations
   WHERE trip_id = '<trip_id>'
   ORDER BY created_at DESC;
   ```

2. **Agregar logs de depuración en ManageTeamModal:**
   ```typescript
   console.log('📋 ManageTeamModal: All invitations:', invitations);
   console.log('📋 ManageTeamModal: History invitations:', historyInvitations);
   ```

3. **Verificar suscripciones en tiempo real:**
   - Revisar si `ManageTeamModal` tiene subscripción a cambios en `trip_invitations`
   - Agregar si no existe
