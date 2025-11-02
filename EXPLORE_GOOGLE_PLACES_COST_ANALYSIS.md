# 🔍 Análisis Detallado: Google Places API en Explore

## 📊 ESTADO ACTUAL DEL SISTEMA

### Arquitectura de Búsqueda

```
Usuario busca en Explore
        ↓
app/(tabs)/explore.tsx
        ↓
searchPlacesEnhanced()
        ↓
Edge Function: google-places-enhanced
        ↓
Google Places API (New) - Text Search
```

---

## 💰 COSTOS DE GOOGLE PLACES API (NEW)

### Text Search Pricing

| Tipo de Request | SKU | Precio por llamada | Precio por 1,000 |
|----------------|-----|-------------------|------------------|
| **Text Search (Basic)** | Basic Data | $0.032 | $32.00 |
| **Text Search (Contact)** | Contact Data | +$0.003 | +$3.00 |
| **Text Search (Atmosphere)** | Atmosphere Data | +$0.005 | +$5.00 |

**Crédito mensual gratis:** $200/mes

Fuente: https://developers.google.com/maps/billing-and-pricing/pricing#text-search

---

## 🔎 ANÁLISIS DE LLAMADOS POR BÚSQUEDA

### Caso 1: Búsqueda General (Sin Categorías)

**Ejemplo:** Usuario busca "París"

```typescript
// 1 llamado a Text Search
const generalPlaces = await textSearchGoogle({
  query: "París",
  maxResultCount: 12,  // 12 lugares
  locale: "es"
});
```

**Total llamados: 1**
**Costo: $0.032**

---

### Caso 2: Búsqueda con 1 Categoría

**Ejemplo:** Usuario busca "Madrid" + selecciona "Restaurantes"

```typescript
// 1 llamado a Text Search con tipo específico
const places = await textSearchGoogle({
  query: "restaurantes Madrid",  // Query enriquecida
  includedType: "restaurant",    // Filtro por tipo
  maxResultCount: 6,
  locale: "es"
});
```

**Total llamados: 1**
**Costo: $0.032**

---

### Caso 3: Búsqueda con Múltiples Categorías

**Ejemplo:** Usuario busca "Barcelona" + selecciona 3 categorías (Restaurantes, Museos, Parques)

```typescript
// Código actual hace 1 llamado por categoría
for (const cat of selectedCategories.slice(0, 5)) {
  await runCategorySearch(cat);
  // Cada runCategorySearch llama a textSearchGoogle()
}

// Categoría 1: Restaurantes
textSearchGoogle({ query: "restaurantes Barcelona", includedType: "restaurant", maxResultCount: 6 })

// Categoría 2: Museos
textSearchGoogle({ query: "museos Barcelona", includedType: "museum", maxResultCount: 6 })

// Categoría 3: Parques
textSearchGoogle({ query: "parques Barcelona", includedType: "park", maxResultCount: 6 })
```

**Total llamados: 3**
**Costo: $0.096** (3 × $0.032)

---

### Caso 4: Búsqueda Máxima (5 Categorías)

**Ejemplo:** Usuario busca "Tokio" + selecciona 5 categorías

```typescript
// Límite preventivo: máximo 5 categorías
for (const cat of selectedCategories.slice(0, 5)) {
  await runCategorySearch(cat);
}
```

**Total llamados: 5**
**Costo: $0.160** (5 × $0.032)

---

## 📈 CAMPOS SOLICITADOS (Field Mask)

### Campos Actuales en `textSearchGoogle()`

```typescript
const fieldMask = [
  // BASIC DATA (incluido en precio base)
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.types',
  
  // BASIC DATA (rating/reviews)
  'places.rating',
  'places.userRatingCount',
  'places.priceLevel',
  'places.businessStatus',
  
  // BASIC DATA (horarios/fotos)
  'places.currentOpeningHours',
  'places.photos',
  
  // GRATIS (nuevos campos)
  'places.editorialSummary',
  'places.websiteUri',
  'places.regularOpeningHours.weekdayDescriptions',
  'places.primaryType',
  'places.primaryTypeDisplayName',
  'places.viewport',
  'places.plusCode',
  'places.shortFormattedAddress',
  'places.accessibilityOptions',
].join(',');
```

**Clasificación de Costos:**

| Categoría | Campos | Costo Extra |
|-----------|--------|-------------|
| **Basic Data** | id, name, location, rating, types, photos | **$0.032** (base) |
| **Contact Data** | phoneNumber, websiteUri | **$0** (websiteUri es gratis) |
| **Atmosphere Data** | No solicitados | **$0** |

**Costo por llamado actual: $0.032** ✅

---

## 🎯 ESCENARIOS DE USO REAL

### Escenario 1: Usuario Casual (5 búsquedas/día)

**Perfil:**
- Busca 5 destinos diferentes al día
- Promedio 2 categorías por búsqueda
- 15 días de uso al mes

**Cálculo:**
```
Llamados por búsqueda = 2 categorías = 2 llamados
Búsquedas por día = 5
Total llamados/día = 5 × 2 = 10 llamados

Llamados por mes = 10 × 15 días = 150 llamados
Costo mensual = 150 × $0.032 = $4.80 por usuario
```

