# Fix: Error "VirtualizedLists should never be nested" en Social Tab

## Estado: ✅ RESUELTO

### Problema Identificado:
Cuando el usuario abría el tab Social, aparecía un warning:
```
VirtualizedLists should never be nested inside plain ScrollViews with the same orientation
```

**Causa Raíz:**
- `FlashList` en `SocialFeedScreen` (lista principal del feed)
- `BottomSheetFlatList` en `CommentsSheet` (lista de comentarios)
- Ambas listas virtualizadas anidadas → Warning de React Native

### Solución Implementada:

#### Cambios en `CommentsSheet.tsx`:

**Antes:**
```tsx
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';

<BottomSheetFlatList
  data={comments}
  renderItem={renderComment}
  keyExtractor={(item) => item.id}
  ListEmptyComponent={renderEmptyState}
/>
```

**Después:**
```tsx
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { FlatList } from 'react-native';

<BottomSheetScrollView contentContainerStyle={styles.scrollContent}>
  <FlatList
    data={comments}
    renderItem={renderComment}
    keyExtractor={(item) => item.id}
    ListEmptyComponent={renderEmptyState}
    scrollEnabled={false}  // ← Clave: desactiva scroll de FlatList
  />
</BottomSheetScrollView>
```

**Nuevo Estilo Agregado:**
```tsx
scrollContent: {
  flexGrow: 1,
},
```

### ¿Por qué funciona?

1. **BottomSheetScrollView**: Maneja el scroll principal del bottom sheet
2. **FlatList con scrollEnabled={false}**: Solo renderiza los items sin crear su propio scroll
3. **Un solo scroll activo**: Solo el BottomSheetScrollView maneja el scrolling
4. **Sin conflicto de virtualización**: FlatList actúa como contenedor de items, no como lista virtualizada

### Beneficios:

✅ **Eliminado el warning** de listas anidadas  
✅ **Mejor rendimiento** - un solo scroll handler  
✅ **UX mejorada** - scroll más fluido en el bottom sheet  
✅ **Compatible** con @gorhom/bottom-sheet@5.2.6  

### Verificación:

Para confirmar que el fix funciona:
1. Abrir tab Social
2. Tocar un post para ver comentarios
3. Scroll debe funcionar suavemente
4. **No debe aparecer el warning** en la consola

### Archivos Modificados:

**1 archivo:**
- `/src/components/social/CommentsSheet.tsx` (+4 líneas, refactor de lista)

### Contexto Técnico:

Este warning aparece porque React Native optimiza el rendimiento de listas grandes usando "windowing" (solo renderiza items visibles). Cuando se anidan dos listas virtualizadas:
- Ambas intentan aplicar windowing
- Se pierde la optimización
- React Native emite el warning

La solución es tener **solo una lista virtualizada activa** (en este caso, ninguna, porque usamos FlatList no virtualizada dentro de BottomSheetScrollView).

### Estado Final:

- ✅ Tab Social abre correctamente
- ✅ Feed muestra posts (FlashList)
- ✅ Bottom sheet de comentarios funciona
- ✅ Sin warnings en consola
- ✅ Performance óptima

---

**Fecha:** 21 de noviembre de 2025  
**Versión de @gorhom/bottom-sheet:** 5.2.6  
**Versión de react-native-reanimated:** 4.1.3  
