# 🧪 Guía de Testing - Sistema de Recuperación de PIN

## 📋 Pre-requisitos

1. ✅ Tener un usuario con PIN configurado
2. ✅ Desplegar Edge Function (opcional para testing)
3. ✅ Configurar RESEND_API_KEY (opcional, modo dev sin esto)

---

## 🚀 Desplegar Edge Function

```bash
# Opción 1: Script automático
./deploy-recovery-email-function.sh

# Opción 2: Manual
supabase functions deploy send-recovery-email --no-verify-jwt
```

---

## 🔧 Configuración (Opcional)

### **Sin RESEND_API_KEY (Modo Desarrollo):**
- ✅ El código se muestra en los logs de la función
- ✅ No se envía email real
- ✅ Perfecto para desarrollo local

### **Con RESEND_API_KEY (Producción):**
```bash
# 1. Obtener API key de Resend
https://resend.com/api-keys

# 2. Configurar en Supabase
Dashboard → Settings → Edge Functions → Environment Variables
RESEND_API_KEY = re_xxxxxxxxxxxxx
```

---

## 📝 Pasos de Testing

### **Test 1: Flujo Completo Exitoso** ✅

```
1. Abrir app → Perfil → Documentos de Viaje
2. Modal de verificación de PIN aparece
3. Click "¿Olvidaste tu PIN?"
   
   ✅ Debe abrir ForgotPinModal
   ✅ Debe mostrar tu email
   
4. Click "Enviar Código de Recuperación"
5. Confirmar en el alert
   
   ✅ Loading spinner debe aparecer
   ✅ Alert de éxito con tu email
   ✅ Debe abrir RecoveryCodeModal
   
6. Revisar email (o logs si modo dev)
   
   📧 Email de: "Goveling Security"
   📧 Asunto: "Código de Recuperación de PIN - Goveling"
   📧 Código de 6 dígitos visible
   
7. Ingresar código de 6 dígitos
   
   ✅ Auto-advance entre inputs
   ✅ Auto-verify al completar 6 dígitos
   ✅ Alert "Código Válido"
   ✅ Debe abrir SetNewPinModal
   
8. Ingresar nuevo PIN (ej: 5678)
   
   ✅ Dots indicator debe actualizar
   ✅ Tips de seguridad visibles
   ✅ Botón "Continuar" habilitado
   
9. Click "Continuar"
   
   ✅ Paso 2 aparece
   ✅ Icono cambia a verde
   ✅ Step indicator: ○●
   
10. Confirmar nuevo PIN (5678)
11. Click "Confirmar PIN"
    
    ✅ Loading spinner
    ✅ Alert "PIN Restablecido"
    ✅ Todos los modales se cierran
    
12. Volver a abrir Documentos de Viaje
13. Ingresar nuevo PIN (5678)
    
    ✅ Debe dar acceso ✅
```

---

### **Test 2: Código Inválido** ❌

```
1-6. (Igual que Test 1)
7. Ingresar código incorrecto: 000000
   
   ✅ Alert "Código incorrecto. Te quedan 2 intentos"
   ✅ Inputs se limpian
   ✅ Focus en primer input
   
8. Ingresar código incorrecto: 111111
   
   ✅ Alert "Código incorrecto. Te quedan 1 intento"
   
9. Ingresar código correcto
   
   ✅ Continúa con Test 1 paso 8
```

---

### **Test 3: Máximo de Intentos** 🚫

```
1-6. (Igual que Test 1)
7. Primer intento: 000000
8. Segundo intento: 111111
9. Tercer intento: 222222
   
   ✅ Alert "Máximo de intentos alcanzado"
   ✅ RecoveryCodeModal se cierra
   ✅ Debe solicitar nuevo código
```

---

### **Test 4: Código Expirado** ⏰

```
1-6. (Igual que Test 1)
7. Esperar 15+ minutos
8. Ingresar código (aunque sea correcto)
   
   ✅ Alert "El código ha expirado"
   ✅ Modal se cierra
   ✅ Debe solicitar nuevo código
```

---

### **Test 5: PIN No Coincide** ❌

```
1-8. (Igual que Test 1)
9. Click "Continuar"
10. Ingresar PIN diferente: 1234 (en lugar de 5678)
    
    ✅ Alert "Los PINs no coinciden"
    ✅ Input de confirmación se limpia
    ✅ Mantiene paso 2 activo
    
11. Ingresar PIN correcto: 5678
    
    ✅ Continúa normalmente
```

---

### **Test 6: Cancelar Durante Setup** ⚠️

```
1-8. (Igual que Test 1)
9. Click botón atrás ([←])
   
   ✅ Alert de confirmación
   ✅ "Continuar configurando" / "Cancelar"
   
10. Si elige "Cancelar":
    ✅ Modal se cierra
    ✅ PIN NO se actualiza
```

