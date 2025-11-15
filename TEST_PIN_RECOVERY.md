# 🧪 GUÍA DE PRUEBA: Recuperación de PIN

## 📋 Pre-requisitos

✅ Migración SQL ejecutada (políticas RLS actualizadas)
✅ Edge Function `request-pin-recovery` desplegada
✅ App ejecutándose en Expo Go

---

## 🔍 PASO 1: Verificar Base de Datos

Ejecuta el script SQL: `test-pin-recovery.sql`

**Resultado esperado:**
```
=== POLÍTICAS RLS ===
- service_role_full_access_recovery_codes | ALL | service_role
- users_view_own_recovery_codes | SELECT | authenticated  
- users_update_own_recovery_codes | UPDATE | authenticated

=== ESTADO RLS ===
✅ RLS HABILITADO

=== CONSTRAINTS ===
unique_active_code | UNIQUE (user_id, is_used)
```

---

## 🧪 PASO 2: Prueba en la App

### 2.1 Abrir Modal de Recuperación

1. Abre la app en Expo Go
2. Ve a la pantalla donde está el PIN (ej: Documentos de Viaje)
3. Click en **"¿Olvidaste tu PIN?"**
4. Debería aparecer el modal `ForgotPinModal`

### 2.2 Solicitar Código

1. Verifica que aparezca tu email
2. Click en **"Enviar Código de Recuperación"**
3. Confirma en el Alert que aparece

**Logs esperados en consola:**
```
🔐 Requesting PIN recovery via Edge Function for: tu-email@example.com
📧 Edge Function response: {data: {...}, error: null}
✅ Recovery code process completed successfully
```

**Resultado esperado:**

- ✅ Alert: "Código Enviado"
- ✅ Mensaje con email y tiempo de expiración
- ✅ En desarrollo: Código visible en el Alert
- ✅ Modal se cierra
- ✅ Se abre `RecoveryCodeModal`

### 2.3 Ingresar Código

1. Ingresa el código de 6 dígitos (del Alert o consola)
2. El código debería verificarse automáticamente

**Logs esperados:**
```
🔍 Verifying recovery code: 123456
✅ Recovery code valid
```

**Resultado esperado:**

- ✅ Código válido → Modal se cierra
- ✅ Se abre `SetNewPinModal`

### 2.4 Crear Nuevo PIN

1. Ingresa un nuevo PIN de 4 dígitos
2. Confirma el PIN
3. El PIN se guarda

**Logs esperados:**
```
💾 Saving new PIN for user: xxx-xxx-xxx
✅ New PIN saved successfully
```

**Resultado esperado:**

- ✅ Alert: "PIN Actualizado"
- ✅ Modal se cierra
- ✅ Puedes usar el nuevo PIN

---

## 🔍 PASO 3: Verificar en Base de Datos

Ejecuta este SQL después de la prueba:

```sql
-- Ver el código que acabas de crear
SELECT 
  sent_to_email,
  is_used,
  attempts,
  expires_at,
  created_at,
  CASE 
    WHEN is_used THEN '✅ USADO'
    WHEN expires_at < NOW() THEN '⏰ EXPIRADO'
    ELSE '⚠️ ACTIVO'
  END as estado
FROM recovery_codes
WHERE sent_to_email = 'TU-EMAIL@example.com'
ORDER BY created_at DESC
LIMIT 1;
```

**Resultado esperado:**
- `is_used` = `true`
- `estado` = `✅ USADO`

---

## 🐛 Troubleshooting

### Error: "new row violates row-level security policy"

**Causa:** Las políticas RLS no están aplicadas correctamente

**Solución:**
```sql
-- Verificar políticas
SELECT policyname FROM pg_policies WHERE tablename = 'recovery_codes';

-- Si no ves "service_role_full_access_recovery_codes", ejecuta:
CREATE POLICY "service_role_full_access_recovery_codes"
  ON recovery_codes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

### Error: "duplicate key value violates unique constraint"

**Causa:** Ya existe un código activo para tu usuario

**Solución:**
```sql
-- Invalidar códigos antiguos manualmente
UPDATE recovery_codes
SET is_used = true
WHERE user_id = 'TU-USER-ID'
  AND is_used = false;
```

### No aparece el código en el Alert

**Causa:** La Edge Function no está en modo desarrollo

**Verificar:**
1. Ve a Supabase Dashboard → Edge Functions → request-pin-recovery → Logs
2. Busca: `🔍 RESEND_API_KEY status: NOT CONFIGURED`
3. Si dice `CONFIGURED`, verifica que el email se envió correctamente

### La Edge Function no se ejecuta

**Causa:** La función no está desplegada o tiene errores

**Solución:**
1. Ve a Supabase Dashboard → Edge Functions
2. Verifica que `request-pin-recovery` existe
3. Revisa los logs (debería mostrar `🔐 PIN Recovery requested for: ...`)
4. Si no existe, usa el código de `/supabase/functions/request-pin-recovery/index.ts`

---

## ✅ Checklist de Prueba Completa

- [ ] SQL de verificación ejecutado correctamente
- [ ] Modal "Olvidé mi PIN" se abre
- [ ] Email del usuario aparece en el modal
- [ ] Click en "Enviar Código" funciona
- [ ] Alert muestra "Código Enviado"
- [ ] Código visible en Alert (modo desarrollo)
- [ ] Modal de código de 6 dígitos se abre
- [ ] Código se verifica correctamente
- [ ] Modal de nuevo PIN se abre
- [ ] Nuevo PIN se guarda exitosamente
- [ ] Puedes autenticarte con el nuevo PIN
- [ ] Base de datos muestra código como "usado"
- [ ] No hay errores en logs

---

## 📊 Logs de Supabase

**Para ver logs de la Edge Function:**

1. Ve a: https://supabase.com/dashboard/project/iwsuyrlrbmnbfyfkqowl/functions/request-pin-recovery
2. Click en "Logs"
3. Busca tu ejecución reciente

**Logs esperados:**
```
🔐 PIN Recovery requested for: tu-email@example.com
✅ User found: user-id-xxx
🔑 Generated recovery code: 123456
🔑 Code hash (first 10 chars): abc123def4
✅ Recovery code saved to database
🔍 RESEND_API_KEY status: NOT CONFIGURED
⚠️ DEVELOPMENT MODE - Returning code in response
```

---

## 🎯 Resultado Final Esperado

Si todo funciona correctamente:

1. ✅ Usuario puede solicitar código sin estar autenticado
2. ✅ Edge Function genera y guarda código con service_role
3. ✅ Código aparece en Alert (desarrollo)
4. ✅ Usuario ingresa código de 6 dígitos
5. ✅ Código se verifica correctamente
6. ✅ Usuario crea nuevo PIN de 4 dígitos
7. ✅ Nuevo PIN se guarda
8. ✅ Sistema funciona de extremo a extremo

**🎉 ¡Recuperación de PIN completamente funcional!**
