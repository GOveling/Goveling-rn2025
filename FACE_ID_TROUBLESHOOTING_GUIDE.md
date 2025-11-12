# 🔍 Diagnóstico: Face ID No Aparece - Guía de Solución

**Fecha**: 12 de noviembre de 2025  
**Problema**: Solo aparece verificación por PIN, no Face ID

---

## 🎯 Orden Correcto del Flujo

El flujo ya está implementado correctamente en el código:

```
1. Usuario abre Documentos de Viaje
   ↓
2. PinVerificationModal se abre
   ↓
3. 🔍 Se verifica si Face ID está:
   - ✅ Disponible en el dispositivo (hardware + enrolled)
   - ✅ Habilitado en la app (configuración del usuario)
   ↓
4a. SI ambos ✅:
    → Face ID se activa AUTOMÁTICAMENTE (después de 300ms)
    → Botón "Usar Face ID" visible debajo
    → Input de PIN visible como RESPALDO
    
4b. SI alguno ❌:
    → Solo se muestra input de PIN
    → No se muestra Face ID
```

---

## 🔍 Checklist de Diagnóstico

### **Paso 1: ¿Estás usando el simulador correcto?**

❌ **Expo Go** → Face ID NO funciona (limitación conocida)  
✅ **iOS Simulator (Xcode)** → Face ID SÍ funciona

**Verificar:**
```bash
# ¿Corriste este comando?
npx expo run:ios

# O estás usando:
npx expo start  # ← Esto abre Expo Go (NO funciona)
```

**Solución si estás en Expo Go:**
```bash
# Cierra Expo Go
# Ejecuta:
npx expo run:ios
```

---

### **Paso 2: ¿Face ID está habilitado en el simulador?**

El simulador necesita tener Face ID configurado.

**Verificar:**
1. Abre el simulador
2. Ve a: **Features → Face ID**
3. Debe decir **"Enrolled"** ✅

**Si dice "Not Enrolled" o está gris:**
```
Simulador → Features → Face ID → Enrolled
```

---

### **Paso 3: ¿Face ID está habilitado en la app?**

Por defecto, Face ID está **deshabilitado**. Debes habilitarlo manualmente.

**Pasos para habilitar:**

1. Abre la app en el simulador
2. Ve a **Perfil** (tab inferior)
3. Toca **"Documentos de Viaje"**
4. Si es la primera vez:
   - Crea tu PIN (6 dígitos)
   - Confirma tu PIN
5. Una vez dentro, toca el ícono **⚙️ Settings** (esquina superior derecha)
6. Verás la opción **"Face ID"** con un toggle
7. **Activa el toggle**
8. El sistema solicitará Face ID inmediatamente
9. En el simulador: **Features → Face ID → Matching Face**
10. Verás mensaje: "✅ Habilitado"

**Ahora cierra y vuelve a abrir Documentos de Viaje:**
- Face ID debería activarse automáticamente
- También verás el botón "Usar Face ID"
- El PIN estará disponible como respaldo

---

### **Paso 4: Ver logs de debug**

He agregado logs de debug para diagnosticar el problema.

**Abrir la consola:**
```bash
# Si usaste npx expo run:ios, la consola muestra los logs
# Busca estos mensajes:

🔍 Biometric Capabilities:
  isAvailable: true/false
  hasHardware: true/false
  isEnrolled: true/false
  biometricType: 'faceId'/'touchId'/'none'

🔍 Biometric Enabled in App: true/false

✨ Auto-triggering biometric authentication...
```

**Interpretar los logs:**

| Log | Significado | Solución |
|-----|-------------|----------|
| `hasHardware: false` | Simulador sin Face ID | Elige iPhone con Face ID (iPhone X+) |
| `isEnrolled: false` | Face ID no configurado | Features → Face ID → Enrolled |
| `isAvailable: false` | Hardware o enrolled falso | Revisa pasos 1 y 2 |
| `Enabled in App: false` | No habilitado en Settings | Ve a Settings y activa toggle |
| `Auto-triggering...` | ✅ Todo correcto | Face ID debería aparecer |

---

## 🎯 Solución Paso a Paso

### **Escenario 1: Usando Expo Go (No Funciona)**

❌ **Problema:** Expo Go no soporta Face ID

✅ **Solución:**
```bash
# Cierra la app
# En la terminal, presiona Ctrl+C

# Ejecuta:
npx expo run:ios

# Espera ~5 minutos la primera vez
# El simulador se abrirá automáticamente con la app
```

---

### **Escenario 2: Face ID No Enrolled en Simulador**

❌ **Problema:** Features → Face ID → Not Enrolled

✅ **Solución:**
```
1. Con el simulador abierto
2. Menú superior: Features → Face ID → Enrolled
3. Reinicia la app (Cmd+R en el simulador)
4. Abre Documentos de Viaje
```

---

### **Escenario 3: Face ID Disponible pero No Habilitado**

❌ **Problema:** Face ID funciona en el simulador pero no en la app

✅ **Solución - Habilitar en la app:**

```
1. Abre la app
2. Perfil → Documentos de Viaje
3. Toca ⚙️ (Settings) arriba a la derecha
4. Verás:
   
   ┌─────────────────────────────────┐
   │ Autenticación                   │
   ├─────────────────────────────────┤
   │ 📱 Face ID              [OFF]   │
   │ Acceso rápido a tus documentos  │
   └─────────────────────────────────┘

5. Toca el toggle para activarlo
6. Sistema solicita Face ID
7. Simulador: Features → Face ID → Matching Face
8. Mensaje: "✅ Habilitado"
9. Cierra Settings
10. Cierra Documentos de Viaje completamente
11. Vuelve a abrir Documentos de Viaje
12. ✨ Face ID se activará automáticamente
```

