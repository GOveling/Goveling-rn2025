# 🗺️ Flujo de Explorar Lugares desde Trip

## 📋 Descripción General

Este sistema permite a los usuarios agregar lugares directamente a un trip específico navegando desde el trip al explorador y seleccionando lugares que se guardan automáticamente en el trip de origen.

## 🔄 Flujo de Usuario

### 1. **Inicio desde Trip**
- Usuario está en `/trips/[id]/places` (pantalla "Mis Lugares" del trip)
- Si no hay lugares, se muestra mensaje vacío con botón "Explorar Lugares"
- Al hacer clic se navega a `/explore?tripId=[id]&returnTo=trip-places`

### 2. **Explorador Contextual**
- Header muestra "Agregar Lugares" en lugar de "Explorar Lugares"
- Subtítulo indica "Agregando lugares a: [Nombre del Trip]"
- Botón principal cambia a "Ver Lugares del Viaje" con ícono 📍
- Colores del botón cambian a verde (#10B981, #059669)

### 3. **Búsqueda y Selección**
- Usuario puede buscar lugares normalmente
- Al tocar un lugar se abre PlaceDetailModal
- El modal muestra botón "Agregar a [Nombre del Trip]" en lugar de "Añadir al viaje"

### 4. **Agregar al Trip**
- Al hacer clic en "Agregar a [Trip]" se ejecuta `addPlaceToTrip()`
- Sistema verifica que el lugar no exista ya en el trip
- Se guarda en tabla `trip_places` con toda la información del lugar
- Se muestra alert de confirmación con opciones:
  - "Continuar explorando"
  - "Ver lugares del viaje" (navega de vuelta)

### 5. **Regreso al Trip**
- Al regresar a `/trips/[id]/places` se recargan automáticamente los lugares
- Los nuevos lugares aparecen en la lista

## 🛠️ Implementación Técnica

### **Archivos Modificados:**

#### 1. `app/trips/[id]/places.tsx`
```typescript
// Botón "Explorar Lugares" ahora pasa parámetros
<TouchableOpacity
  onPress={() => router.push(`/explore?tripId=${id}&returnTo=trip-places`)}
>
```

#### 2. `app/(tabs)/explore.tsx`
```typescript
// Recibe parámetros del trip
const { tripId, returnTo } = useLocalSearchParams<{ tripId?: string; returnTo?: string }>();

// Carga información del trip
useEffect(() => {
  if (tripId) {
    // Cargar título del trip desde Supabase
  }
}, [tripId]);

// Función para agregar lugar al trip
const addPlaceToTrip = async (place: EnhancedPlace) => {
  // Verificar duplicados
  // Insertar en trip_places
  // Mostrar confirmación
};
```

#### 3. `src/components/PlaceDetailModal.tsx`
```typescript
// Nuevas props
interface PlaceDetailModalProps {
  tripId?: string;
  tripTitle?: string;
  onAddToTrip?: (place: EnhancedPlace) => void;
}

// Lógica condicional en handleAddToTrip
const handleAddToTrip = () => {
  if (tripId && onAddToTrip) {
    onAddToTrip(place); // Agregar directamente al trip
  } else {
    router.push('/explore/add-to-trip'); // Flujo normal
  }
};
```

### **Base de Datos:**

#### Tabla `trip_places`
```sql
CREATE TABLE trip_places (
  id UUID PRIMARY KEY,
  trip_id UUID REFERENCES trips(id),
  place_id TEXT, -- Google Places ID
  name TEXT,
  address TEXT,
  lat DECIMAL(10, 8),
  lng DECIMAL(11, 8),
  category TEXT,
  added_by UUID REFERENCES auth.users(id),
  added_at TIMESTAMP,
  -- Campos adicionales para futuras funcionalidades
  notes TEXT,
  visited BOOLEAN DEFAULT FALSE,
  visit_date TIMESTAMP,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5)
);
```

## 🔐 Seguridad

### **Row Level Security (RLS)**
- ✅ Usuarios solo pueden ver lugares de trips que poseen o donde colaboran
- ✅ Solo pueden agregar lugares a trips donde tienen acceso
- ✅ Políticas de UPDATE y DELETE implementadas

### **Validaciones**
- ✅ Verificación de autenticación antes de agregar lugares
- ✅ Prevención de duplicados (constraint único en trip_id + place_id)
- ✅ Validación de permisos en el trip

## 🎨 UX/UI Mejoradas

### **Indicadores Visuales**
- 🎯 Header contextual mostrando el trip de destino
- 🎨 Colores diferentes para distinguir el modo "agregar al trip"
- 📍 Iconos específicos para el contexto
- 💬 Mensajes claros de confirmación

### **Navegación Intuitiva**
- ↩️ Botón para volver al trip desde el explorador
- 🔄 Recarga automática de lugares al regresar
- ⚡ Confirmación con opciones de continuar o volver

## 🚀 Funcionalidades Futuras

### **Ya Preparadas en la BD:**
- ⭐ Rating de lugares visitados
- 📝 Notas personales por lugar
- ✅ Marcar lugares como visitados
- 📅 Fecha de visita

### **Próximas Implementaciones:**
- 📊 Estadísticas de lugares por trip
- 🗺️ Vista de mapa con lugares del trip
- 📤 Compartir lugares entre trips
- 🏷️ Etiquetas y categorización personalizada

## 📱 Flujo de Pantallas

```
Trip Places (/trips/[id]/places)
         ↓ [Botón "Explorar Lugares"]
Explore Contextual (/explore?tripId=[id]&returnTo=trip-places)
         ↓ [Buscar y seleccionar lugar]
Place Detail Modal (con contexto de trip)
         ↓ [Botón "Agregar a [Trip]"]
Confirmación → Trip Places (recargado automáticamente)
```

## ✅ Testing Manual

1. **Flujo Completo:**
   - Ir a un trip → Lugares → "Explorar Lugares"
   - Buscar un lugar → Seleccionar → "Agregar a [Trip]"
   - Verificar que aparece en lugares del trip

2. **Prevención de Duplicados:**
   - Agregar el mismo lugar dos veces
   - Verificar mensaje de "Lugar ya agregado"

3. **Navegación:**
   - Botón "Ver Lugares del Viaje" funciona
   - Recarga automática al regresar

4. **Permisos:**
   - Solo propietarios y colaboradores pueden agregar lugares
   - Verificar que RLS funciona correctamente

Fecha de implementación: 9 de octubre de 2025
Estado: ✅ Completado y listo para testing
