# ✅ VERIFICACIÓN POST-DEPLOYMENT

## 📋 Estado Actual del Sistema

### ✅ Base de Datos
- [x] Tabla `recovery_codes` creada
- [x] Índices creados (user_id, expires_at, is_used)
- [x] RLS habilitado
- [x] 4 políticas de seguridad aplicadas

### ✅ Edge Function
- [x] `send-recovery-email` desplegada
- [x] CORS configurado
- [x] Modo desarrollo activo (sin RESEND_API_KEY)
- [x] Logging mejorado

### ✅ Frontend
- [x] `pinRecovery.ts` service actualizado
- [x] `ForgotPinModal` muestra código en desarrollo
- [x] `RecoveryCodeModal` implementado
- [x] `SetNewPinModal` implementado
- [x] `PinVerificationInline` con botón de recuperación
- [x] `PinVerificationModal` con botón de recuperación

---

## 🧪 TESTING: Prueba el Flujo Completo

### Paso 1: Abrir Pantalla de PIN
1. Ve a **Perfil** → **Documentos de Viaje**
2. Debería aparecer la pantalla con teclado numérico
3. Verifica que se ve el botón: **"ℹ️ ¿Olvidaste tu PIN?"**

### Paso 2: Solicitar Código
1. Haz clic en **"¿Olvidaste tu PIN?"**
2. Aparece `ForgotPinModal` con tu email
3. Haz clic en **"Enviar Código"**
4. Confirma en el Alert

### Paso 3: Verificar Código Generado
En **modo desarrollo** (sin RESEND_API_KEY), verás el código de 3 formas:

#### Opción A: En el Alert de Confirmación
```
✅ Código Enviado

Hemos enviado un código de 6 dígitos a tu@email.com.

El código expira en 15 minutos.

🔧 MODO DESARROLLO
Código: 123456

(En producción se enviará por email)
```

#### Opción B: En la Consola de Expo
```
═══════════════════════════════════════
📋 CÓDIGO DE RECUPERACIÓN: 123456
═══════════════════════════════════════
```

#### Opción C: En los Logs del Edge Function
Ve a: https://supabase.com/dashboard/project/iwsuyrlrbmnbfyfkqowl/functions/send-recovery-email/logs

Busca línea:
```
⚠️ Development mode - Code: 123456
```

### Paso 4: Ingresar Código
1. Se abre `RecoveryCodeModal` con 6 campos
2. Ingresa el código de 6 dígitos (uno por campo)
3. O pega el código completo desde el clipboard
4. Click en **"Verificar Código"**

### Paso 5: Establecer Nuevo PIN
1. Se abre `SetNewPinModal`
2. **Paso 1/2**: Ingresa nuevo PIN de 4 dígitos
3. Click en **"Continuar"**
4. **Paso 2/2**: Confirma el PIN (ingresar de nuevo)
5. Click en **"Establecer PIN"**

### Paso 6: Verificación Final
1. Aparece Alert: **"✅ PIN Restablecido"**
2. Se cierran todos los modales
3. Pantalla de PIN reaparece
4. Ingresa el **nuevo PIN**
5. Deberías poder acceder a tus documentos ✅

---

## 🔍 VERIFICACIONES EN SUPABASE

### 1. Verificar Tabla `recovery_codes`

```sql
-- Ver últimos códigos generados
SELECT 
  id,
  user_id,
  sent_to_email,
  is_used,
  attempts,
  max_attempts,
  expires_at,
  created_at
FROM recovery_codes
ORDER BY created_at DESC
LIMIT 5;
```

**Esperado**: Ver registros con:
- `is_used = false` (antes de usar el código)
- `attempts = 0` (antes de intentos)
- `expires_at` = 15 minutos después de `created_at`

### 2. Verificar RLS Policies

```sql
-- Ver todas las políticas de la tabla
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'recovery_codes';
```

