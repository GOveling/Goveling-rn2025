# 🔐 Guía de Verificación y Debug del PIN - Documentos de Viaje

## ✅ **Confirmación de Guardado**

Has configurado exitosamente el PIN y viste el mensaje: **"✅ PIN Configurado"**

### ¿Cómo se guarda el PIN?

El PIN se guarda de forma **segura** usando `expo-secure-store`:

- **iOS**: Keychain (encriptación a nivel de hardware)
- **Android**: Android Keystore (encriptación a nivel de hardware)

### Formato de almacenamiento:

```typescript
// Clave en SecureStore
SECURE_STORE_PIN_KEY = 'travel_documents_pin_hash'

// Valor guardado (JSON)
{
  hash: "sha256_hash_del_pin",
  salt: "salt_aleatorio_en_base64"
}
```

---

## 🛠️ **Herramientas de Debug (Solo en modo desarrollo)**

En tu perfil verás una nueva sección **"🔐 DEBUG: Utilidades del PIN"** con 3 opciones:

### 1️⃣ **Verificar si PIN está guardado**

**Función**: Comprueba si existe un PIN en SecureStore

```typescript
const hasPin = await hasPinConfigured();
// Retorna: true o false
```

**Resultado esperado**:
- ✅ PIN está guardado → Tu PIN se guardó correctamente
- ❌ No hay PIN guardado → No hay PIN configurado

---

### 2️⃣ **Probar verificación de PIN**

**Función**: Te permite ingresar un PIN para verificar si coincide con el guardado

```typescript
const isValid = await verifyPin(inputPin);
// Retorna: true si el PIN es correcto, false si no
```

**Cómo usar**:
1. Toca "Probar verificación de PIN"
2. Se abrirá un prompt para ingresar el PIN
3. Ingresa el PIN que configuraste
4. Verás el resultado:
   - ✅ PIN correcto
   - ❌ PIN incorrecto

---

### 3️⃣ **Resetear PIN (eliminar)**

**Función**: Elimina completamente el PIN de SecureStore

```typescript
await removePinHash();
```

**⚠️ ADVERTENCIA**: Esta acción es irreversible

**Cómo usar**:
1. Toca "Resetear PIN (eliminar)"
2. Confirma la acción destructiva
3. El PIN será eliminado de SecureStore
4. Verás el mensaje: "✅ PIN Eliminado"

**Después del reset**:
- La próxima vez que intentes agregar un documento, se te pedirá configurar un nuevo PIN
- Los documentos existentes **NO** se eliminarán, pero necesitarás el PIN original para desencriptarlos

---

## 🔍 **Verificación Manual (Terminal)**

Si quieres verificar más a fondo, puedes usar estos comandos en el código:

```typescript
import * as SecureStore from 'expo-secure-store';

// Verificar si existe la clave
const pinData = await SecureStore.getItemAsync('travel_documents_pin_hash');
console.log('PIN Data:', pinData ? 'Existe' : 'No existe');

// Ver el contenido (solo en desarrollo)
if (pinData) {
  const parsed = JSON.parse(pinData);
  console.log('Hash guardado:', parsed.hash);
  console.log('Salt guardado:', parsed.salt);
}
```

---

## 📊 **Flujo Completo del PIN**

### **Al configurar el PIN por primera vez:**

```
1. Usuario ingresa PIN (4-6 dígitos) → PinSetupModal
2. Usuario confirma PIN → PinSetupModal
3. Se genera un salt aleatorio → documentEncryption.ts
4. Se deriva el hash usando PBKDF2-SHA256 (100 iteraciones) → derivePinKey()
5. Se guarda { hash, salt } en SecureStore → savePinHash()
6. Se muestra "✅ PIN Configurado"
```

### **Al verificar el PIN:**

```
1. Usuario ingresa PIN → PinVerificationModal
2. Se recupera { hash, salt } de SecureStore → verifyPin()
3. Se deriva el hash del PIN ingresado usando el salt guardado
4. Se compara el hash calculado con el hash guardado
5. Retorna true/false
```

### **Al resetear el PIN:**

```
1. Usuario confirma reset → handleResetPin()
2. Se elimina la clave de SecureStore → removePinHash()
3. hasPin = false
4. La próxima vez se pide configurar nuevo PIN
```

---

## ✅ **Confirmación de que funciona correctamente**

### **Señales de que todo está bien:**

1. ✅ Viste el mensaje "✅ PIN Configurado"
2. ✅ La herramienta "Verificar si PIN está guardado" dice: "✅ PIN está guardado"
3. ✅ La herramienta "Probar verificación de PIN" con el PIN correcto dice: "✅ PIN correcto"
4. ✅ Si intentas con un PIN incorrecto, dice: "❌ PIN incorrecto"

### **Si algo no funciona:**

- Usa "Resetear PIN" para empezar de nuevo
- Configura un nuevo PIN desde Documentos de Viaje
- Verifica que `expo-secure-store` esté instalado: `npx expo install expo-secure-store`

---

## 🔐 **Seguridad del Sistema**

### **Características de seguridad implementadas:**

1. **Hash seguro**: PBKDF2-SHA256 con 100 iteraciones (optimizado para móvil)
2. **Salt único**: Cada PIN tiene un salt aleatorio de 256 bits
3. **Almacenamiento seguro**: Hardware-backed (Keychain/Keystore)
4. **Nunca se guarda el PIN en texto plano**: Solo se guarda el hash
5. **Intentos limitados**: 3 intentos máximo en verificación (implementado en PinVerificationModal)

### **Protección contra:**

- ✅ Rainbow table attacks (salt único)
- ✅ Brute force attacks (PBKDF2 con múltiples iteraciones)
- ✅ Acceso sin autorización (requiere biometría en algunos dispositivos)
- ✅ Extracción de backup (SecureStore no se respalda en iCloud/Google Drive)

---

## 🎯 **Próximos Pasos**

Ahora que el PIN está funcionando correctamente, el siguiente paso es:

### **Fase 4: Formulario de Documentos**

- [ ] Crear AddDocumentModal con formulario completo
- [ ] Implementar selector de tipo de documento
- [ ] Agregar date pickers para fechas de emisión y expiración
- [ ] Integrar image picker con compresión
- [ ] Implementar sistema de encriptación con el PIN
- [ ] Subir documento encriptado a Supabase Storage
- [ ] Guardar metadata en la tabla travel_documents

---

## 📝 **Notas Finales**

- Las herramientas DEBUG solo están disponibles en **modo desarrollo** (`__DEV__`)
- En producción, estas utilidades no estarán visibles
- El sistema de PIN está completamente funcional y listo para la siguiente fase
- Puedes resetear el PIN cuantas veces quieras durante el desarrollo

---

## 🆘 **Troubleshooting**

### **"No hay PIN guardado" después de configurarlo**

```typescript
// Verificar si SecureStore está disponible
import * as SecureStore from 'expo-secure-store';
console.log('SecureStore disponible:', SecureStore.isAvailableAsync());
```

### **PIN no se verifica correctamente**

```typescript
// Verificar el proceso de derivación
const { derivePinKey } = require('~/services/documentEncryption');
const hash = await derivePinKey('1234', 'tu_salt_en_base64');
console.log('Hash derivado:', hash);
```

### **Error al guardar en SecureStore**

- Verifica que tengas permisos en el dispositivo
- En iOS, asegúrate de no estar usando el simulador en algunos casos
- En Android, verifica que el dispositivo tenga lock screen configurado

---

**¿Listo para continuar con el formulario de documentos?** 🚀
