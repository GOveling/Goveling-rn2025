# 🔍 Prueba Face ID en Simulador - Instrucciones

## ✅ He agregado logs de debug

Ahora verás estos logs en la consola cuando abras Documentos de Viaje:

```
🔐 PinVerificationModal rendered: {visible: true, biometricAttempted: false}
🔐 PinVerificationModal useEffect: {visible: true, biometricAttempted: false}
🔐 Calling checkAndTriggerBiometric...
🔍 Biometric Capabilities: {isAvailable: ?, hasHardware: ?, isEnrolled: ?, biometricType: '?'}
🔍 Biometric Enabled in App: true/false
```

## 📱 Pasos para Probar

### 1. **Recarga la app en el simulador**

En el simulador, presiona:
- **⌘R** (Cmd+R) para recargar

O sacude el dispositivo:
- Hardware → Shake Gesture
- Luego "Reload"

### 2. **Abre Documentos de Viaje**

1. Ve a Perfil (tab inferior)
2. Toca "Documentos de Viaje"
3. **Mira la consola** (terminal donde corriste npx expo run:ios)

### 3. **Interpreta los logs**

**Si ves esto:**
```
🔍 Biometric Capabilities: {
  isAvailable: false,
  hasHardware: true,
  isEnrolled: true,
  biometricType: 'faceId'
}
```
✅ Hardware OK, pero Face ID **NO habilitado en la app**  
➡️ **Solución:** Ve a Settings (⚙️) y activa el toggle

**Si ves esto:**
```
🔍 Biometric Capabilities: {
  isAvailable: false,
  hasHardware: true,
  isEnrolled: false,
  biometricType: 'none'
}
```
❌ Face ID **NO enrolled en el simulador**  
➡️ **Solución:** Features → Face ID → Enrolled

**Si ves esto:**
```
🔍 Biometric Capabilities: {
  isAvailable: false,
  hasHardware: false,
  isEnrolled: false,
  biometricType: 'none'
}
```
❌ Simulador sin Face ID  
➡️ **Solución:** Usa iPhone X o superior

**Si ves esto:**
```
🔍 Biometric Capabilities: {
  isAvailable: true,
  hasHardware: true,
  isEnrolled: true,
  biometricType: 'faceId'
}
🔍 Biometric Enabled in App: false
⚠️ Biometric is available but NOT enabled in app settings
```
✅ Todo OK, solo falta habilitar en Settings  
➡️ **Habilita Face ID:**
1. Dentro de Documentos de Viaje
2. Toca ⚙️ (Settings)
3. Activa toggle "Face ID"
4. Simulador: Features → Face ID → Matching Face

**Si ves esto:**
```
🔍 Biometric Capabilities: {
  isAvailable: true,
  hasHardware: true,
  isEnrolled: true,
  biometricType: 'faceId'
}
🔍 Biometric Enabled in App: true
✨ Auto-triggering biometric authentication...
```
🎉 **¡PERFECTO!** Face ID se está activando

## 🐛 Si NO ves ningún log

Si no ves ninguno de estos logs después de abrir Documentos de Viaje:

1. **Verifica que recargaste la app:** Cmd+R en el simulador
2. **Verifica el terminal:** Deberías ver los logs ahí
3. **Cierra y vuelve a abrir el simulador:**
   ```bash
   # Detén la app (Cmd+.)
   # Vuelve a correr:
   npx expo run:ios
   ```

## 📋 Checklist

- [ ] Recargué la app (Cmd+R)
- [ ] Abrí Documentos de Viaje
- [ ] Vi logs en la consola
- [ ] Face ID está "Enrolled" en simulador
- [ ] Anoté qué dice `isAvailable`, `hasHardware`, `isEnrolled`
- [ ] Anoté qué dice `Biometric Enabled in App`

## 💬 Envíame los Logs

Copia y pega los logs que veas, específicamente:

```
🔐 PinVerificationModal rendered: ...
🔐 PinVerificationModal useEffect: ...
🔍 Biometric Capabilities: ...
🔍 Biometric Enabled in App: ...
```

Con eso puedo decirte exactamente qué está pasando.

---

**Última actualización:** 12 de noviembre de 2025
