# ✅ GUÍA DE VALIDACIÓN VISUAL - PASO A PASO

## 🎯 Objetivo
Verificar que los lugares agregados desde el botón "+ Explorar Más" ahora muestren:
- ⭐ Rating (calificación)
- 🕐 Horarios de atención
- 💰 Nivel de precio
- 📝 Descripción/About

---

## 🧪 TEST 1: Flujo Completo desde Trip (RECOMENDADO - PRINCIPAL)

### Paso 1: Abrir un Trip existente
```
1. Abrir la app
2. Ir a la sección "Trips"
3. Presionar sobre un trip existente
4. Ver la lista de lugares del trip
```

### Paso 2: Presionar "+ Explorar Más"
```
5. Buscar el botón verde con ícono "+" y texto "Explorar Más"
6. Presionarlo
✅ ESPERADO: Se abre Explore con el tripId del trip
```

### Paso 3: Buscar y abrir un lugar
```
7. En Explore, escribir un tipo de lugar (ej: "Restaurante")
8. Presionar buscar
9. Cuando aparezcan resultados, hacer tap en uno de los primeros
✅ ESPERADO: Se abre modal con ficha del lugar
```

### Paso 4: Verificar datos en Explore (ANTES de agregar)
```
En la modal del lugar que se abre, debe mostrar:
  ⭐ Rating (ej: "4.5") → CAMPO: place.rating
  🕐 Horarios (ej: "Mon-Fri: 9am-6pm") → CAMPO: place.openingHours
  💰 Precio (ej: "$$") → CAMPO: place.priceLevel
  📝 About (descripción) → CAMPO: place.editorialSummary

✅ ESPERADO: VES TODOS ESTOS DATOS EN LA MODAL
```

### Paso 5: Agregar el lugar al trip
```
10. En la modal, buscar y presionar el botón "Agregar a este viaje"
    O presionar el botón flotante con ícono de avión
✅ ESPERADO: Aparece confirmación "¡Lugar agregado!"
```

### Paso 6: Volver al trip
```
11. Presionar "Ver lugares del viaje" en la confirmación
    O navegar manualmente al trip
✅ ESPERADO: Vuelves a ver la lista del trip
```

### Paso 7: Verificar datos guardados (DESPUÉS de agregar) ⚠️ CRÍTICO
```
12. En la lista de lugares del trip, buscar el lugar que acabas de agregar
13. Hacer tap sobre ese lugar para ver su ficha en el trip

✅ VERIFICAR QUE MUESTRE:
   ✓ Rating (⭐) - DEBE COINCIDIR CON LO QUE VISTE EN EXPLORE
   ✓ Horarios (🕐) - DEBE COINCIDIR CON LO QUE VISTE EN EXPLORE
   ✓ Precio (💰) - DEBE COINCIDIR CON LO QUE VISTE EN EXPLORE
   ✓ About (📝) - DEBE COINCIDIR CON LO QUE VISTE EN EXPLORE
```

---

## 🧪 TEST 2: Crear Nuevo Viaje desde Explore

### Paso 1: Ir a Explore sin tripId
```
1. Abrir la app
2. Ir a la sección "Explore"
3. NO abrir desde "+ Explorar Más" de un trip
✅ ESPERADO: Explore abre sin tripId en contexto
```

### Paso 2: Buscar y abrir un lugar
```
4. Escribir un tipo de lugar (ej: "Café")
5. Presionar buscar
6. Hacer tap en uno de los resultados
✅ ESPERADO: Se abre modal con ficha del lugar
```

### Paso 3: Crear nuevo viaje
```
7. En la modal del lugar, buscar el botón "Crear nuevo viaje"
8. Presionarlo
✅ ESPERADO: Se abre modal para crear viaje
```

### Paso 4: Completar datos del viaje
```
9. Llenar formulario:
   - Nombre del viaje
   - Descripción (opcional)
   - Fechas (opcional)
   - Presupuesto (opcional)
10. Presionar "Crear viaje"
✅ ESPERADO: Se guarda el viaje y se agrega el lugar
```

### Paso 5: Verificar datos del lugar
```
11. Navegar al viaje recién creado
12. Ver el lugar que se agregó automáticamente
13. Hacer tap sobre el lugar

✅ VERIFICAR QUE MUESTRE:
   ✓ Rating (⭐)
   ✓ Horarios (🕐)
   ✓ Precio (💰)
   ✓ About (📝)
```

---

## 🧪 TEST 3: Agregar sin abrir ficha (Advanced)

### Paso 1: Abrir Explore desde "+ Explorar Más"
```
1. Ir a un trip
2. Presionar "+ Explorar Más"
✅ ESPERADO: Se abre Explore con tripId en contexto
```

### Paso 2: Buscar un lugar
```
3. Escribir y buscar (ej: "Pizza")
4. VER resultados sin hacer tap
✅ ESPERADO: Ves las tarjetas de lugares
```

### Paso 3: Agregar directamente sin abrir modal
```
5. En la tarjeta del lugar (sin abrir modal), 
   buscar un botón "+ Agregar a viaje" o similar
6. Presionarlo directamente
✅ ESPERADO: Se agrega sin abrir la ficha completa
```

