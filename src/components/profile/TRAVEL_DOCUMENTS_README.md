# Travel Documents Feature - Documentos de Viaje

Sistema completo de gestión de documentos de viaje con encriptación, almacenamiento seguro y visualización con zoom.

## 🎯 Características Implementadas

### Fase 4.2 - Gestión de Documentos ✅
- ✅ Guardado de documentos con imágenes/PDFs
- ✅ Upload a Supabase Storage (bucket: `travel-documents`)
- ✅ Almacenamiento encriptado de datos
- ✅ Signed URLs para acceso seguro
- ✅ Compatibilidad con documentos antiguos (migración de formato)

### Fase 4.3 - Visualización con Zoom ✅
- ✅ **Imágenes**: Zoom con `react-native-image-viewing`
  - Pinch-to-zoom
  - Doble tap para zoom
  - Swipe para cerrar
  
- ✅ **PDFs**: Visualización con `react-native-webview`
  - Modal de pantalla completa
  - Zoom nativo del WebView
  - Compatible con Expo Go

## 📱 Componentes

### TravelDocumentsModal.tsx
- Lista de documentos guardados
- Formulario de agregar documento
- Verificación con PIN
- Upload de archivos
- Backward compatibility (imageUrl → filePath)

### DocumentViewerModal.tsx
- Detalles del documento
- Viewer de imágenes con zoom (react-native-image-viewing)
- Viewer de PDFs con zoom (react-native-webview)
- Botón de eliminar documento

## 🔐 Seguridad

### Almacenamiento
- **Bucket**: `travel-documents` (privado)
- **RLS Policies**: 8 políticas configuradas
  - Insert: Solo propietario
  - Select: Solo propietario
  - Update: Solo propietario
  - Delete: Solo propietario
- **Estructura**: `{user_id}/{timestamp}.{ext}`

### Encriptación
- **Estado Actual**: JSON stringify (temporal)
- **Pendiente Fase 4.3**:
  - Encriptación dual (PIN + recovery key)
  - Edge Function: `encrypt-document`
  - Desencriptación en cliente

### URLs
- **Signed URLs**: 1 hora de expiración
- **Generación**: En tiempo de carga
- **Fallback**: Public URL si signed URL falla

## 📦 Dependencias

```json
{
  "react-native-image-viewing": "^latest", // Zoom de imágenes
  "react-native-webview": "^latest",       // Viewer de PDFs
  "expo-document-picker": "^latest",       // Selección de archivos
  "expo-image-picker": "^latest",          // Selección de imágenes
  "@supabase/supabase-js": "^latest"       // Storage y DB
}
```

## 🚀 Migración Futura: react-native-pdf

### ⚠️ Importante para Builds Nativos

Cuando se realicen builds nativos de iOS y Android (sin Expo Go), se recomienda migrar a `react-native-pdf` para mejor rendimiento con PDFs grandes.

### Por qué react-native-pdf es mejor para producción:
1. **Rendimiento**: Nativo vs WebView
2. **Funcionalidades**:
   - Scroll más fluido
   - Búsqueda en texto
   - Anotaciones
   - Impresión
3. **Tamaño**: Mejor manejo de PDFs grandes (>10MB)
4. **UX**: Comportamiento más nativo

### Limitaciones actuales con WebView:
- ⚠️ PDFs muy grandes (>10MB) pueden ser lentos
- ⚠️ No búsqueda en texto
- ⚠️ No anotaciones
- ✅ Suficiente para documentos de viaje típicos (<5MB)

### Pasos para migrar (después de expo prebuild):

```bash
# 1. Instalar react-native-pdf
npm install react-native-pdf react-native-blob-util

# 2. iOS: Instalar pods
cd ios && pod install && cd ..

# 3. Actualizar DocumentViewerModal.tsx
```

**Ejemplo de código para migración:**

```tsx
// Reemplazar WebView con react-native-pdf
import Pdf from 'react-native-pdf';

// En lugar de:
<WebView source={{ uri: pdfUrl }} />

// Usar:
<Pdf
  source={{ uri: pdfUrl }}
  onLoadComplete={(numberOfPages) => {
    console.log(`PDF loaded with ${numberOfPages} pages`);
  }}
  onError={(error) => {
    console.log(error);
  }}
  style={styles.pdf}
  enablePaging
  horizontal
  spacing={10}
  // Zoom configuración
  minScale={0.5}
  maxScale={3.0}
  scale={1.0}
/>
```

### Cuándo migrar:
- ✅ Después de `expo prebuild`
- ✅ Cuando uses EAS Build para producción
- ✅ Si los usuarios reportan PDFs lentos
- ⚠️ NO si sigues usando Expo Go para desarrollo

## 📝 Notas de Desarrollo

### Formato de Datos Antiguo vs Nuevo
```typescript
// ANTIGUO (antes de migración)
{
  documentNumber: "ABC123",
  imageUrl: "https://full.url/travel-documents/user_id/file.jpg"
}

// NUEVO (actual)
{
  documentNumber: "ABC123",
  filePath: "user_id/file.jpg",  // Relativo al bucket
  imageUrl: "https://signed.url"  // Generado en runtime
}
```

### Backward Compatibility
El código actual detecta automáticamente documentos antiguos y extrae el `filePath` del `imageUrl`:

```typescript
if (decryptedData.imageUrl && !decryptedData.filePath) {
  console.log('⚠️ Old document format detected');
  const urlParts = decryptedData.imageUrl.split('/travel-documents/');
  if (urlParts.length > 1) {
    decryptedData.filePath = urlParts[1];
  }
}
```

## 🧪 Testing

### Casos a probar:
1. ✅ Agregar documento con imagen
2. ✅ Agregar documento con PDF
3. ✅ Ver documento con zoom (imagen)
4. ✅ Ver documento con zoom (PDF)
5. ✅ Eliminar documento
6. ✅ Documentos antiguos (backward compatibility)
7. ✅ Signed URLs expiradas (fallback)

## 📚 Recursos

- [react-native-image-viewing](https://github.com/jobtoday/react-native-image-viewing)
- [react-native-webview](https://github.com/react-native-webview/react-native-webview)
- [react-native-pdf](https://github.com/wonday/react-native-pdf) (para migración futura)
- [Supabase Storage](https://supabase.com/docs/guides/storage)
- [Expo DocumentPicker](https://docs.expo.dev/versions/latest/sdk/document-picker/)

## 🔮 Roadmap

### Pendiente:
- [ ] Encriptación real (Edge Function)
- [ ] Biometría (Face ID/Touch ID)
- [ ] Email recovery
- [ ] Sincronización offline
- [ ] Migración a react-native-pdf (post-prebuild)
- [ ] Búsqueda de documentos
- [ ] Filtros por tipo
- [ ] Exportar documentos

---

**Última actualización**: Noviembre 2025  
**Estado**: En desarrollo (Fase 4.3 completada, Fase 5 pendiente)