---

### Escenario 2: Usuario Activo (15 búsquedas/día)

**Perfil:**
- Viajero planificando itinerario detallado
- Busca 15 destinos/lugares al día
- Promedio 3 categorías por búsqueda
- 20 días de uso al mes

**Cálculo:**
```
Llamados por búsqueda = 3 categorías = 3 llamados
Búsquedas por día = 15
Total llamados/día = 15 × 3 = 45 llamados

Llamados por mes = 45 × 20 días = 900 llamados
Costo mensual = 900 × $0.032 = $28.80 por usuario
```

---

### Escenario 3: 100 Usuarios (Mix Realista)

**Mezcla:**
- 70% usuarios casuales: 70 × 150 = 10,500 llamados
- 20% usuarios activos: 20 × 900 = 18,000 llamados
- 10% usuarios ocasionales (50 llamados/mes): 10 × 50 = 500 llamados

**Total:** 29,000 llamados/mes

**Cálculo de costo:**
```
Crédito gratis: $200/mes = 6,250 llamados gratis
Llamados pagados: 29,000 - 6,250 = 22,750 llamados
Costo: 22,750 × $0.032 = $728/mes

Costo por usuario: $728 / 100 = $7.28/mes
```

---

### Escenario 4: 1,000 Usuarios

**Total estimado:** 290,000 llamados/mes

**Cálculo:**
```
Crédito gratis: 6,250 llamados
Llamados pagados: 290,000 - 6,250 = 283,750 llamados
Costo: 283,750 × $0.032 = $9,080/mes

Costo por usuario: $9,080 / 1,000 = $9.08/mes
```

---

## 🚨 PROBLEMAS IDENTIFICADOS

### 1. **Búsquedas con Múltiples Categorías = Múltiples Llamados**

```typescript
// ❌ PROBLEMA ACTUAL
if (selectedCategories.length > 0) {
  for (const cat of selectedCategories.slice(0, 5)) {
    await runCategorySearch(cat);  // 1 llamado por categoría
  }
}

// 5 categorías = 5 llamados = $0.160 por búsqueda
```

**Impacto:** 5x más caro que búsqueda simple

---

### 2. **Llamados Secuenciales (No Paralelos)**

```typescript
// Las búsquedas se hacen en secuencia, no en paralelo
for (const cat of selectedCategories.slice(0, 5)) {
  await runCategorySearch(cat);  // Espera a que termine antes de siguiente
}
```

**Impacto:** Tiempo de respuesta más lento (5 categorías = 5x tiempo)

---

### 3. **Sin Cache de Resultados**

```typescript
// explore.tsx limpia el cache antes de cada búsqueda
clearPlacesCache();  // ❌ Invalida cache anterior
```

**Impacto:** Re-búsquedas de mismos lugares cuestan dinero

---

### 4. **maxResultCount No Optimizado**

```typescript
// Búsqueda general pide 12 resultados
maxResultCount: 12,  // ¿Son necesarios 12?

// Búsqueda por categoría pide 6 resultados por categoría
maxResultCount: 6,   // 5 categorías × 6 = 30 lugares totales
```

**Impacto:** Más resultados = más datos procesados (aunque costo es fijo por llamado)

---

## 💡 OPTIMIZACIONES PROPUESTAS

### Optimización 1: Consolidar Búsquedas por Categoría

**Problema:** 5 categorías = 5 llamados
**Solución:** 1 búsqueda amplia + filtrado local

```typescript
// ✅ SOLUCIÓN OPTIMIZADA
async function optimizedCategorySearch(
  input: string,
  categories: string[],
  userLocation?: Location
) {
  // 1 solo llamado con query amplia
  const places = await textSearchGoogle({
    query: input,
    // NO usar includedType - buscar ampliamente
    maxResultCount: 20,  // Más resultados en 1 llamado
    userLocation,
    locale
  });

  // Filtrar localmente por categorías deseadas
  const filtered = places.filter(place => {
    const placeTypes = place.types || [];
    return categories.some(cat => {
      const expectedTypes = CATEGORY_TO_GOOGLE_TYPES[cat] || [];
      return expectedTypes.some(type => placeTypes.includes(type));
    });
  });

  return filtered;
}
```

**Ahorro:** 5 llamados → 1 llamado = **80% reducción de costos**

---

### Optimización 2: Implementar Cache Inteligente

```typescript
// Cache de resultados por query + ubicación
interface CacheKey {
  query: string;
  categories: string[];
  location?: string;  // lat_lng redondeado
}

const CACHE_DURATION = 60 * 60 * 1000; // 1 hora

// ✅ Antes de buscar, revisar cache
const cacheKey = generateCacheKey(input, categories, userLocation);
const cached = memoryCache.get(cacheKey);

if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
  console.log('✅ Returning cached results (0 API calls)');
  return cached.data;
}
```

**Ahorro estimado:** 40-60% de llamados para búsquedas repetidas

---

### Optimización 3: Búsquedas Paralelas (Si Necesario)

