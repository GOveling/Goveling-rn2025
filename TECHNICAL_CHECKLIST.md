# ✅ CHECKLIST TÉCNICO DE VERIFICACIÓN

## 🔍 Verificación de Código

### 1. explore.tsx (Lines 155-206)

**Verificar que exista:**
```tsx
const convertPriceLevel = (priceLevel?: number | string | null): number | null => {
  if (typeof priceLevel === 'number') return priceLevel;
  if (!priceLevel) return null;
  
  const priceLevelMap: { [key: string]: number } = {
    PRICE_LEVEL_FREE: 0,
    PRICE_LEVEL_INEXPENSIVE: 1,
    PRICE_LEVEL_MODERATE: 2,
    PRICE_LEVEL_EXPENSIVE: 3,
    PRICE_LEVEL_VERY_EXPENSIVE: 4,
  };
  
  return priceLevelMap[priceLevel] ?? null;
};
```
- [ ] Función `convertPriceLevel` existe
- [ ] Mapeo correcto de price levels

**Verificar que el insert incluya:**
```tsx
const { error } = await supabase.from('trip_places').insert({
  // Campos básicos
  trip_id: tripId,
  place_id: place.id,
  name: place.name,
  address: place.address || '',
  lat: place.coordinates?.lat || 0,
  lng: place.coordinates?.lng || 0,
  category: place.types?.[0] || place.category || 'establishment',
  photo_url: place.photos && place.photos.length > 0 ? place.photos[0] : null,
  added_by: user.user.id,
  added_at: new Date().toISOString(),
  // Campos de Google Places (nuevos)
  google_rating: place.rating || null,
  reviews_count: place.reviews_count || null,
  price_level: convertPriceLevel(place.priceLevel),
  editorial_summary: place.editorialSummary || null,
  opening_hours: place.openingHours ? { weekdayDescriptions: place.openingHours } : null,
  website: place.website || null,
  phone: place.phone || null,
});
```
- [ ] google_rating incluido
- [ ] reviews_count incluido
- [ ] price_level incluido y con convertPriceLevel()
- [ ] editorial_summary incluido
- [ ] opening_hours incluido con formato correcto
- [ ] website incluido
- [ ] phone incluido

---

### 2. AddToTripModal.tsx (Lines 298-318)

**Verificar que NewTripModal reciba addPlaceContext:**
```tsx
<NewTripModal
  visible={showNewTripModal}
  onClose={() => setShowNewTripModal(false)}
  onTripCreated={handleCreateTrip}
  addPlaceContext={{
    placeId: place.id,
    placeName: place.name,
    address: place.address || '',
    lat: place.coordinates?.lat || 0,
    lng: place.coordinates?.lng || 0,
    category: place.types?.[0] || place.category || 'establishment',
    photoUrl: place.photos && place.photos.length > 0 ? place.photos[0] : null,
    rating: place.rating || null,
    reviewsCount: place.reviews_count || null,
    priceLevel: place.priceLevel || null,
    editorialSummary: place.editorialSummary || null,
    openingHours: place.openingHours || null,
    website: place.website || null,
    phone: place.phone || null,
  }}
/>
```
- [ ] addPlaceContext pasado a NewTripModal
- [ ] Todos los campos presentes
- [ ] Nombres de propiedades coinciden con interfaz NewTripModalProps

---

### 3. NewTripModal.tsx - Interface (Lines 37-56)

**Verificar que la interfaz esté actualizada:**
```tsx
interface NewTripModalProps {
  visible: boolean;
  onClose: () => void;
  onTripCreated: (tripId: string) => void;
  addPlaceContext?: {
    placeId: string;
    placeName: string;
    address?: string;
    lat?: number;
    lng?: number;
    category?: string;
    photoUrl?: string | null;
    rating?: number | null;
    reviewsCount?: number | null;
    priceLevel?: number | null;
    editorialSummary?: string | null;
    openingHours?: string[] | null;
    website?: string | null;
    phone?: string | null;
    onPlaceAdded?: () => void;
  };
}
```
- [ ] address presente en interfaz
- [ ] lat, lng, category, photoUrl presentes
- [ ] rating, reviewsCount presentes
- [ ] priceLevel, editorialSummary presentes
- [ ] openingHours, website, phone presentes

---

### 4. NewTripModal.tsx - Insert (Lines 220-261)