---

## 🎨 Cómo Se Ve Cuando Funciona

### **Con Face ID Habilitado:**

```
┌─────────────────────────────────────┐
│          Verificar PIN              │
│          [X Cerrar]                 │
├─────────────────────────────────────┤
│                                     │
│            🔒 [Ícono]               │
│                                     │
│   Ingresa tu PIN para continuar    │
│                                     │
│  ┌─────────────────────────────┐   │
│  │   📱  Usar Face ID           │   │  ← Este botón aparece
│  └─────────────────────────────┘   │
│                                     │
│              — o —                  │  ← Divisor
│                                     │
│       [Input de PIN]                │  ← Respaldo
│                                     │
│       [Verificar]                   │
│                                     │
│     ¿Olvidaste tu PIN?              │
│                                     │
└─────────────────────────────────────┘
```

### **Sin Face ID (actual):**

```
┌─────────────────────────────────────┐
│          Verificar PIN              │
│          [X Cerrar]                 │
├─────────────────────────────────────┤
│                                     │
│            🔒 [Ícono]               │
│                                     │
│   Ingresa tu PIN para continuar    │
│                                     │
│       [Input de PIN]                │  ← Solo esto
│                                     │
│       [Verificar]                   │
│                                     │
│     ¿Olvidaste tu PIN?              │
│                                     │
└─────────────────────────────────────┘
```

---

## 🧪 Test Completo

Sigue estos pasos exactamente:

```bash
# 1. Asegúrate de usar el simulador correcto
npx expo run:ios

# Espera a que compile y se abra el simulador
```

Luego en el simulador:

```
2. Habilita Face ID en el simulador:
   Features → Face ID → Enrolled

3. Abre la app (si no está abierta ya)

4. Ve a: Perfil (tab inferior)

5. Toca: "Documentos de Viaje"

6. Primera vez:
   - Crea PIN: 123456
   - Confirma: 123456

7. Toca: ⚙️ (Settings, esquina superior derecha)

8. Deberías ver:
   ┌─────────────────────────────────┐
   │ Autenticación                   │
   ├─────────────────────────────────┤
   │ 📱 Face ID              [OFF]   │
   └─────────────────────────────────┘

9. Si NO ves esta opción:
   - Revisa los logs (consola)
   - Verifica que corriste "npx expo run:ios"
   - NO "npx expo start"

10. Si SÍ ves la opción:
    - Activa el toggle
    - Simulador: Features → Face ID → Matching Face
    - Verás: "✅ Habilitado"

11. Cierra Settings (X)

12. Cierra Documentos de Viaje (X)

13. Vuelve a abrir: Documentos de Viaje

14. Ahora deberías ver:
    - Face ID se activa automáticamente (300ms)
    - Botón "Usar Face ID" visible
    - Input de PIN como respaldo

15. Prueba:
    - Features → Face ID → Matching Face
    - ✅ Deberías entrar automáticamente
```

---

## 🔧 Comandos de Verificación

### **1. Verificar que el build es nativo (no Expo Go):**

Busca en los logs iniciales algo como:
```
✔ Building iOS app
✔ Installing CocoaPods
✔ Built successfully
```

Si ves:
```
› Opening on iOS simulator
› Using Expo Go
```
❌ Estás usando Expo Go (no funcionará)

### **2. Verificar que el simulador tiene Face ID:**

En el simulador, menú superior debe mostrar:
```
Features → Face ID → Enrolled ✓
```

Si dice "Not Available" o no aparece la opción:
- Cierra el simulador
- Abre Xcode
- Elige un simulador con Face ID (iPhone 14/15 Pro)
- Vuelve a ejecutar `npx expo run:ios`

---

## 📱 Simuladores Recomendados con Face ID

✅ iPhone 15 Pro / Pro Max  
✅ iPhone 14 Pro / Pro Max  
✅ iPhone 13 / Pro / Pro Max  
✅ iPhone 12 / Pro / Pro Max  
✅ iPhone 11 / Pro / Pro Max  
✅ iPhone X / XS / XS Max / XR  

❌ iPhone SE (no tiene Face ID)  
❌ iPhone 8 / 8 Plus (Touch ID en su lugar)

---

## 🐛 Problemas Comunes

### **"No veo la opción de Face ID en Settings"**

**Causa:** Usando Expo Go o Face ID no enrolled

**Solución:**
```bash
npx expo run:ios
# Y en el simulador:
Features → Face ID → Enrolled
```

### **"Face ID se intenta activar pero falla inmediatamente"**

**Causa:** Face ID no enrolled en simulador

**Solución:**
```
Features → Face ID → Enrolled
```

### **"El toggle de Face ID está deshabilitado (gris)"**

**Causa:** Hardware no disponible o no enrolled

**Solución:**
```
Features → Face ID → Enrolled
# Luego reinicia la app (Cmd+R)
```

---

## 📞 Necesitas Ayuda?

Envíame los logs de la consola:

```
🔍 Biometric Capabilities: { ... }
🔍 Biometric Enabled in App: true/false
```

Y dime:
1. ¿Usaste `npx expo run:ios` o `npx expo start`?
2. ¿Qué simulador estás usando? (iPhone 15 Pro, etc.)
3. ¿Face ID dice "Enrolled" en el menú Features?
4. ¿Ves la opción de Face ID en Settings de la app?

---

**Estado actual:** El código está correcto, el problema es de configuración.

**Última actualización:** 12 de noviembre de 2025
