# 🔄 Actualización de Lugares Existentes

## 📊 Situación Actual

**Problema:** Los lugares guardados **antes** de la implementación de los campos de Google Places (migración `202510172_add_google_places_fields.sql`) tienen NULL en todos los campos adicionales:
- `google_rating`
- `reviews_count`
- `price_level`
- `editorial_summary`
- `opening_hours`
- `website`
- `phone`
- `photo_url`

**Lugares afectados:**
- Pollo Fryd (guardado el 28-10-2025 01:58)
- Sangucheria Casa 23 (guardado el 28-10-2025 01:08)
- Hotel Terrado Suites Antofagasta (guardado el 27-10-2025 03:07)
- Hotel Terrado Suites Iquique (guardado el 27-10-2025 03:08)
- Walt Disney World Resort (guardado el 27-10-2025 04:01)
- Tienda Würth Antofagasta (guardado el 28-10-2025 02:16)
- Tokyo DisneySea (guardado el 28-10-2025 02:35)

## ✅ Soluciones

### Opción 1: Guardar Nuevamente (Recomendado)
1. Abre **Explore** desde tu viaje
2. Busca cada lugar afectado
3. Toca el botón "❤️" para remover del viaje
4. Vuelve a buscar el lugar
5. Toca "❤️" nuevamente para agregarlo
6. **Ahora sí se guardará con todos los campos completos**

### Opción 2: Script SQL de Actualización (Avanzado)
Si quieres actualizar masivamente desde la base de datos, necesitarías:

```sql
-- Ejemplo para actualizar un lugar específico
-- NOTA: Necesitas obtener los datos de Google Places API primero

UPDATE trip_places
SET 
  google_rating = 4.4,
  reviews_count = 9,
  price_level = NULL,
  editorial_summary = NULL,
  opening_hours = '{"weekdayDescriptions": ["Monday: 11:00 AM – 10:00 PM", "Tuesday: 11:00 AM – 10:00 PM", ...]}',
  website = NULL,
  phone = NULL,
  photo_url = NULL
WHERE place_id = 'ChIJfxjKzukprpYRHyIQCSARtmo'; -- Pollo Fryd
```

**Limitación:** Necesitas hacer una llamada a Google Places API por cada lugar para obtener los datos actualizados.

## 🎯 Verificación

Después de guardar nuevamente un lugar, verifica en PlaceDetailModal que ahora muestra:
- ⭐ Rating y reseñas
- 💰 Nivel de precio
- 🕐 Horarios de apertura
- 🌐 Website
- 📞 Teléfono
- 📸 Foto

## 📝 Notas

- **Los lugares nuevos** que se agreguen desde ahora **YA incluirán todos los campos automáticamente**
- El código está correcto en:
  - `explore.tsx` (líneas 210-244)
  - `AddToTripModal.tsx` (líneas 235-247)
  - `NewTripModal.tsx` (líneas 237-261)
  - `add-to-trip.tsx` (líneas 110-143)
  
- Solo los lugares **ya guardados antes** tienen datos incompletos

## 🔍 Para Debugging

Si quieres verificar qué lugares tienen datos incompletos:

```sql
-- Lugares sin rating
SELECT name, place_id, google_rating, photo_url, opening_hours
FROM trip_places
WHERE trip_id = '2e57b445-ec22-4477-aad2-934ba81f81b6' -- chile test
AND google_rating IS NULL;
```