**Esperado**: 4 políticas:
1. `Users can view own active recovery codes` (SELECT)
2. `Service role can manage recovery codes` (ALL)
3. `Users can insert own recovery codes` (INSERT)
4. `Users can update own recovery codes` (UPDATE)

### 3. Verificar Edge Function Logs

Ve a: https://supabase.com/dashboard/project/iwsuyrlrbmnbfyfkqowl/functions/send-recovery-email/logs

**Busca estas líneas**:
```
📧 send-recovery-email called: { email: 'user@email.com', userId: 'uuid', hasCode: true }
⚠️ Development mode - Code: 123456
```

Si ves errores, revisa:
- ¿El Edge Function está desplegado?
- ¿La función tiene permisos correctos?
- ¿La tabla existe y tiene datos?

---

## 🐛 TROUBLESHOOTING

### Problema: "Edge Function returned non-2xx status"
**Causa**: Edge Function no desplegado o con error  
**Solución**:
1. Ve a https://supabase.com/dashboard/project/iwsuyrlrbmnbfyfkqowl/functions
2. Verifica que `send-recovery-email` aparece en la lista
3. Revisa los logs para ver el error exacto
4. Si no existe, vuelve a crear la función con el código de `index-standalone.ts`

### Problema: No veo el código en el Alert
**Causa**: `developmentCode` no se está retornando  
**Solución**:
1. Verifica que el Edge Function NO tenga `RESEND_API_KEY` configurado
2. Revisa la consola de Expo Go para ver logs
3. Revisa logs del Edge Function en Supabase

### Problema: "Código incorrecto" aunque es el correcto
**Causa**: Hash no coincide o código expirado  
**Solución**:
1. Verifica que estás usando el código más reciente
2. Asegúrate que no hayan pasado 15 minutos
3. Revisa la tabla `recovery_codes` en Supabase:
   ```sql
   SELECT code_hash, is_used, attempts, expires_at
   FROM recovery_codes
   WHERE user_id = 'TU_USER_ID'
   ORDER BY created_at DESC
   LIMIT 1;
   ```

### Problema: Error al establecer nuevo PIN
**Causa**: Permisos de escritura en Secure Store  
**Solución**:
1. Verifica permisos de la app en iOS Settings
2. Reinicia la app completamente
3. Revisa logs en consola

---

## 📊 QUERIES ÚTILES PARA DEBUGGING

### Ver códigos activos de un usuario
```sql
SELECT 
  code_hash,
  sent_to_email,
  is_used,
  attempts,
  max_attempts,
  expires_at > NOW() as is_valid,
  EXTRACT(EPOCH FROM (expires_at - NOW()))/60 as minutes_left
FROM recovery_codes
WHERE user_id = 'TU_USER_ID'
  AND is_used = false
ORDER BY created_at DESC;
```

### Limpiar códigos antiguos
```sql
-- Marcar como usados todos los códigos expirados
UPDATE recovery_codes
SET is_used = true
WHERE expires_at < NOW()
  AND is_used = false;
```

### Ver estadísticas de uso
```sql
SELECT 
  COUNT(*) as total_codes,
  SUM(CASE WHEN is_used THEN 1 ELSE 0 END) as used_codes,
  SUM(CASE WHEN expires_at < NOW() THEN 1 ELSE 0 END) as expired_codes,
  AVG(attempts) as avg_attempts
FROM recovery_codes
WHERE created_at > NOW() - INTERVAL '7 days';
```

---

## 🎯 PRÓXIMOS PASOS

### 1. Testing Completo ✅
- [ ] Probar flujo completo de recuperación
- [ ] Verificar que el código se muestra en desarrollo
- [ ] Probar con código incorrecto (3 intentos)
- [ ] Probar con código expirado (después de 15 min)
- [ ] Verificar que el nuevo PIN funciona

### 2. Configurar Resend (Producción)
Cuando quieras emails reales:
- [ ] Crear cuenta en https://resend.com
- [ ] Obtener API Key
- [ ] Agregar variable `RESEND_API_KEY` en Supabase
- [ ] Verificar dominio en Resend (opcional pero recomendado)
- [ ] Redeploy Edge Function

