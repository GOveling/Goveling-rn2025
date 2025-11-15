# 📧 Configuración de Resend para Recuperación de PIN

## ✅ Cambios Realizados

La Edge Function `request-pin-recovery` ahora usa:
- **Remitente:** `Goveling Security <seguridad@team.goveling.com>`
- **Dominio verificado:** `team.goveling.com`
- **Template:** Email HTML profesional con diseño responsive

---

## 🔧 Configurar RESEND_API_KEY

### Paso 1: Obtener API Key de Resend

1. Ve a: https://resend.com/api-keys
2. Copia tu API Key (empieza con `re_`)

### Paso 2: Configurar en Supabase

1. Ve a: https://supabase.com/dashboard/project/iwsuyrlrbmnbfyfkqowl/settings/functions
2. En la sección **"Environment variables"**
3. Agrega una nueva variable:
   - **Name:** `RESEND_API_KEY`
   - **Value:** `re_tu_api_key_aquí`
4. Click en **"Save"**

### Paso 3: Desplegar la función actualizada

```bash
# Opción 1: Desplegar desde el Dashboard
# Ve a: https://supabase.com/dashboard/project/iwsuyrlrbmnbfyfkqowl/functions/request-pin-recovery
# Click en "Edit" y pega el código de: supabase/functions/request-pin-recovery/index.ts
# Click en "Deploy"

# Opción 2: Desplegar con CLI (si tienes configurado el access token)
supabase functions deploy request-pin-recovery --project-ref iwsuyrlrbmnbfyfkqowl
```

---

## 🧪 Probar con Resend Configurado

Una vez configurado `RESEND_API_KEY`, prueba:

```bash
node test-pin-recovery.js
```

**Resultado esperado (con Resend):**
```json
{
  "ok": true,
  "message": "Código enviado exitosamente por email",
  "emailSent": true
}
```

**El código NO aparecerá en la respuesta** (solo en el email).

---

## 📊 Logs de Supabase

Ve a: https://supabase.com/dashboard/project/iwsuyrlrbmnbfyfkqowl/functions/request-pin-recovery/logs

Deberías ver:
```
🔍 RESEND_API_KEY status: CONFIGURED
📧 Sending email via Resend to: usuario@example.com
📧 Resend API response status: 200
✅ Email sent successfully: {...}
```

---

## 🎨 Preview del Email

El email incluye:

1. **Header con gradiente** (púrpura/violeta)
2. **Código de 6 dígitos** en una tarjeta destacada
3. **Información importante:**
   - ⏰ Expira en 15 minutos
   - 🔒 3 intentos disponibles
4. **Instrucciones paso a paso**
5. **Aviso de seguridad**
6. **Footer profesional**

---

## 🔄 Modo Desarrollo vs Producción

### Modo Desarrollo (sin RESEND_API_KEY)
- ✅ Código aparece en la respuesta
- ✅ Se muestra en Alert en la app
- ✅ No se envía email real

### Modo Producción (con RESEND_API_KEY)
- ✅ Email enviado a `team.goveling.com`
- ✅ Código NO aparece en respuesta (seguridad)
- ✅ Usuario recibe email profesional

---

## ✅ Checklist de Configuración

- [ ] API Key de Resend obtenida
- [ ] Variable `RESEND_API_KEY` agregada en Supabase
- [ ] Función `request-pin-recovery` actualizada y desplegada
- [ ] Probado con `node test-pin-recovery.js`
- [ ] Email recibido correctamente
- [ ] Flujo completo probado en la app

---

## 🎯 Próximos Pasos

Una vez configurado:

1. ✅ Emails se enviarán automáticamente desde `seguridad@team.goveling.com`
2. ✅ Los usuarios recibirán códigos de 6 dígitos por email
3. ✅ El sistema es completamente funcional en producción
4. ✅ Modo desarrollo sigue disponible para testing local

---

## 📧 Dominios de Email Disponibles

Ya tienes configurados en `team.goveling.com`:

- `seguridad@team.goveling.com` → Recuperación de PIN ✅
- `noreply@team.goveling.com` → Notificaciones generales
- `bienvenida@team.goveling.com` → Emails de confirmación

Todos están verificados y listos para usar.
