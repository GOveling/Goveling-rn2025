# Implementación de Desencriptación Offline con react-native-quick-crypto

## 📋 Resumen

Se implementó la capacidad de desencriptar documentos de viaje en **modo offline** utilizando `react-native-quick-crypto`, un polyfill completo de Web Crypto API para React Native.

## 🔧 Cambios Realizados

### 1. Instalación de react-native-quick-crypto

```bash
npm install react-native-quick-crypto
```

Esta biblioteca proporciona:
- ✅ `crypto.subtle.importKey()` - Importar claves para desencriptación
- ✅ `crypto.subtle.decrypt()` - Desencriptar datos con AES-256-GCM
- ✅ Soporte completo para algoritmos criptográficos nativos
- ✅ API idéntica a Web Crypto API del navegador

### 2. Configuración del Polyfill

**Archivo:** `src/services/documentEncryption.ts`

```typescript
// Polyfill para Web Crypto API en React Native - MUST BE FIRST
// eslint-disable-next-line import/order
import { install } from 'react-native-quick-crypto';
install();
```

El polyfill **debe instalarse ANTES** de cualquier uso de `crypto.subtle`.

### 3. Función de Desencriptación Local

La función `decryptDataLocally()` ahora usa `crypto.subtle` para:

1. **Importar la clave derivada** del PIN usando `importKey()`
2. **Desencriptar con AES-256-GCM** usando `decrypt()`
3. **Manejar authTag correctamente** (concatenándolo al ciphertext)

```typescript
async function decryptDataLocally(
  encryptedBase64: string,
  ivBase64: string,
  authTagBase64: string,
  keyBase64: string
): Promise<string> {
  // Decodificar base64
  const keyBytes = Uint8Array.from(atob(keyBase64), (c) => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(ivBase64), (c) => c.charCodeAt(0));
  const authTag = Uint8Array.from(atob(authTagBase64), (c) => c.charCodeAt(0));
  const ciphertext = Uint8Array.from(atob(encryptedBase64), (c) => c.charCodeAt(0));

  // Concatenar ciphertext + authTag (GCM lo requiere)
  const encryptedBuffer = new Uint8Array(ciphertext.length + authTag.length);
  encryptedBuffer.set(ciphertext);
  encryptedBuffer.set(authTag, ciphertext.length);

  // Importar clave
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  // Desencriptar
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    cryptoKey,
    encryptedBuffer
  );

  return new TextDecoder().decode(decryptedBuffer);
}
```

## ⚠️ REQUISITO IMPORTANTE: Development Build

`react-native-quick-crypto` requiere **módulos nativos** que **NO están disponibles en Expo Go**.

### Para probar en dispositivo físico:

#### Opción 1: EAS Build (Recomendado)
```bash
# Instalar EAS CLI si no lo tienes
npm install -g eas-cli

# Login a Expo
eas login

# Crear development build para iOS
eas build --profile development --platform ios

# O para Android
eas build --profile development --platform android
```

#### Opción 2: Build Local con Expo
```bash
# Para iOS (requiere macOS)
npx expo run:ios

# Para Android
npx expo run:android
```

#### Opción 3: Prebuild (si necesitas personalizar)
```bash
npx expo prebuild --clean
```

Esto generará las carpetas `ios/` y `android/` con código nativo.

### Para probar en simulador/emulador:
```bash
# iOS Simulator
npx expo run:ios

# Android Emulator
npx expo run:android
```

## 🧪 Pruebas

### Flujo de Prueba Completo:

1. **Conectado a Internet:**
   ```
   ✅ Abrir modal de documentos
   ✅ Ingresar PIN
   ✅ Ver documento encriptado (descarga del servidor)
   ✅ Descargar para offline (icono de nube)
   ✅ Verificar "✓ Disponible offline"
   ```

2. **Desconectado de Internet:**
   ```
   ✅ Activar modo avión
   ✅ Abrir modal de documentos
   ✅ Ingresar PIN
   ✅ Ver documento - debe desencriptar localmente
   ✅ Logs esperados:
      - "📴 Offline mode - using local decryption"
      - "🔑 Generated offline key: ..."
      - "✅ Document decrypted locally"
   ```