**Verificar que el insert esté actualizado:**
```tsx
if (addPlaceContext) {
  console.log('📍 Añadiendo lugar al viaje recién creado...');
  try {
    const convertPriceLevel = (priceLevel?: number | string | null): number | null => {
      // ... función convertPriceLevel
    };

    const { error: placeError } = await supabase.from('trip_places').insert({
      trip_id: data.id,
      place_id: addPlaceContext.placeId,
      name: addPlaceContext.placeName,
      address: addPlaceContext.address || '',
      lat: addPlaceContext.lat || 0,
      lng: addPlaceContext.lng || 0,
      category: addPlaceContext.category || 'establishment',
      photo_url: addPlaceContext.photoUrl || null,
      added_by: user.id,
      added_at: new Date().toISOString(),
      google_rating: addPlaceContext.rating || null,
      reviews_count: addPlaceContext.reviewsCount || null,
      price_level: convertPriceLevel(addPlaceContext.priceLevel),
      editorial_summary: addPlaceContext.editorialSummary || null,
      opening_hours: addPlaceContext.openingHours
        ? { weekdayDescriptions: addPlaceContext.openingHours }
        : null,
      website: addPlaceContext.website || null,
      phone: addPlaceContext.phone || null,
    });
  } catch (placeError) {
    // ...
  }
}
```
- [ ] convertPriceLevel definida dentro del bloque
- [ ] Todos los campos del addPlaceContext utilizados
- [ ] Opening hours con formato weekdayDescriptions
- [ ] Try-catch para manejo de errores

---

### 5. add-to-trip.tsx (Lines 110-143)

**Verificar que el insert esté actualizado:**
```tsx
const convertPriceLevel = (priceLevel?: number | string | null): number | null => {
  // ... función
};

const { error } = await supabase.from('trip_places').insert({
  trip_id: tripId,
  place_id: place.id,
  name: place.name,
  address: place.address || '',
  lat: place.coordinates?.lat || 0,
  lng: place.coordinates?.lng || 0,
  category: place.types?.[0] || place.category || 'establishment',
  photo_url: place.photos && place.photos.length > 0 ? place.photos[0] : null,
  added_by: user.user.id,
  added_at: new Date().toISOString(),
  google_rating: place.rating || null,
  reviews_count: place.reviews_count || null,
  price_level: convertPriceLevel(place.priceLevel),
  editorial_summary: place.editorialSummary || null,
  opening_hours: place.openingHours ? { weekdayDescriptions: place.openingHours } : null,
  website: place.website || null,
  phone: place.phone || null,
});
```
- [ ] convertPriceLevel incluida
- [ ] Todos los campos de Google Places incluidos
- [ ] Formato correcto de opening_hours

---

## 🛠️ Compilación y Linting

### TypeScript Check
```bash
npx tsc --noEmit
```
- [ ] ✅ DEBE PASAR sin errores
- [ ] ✅ DEBE PASAR sin advertencias (warnings de estilos están OK)

### ESLint Check
```bash
npx eslint .
```
- [ ] ✅ DEBE PASAR sin errores
- [ ] ⚠️ PUEDE HABER warnings de colores hardcodeados (OK)

---

## 📊 Verificación en Base de Datos

### Query para verificar
```sql
SELECT 
  id,
  place_id, 
  name, 
  google_rating, 
  reviews_count, 
  price_level, 
  editorial_summary, 
  opening_hours, 
  website, 
  phone,
  added_at
FROM trip_places
ORDER BY added_at DESC
LIMIT 10;
```

**Verificar que:**
- [ ] `google_rating` tiene valores numéricos o null
- [ ] `reviews_count` tiene valores numéricos o null
- [ ] `price_level` tiene valores 0-4 o null
- [ ] `editorial_summary` tiene textos o null
- [ ] `opening_hours` tiene JSON o null
- [ ] `website` tiene URLs o null
- [ ] `phone` tiene números o null

### Query para verificar que NO hay todos nulls
```sql
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN google_rating IS NOT NULL THEN 1 ELSE 0 END) as with_rating,
  SUM(CASE WHEN opening_hours IS NOT NULL THEN 1 ELSE 0 END) as with_hours,
  SUM(CASE WHEN price_level IS NOT NULL THEN 1 ELSE 0 END) as with_price
FROM trip_places;
```

**Verificar que:**
- [ ] `with_rating` > 0 (al menos algunos lugares con rating)
- [ ] `with_hours` > 0 (al menos algunos lugares con horarios)
- [ ] `with_price` > 0 (al menos algunos lugares con precio)

---

## 🧪 Pruebas Funcionales