---

### **Test 7: Paste Support** 📋

```
1-6. (Igual que Test 1)
7. Copiar código: 429815
8. Pegar en primer input
   
   ✅ Los 6 dígitos se distribuyen en los 6 inputs
   ✅ Auto-verify se ejecuta
   ✅ Continúa con Test 1 paso 8
```

---

### **Test 8: Timer en Tiempo Real** ⏱️

```
1-6. (Igual que Test 1)
7. Observar RecoveryCodeModal sin ingresar código
   
   ✅ "Expira en 15 minutos" inicialmente
   ✅ Después de 1 minuto: "Expira en 14 minutos"
   ✅ Después de 10 minutos: "Expira en 5 minutos"
   
8. Esperar hasta expiración
   
   ✅ "Código expirado"
   ✅ Al intentar verificar: Alert de expiración
```

---

### **Test 9: Email Enmascarado** 🎭

```
Email real: sebastian.araos@gmail.com
Email mostrado: se**************@gmail.com

Email real: john@example.com
Email mostrado: jo**@example.com
```

---

### **Test 10: Modo Desarrollo (Sin RESEND_API_KEY)** 🔧

```
1-5. (Igual que Test 1)
6. Abrir logs de Supabase Functions

   ✅ Ver log: "⚠️ RESEND_API_KEY not configured"
   ✅ Ver código en logs: "code: 429815"
   
7. Usar código de los logs
8. Continuar con Test 1
```

---

## 🎯 Checklist de Validación

### **UI/UX:**
- [ ] ForgotPinModal abre correctamente
- [ ] Email del usuario se muestra
- [ ] Loading states funcionan
- [ ] Alerts son claros y útiles
- [ ] RecoveryCodeModal tiene 6 inputs
- [ ] Auto-focus funciona
- [ ] Auto-advance funciona
- [ ] Paste support funciona
- [ ] SetNewPinModal tiene 2 pasos
- [ ] Step indicator funciona
- [ ] PIN length dots funcionan
- [ ] Tips de seguridad visibles

### **Funcionalidad:**
- [ ] Código se genera (6 dígitos)
- [ ] Código se hashea antes de guardar
- [ ] Email se envía (o modo dev funciona)
- [ ] Código se valida correctamente
- [ ] Intentos se cuentan (máx 3)
- [ ] Expiración funciona (15 min)
- [ ] Nuevo PIN se guarda
- [ ] Acceso con nuevo PIN funciona

### **Seguridad:**
- [ ] Código no se ve en plain text en DB
- [ ] Solo 1 código activo por usuario
- [ ] Códigos anteriores se invalidan
- [ ] PIN se hashea con PBKDF2
- [ ] SecureStore guarda el PIN
- [ ] Email de recuperación verificado

---

## 🐛 Debugging

### **Problema: Edge Function no responde**

```bash
# Ver logs de la función
supabase functions serve send-recovery-email --env-file ./supabase/.env.local

# O en dashboard
Dashboard → Edge Functions → send-recovery-email → Logs
```

### **Problema: Email no llega**

```
1. Verificar RESEND_API_KEY configurado
2. Verificar dominio verificado en Resend
3. Revisar logs de Resend: https://resend.com/emails
4. Verificar spam folder
5. Usar modo dev temporalmente
```

### **Problema: Código siempre inválido**

```sql
-- Verificar código en DB
SELECT 
  code_hash,
  is_used,
  attempts,
  expires_at,
  created_at
FROM recovery_codes
WHERE user_id = 'tu-user-id'
ORDER BY created_at DESC
LIMIT 1;
```

### **Problema: PIN no se actualiza**

```bash
# Verificar SecureStore
# En React Native Debugger:
await SecureStore.getItemAsync('travel_documents_pin_hash')

# Debe retornar:
{
  "hash": "...",
  "salt": "..."
}
```

---

## 📊 Métricas de Éxito

✅ **Flujo completo funciona**: Usuario puede recuperar PIN
✅ **Email llega en < 30 segundos**
✅ **Código válido por 15 minutos**
✅ **Máximo 3 intentos respetado**
✅ **Nuevo PIN funciona inmediatamente**
✅ **UI/UX fluida sin crashes**

---

## 🎉 Resultado Esperado

Después de completar el flujo:
1. ✅ Usuario tiene nuevo PIN
2. ✅ Puede acceder a documentos
3. ✅ Código antiguo está invalidado
4. ✅ Email de recuperación recibido (o logs vistos)
5. ✅ Experiencia fluida y profesional

---

**Última actualización**: 9 de noviembre de 2025  
**Estado**: Lista para testing
