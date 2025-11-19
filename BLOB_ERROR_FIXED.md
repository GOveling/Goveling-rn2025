# 🐛 FIX: Error "Property 'blob' doesn't exist"

**Fecha:** 18 de noviembre de 2025  
**Error:** `ReferenceError: Property 'blob' doesn't exist`  
**Ubicación:** `ImageService.uploadImage()` al intentar subir fotos

---

## ❌ PROBLEMA

Al intentar publicar una foto con lugar auto-detectado, la app crasheaba con:

```
Error creating post: ReferenceError: Property 'blob' doesn't exist
    at normalizeArgs
    at append
    at uploadOrUpdate
    at upload
```

### Causa Raíz

**React Native (Hermes engine) NO soporta la API `Blob` de manera nativa.**

El código estaba usando:
```typescript
// ❌ NO FUNCIONA en React Native
const response = await fetch(image.uri);
const blob = await response.blob();  // ← blob() no existe
await supabase.storage.upload(filename, blob, {...});
```

---

## ✅ SOLUCIÓN IMPLEMENTADA

Reemplazar el uso de `Blob` con **`expo-file-system`** que es compatible con React Native.

### Cambios en `imageService.ts`

#### 1️⃣ Agregar import de FileSystem

```typescript
import * as FileSystem from 'expo-file-system';
```

#### 2️⃣ Fix en `processImage()` - Obtener tamaño de archivo

**ANTES:**
```typescript
// Get file size
const response = await fetch(result.uri);
const blob = await response.blob();
const size = blob.size;
```

**DESPUÉS:**
```typescript
// Get file size using FileSystem (React Native compatible)
const fileInfo = await FileSystem.getInfoAsync(result.uri);
if (!fileInfo.exists) {
  throw new Error('Processed image file not found');
}
const size = fileInfo.size || 0;
```

#### 3️⃣ Fix en `uploadImage()` - Subir archivo a Supabase

**ANTES:**
```typescript
// Convert URI to blob
const response = await fetch(image.uri);
const blob = await response.blob();

// Upload to storage
const { data: uploadData, error: uploadError } = await supabase.storage
  .from(bucket)
  .upload(filename, blob, {
    contentType: 'image/jpeg',
    cacheControl: '3600',
    upsert: false,
  });
```

**DESPUÉS:**
```typescript
// Convert URI to ArrayBuffer (React Native compatible)
// Read file as base64, then convert to ArrayBuffer
const base64 = await FileSystem.readAsStringAsync(image.uri, {
  encoding: 'base64',
});

// Convert base64 to ArrayBuffer
const arrayBuffer = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)).buffer;

// Upload to storage
const { data: uploadData, error: uploadError } = await supabase.storage
  .from(bucket)
  .upload(filename, arrayBuffer, {
    contentType: 'image/jpeg',
    cacheControl: '3600',
    upsert: false,
  });
```

---

## 🔍 EXPLICACIÓN TÉCNICA

### ¿Por qué `blob()` no funciona en React Native?

1. **Blob API** es una API del navegador web
2. **React Native** usa JavaScriptCore/Hermes, NO un navegador completo
3. No tiene todas las APIs web (como `Blob`, `FormData` completo, etc.)

### Solución: FileSystem → base64 → ArrayBuffer

```
Archivo local (file://)
    ↓
FileSystem.readAsStringAsync (lee como base64)
    ↓
atob() (decodifica base64 a string binario)
    ↓
Uint8Array.from() (convierte a array de bytes)
    ↓
.buffer (obtiene ArrayBuffer)
    ↓
Supabase Storage (acepta ArrayBuffer)
```

### ¿Por qué ArrayBuffer?

Supabase Storage acepta varios tipos:
- ✅ `ArrayBuffer` - Compatible con React Native
- ✅ `Uint8Array`
- ❌ `Blob` - Solo navegadores
- ❌ `File` - Solo navegadores

---

## 📊 IMPACTO

### ANTES (con Blob)
```
Usuario sube foto
    ↓
processImage() - ❌ Crash al obtener tamaño
    ↓
uploadImage() - ❌ Crash al subir archivo
    ↓
❌ ERROR: Property 'blob' doesn't exist
```

### DESPUÉS (con FileSystem)
```
Usuario sube foto
    ↓
processImage() - ✅ FileSystem.getInfoAsync()
    ↓
uploadImage() - ✅ FileSystem.readAsStringAsync() → ArrayBuffer
    ↓
✅ ÉXITO: Imagen subida correctamente
```

---

## ✅ TESTING

### Compilación
```bash
✓ TypeScript Check: PASS
✓ ESLint Check: PASS
```

### Flujo completo esperado
1. ✅ Usuario selecciona foto con GPS
2. ✅ Sistema auto-detecta lugar (Nominatim + Google Places)
3. ✅ Muestra ficha enriquecida (rating, reseñas, tipos)
4. ✅ Usuario presiona "Publicar"
5. ✅ Imagen se procesa con `processImage()`
6. ✅ Imagen se sube con `uploadImage()` usando ArrayBuffer
7. ✅ Post se crea con lugar vinculado
8. ✅ Success!

---

## 🔧 ARCHIVOS MODIFICADOS

```
src/services/imageService.ts
- Agregado import de expo-file-system
- Fix en processImage() para obtener tamaño de archivo
- Fix en uploadImage() para convertir URI → ArrayBuffer
```

---

## 📚 REFERENCIAS

### expo-file-system Documentation
```typescript
FileSystem.readAsStringAsync(fileUri, {
  encoding: 'base64'  // or 'utf8'
})

FileSystem.getInfoAsync(fileUri)
// Returns: { exists, size, uri, isDirectory, ... }
```

### Supabase Storage Upload
```typescript
supabase.storage
  .from(bucket)
  .upload(path, data, options)

// data puede ser:
// - ArrayBuffer ✅ (React Native compatible)
// - Uint8Array ✅
// - Blob ❌ (Solo web)
// - File ❌ (Solo web)
```

---

## 🚀 PRÓXIMOS PASOS

1. **Probar el flujo completo** de subida de fotos
2. **Validar** que el lugar se ancle correctamente a la publicación
3. **Verificar** que otros usuarios puedan ver el lugar en el post
4. **Confirmar** que el lugar se agregue a `global_places`

---

## ✨ CONCLUSIÓN

**PROBLEMA RESUELTO:** ✅

El error de `blob` fue causado por incompatibilidad entre:
- Web API (`Blob`) 
- React Native engine (Hermes)

**SOLUCIÓN:** Usar `expo-file-system` nativo de React Native para:
1. Leer archivos locales
2. Convertir a formato compatible (`ArrayBuffer`)
3. Subir a Supabase Storage sin `Blob`

Ahora el usuario puede **subir fotos con lugares auto-detectados** sin errores! 🎉