### 3. Internacionalización (Futuro)
Los componentes actualmente están en español. Para multi-idioma:
- [ ] Agregar traducciones a `src/i18n/translations.ts`
- [ ] Usar `useTranslations()` en componentes
- [ ] Traducir template de email
- [ ] Detectar idioma del usuario desde `auth.user.user_metadata`

### 4. Analytics (Opcional)
Para monitorear uso:
- [ ] Agregar evento "recovery_code_requested"
- [ ] Agregar evento "recovery_code_verified"
- [ ] Agregar evento "pin_reset_completed"
- [ ] Dashboard de métricas de seguridad

---

## 📝 CAMBIOS REALIZADOS EN ESTA SESIÓN

### Archivos Creados
1. `supabase/functions/_shared/cors.ts` - Headers CORS compartidos
2. `supabase/functions/send-recovery-email/index-standalone.ts` - Versión standalone del Edge Function
3. `DEPLOY_RECOVERY_EMAIL_GUIDE.md` - Guía de deployment
4. `PHASE6_EMAIL_RECOVERY_COMPLETE.md` - Documentación completa de Fase 6
5. `PIN_RECOVERY_FIX_VISUAL.txt` - Diagrama visual de los cambios

### Archivos Modificados
1. `src/services/pinRecovery.ts` 
   - Agregado mejor logging
   - Agregado `developmentCode` en respuesta
   - Mejorado manejo de errores

2. `src/components/profile/ForgotPinModal.tsx`
   - Muestra código en Alert en modo desarrollo
   - Mejorado feedback visual

3. `src/components/profile/PinVerificationInline.tsx`
   - Agregado botón "¿Olvidaste tu PIN?"
   - Integrados 3 modales de recuperación
   - Agregados handlers del flujo

4. `supabase/functions/send-recovery-email/index.ts`
   - Agregado manejo de CORS
   - Mejorado modo desarrollo
   - Mejor logging

### SQL Ejecutado
```sql
CREATE TABLE recovery_codes (...)
CREATE INDEX idx_recovery_codes_*
ALTER TABLE recovery_codes ENABLE ROW LEVEL SECURITY
CREATE POLICY "Users can view own active recovery codes" ...
CREATE POLICY "Service role can manage recovery codes" ...
CREATE POLICY "Users can insert own recovery codes" ...
CREATE POLICY "Users can update own recovery codes" ...
```

---

## ✅ CHECKLIST FINAL

### Supabase
- [x] Tabla `recovery_codes` creada con todas las columnas
- [x] 3 índices creados para performance
- [x] RLS habilitado
- [x] 4 políticas de seguridad activas
- [x] Edge Function `send-recovery-email` desplegada
- [x] Edge Function sin `RESEND_API_KEY` (modo desarrollo)

### Código
- [x] Service `pinRecovery.ts` con logging mejorado
- [x] `ForgotPinModal` muestra código en desarrollo
- [x] `RecoveryCodeModal` con timer y validación
- [x] `SetNewPinModal` con proceso de 2 pasos
- [x] `PinVerificationInline` con integración completa
- [x] `PinVerificationModal` con integración completa
- [x] Tipos TypeScript actualizados

### Testing
- [ ] **TU TURNO**: Probar flujo completo en Expo Go
- [ ] Verificar que el código aparece en Alert
- [ ] Verificar que el código funciona
- [ ] Verificar que el nuevo PIN funciona
- [ ] Verificar logs en Supabase

---

## 🎉 SISTEMA LISTO PARA TESTING

El sistema de recuperación de PIN está **completamente implementado** y listo para probar.

**En modo desarrollo**, el código se mostrará de 3 formas:
1. ✅ En el Alert después de solicitar código
2. ✅ En la consola de Expo Go
3. ✅ En los logs del Edge Function en Supabase

**¡Prueba el flujo completo y avísame si encuentras algún problema!** 🚀
