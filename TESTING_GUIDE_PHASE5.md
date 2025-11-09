# 🧪 Guía de Pruebas - Fase 5: Autenticación Biométrica

**Fecha:** 9 de noviembre de 2025  
**Versión:** 1.0  
**Fase:** 5 - Autenticación Biométrica (Face ID / Touch ID / Fingerprint)

---

## 📋 Prerrequisitos

Antes de comenzar las pruebas, asegúrate de:

- ✅ Tener Expo Go instalado en tu dispositivo
- ✅ Dispositivo iOS con Face ID o Touch ID configurado
  * iPhone X o posterior (Face ID)
  * iPhone 5s - 8 (Touch ID)
- ✅ Dispositivo Android con sensor de huella configurado
- ✅ Expo CLI actualizado: `npm install -g expo-cli`
- ✅ Proyecto sincronizado: `git pull origin main`

---

## 🚀 Iniciar el Proyecto

### 1. Instalar dependencias (si es necesario)
```bash
cd /Users/sebastianaraos/Desktop/Goveling-rn2025
npm install
```

### 2. Iniciar Expo
```bash
npx expo start
```

### 3. Conectar dispositivo
- **iOS:** Escanear QR con Cámara → Abrir en Expo Go
- **Android:** Escanear QR con Expo Go directamente

---

## 🧪 Casos de Prueba

### **CASO 1: Primera Configuración (Sin PIN)**

**Objetivo:** Verificar que el sistema solicita crear un PIN antes de permitir acceso

**Pasos:**
1. Abrir la app
2. Ir a **Profile** → **Travel Documents**
3. **Esperado:** Debe mostrar el modal de configuración de PIN
4. Crear un PIN de 4 dígitos (Ej: 1234)
5. Confirmar el PIN
6. **Esperado:** Modal de PIN se cierra, muestra pantalla vacía de documentos

**✅ Resultado Esperado:**
```
┌──────────────────────────────┐
│  🔒 Configura tu PIN         │
│                               │
│  Crea un PIN de 4 dígitos    │
│  [____]                      │
│                               │
│  [Configurar PIN]            │
└──────────────────────────────┘
```

---

### **CASO 2: Habilitar Autenticación Biométrica**

**Objetivo:** Activar Face ID/Touch ID desde Settings

**Pasos:**
1. Abrir **Travel Documents**
2. Ingresar PIN si es necesario
3. Hacer clic en el ícono de **⚙️ Settings** (arriba a la derecha, antes del +)
4. **Esperado:** Modal de Security Settings se abre
5. Verificar que muestra:
   - Título: "Autenticación Biométrica"
   - Subtítulo: "Acceso rápido a tus documentos"
   - Toggle: OFF
   - Tipo de biometría detectado (Face ID / Touch ID / Huella Digital)
6. Activar el **toggle**
7. **Esperado:** Sistema solicita autenticación biométrica inmediatamente
8. Autenticar con Face ID / Touch ID
9. **Esperado:** 
   - Alert: "✅ Face ID habilitado"
   - Toggle permanece ON
   - Aparece info box azul: "Podrás usar Face ID en lugar de tu PIN..."
10. Cerrar modal de Settings

**✅ Resultado Esperado:**
```
┌──────────────────────────────────┐
│  ← Seguridad                    │
│                                  │
│  🎭 [Face ID]  ──────────  [ON] │
│  Acceso rápido a tus documentos  │
│                                  │
│  ℹ️ Podrás usar Face ID en       │
│     lugar de tu PIN. Si falla,   │
│     siempre podrás usar tu PIN.  │
│                                  │
│  🔑 [Cambiar PIN] (Próximamente) │
│                                  │
│  🛡️ Información de Seguridad     │
│     AES-256-GCM encryption...    │
└──────────────────────────────────┘
```

---

### **CASO 3: Acceso con Biometría (Auto-Trigger Exitoso)**

**Objetivo:** Verificar que la biometría se activa automáticamente

**Pasos:**
1. Cerrar completamente la app (force quit)
2. Abrir la app de nuevo
3. Ir a **Profile** → **Travel Documents**
4. **Esperado:** Modal de verificación se abre
5. **Esperado:** Después de 300ms, Face ID/Touch ID se activa automáticamente
6. Autenticar con Face ID / Touch ID
7. **Esperado:** Modal se cierra inmediatamente, acceso a documentos

**⏱️ Timeline:**
```
0ms    → Modal de verificación abre
300ms  → Face ID se activa automáticamente
1000ms → Usuario autentica con Face ID
1100ms → Modal se cierra, acceso concedido
```

**✅ Resultado Esperado:**
```
┌────────────────────────────────┐
│  Face ID prompt aparece        │
│  (UI nativa de iOS/Android)    │
│                                 │
│         👤                      │
│    Coloca tu rostro            │
│    frente a la cámara          │
│                                 │
│  [Cancelar]                    │
└────────────────────────────────┘

↓ (Si exitoso)

Acceso concedido automáticamente
```

