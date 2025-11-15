# 🔍 DEBUGGING BIOMETRIC ACTIVATION

## Problema Identificado

Los logs muestran:
```
⚠️ Biometric is available but NOT enabled in app settings
🔍 Biometric Enabled in App: false
```

**Face ID está disponible en el dispositivo, pero NO está habilitado en la app.**

---

## ✅ Pasos para Activar Biometría

### 1. Verifica que Face ID esté Enrolled en Simulator
```
Simulator → Features → Face ID → Enrolled ✓
```

### 2. Abre la App y Ve a Settings

```
1. Abre Goveling
2. Tap en "Documentos de Viaje"
3. Ingresa tu PIN (todavía necesitas PIN porque biometría no está activa)
4. Tap en el ícono ⚙️ (Settings) en la esquina superior derecha
```

### 3. Activa el Toggle de Face ID

```
En Security Settings Modal:
┌────────────────────────────────┐
│ 🛡️ Autenticación               │
├────────────────────────────────┤
│ 👤 Face ID         [  OFF  ]  │← TAP AQUÍ para activar
│                                │
│ ℹ️  Utiliza Face ID para      │
│    acceder rápidamente         │
└────────────────────────────────┘
```

### 4. Verifica Face ID Prompt

Cuando actives el toggle, deberías ver:

```
1. Face ID prompt aparece
2. En Simulator: Features → Face ID → Matching Face
3. Alert: "✅ Habilitado - Face ID ha sido habilitado correctamente"
4. Toggle ahora muestra ON
```

---

## 🔍 Logs Esperados Durante Activación

Cuando hagas tap en el toggle de Face ID, deberías ver estos logs en consola:

```javascript
// 1. Toggle activado
🔧 SecuritySettingsModal: Toggle biometric called with value: true
🔓 SecuritySettingsModal: Attempting to ENABLE biometric...

// 2. Prompt de Face ID aparece
🔧 SecuritySettingsModal: Biometric auth result: { success: true }

// 3. Guardando en AsyncStorage
✅ SecuritySettingsModal: Auth successful, saving to storage...
🔧 [biometricAuth] Setting biometric auth to: true
✅ [biometricAuth] Successfully saved to AsyncStorage: true
🔍 [biometricAuth] Verification read from AsyncStorage: "true"

// 4. Estado actualizado
✅ SecuritySettingsModal: Biometric ENABLED successfully
```

---

## ❌ Si Face ID Falla

### Caso 1: Face ID Cancelado
```
❌ SecuritySettingsModal: Auth failed: Autenticación cancelada o fallida
```
**Solución:** Intenta de nuevo y aprueba el Face ID

### Caso 2: Face ID No Enrolled
```
❌ No hay datos biométricos registrados en el dispositivo
```
**Solución:** 
```
Simulator → Features → Face ID → Enrolled
```

### Caso 3: AsyncStorage No Guarda
```
❌ [biometricAuth] Error setting biometric auth status: [error]
```
**Solución:** Limpia AsyncStorage y reinicia:
```javascript
// En React Native Debugger Console:
AsyncStorage.clear();
// Luego cierra y reabre la app
```

---

## 🧪 Verificación Manual

Después de activar, cierra el modal de Settings y vuelve a abrir Documentos:

### Logs Esperados (CON biometría activa):
```javascript
PinVerificationInline.tsx:53 🔐 PinVerificationInline rendered: {biometricEnabled: true, biometricAttempted: false}
PinVerificationInline.tsx:66 🔍 Biometric Capabilities: {isAvailable: true, hasHardware: true, isEnrolled: true, biometricType: 'faceId'}
PinVerificationInline.tsx:77 🔍 Biometric Enabled in App: true  ← ✅ AHORA DEBE SER TRUE
✨ Auto-triggering biometric authentication...
```

### Logs Actuales (SIN biometría activa):
```javascript
PinVerificationInline.tsx:77 🔍 Biometric Enabled in App: false  ← ❌ ACTUALMENTE FALSE
⚠️ Biometric is available but NOT enabled in app settings
```

---

## 🔄 Troubleshooting Completo

### 1. Verificar AsyncStorage

```javascript
// En React Native Debugger Console o con debug breakpoint:
const value = await AsyncStorage.getItem('biometric_auth_enabled');
console.log('Current value:', value); // Debería ser "true"
```

### 2. Forzar Activación Manual

Si el toggle no funciona, puedes forzar la activación desde la consola:

```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';

// Ejecutar en consola:
await AsyncStorage.setItem('biometric_auth_enabled', 'true');
console.log('Manually enabled biometric');

// Verifica:
const check = await AsyncStorage.getItem('biometric_auth_enabled');
console.log('Verification:', check); // Debería mostrar "true"
```

### 3. Limpieza Completa

Si nada funciona:

```bash
# 1. Detener app
pkill -f "expo"

# 2. Limpiar AsyncStorage
# En React Native Debugger:
# AsyncStorage.clear()

# 3. Limpiar caches
watchman watch-del-all
rm -rf $TMPDIR/metro-*

# 4. Rebuild
npx expo run:ios

# 5. En Simulator: Features → Face ID → Enrolled
# 6. En App: Documentos → Settings → Toggle Face ID ON
```

---

## 📊 Estado del Toggle Visualmente

### Toggle OFF (Estado Actual):
```
┌────────────────────────────────┐
│ 👤 Face ID         [  OFF  ]  │ ← biometricEnabled: false
│                                │
│ ⚠️  Face ID disponible pero    │
│    no habilitado               │
└────────────────────────────────┘
```

### Toggle ON (Estado Deseado):
```
┌────────────────────────────────┐
│ 👤 Face ID         [  ON   ]  │ ← biometricEnabled: true
│                                │
│ ✅ Face ID está habilitado     │
└────────────────────────────────┘
```

---

## 🎯 Próximos Pasos

1. **Rebuild app** (si no lo has hecho ya):
   ```bash
   ./rebuild-ios.sh
   ```

2. **Abre la app con consola visible** para ver todos los logs

3. **Sigue el flujo:**
   ```
   Documentos → Ingresa PIN → ⚙️ Settings → Toggle Face ID ON
   ```

4. **Observa los logs** durante el proceso de activación

5. **Verifica** que el toggle quede en ON

6. **Sal de Settings** y vuelve a abrir Documentos

7. **Face ID debería auto-lanzarse** ahora

---

## 📝 Checklist Final

- [ ] Simulator: Features → Face ID → Enrolled ✓
- [ ] App: Rebuild completo (`npx expo run:ios`)
- [ ] App: Abrir Documentos → Ingresar PIN
- [ ] App: Tap en ⚙️ Settings
- [ ] App: Toggle Face ID de OFF → ON
- [ ] Simulator: Aprobar Face ID (Matching Face)
- [ ] App: Ver alert "✅ Habilitado"
- [ ] App: Toggle muestra ON
- [ ] App: Salir de Settings
- [ ] App: Volver a abrir Documentos
- [ ] App: Face ID se lanza automáticamente ✨

---

## 💡 Nota Importante

El toggle **requiere** verificar tu identidad con Face ID ANTES de activarse. Esto es por seguridad:

1. Usuario toca toggle → OFF a ON
2. Sistema lanza Face ID prompt
3. Usuario aprueba Face ID
4. Sistema guarda "true" en AsyncStorage
5. Toggle cambia a ON
6. Próximas veces: Face ID se auto-lanza

Si el Face ID falla o se cancela, el toggle permanece en OFF.