### Paso 4: Verificar en el trip
```
7. Volver al trip
8. Buscar el lugar que agregaste
9. Abrir su ficha

✅ VERIFICAR QUE MUESTRE:
   ✓ Aunque no hayas visto la modal completa en Explore,
     el lugar debe mostrar TODOS los datos en el trip
```

---

## 🔍 VALIDACIÓN DE DATOS EN LA BASE DE DATOS

Si necesitas verificar directamente en Supabase:

### Acceder a la tabla trip_places
```
1. Ir a Supabase Dashboard
2. Ir a SQL Editor
3. Ejecutar:

SELECT 
  place_id, 
  name, 
  google_rating, 
  reviews_count, 
  price_level, 
  editorial_summary, 
  opening_hours, 
  website, 
  phone
FROM trip_places
WHERE trip_id = 'TU_TRIP_ID'
ORDER BY added_at DESC
LIMIT 5;
```

### Verificar valores
```
google_rating        → Debe tener un número (ej: 4.5) o null
reviews_count        → Debe tener un número (ej: 127) o null
price_level          → Debe tener 0, 1, 2, 3, 4 o null
editorial_summary    → Debe tener texto o null
opening_hours        → Debe tener JSON con weekdayDescriptions o null
website              → Debe tener URL o null
phone                → Debe tener teléfono o null
```

---

## ❌ PROBLEMAS COMUNES Y SOLUCIONES

### Problema 1: Los datos NO aparecen después de agregar
```
Posibles causas:
1. El lugar tiene datos incompletos en Google Places API
2. El componente PlaceDetailModal no está mostrando los campos
3. Los datos se guardaron null en la BD

Solución:
1. Ir a Supabase y verificar que los campos NO sean todos null
2. Si son null, el problema es que Google Places no retorna los datos
3. Si tienen valores, el problema es en la UI de visualización
```

### Problema 2: Solo algunos datos aparecen
```
Posible causa: El lugar tiene algunos campos pero no todos en Google Places

Solución: ESTO ES NORMAL
- No todos los lugares tienen todos los datos en Google Places
- Ejemplo: Un lugar local puede no tener website o teléfono
- Verificar que AL MENOS aparezcan: rating, horarios, precio
```

### Problema 3: Aparecen datos pero diferentes a los de Explore
```
Posible causa: Se guardaron datos distintos de los que se mostraban

Solución:
1. Verificar que el lugar es el mismo (validar place_id)
2. Comprobar en Supabase que los valores sean correctos
3. Limpiar caché y recargar la app
```

---

## 📱 CAMPOS QUE DEBE MOSTRAR PlaceDetailModal

Cuando abres la ficha de un lugar (desde Explore o desde Trip), debe mostrar:

### Información Básica (SIEMPRE)
- ✅ Nombre del lugar
- ✅ Dirección
- ✅ Categoría
- ✅ Foto

### Información de Google Places (ANTES NO SE GUARDABA, AHORA SÍ)
- ✅ **Rating** (⭐ ej: "4.5 estrellas")
- ✅ **Número de reseñas** (ej: "127 reseñas")
- ✅ **Nivel de precio** (💰 ej: "$$")
- ✅ **Descripción/About** (📝 resumen del lugar)
- ✅ **Horarios** (🕐 horarios de atención)
- ✅ **Teléfono** (☎️ si disponible)
- ✅ **Website** (🌐 si disponible)

---

## ✨ RESUMEN ESPERADO

### ANTES (Sin fix)
```
Trip Places List:
├── Lugar 1
│   ├── Nombre ✓
│   ├── Dirección ✓
│   ├── Rating ✗
│   ├── Horarios ✗
│   ├── Precio ✗
│   └── About ✗
```

### DESPUÉS (Con fix)
```
Trip Places List:
├── Lugar 1
│   ├── Nombre ✓
│   ├── Dirección ✓
│   ├── Rating ✓ ← NUEVO
│   ├── Horarios ✓ ← NUEVO
│   ├── Precio ✓ ← NUEVO
│   └── About ✓ ← NUEVO
```

---

## 📊 CHECKLIST FINAL

- [ ] TEST 1 completado: Lugar muestra todos los datos después de agregar desde "+ Explorar Más"
- [ ] TEST 2 completado: Lugar muestra todos los datos cuando se crea nuevo viaje
- [ ] TEST 3 completado: Lugar muestra todos los datos aunque se agregue sin abrir modal
- [ ] Verificación BD: Supabase muestra valores en todos los campos
- [ ] Rating aparece correctamente formateado (ej: "4.5 ⭐")
- [ ] Horarios se muestran legibles (días y horas)
- [ ] Precio muestra nivel ($, $$, $$$, etc)
- [ ] About/Editorial Summary muestra descripción del lugar
- [ ] Teléfono y website aparecen si están disponibles

---

## 🚀 SIGUIENTE PASO

Una vez validado que TODO funciona correctamente:

1. Hacer commit de los cambios
2. Actualizar la documentación del proyecto
3. Comunicar el fix al equipo
4. Monitorear si hay reportes de problemas