---

### **CASO 4: Fallback Manual a Biometría**

**Objetivo:** Usar botón manual si auto-trigger falla

**Pasos:**
1. Abrir **Travel Documents**
2. Cuando Face ID se active automáticamente, **cancelar**
3. **Esperado:** Modal muestra:
   - Botón "🎭 Usar Face ID" (arriba)
   - Divider "o"
   - Input de PIN (abajo)
4. Hacer clic en **"Usar Face ID"**
5. **Esperado:** Face ID se activa de nuevo
6. Autenticar con Face ID
7. **Esperado:** Acceso concedido

**✅ Resultado Esperado:**
```
┌─────────────────────────────────┐
│  🔒                             │
│  Ingresa tu PIN para continuar  │
│                                  │
│  ┌───────────────────────────┐  │
│  │  🎭  Usar Face ID         │  │ ← Botón manual
│  └───────────────────────────┘  │
│                                  │
│  ────────  o  ────────           │
│                                  │
│  [____]  ← PIN Input            │
│                                  │
│  [Verificar PIN]                │
└─────────────────────────────────┘
```

---

### **CASO 5: Fallback Completo a PIN**

**Objetivo:** Usar PIN cuando biometría falla o se cancela

**Pasos:**
1. Abrir **Travel Documents**
2. Cancelar Face ID automático
3. **Esperado:** Ver botón "Usar Face ID" y input de PIN
4. NO usar el botón de Face ID
5. Ingresar PIN manualmente (Ej: 1234)
6. Hacer clic en **"Verificar PIN"**
7. **Esperado:** Acceso concedido

**✅ Resultado Esperado:**
- PIN se valida correctamente
- Modal se cierra
- Acceso a documentos concedido

---

### **CASO 6: Deshabilitar Biometría**

**Objetivo:** Desactivar Face ID desde Settings

**Pasos:**
1. Abrir **Travel Documents** (usar biometría o PIN)
2. Clic en **⚙️ Settings**
3. Toggle de Face ID debe estar **ON**
4. Desactivar el **toggle**
5. **Esperado:** Alert de confirmación:
   ```
   ⚠️ ¿Deshabilitar Face ID?
   Deberás usar tu PIN para acceder a tus documentos
   [Cancelar] [Deshabilitar]
   ```
6. Hacer clic en **"Deshabilitar"**
7. **Esperado:** 
   - Alert: "✅ Face ID deshabilitado"
   - Toggle permanece OFF
   - Info box azul desaparece
8. Cerrar Settings
9. Cerrar app completamente
10. Abrir app y volver a Travel Documents
11. **Esperado:** Solo muestra input de PIN, NO botón de biometría

**✅ Resultado Esperado:**
```
┌─────────────────────────────────┐
│  🔒                             │
│  Ingresa tu PIN para continuar  │
│                                  │
│  [____]  ← Solo PIN Input       │
│                                  │
│  [Verificar PIN]                │
│                                  │
│  (No hay botón de Face ID)      │
└─────────────────────────────────┘
```

---

### **CASO 7: Sin Hardware de Biometría (Simulador)**

**Objetivo:** Verificar comportamiento en dispositivos sin biometría

**Pasos:**
1. Usar **iOS Simulator** (no tiene Face ID real)
2. Abrir Travel Documents
3. Clic en **⚙️ Settings**
4. **Esperado:** Modal muestra:
   - Título: "Autenticación Biométrica"
   - Toggle: OFF y **deshabilitado** (gris)
   - Mensaje: "No disponible en este dispositivo"

**✅ Resultado Esperado:**
```
┌──────────────────────────────────┐
│  ← Seguridad                    │
│                                  │
│  🔒 [Autenticación Biométrica]  │
│      ──────────  [OFF]           │
│  No disponible en este dispositivo│
└──────────────────────────────────┘
```

---

### **CASO 8: Biometría Configurada pero No Enrolada**

**Objetivo:** Detectar cuando el usuario no tiene Face ID configurado en el dispositivo

**Setup:**
1. **iOS:** Settings → Face ID & Passcode → Reset Face ID
2. **Android:** Settings → Security → Remove Fingerprint

**Pasos:**
1. Abrir Travel Documents
2. Clic en **⚙️ Settings**
3. **Esperado:** Modal muestra:
   - Toggle: OFF
   - Warning box naranja:
     ```
     ⚠️ Ve a Ajustes del dispositivo y configura Face ID para usar esta función.
     ```

**✅ Resultado Esperado:**
```
┌──────────────────────────────────┐
│  ← Seguridad                    │
│                                  │
│  🎭 [Face ID]  ──────────  [OFF]│
│  Acceso rápido a tus documentos  │
│                                  │
│  ⚠️ Ve a Ajustes del dispositivo │
│     y configura Face ID para     │
│     usar esta función.           │
└──────────────────────────────────┘
```

---

## 📝 Checklist de Validación

Marca cada ítem después de probarlo:

