# ✅ PASO 4 COMPLETADO: Integración UI Offline

## 📝 Cambios Implementados en `TravelDocumentsModal.tsx`

### 1. **Import del Hook de Sync**
```typescript
import { useDocumentSync } from '~/hooks/useDocumentSync';
```

### 2. **Estados y Hook**
```typescript
// Offline Sync Hook
const {
  cachedDocuments,
  cacheSizeMB,
  downloadForOffline,
  removeFromCache,
  isDocumentAvailableOffline,
  refreshCacheStatus,
} = useDocumentSync();

// Estado de descarga por documento
const [downloadingDocs, setDownloadingDocs] = useState<Set<string>>(new Set());
```

### 3. **Funciones de Gestión Offline**

#### ✅ `handleDownloadForOffline(doc)`
- Descarga documento encriptado al cache local
- Muestra indicador de progreso durante descarga
- Actualiza estado del cache
- Alert de confirmación

#### ✅ `handleRemoveFromOffline(doc)`
- Elimina documento del cache local
- Mantiene disponibilidad online
- Confirmación antes de eliminar
- Actualiza estado del cache

#### ✅ `handleOfflineOptions(doc)`
- Muestra menú contextual con opciones:
  - "📥 Descargar para Offline" (si no está en cache)
  - "🗑️ Eliminar de Offline" (si está en cache)

---

## 🎨 Elementos UI Agregados

### 1. **Badge de "Offline" en Lista de Documentos**
```tsx
{isDocumentAvailableOffline(doc.id) && (
  <View style={styles.offlineBadge}>
    <Ionicons name="cloud-offline" size={12} color="#10B981" />
    <Text style={styles.offlineBadgeText}>Offline</Text>
  </View>
)}
```

