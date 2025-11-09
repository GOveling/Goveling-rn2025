# 🐛 Bug #5: Face ID No Funciona en Expo Go

**Fecha:** 9 de noviembre de 2025  
**Severidad:** 🔴 **BLOQUEANTE en Expo Go**

---

## 🎯 **Problema**

Face ID no se activa. Al intentar habilitarlo, aparece el siguiente error:

```json
{
  "error": "missing_usage_description",
  "warning": "FaceID is available but has not been configured. To enable FaceID, provide `NSFaceIDUsageDescription`.",
  "success": false
}
```

---

## 🔍 **Causa Raíz**

**Expo Go NO soporta completamente `expo-local-authentication` con Face ID** porque:

1. iOS requiere que el permiso `NSFaceIDUsageDescription` esté compilado en el `Info.plist` de la app nativa
2. Expo Go tiene su propio `Info.plist` preconfigurado que NO incluye este permiso
3. No se puede modificar el `Info.plist` de Expo Go desde tu código

**Documentación oficial:** https://docs.expo.dev/versions/latest/sdk/local-authentication/#configuration-in-appjson--appconfigjs

---

## ✅ **Solución Aplicada al Código**

### 1. Agregado `NSFaceIDUsageDescription` en `app.json`

```json
"infoPlist": {
  "NSFaceIDUsageDescription": "Goveling utiliza Face ID para proteger tus documentos de viaje de forma segura y conveniente."
}
```

### 2. Agregado plugin de `expo-local-authentication` en `app.json`

```json
"plugins": [
  // ... otros plugins
  [
    "expo-local-authentication",
    {
      "faceIDPermission": "Goveling utiliza Face ID para proteger tus documentos de viaje de forma segura y conveniente."
    }
  ]
]
```

### 3. Mejorado manejo de error en `biometricAuth.ts`

```typescript
catch (error: any) {
  // Check if it's the missing usage description error
  if (error?.message?.includes('NSFaceIDUsageDescription') || 
      error?.code === 'missing_usage_description') {
    return {
      success: false,
      error: 'Face ID requiere un Development Build. No funciona en Expo Go.',
    };
  }
  
  return {
    success: false,
    error: 'Error al autenticar con biometría',
  };
}
```

---

## 🚀 **Cómo Hacer que Face ID Funcione**

### **Opción 1: Development Build en iPhone (RECOMENDADO)** 🎯

**Pasos:**

```bash
# 1. Asegúrate de tener EAS CLI instalado
npm install -g eas-cli

# 2. Login en Expo
eas login

# 3. Crear el build de desarrollo para iOS
eas build --profile development --platform ios

# 4. Espera 10-15 minutos mientras se construye

# 5. Cuando termine, instala la app en tu iPhone:
#    - Abre el link que te da EAS en tu iPhone
#    - Instala el perfil de desarrollo si es la primera vez
#    - Instala la app

# 6. En tu computadora, inicia el servidor
npx expo start --dev-client

# 7. Escanea el QR con la app que acabas de instalar
```

**Ventajas:**
- ✅ Face ID funcionará 100%
- ✅ Es como la app real
- ✅ Todos los permisos nativos funcionan

**Requisitos:**
- 💰 Cuenta de Apple Developer ($99/año) para instalar en dispositivo físico
- ⏱️ ~10-15 minutos para el build

---

### **Opción 2: Simulador de iOS (RÁPIDO SI TIENES macOS)** ⚡

**Pasos:**

```bash
# 1. Instala Xcode (desde App Store) si no lo tienes

# 2. Instala el cliente de desarrollo
npx expo install expo-dev-client

# 3. Corre en el simulador
npx expo run:ios

# 4. Cuando la app esté corriendo, simula Face ID:
#    - En el simulador: Features → Face ID → Enrolled
#    - Cuando aparezca el prompt de Face ID:
#      Features → Face ID → Matching Face (para éxito)
#      Features → Face ID → Non-matching Face (para fallo)
```

**Ventajas:**
- ✅ Rápido (no necesita build en la nube)
- ✅ Face ID simulado funciona
- ✅ Gratis, no necesita cuenta de Apple Developer
- ✅ Ideal para desarrollo y testing

**Requisitos:**
- 🖥️ macOS (Mac con Apple Silicon o Intel)
- 💾 ~20GB de espacio (Xcode)

---

### **Opción 3: Testing sin Face ID (TEMPORAL)** 🔧

Para seguir testeando otras features mientras preparas el build:

**En Expo Go:**
- ❌ Face ID NO funcionará
- ✅ PIN sí funciona
- ✅ Todas las demás features funcionan
- ✅ Puedes seguir desarrollando

**El código ya maneja esto automáticamente:**
- Muestra mensaje de error claro
- Permite seguir usando PIN
- No bloquea otras funcionalidades

---

## 📊 **Comparación de Opciones**

| Característica | Expo Go | Development Build | Simulador iOS |
|----------------|---------|-------------------|---------------|
| Face ID funciona | ❌ No | ✅ Sí | ✅ Sí (simulado) |
| Tiempo setup | 0 min | 15 min | 30 min (primera vez) |
| Costo | Gratis | $99/año* | Gratis |
| Requiere Mac | No | No | Sí |
| Dispositivo real | Sí | Sí | No |
| Reload rápido | ✅ Sí | ✅ Sí | ✅ Sí |

\* Solo si quieres instalar en dispositivo físico. Para simulador es gratis.

---

## 🎯 **Recomendación**

### **Para Desarrollo Actual:**
1. **Si tienes Mac:** Usa el **simulador de iOS** (Opción 2)
   - Más rápido de configurar
   - Face ID simulado funciona perfectamente
   - Ideal para iterar rápidamente

2. **Si NO tienes Mac:** Crea un **Development Build** (Opción 1)
   - Necesario para probar en iPhone real
   - Más cercano a la experiencia de producción
   - Requiere cuenta de Apple Developer

### **Para Testing con Usuarios:**
- Usa **Development Build** (Opción 1)
- Es la experiencia más real
- Permite que testers prueben Face ID en sus dispositivos

### **Para Producción:**
- Usa `eas build --profile production --platform ios`
- Face ID funcionará automáticamente
- No hay cambios adicionales necesarios

---

## ✅ **Checklist de Implementación**

- [x] `NSFaceIDUsageDescription` agregado en `app.json`
- [x] Plugin `expo-local-authentication` configurado
- [x] Manejo de error mejorado en código
- [ ] Crear Development Build o usar simulador
- [ ] Probar Face ID en ambiente apropiado
- [ ] Validar flujo completo (habilitar, usar, deshabilitar)

---

## 📝 **Notas Importantes**

1. **Expo Go es SOLO para desarrollo rápido** de features que no requieren configuración nativa
2. **Face ID SIEMPRE requiere Development Build o Simulador** para testing
3. **En producción todo funcionará correctamente** una vez que hagas el build final
4. **El código está listo y correcto**, solo necesita el ambiente adecuado para ejecutarse

---

## 🔗 **Referencias**

- [Expo Local Authentication Docs](https://docs.expo.dev/versions/latest/sdk/local-authentication/)
- [EAS Build Docs](https://docs.expo.dev/build/introduction/)
- [Expo Development Builds](https://docs.expo.dev/develop/development-builds/introduction/)
- [iOS Simulator Face ID](https://developer.apple.com/documentation/xcode/running-your-app-in-simulator-or-on-a-device)

---

**Estado:** ✅ Código listo, requiere ambiente apropiado para testing