### Configuración Inicial
- [ ] Sistema solicita crear PIN en primer uso
- [ ] PIN se guarda correctamente
- [ ] No se puede acceder sin PIN

### Settings Modal
- [ ] Botón de Settings (⚙️) visible en header
- [ ] Modal de Security Settings se abre correctamente
- [ ] Detecta tipo de biometría (Face ID / Touch ID / Huella)
- [ ] Toggle funciona correctamente
- [ ] Info boxes se muestran según estado

### Habilitar Biometría
- [ ] Toggle ON solicita autenticación inmediatamente
- [ ] Autenticación exitosa habilita biometría
- [ ] Alert de confirmación aparece
- [ ] Preferencia se guarda en AsyncStorage
- [ ] Info box azul aparece cuando está habilitado

### Auto-Trigger
- [ ] Face ID se activa automáticamente al abrir modal (300ms delay)
- [ ] Autenticación exitosa cierra modal automáticamente
- [ ] Cancelar Face ID muestra botón manual y PIN input

### Botón Manual
- [ ] Botón "Usar Face ID" visible cuando biometría habilitada
- [ ] Clic en botón activa Face ID de nuevo
- [ ] Autenticación exitosa concede acceso

### Fallback a PIN
- [ ] PIN input siempre visible
- [ ] PIN funciona aunque biometría esté habilitada
- [ ] PIN funciona si biometría falla

### Deshabilitar Biometría
- [ ] Toggle OFF muestra alert de confirmación
- [ ] Confirmar deshabilitación actualiza preferencia
- [ ] Próximo acceso solo muestra PIN
- [ ] Info box azul desaparece

### Edge Cases
- [ ] Sin hardware: Toggle deshabilitado, mensaje correcto
- [ ] Sin enrollment: Warning box naranja aparece
- [ ] Simulador: No hay errores, solo PIN disponible

### UX / UI
- [ ] Iconos correctos según tipo de biometría
- [ ] Colores temáticos aplicados
- [ ] Animaciones suaves
- [ ] No hay crashes
- [ ] Logs en consola son claros

---

## 🐛 Problemas Comunes y Soluciones

### Problema 1: Face ID no se activa
**Causa:** Simulador no soporta Face ID real  
**Solución:** Probar en dispositivo físico

### Problema 2: "No se pudo autenticar"
**Causa:** Face ID no configurado en dispositivo  
**Solución:** iOS Settings → Face ID & Passcode → Configure Face ID

### Problema 3: Toggle se activa pero luego se desactiva
**Causa:** Autenticación falló o se canceló  
**Solución:** Intentar de nuevo, asegurarse de completar Face ID

### Problema 4: AsyncStorage no guarda preferencia
**Causa:** Permisos o error en AsyncStorage  
**Solución:** 
```bash
npx expo start --clear
```

### Problema 5: Modal de Settings no se abre
**Causa:** Botón de Settings no está conectado  
**Solución:** Verificar que `onPress={() => setShowSecuritySettings(true)}` está en el botón

---

## 📊 Logs Esperados en Consola

### Habilitar Biometría:
```
✅ Checking biometric capabilities...
📱 Biometric type detected: faceId
✅ Biometric authentication successful
💾 Saving biometric preference: true
```

### Auto-Trigger:
```
🔓 PinVerificationModal opened
⏱️ Auto-triggering biometric authentication in 300ms...
🎭 Authenticating with Face ID...
✅ Biometric authentication successful
🔒 Closing modal, access granted
```

### Fallback a PIN:
```
🔓 PinVerificationModal opened
⏱️ Auto-triggering biometric authentication in 300ms...
🎭 Authenticating with Face ID...
❌ Biometric authentication cancelled
📝 Showing PIN input for manual entry
```

### Deshabilitar Biometría:
```
⚠️ Disabling biometric authentication...
💾 Saving biometric preference: false
✅ Biometric authentication disabled
```

---

## ✅ Criterios de Aceptación

La Fase 5 se considera **completada exitosamente** si:

1. ✅ Todos los casos de prueba pasan sin errores
2. ✅ Biometría se activa automáticamente en <500ms
3. ✅ Fallback a PIN funciona en todos los casos
4. ✅ Preferencia persiste después de cerrar la app
5. ✅ No hay crashes en ningún flujo
6. ✅ UI es clara e intuitiva
7. ✅ Settings modal es accesible fácilmente
8. ✅ Funciona en iOS (Face ID + Touch ID)
9. ✅ Funciona en Android (Fingerprint)
10. ✅ Logs en consola son útiles para debugging

---

## 🚀 Próximos Pasos

Una vez completadas estas pruebas:

1. ✅ Marcar Fase 5 como completada
2. 📝 Documentar resultados de pruebas
3. 🐛 Reportar bugs encontrados
4. 🎉 Celebrar!
5. ➡️ Iniciar Fase 6: Sistema de Recuperación por Email

---

**¿Listo para probar?**  
Sigue esta guía paso a paso y marca cada ítem según lo completes. ¡Buena suerte! 🎉