**Ubicación:** Junto al badge "PDF" en la tarjeta del documento  
**Color:** Verde (#10B981)  
**Icono:** `cloud-offline`

---

### 2. **Botón de Gestión Offline**
```tsx
<TouchableOpacity
  style={styles.offlineButton}
  onPress={() => handleOfflineOptions(doc)}
>
  {downloadingDocs.has(doc.id) ? (
    <Text style={styles.offlineButtonIcon}>⏳</Text>
  ) : isDocumentAvailableOffline(doc.id) ? (
    <Ionicons name="cloud-done" size={20} color="#10B981" />
  ) : (
    <Ionicons name="cloud-download-outline" size={20} color="#2196F3" />
  )}
</TouchableOpacity>
```

**Estados del Botón:**
- 📥 **Descargar** (azul) - Documento no está en cache
- ⏳ **Descargando** (emoji) - Descarga en progreso
- ☁️ **Disponible** (verde) - Documento en cache offline

**Ubicación:** Esquina superior derecha, al lado del botón de eliminar

---

### 3. **Indicador de Cache en Header**
```tsx
{cachedDocuments.size > 0 && (
  <Text style={styles.cacheIndicator}>
    {cachedDocuments.size} offline • {cacheSizeMB.toFixed(1)} MB
  </Text>
)}
```

**Información Mostrada:**
- Cantidad de documentos offline
- Tamaño total del cache en MB

**Ubicación:** Debajo del título "Documentos de Viaje"

---

## 🎨 Estilos Agregados

### **offlineBadge**
```typescript
offlineBadge: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: 'rgba(16, 185, 129, 0.1)',
  paddingHorizontal: 6,
  paddingVertical: 2,
  borderRadius: 4,
  gap: 4,
  borderWidth: 1,
  borderColor: '#10B981',
}
```

### **offlineBadgeText**
```typescript
offlineBadgeText: {
  color: '#10B981',
  fontSize: 10,
  fontWeight: '600',
}
```

### **offlineButton**
```typescript
offlineButton: {
  position: 'absolute',
  top: 8,
  right: 52, // Al lado del botón delete
  backgroundColor: 'rgba(33, 150, 243, 0.1)',
  borderRadius: 20,
  width: 36,
  height: 36,
  alignItems: 'center',
  justifyContent: 'center',
}
```

### **offlineButtonIcon**
```typescript
offlineButtonIcon: {
  fontSize: 16,
}
```

### **headerCenter**
```typescript
headerCenter: {
  flex: 1,
  alignItems: 'center',
}
```

### **cacheIndicator**
```typescript
cacheIndicator: {
  fontSize: 11,
  marginTop: 2,
  textAlign: 'center',
}
```

### **documentCardContent** (Modificado)
```typescript
documentCardContent: {
  // ...
  paddingRight: 96, // Aumentado para ambos botones
}
```

---

## 🔄 Flujo de Usuario

### **Descargar Documento para Offline:**
1. Usuario ve documento en la lista
2. Toca botón ☁️ (cloud-download)
3. Se muestra menú "Opciones Offline"
4. Selecciona "📥 Descargar para Offline"
5. Botón cambia a ⏳ (descargando)
6. Al completar:
   - Badge "Offline" aparece en la tarjeta
   - Botón cambia a ☁️✓ (cloud-done verde)
   - Alert: "✅ Disponible Offline"
   - Header actualiza: "1 offline • 2.3 MB"

### **Eliminar de Cache Offline:**
1. Usuario ve documento con badge "Offline"
2. Toca botón ☁️✓ (cloud-done verde)
3. Se muestra menú "Opciones Offline"
4. Selecciona "🗑️ Eliminar de Offline"
5. Confirma en dialog
6. Al completar:
   - Badge "Offline" desaparece
   - Botón vuelve a ☁️ (cloud-download azul)
   - Alert: "✅ Eliminado"
   - Header actualiza el contador

---

## 📊 Información en Tiempo Real

El componente ahora muestra:
- ✅ **Badge "Offline"** en cada documento en cache
- ✅ **Estado visual del botón** (descargar/descargando/disponible)
- ✅ **Contador en header** (X offline • Y MB)
- ✅ **Estado de descarga** (spinner durante operación)

---

## 🧪 Testing Sugerido

### Test 1: Descargar Documento
1. Abrir TravelDocumentsModal
2. Verificar PIN
3. Tocar botón ☁️ en un documento
4. Seleccionar "Descargar para Offline"
5. Verificar:
   - Badge "Offline" aparece
   - Botón cambia a verde ☁️✓
   - Header muestra "1 offline • X MB"

### Test 2: Ver Badge en Lista
1. Descargar un documento
2. Cerrar y reabrir modal
3. Verificar que badge "Offline" persiste

### Test 3: Eliminar de Cache
1. Tocar botón ☁️✓ en documento offline
2. Seleccionar "Eliminar de Offline"
3. Confirmar
4. Verificar:
   - Badge desaparece
   - Botón vuelve a azul
   - Contador actualiza

### Test 4: Múltiples Documentos
1. Descargar 3 documentos
2. Verificar header: "3 offline • X MB"
3. Cerrar app
4. Reabrir
5. Verificar que siguen offline

### Test 5: Indicador de Descarga
1. Descargar documento grande (si aplica)
2. Verificar que botón muestra ⏳
3. Verificar que no se puede tocar mientras descarga

---

## 🎯 Estado de Implementación

### ✅ COMPLETADO:
1. ✅ Hook de sync integrado
2. ✅ Funciones de descarga/eliminación
3. ✅ Badge "Offline" en documentos
4. ✅ Botón de gestión offline
5. ✅ Indicador en header (contador + tamaño)
6. ✅ Estados visuales (descargando/disponible)
7. ✅ Menú de opciones offline
8. ✅ Estilos y diseño

### 🔜 PENDIENTE (Próximos Pasos):
1. Detección de conectividad (NetInfo)
2. Auto-sync al reconectar
3. Modal de gestión de cache (ver todos offline)
4. Gate de membresía premium
5. Optimizaciones de performance

---

## 💡 Notas Técnicas

### **Performance:**
- Badge solo se renderiza si está en cache
- useDocumentSync actualiza estado automáticamente
- No hay re-renders innecesarios

### **Persistencia:**
- Cache persiste entre sesiones (AsyncStorage)
- Metadata actualizada en tiempo real
- Límite de 100MB aplicado automáticamente

### **UX:**
- Iconos intuitivos (☁️ azul = descargar, ☁️✓ verde = disponible)
- Feedback visual inmediato
- Confirmaciones antes de acciones destructivas

---

**Estado:** ✅ PASO 4 COMPLETADO  
**Siguiente:** PASO 2 - Detección de conectividad y auto-sync