```typescript
// Si decidimos mantener búsquedas separadas por categoría
// hacer llamados en paralelo en vez de secuencial

// ❌ ACTUAL (secuencial)
for (const cat of categories) {
  await runCategorySearch(cat);  // 5 categorías = 5 × tiempo
}

// ✅ OPTIMIZADO (paralelo)
const searchPromises = categories.map(cat => runCategorySearch(cat));
const results = await Promise.all(searchPromises);  // 5 categorías = 1 × tiempo
```

**Ahorro:** No reduce llamados pero mejora velocidad 5x

---

### Optimización 4: Reducir maxResultCount

```typescript
// ✅ OPTIMIZADO
// Búsqueda general
maxResultCount: 10,  // Era 12

// Búsqueda por categoría (si consolidamos, 1 solo llamado)
maxResultCount: 15,  // Suficiente para filtrar localmente
```

**Ahorro:** Marginal, pero reduce datos transferidos

---

### Optimización 5: Debounce de Búsquedas

```typescript
// ✅ Evitar búsquedas mientras usuario está escribiendo
const debouncedSearch = debounce(performSearch, 500);

// Usuario escribe "Par" → "Pari" → "Paris"
// Solo se ejecuta 1 búsqueda al final
```

**Ahorro estimado:** 50-70% de búsquedas innecesarias

---

## 📊 COMPARACIÓN: ACTUAL vs OPTIMIZADO

### Caso: Usuario busca con 3 categorías

| Métrica | Actual | Optimizado | Mejora |
|---------|--------|------------|--------|
| **Llamados por búsqueda** | 3 | 1 | **66% ↓** |
| **Costo por búsqueda** | $0.096 | $0.032 | **66% ↓** |
| **Tiempo de respuesta** | ~1.5s | ~0.5s | **66% ↓** |
| **Con cache (2da búsqueda)** | $0.096 | $0.000 | **100% ↓** |

### Proyección: 100 usuarios con optimizaciones

```
Llamados sin cache: 29,000/mes
Reducción por consolidación: -66% = 9,860 llamados
Reducción por cache: -50% de esos = 4,930 llamados
Reducción por debounce: -30% = 3,451 llamados/mes

Costo mensual: 3,451 × $0.032 = $110.43/mes (vs $728)
Ahorro: $617.57/mes (85% reducción)
```

---

## 🎯 RECOMENDACIONES PRIORITARIAS

### 🔴 ALTA PRIORIDAD (Implementar YA)

1. **Consolidar búsquedas por categoría**
   - 1 llamado en vez de N llamados
   - Ahorro: 66-80%
   - Complejidad: Media

2. **Implementar cache de 1 hora**
   - Evitar re-búsquedas
   - Ahorro: 40-60%
   - Complejidad: Baja

3. **Debounce de búsquedas**
   - Evitar búsquedas mientras escribe
   - Ahorro: 50-70%
   - Complejidad: Muy baja

### 🟡 MEDIA PRIORIDAD

4. **Paralelizar búsquedas** (solo si mantenemos separadas)
   - Mejora velocidad, no costo
   - Complejidad: Baja

5. **Optimizar maxResultCount**
   - Ahorro marginal
   - Complejidad: Muy baja

### 🟢 BAJA PRIORIDAD

6. **Implementar rate limiting por usuario**
   - Prevenir abuso
   - Complejidad: Media

---

## 🧮 CÁLCULO DE ROI

### Inversión en Optimización

**Tiempo de desarrollo estimado:** 8 horas
**Costo de desarrollo:** $800 (a $100/hora)

### Retorno

**Ahorro mensual:** $617.57 para 100 usuarios
**Break-even:** 1.3 meses
**Ahorro anual:** $7,410.84

**ROI:** 925% anual

---

## 📝 CONCLUSIONES

### Estado Actual
- ✅ Funcional y estable
- ⚠️ No optimizado para costos
- ⚠️ Búsquedas múltiples por categoría
- ⚠️ Sin cache efectivo
- ⚠️ Búsquedas secuenciales (lentas)

### Costos Actuales
- Usuario casual: **$4.80/mes**
- Usuario activo: **$28.80/mes**
- 100 usuarios: **$728/mes**
- 1,000 usuarios: **$9,080/mes**

### Costos Optimizados (con todas las mejoras)
- Usuario casual: **$0.72/mes** (85% ↓)
- Usuario activo: **$4.32/mes** (85% ↓)
- 100 usuarios: **$110/mes** (85% ↓)
- 1,000 usuarios: **$1,362/mes** (85% ↓)

### Acción Inmediata Recomendada

**Implementar las 3 optimizaciones de alta prioridad:**
1. Consolidar búsquedas por categoría
2. Cache de 1 hora
3. Debounce de búsquedas

**Impacto esperado:** 85% reducción de costos + 66% mejora en velocidad

---

## 📎 Referencias

- [Google Places API (New) Pricing](https://developers.google.com/maps/billing-and-pricing/pricing#text-search)
- [Text Search (New) Documentation](https://developers.google.com/maps/documentation/places/web-service/text-search)
- [Field Mask Guide](https://developers.google.com/maps/documentation/places/web-service/place-data-fields)