### Logs a Revisar:

Busca en la consola:
```
documentEncryption.ts:383 📴 Offline mode - using local decryption
documentEncryption.ts:400 🔑 Generated offline key: { hasKey: true, keyLength: 44 }
documentEncryption.ts:408 ✅ Document decrypted locally
```

Si ves error:
```
❌ Local decryption error: ReferenceError: Property 'crypto' doesn't exist
```
→ **Solución:** Necesitas usar un development build, no Expo Go.

## 📱 Actualización de eas.json (si usas EAS Build)

Asegúrate de que tu `eas.json` tenga:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  }
}
```

## 🔐 Seguridad

### ✅ Ventajas:
- **Encriptación en reposo:** Los documentos se guardan encriptados en el cache local
- **Clave derivada del PIN:** No se almacena la clave en texto plano
- **AES-256-GCM:** Algoritmo seguro y estándar de la industria
- **Autenticación:** authTag verifica la integridad de los datos

### ⚠️ Consideraciones:
- El PIN del usuario es la única protección
- Los datos encriptados están en AsyncStorage (no en Secure Enclave/Keystore)
- Recomendación: PIN de 6 dígitos mínimo

## 📊 Arquitectura

```
Usuario ingresa PIN
      ↓
derivePinKey(pin, userId) → Clave base64
      ↓
┌─────────────────────────────────────┐
│  ¿Conectado a Internet?             │
└─────────────────────────────────────┘
      ↓                    ↓
    SÍ                    NO
      ↓                    ↓
Edge Function         decryptDataLocally()
(Supabase)            (crypto.subtle)
      ↓                    ↓
  Desencriptado       Desencriptado
      ↓                    ↓
    JSON                  JSON
```

## 🐛 Troubleshooting

### Error: "crypto is not defined"
**Causa:** El polyfill no se instaló correctamente o estás en Expo Go.  
**Solución:** 
1. Verificar que `install()` se llama al inicio del archivo
2. Usar development build en lugar de Expo Go

### Error: "Cannot decrypt: wrong authTag"
**Causa:** La clave derivada no coincide o los datos están corruptos.  
**Solución:**
1. Verificar que el PIN es correcto
2. Revisar que userId es el mismo que cuando se encriptó
3. Borrar cache y volver a descargar el documento

### Error: "User not authenticated"
**Causa:** getUser() requiere conexión a internet.  
**Solución:** Ya implementado - se usa getSession() offline.

### Documento no se descarga para offline
**Causa:** Error de red o permisos.  
**Solución:**
1. Verificar conectividad al descargar
2. Revisar logs de documentSync.ts
3. Verificar espacio de almacenamiento

## 📝 Próximos Pasos

### Opcional - Mejoras Futuras:

1. **Secure Storage para claves:**
   - Mover clave derivada a SecureStore en vez de regenerarla
   - Requiere re-autenticación periódica

2. **Biometría para acceso:**
   - Face ID / Touch ID como alternativa al PIN
   - Ya implementado en auth, extender a documentos

3. **Sincronización inteligente:**
   - Auto-sync cuando vuelve la conectividad
   - Ya implementado en documentSync.ts

4. **Compresión antes de encriptar:**
   - Reducir tamaño de cache
   - Ya implementado con pako en documentSync.ts

## ✅ Checklist de Implementación

- [x] Instalar react-native-quick-crypto
- [x] Configurar polyfill en documentEncryption.ts
- [x] Implementar decryptDataLocally()
- [x] Detectar modo offline con NetInfo
- [x] Usar getSession() en lugar de getUser()
- [x] Generar clave localmente
- [x] Manejar errores correctamente
- [x] Agregar logs para debugging
- [ ] **Crear development build para probar**
- [ ] Probar en dispositivo real sin conexión
- [ ] Validar en iOS y Android

## 📚 Referencias

- [react-native-quick-crypto](https://github.com/margelo/react-native-quick-crypto)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [Expo Development Builds](https://docs.expo.dev/develop/development-builds/introduction/)
- [EAS Build](https://docs.expo.dev/build/introduction/)

---

**Estado:** ✅ Implementación completa  
**Requiere:** Development build para probar  
**Última actualización:** 10 de Noviembre, 2025
