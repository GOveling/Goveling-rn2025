# 🧪 Guía de Testing - Post Modernización

**Fecha**: 16 de octubre de 2025  
**Versión**: Después de Packages 1-10  
**Objetivo**: Verificar que no hay regresiones tras la refactorización

---

## 🚀 Inicio Rápido

### 1. Preparar el Entorno

```bash
# Desde el directorio del proyecto
cd /Users/sebastianaraos/Desktop/Goveling-rn2025

# Limpiar caché (recomendado)
npx expo start --clear

# O inicio normal
npx expo start
```

### 2. Opciones de Ejecución

- **iOS Simulator**: Presiona `i`
- **Android Emulator**: Presiona `a`
- **Dispositivo físico**: Escanea el QR code con Expo Go

---

## ✅ Checklist de Testing

### Prioridad Alta - Funcionalidades Críticas

#### 1. Autenticación (/auth)
- [ ] **Login con email/password**
  - Campos funcionan correctamente
  - Validación de errores
  - Navegación exitosa al home
  
- [ ] **Signup**
  - Formulario completo funcional
  - Verificación de email
  - Creación de cuenta exitosa
  
- [ ] **Forgot Password**
  - Envío de email de recuperación
  - Reset de contraseña

**Archivos modificados**: `app/auth/index.tsx` (Package 2)

#### 2. Navegación Principal (Tabs)
- [ ] **Tab: Home** (`/(tabs)/index.tsx`)
  - Widget de ubicación muestra ciudad correcta
  - Temperatura se actualiza
  - CurrentTripCard renderiza si hay viaje activo
  - Contador de viajes próximos correcto
  - Realtime subscriptions funcionan (agregar lugar desde explore)
  
**Archivos modificados**: 
- `app/(tabs)/index.tsx` (Packages 5, 6, 8, 9)
- Cambios importantes: useEffect dependencies, unused vars

- [ ] **Tab: Explore** (`/(tabs)/explore.tsx`)
  - Búsqueda de lugares funciona
  - Categorías se despliegan correctamente
  - Mapa/lista toggle funciona
  - Botones de acción visibles
  
**Archivos modificados**: `app/(tabs)/explore.tsx` (Packages 6, 8)

- [ ] **Tab: Trips** (`/(tabs)/trips.tsx`)
  - Lista de viajes se carga
  - Filtros funcionan (active, upcoming, past)
  - Navegación a detalles del viaje
  
- [ ] **Tab: Booking** (`/(tabs)/booking.tsx`)
  - Cards de opciones visibles
  - Navegación a servicios externos
  
**Archivos modificados**: `app/(tabs)/booking.tsx` (Packages 6, 8)

- [ ] **Tab: Profile** (`/(tabs)/profile.tsx`)
  - Datos de usuario se cargan
  - Navegación a settings
  - Logout funciona

#### 3. Gestión de Viajes
- [ ] **Crear nuevo viaje**
  - Formulario funcional
  - Guardar viaje exitosamente
  
- [ ] **Ver detalles de viaje** (`/trips/[id]/index.tsx`)
  - Información se carga correctamente
  - Tabs (places, team, etc.) funcionan
  
**Archivos modificados**: `app/trips/[id]/index.tsx` (Package 9)
- Cambio: useCallback para loadTrip

- [ ] **Agregar lugar a viaje** (`/explore/add-to-trip.tsx`)
  - Modal de selección de viaje aparece
  - Agregar lugar exitosamente
  - Navegación de regreso funciona
  
**Archivos modificados**: `app/explore/add-to-trip.tsx` (Package 9)
- Cambio: useCallback para loadPlaceDetails

#### 4. Perfil y Configuración
- [ ] **Personal Info** (`/profile/personal-info-new.tsx`)
  - Datos se cargan correctamente
  - Edición funciona
  - Guardar cambios exitosamente
  
**Archivos modificados**: `app/profile/personal-info-new.tsx` (Package 9)
- Cambio: useCallback para loadProfileData

- [ ] **Settings**
  - Cambio de idioma
  - Cambio de unidades (metric/imperial)
  - Travel mode toggle

---

### Prioridad Media - Componentes Modificados

#### 5. Componentes de UI
- [ ] **PlaceCard** (`src/components/PlaceCard.tsx`)
  - Renderiza correctamente
  - Estilos intactos (removimos 3 no usados)
  
**Archivos modificados**: Package 1 - Removed unused styles

- [ ] **PlaceDetailModal** (`src/components/PlaceDetailModal.tsx`)
  - Modal abre correctamente
  - Animaciones funcionan
  - Botones de acción
  
**Archivos modificados**: 
- Package 1 - Removed unused style
- Package 7 - Converted requires to imports

- [ ] **UniversalMap** (`src/components/map/UniversalMap.tsx`)
  - Mapa renderiza
  - Marcadores visibles
  
**Archivos modificados**: Package 1 - Removed unused style

#### 6. Context Providers
- [ ] **AuthContext** (`src/contexts/AuthContext.tsx`)
  - Login/logout funciona
  - Estado de usuario se mantiene
  - Navegación post-logout correcta
  
**Archivos modificados**: Package 10 - Added comment to catch block

#### 7. Hooks Personalizados
- [ ] **useNotifications** (`src/hooks/useNotifications.ts`)
  - Notificaciones se reciben
  - Realtime subscriptions funcionan
  - Cleanup no genera errores
  