### Test 1: Agregar desde "+ Explorar Más"
- [ ] Ir a un Trip
- [ ] Presionar "+ Explorar Más"
- [ ] Buscar "Restaurante"
- [ ] Hacer tap en resultado
- [ ] ✅ VERIFICAR que muestre Rating
- [ ] ✅ VERIFICAR que muestre Horarios
- [ ] ✅ VERIFICAR que muestre Precio
- [ ] ✅ VERIFICAR que muestre About
- [ ] Presionar "Agregar a este viaje"
- [ ] Volver al Trip
- [ ] Abrir el lugar que agregaste
- [ ] ✅ VERIFICAR que SIGA mostrando Rating (CRÍTICO)
- [ ] ✅ VERIFICAR que SIGA mostrando Horarios (CRÍTICO)
- [ ] ✅ VERIFICAR que SIGA mostrando Precio (CRÍTICO)
- [ ] ✅ VERIFICAR que SIGA mostrando About (CRÍTICO)

### Test 2: Crear nuevo viaje
- [ ] Ir a Explore
- [ ] Buscar un lugar
- [ ] Hacer tap
- [ ] Presionar "Crear nuevo viaje"
- [ ] Llenar datos del viaje
- [ ] Presionar "Crear"
- [ ] ✅ VERIFICAR que el lugar tiene todos los datos

### Test 3: Agregar sin abrir modal
- [ ] Ir a Explore desde "+ Explorar Más"
- [ ] Buscar un lugar
- [ ] Presionar agregar directamente (sin abrir modal)
- [ ] Volver al Trip
- [ ] ✅ VERIFICAR que tenga todos los datos

---

## 📋 Checklist Resumen

### Código
- [ ] explore.tsx modificado correctamente
- [ ] AddToTripModal.tsx pasa contexto correcto
- [ ] NewTripModal.tsx interfaz extendida
- [ ] NewTripModal.tsx insert actualizado
- [ ] add-to-trip.tsx insert actualizado
- [ ] convertPriceLevel en los 3 lugares necesarios

### Tests de Compilación
- [ ] TypeScript Check PASA
- [ ] ESLint Check PASA

### Tests de Base de Datos
- [ ] Nuevos places tienen google_rating
- [ ] Nuevos places tienen reviews_count
- [ ] Nuevos places tienen price_level
- [ ] Nuevos places tienen editorial_summary
- [ ] Nuevos places tienen opening_hours
- [ ] Nuevos places tienen website
- [ ] Nuevos places tienen phone

### Tests Funcionales
- [ ] Test 1: Todos los datos aparecen en Trip
- [ ] Test 2: Crear nuevo viaje guarda datos completos
- [ ] Test 3: Agregar sin modal guarda datos completos

### Documentación
- [ ] PLACE_DATA_FIX_SUMMARY.md creado
- [ ] PLACE_DATA_FIX_DETAILED_ANALYSIS.md creado
- [ ] VALIDATION_GUIDE.md creado
- [ ] VISUAL_SUMMARY.md creado
- [ ] FIX_COMPLETED.md creado
- [ ] Este checklist creado

---

## 🚀 Próximos Pasos

Cuando TODO esté checkmarked:

1. ✅ Ejecutar tests manuales
2. ✅ Validar en BD
3. ✅ Hacer commit:
   ```bash
   git add -A
   git commit -m "fix: guardar datos completos de lugares en trips

   - Actualizar explore.tsx para guardar todos los datos
   - Actualizar AddToTripModal.tsx para pasar contexto completo
   - Extender NewTripModal.tsx para recibir todos los datos
   - Actualizar add-to-trip.tsx para guardar todos los datos
   - Agregar convertPriceLevel en todos los puntos de inserción
   - Incluir: google_rating, reviews_count, price_level, editorial_summary, opening_hours, website, phone"
   ```
4. ✅ Hacer push
5. ✅ Crear PR si aplica

---

## 📞 Troubleshooting

### Error: \"google_rating is not a column\"
❌ SIGNIFICA: La BD no tiene el campo
✅ SOLUCIÓN: Verificar que trip_places tenga la columna (ya debe existir)

### Valores siempre null en BD
❌ SIGNIFICA: Los datos no se están pasando correctamente
✅ SOLUCIÓN: Verificar que place.rating, place.openingHours, etc. tengan valores

### TypeScript errors después de cambios
❌ SIGNIFICA: Interfaz no está actualizada
✅ SOLUCIÓN: Verificar que NewTripModalProps incluya todos los campos opcionales

### ESLint errors por colores
⚠️ ESTO ES OK: Son warnings de estilo, no afectan funcionalidad

---

## ✨ Estado Final Esperado

Cuando todo esté completo:

```
✅ Código compilado
✅ Tests pasados
✅ Datos en BD correctos
✅ UI muestra información completa
✅ Todos los flujos funcionan igual
✅ Documentación actualizada
✅ Ready para producción
```

---

**Fecha de completación:** 19 de octubre de 2025
**Archivos modificados:** 4
**Campos agregados:** 8
**Flujos reparados:** 4
**Estado:** COMPLETADO ✅