**Archivos modificados**: Package 10 - Added comments to catch blocks

---

### Prioridad Baja - Verificación Visual

#### 8. Estilos y Apariencia
- [ ] No hay cambios visuales inesperados
- [ ] Colores se mantienen
- [ ] Spacing/padding correcto
- [ ] Fuentes sin cambios

#### 9. Animaciones
- [ ] Lottie animations funcionan
  - Tab icons animados
  - Loading states
  - Modal transitions

**Archivos modificados**: `app/(tabs)/_layout.tsx` (Package 7)
- Cambio: require() → import para animations

---

## 🐛 Problemas Conocidos (Pre-existentes)

### TypeScript Errors
Estos errores **NO** fueron causados por la refactorización:

```
app/profile/personal-info-simple.tsx: Duplicate properties
src/components/AppMap/webview/WebViewMap.tsx: Duplicate properties
src/components/home/CurrentTripCard.tsx: Duplicate properties
src/components/onboarding/: Type incompatibilities
```

**Acción**: Ignorar estos errores - ya existían antes

---

## 📝 Cómo Reportar Problemas

Si encuentras una regresión:

### 1. Identificar el Package Responsable
```bash
# Ver cambios de un commit específico
git show <commit-hash>

# Ejemplo:
git show aa24383  # Package 8
```

### 2. Template de Reporte

```markdown
**Problema**: Breve descripción
**Package**: #X - Nombre del package
**Commit**: hash del commit
**Archivo**: ruta/al/archivo.tsx
**Pasos para reproducir**:
1. ...
2. ...
3. ...

**Comportamiento esperado**: ...
**Comportamiento actual**: ...
**Screenshots/Logs**: ...
```

### 3. Rollback si es Necesario

```bash
# Revertir un commit específico
git revert <commit-hash>

# Ejemplo:
git revert aa24383  # Revierte Package 8
```

---

## 🔍 Testing por Package

### Package 1: Estilos No Usados
**Archivos**: PlaceCard, PlaceDetailModal, UniversalMap  
**Test**: Verificar que los componentes se ven igual

### Package 2: Caracteres Escapados
**Archivos**: OAuthHelp, auth/index  
**Test**: Buscar comillas/apóstrofes renderizados correctamente

### Package 3: Bloques Vacíos
**Archivos**: TripCard, NearbyAlerts, NotificationBell  
**Test**: No hay errores en console logs

### Package 4: Display Names
**Archivos**: personal-info, PersonalInfoEditModal  
**Test**: No hay warnings de React en DevTools

### Package 5: Import Order
**Archivos**: index, home/index  
**Test**: App inicia sin errores de imports

### Package 6: TypeScript Any
**Archivos**: booking, explore, index, home/index  
**Test**: No hay errores de tipo en runtime

### Package 7: Require Statements
**Archivos**: _layout, PlaceDetailModal, MapTilerMap, AppleMap  
**Test**: Animaciones e imports dinámicos funcionan

### Package 8: Variables No Usadas
**Archivos**: booking, explore, index  
**Test**: Funcionalidad completa de los tabs

### Package 9: Hook Dependencies
**Archivos**: index, add-to-trip, trips/[id], personal-info-new  
**Test**: useEffect se ejecutan correctamente, no hay loops

### Package 10: Empty Blocks
**Archivos**: AuthContext, useNotifications, ManageTeamModal  
**Test**: Cleanup y error handling funcionan

---

## ✅ Checklist Final

Antes de dar por terminada la fase de testing:

- [ ] App inicia sin crashes
- [ ] Todas las funcionalidades críticas funcionan
- [ ] No hay errores nuevos en console
- [ ] No hay regresiones visuales
- [ ] Navegación fluida entre screens
- [ ] Realtime features funcionan
- [ ] Animaciones se reproducen
- [ ] No hay memory leaks evidentes

---

## 🎯 Criterios de Éxito

### ✅ Testing Exitoso Si:
- App funciona igual o mejor que antes
- No hay nuevos errores en console
- Todos los flujos principales funcionan
- Performance no se degradó

### ⚠️ Revisar Si:
- Algún componente se ve diferente
- Hay nuevos warnings en console
- Alguna funcionalidad dejó de funcionar
- Performance se degradó notablemente

### ❌ Rollback Si:
- Crashes frecuentes
- Funcionalidad crítica rota
- Problemas graves de performance
- Múltiples regresiones

---

## 📊 Métricas a Monitorear

### Performance
```bash
# Abrir React DevTools Profiler
# Grabar sesión de 30 segundos
# Comparar con baseline anterior
```

### Console Logs
- ❌ No debe haber ERRORES nuevos
- ⚠️ Warnings aceptables si son pre-existentes
- ℹ️ Info/Debug logs esperados

### Memory Leaks
- Verificar que cleanup functions se ejecuten
- No debe haber suscripciones colgadas
- Channels deben cerrarse correctamente

---

## 🚀 Siguiente Paso

Una vez completado el testing:

### Si todo está bien ✅
1. Marcar fase de Modernización como completa
2. Decidir sobre Packages 11-28 (opcionales)
3. Actualizar CHANGELOG.md

### Si hay problemas ⚠️
1. Reportar usando el template
2. Analizar commit específico
3. Revertir si es necesario
4. Ajustar y re-testear

---

*Última actualización: 16 de octubre de 2025*
