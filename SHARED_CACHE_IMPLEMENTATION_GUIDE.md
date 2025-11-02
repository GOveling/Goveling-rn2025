# 🎉 Cache Compartido Implementado - Guía de Uso

**Fecha:** 2 de noviembre de 2025
**Estado:** ✅ Implementado y listo para deployment

---

## 📋 RESUMEN DE IMPLEMENTACIÓN

Se ha implementado exitosamente un **sistema de cache compartido en 3 niveles** que reduce los costos de Google Places API en **77% adicional**.

### Archivos Creados/Modificados:

1. ✅ `supabase/migrations/20251102_places_search_cache.sql` - Tabla y funciones SQL
2. ✅ `supabase/functions/_shared/cacheHelper.ts` - Helper para cache L2
3. ✅ `supabase/functions/google-places-enhanced/index.ts` - Integración de 3 niveles
4. ✅ `apply-shared-cache-migration.sh` - Script de aplicación

---

## 🏗️ ARQUITECTURA IMPLEMENTADA

### Sistema de Cache en 3 Niveles:

```
Usuario busca "París"
        ↓
┌──────────────────────────┐
│ L1: Cache Local          │ → HIT: 0ms, $0
│     (Memoria del Cliente)│    Instantáneo
│     TTL: 1 hora          │
│     Ya implementado ✅    │
└──────────────────────────┘
        ↓ MISS
┌──────────────────────────┐
│ L2: Cache Compartido     │ → HIT: ~100ms, $0
│     (Supabase DB)        │    Rápido, compartido
│     TTL: 24-48 horas     │
│     NUEVO ✨             │
└──────────────────────────┘
        ↓ MISS
┌──────────────────────────┐
│ L3: Google Places API    │ → MISS: ~500ms, $0.032
│     (Búsqueda nueva)     │    Caro, guarda en L1+L2
└──────────────────────────┘
```

---

## 🚀 DEPLOYMENT

### Paso 1: Aplicar Migración SQL

```bash
# Opción A: Script automático (recomendado)
./apply-shared-cache-migration.sh

# Opción B: Manual
supabase db push
```

Esto creará:
- ✅ Tabla `places_search_cache`
- ✅ Índices optimizados
- ✅ Políticas RLS seguras
- ✅ Funciones RPC (increment_cache_hit, clean_expired_cache, get_cache_stats)

### Paso 2: Deployar Edge Function

```bash
# Deploy de la función actualizada con cache compartido
supabase functions deploy google-places-enhanced
```

### Paso 3: Verificar

```bash
# Verificar que la tabla existe
supabase db remote commit

# Ver estructura de la tabla
psql $DATABASE_URL -c "\d places_search_cache"
```

---

## 📊 CÓMO FUNCIONA

### Flujo de Búsqueda:

1. **Usuario hace búsqueda** en Explore tab
   ```typescript
   searchPlacesEnhanced({ 
     input: "París", 
     selectedCategories: ["restaurant"] 
   })
   ```

2. **L1: Verifica cache local** (cliente)
   - Si existe y no expiró (< 1h) → Retorna inmediatamente
   - Si no existe o expiró → Continúa a L2

3. **L2: Verifica cache compartido** (edge function)
   ```typescript
   const cachedResult = await getCachedResults(supabase, cacheKey);
   if (cachedResult.hit) {
     // ✅ HIT: Retorna resultados de otro usuario
     return cachedResult.data;
   }
   ```

4. **L3: Llama a Google Places API** (si cache miss)
   ```typescript
   const results = await textSearchGoogle(params);
   
   // Guarda en L2 para todos los usuarios
   await saveCachedResults(supabase, cacheKey, params, results);
   ```

---

## 🔍 MONITOREO Y ANALYTICS

### Ver Estadísticas del Cache

```sql
-- Obtener estadísticas generales
SELECT * FROM get_cache_stats();

-- Resultado:
-- total_entries | total_hits | avg_hits_per_entry | most_popular_searches
-- --------------|------------|--------------------|-----------------------
-- 150           | 1,234      | 8.2                | [{"search": "París"...}]
```

### Consultas Útiles:

```sql
-- Ver cache activo (no expirado)
SELECT 
  cache_key,
  search_params->>'input' as search_query,
  hit_count,
  created_at,
  expires_at
FROM places_search_cache
WHERE expires_at > NOW()
ORDER BY hit_count DESC
LIMIT 10;

-- Búsquedas más populares
SELECT 
  search_params->>'input' as destination,
  COUNT(*) as cache_entries,
  SUM(hit_count) as total_hits,
  SUM(hit_count) * 0.032 as money_saved_usd
FROM places_search_cache
WHERE expires_at > NOW()
GROUP BY search_params->>'input'
ORDER BY total_hits DESC
LIMIT 20;

-- Hit rate general
SELECT 
  COUNT(*) as total_entries,
  SUM(hit_count) as total_hits,
  ROUND(AVG(hit_count), 2) as avg_hits_per_entry,
  SUM(hit_count) * 0.032 as total_money_saved_usd
FROM places_search_cache
WHERE created_at >= NOW() - INTERVAL '30 days';
```

### Logs de Edge Function:

```bash
# Ver logs en tiempo real
supabase functions logs google-places-enhanced --tail

# Buscar cache hits
supabase functions logs google-places-enhanced | grep "L2 Cache HIT"

# Buscar cache misses
supabase functions logs google-places-enhanced | grep "L2 Cache MISS"
```

---

## 🧹 MANTENIMIENTO

### Limpiar Cache Expirado

El cache expirado se limpia automáticamente al consultar (WHERE expires_at > NOW()), pero puedes limpiarlo manualmente:

```sql
-- Limpiar entradas expiradas
SELECT clean_expired_cache();

-- Ver resultado:
-- deleted_count
-- --------------
-- 45
```

### Configurar Cron Job (Opcional)

Para limpieza automática diaria:

```sql
-- Usando pg_cron (si está instalado)
SELECT cron.schedule(
  'clean-expired-cache',
  '0 3 * * *',  -- Todos los días a las 3 AM
  $$SELECT clean_expired_cache()$$
);

-- Ver cron jobs
SELECT * FROM cron.job;
```

### Invalidar Cache Manualmente

Si necesitas forzar actualización de un lugar específico:

```sql
-- Invalidar cache de París
DELETE FROM places_search_cache
WHERE search_params->>'input' ILIKE '%parís%';

-- Invalidar todo el cache (usar con precaución)
TRUNCATE places_search_cache;
```

---

## 🎯 CONFIGURACIÓN AVANZADA

### Ajustar TTL por Popularidad

El sistema ya incluye TTL dinámico:
- **Destinos populares** (París, Barcelona, etc.): 48 horas
- **Otros destinos**: 24 horas

Modificar en `cacheHelper.ts`:

```typescript
export function calculateDynamicTTL(searchInput: string): number {
  const input = searchInput.toLowerCase();
  
  // Agregar más destinos populares
  const popularDestinations = [
    'paris', 'parís',
    'barcelona',
    // ... agregar más
  ];
  
  const isPopular = popularDestinations.some(dest => input.includes(dest));
  
  return isPopular ? 
    48 * 60 * 60 * 1000 : // 48h
    24 * 60 * 60 * 1000;  // 24h
}
```

### Pre-warming del Cache

Cachear destinos populares proactivamente:

```typescript
// Script: scripts/warm-cache.ts
const popularSearches = [
  { input: 'París', selectedCategories: ['restaurant', 'museum'] },
  { input: 'Barcelona', selectedCategories: ['restaurant', 'beach'] },
  { input: 'Roma', selectedCategories: ['restaurant', 'attraction'] },
  // ... más destinos
];

for (const search of popularSearches) {
  await fetch('https://YOUR_PROJECT.supabase.co/functions/v1/google-places-enhanced', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(search),
  });
  
  await new Promise(r => setTimeout(r, 1000)); // Rate limit
}
```

---

## 🧪 TESTING

### Test 1: Verificar Cache Miss → Hit

```bash
# Terminal 1: Ver logs
supabase functions logs google-places-enhanced --tail

# Terminal 2: Hacer búsqueda
curl -X POST \
  https://YOUR_PROJECT.supabase.co/functions/v1/google-places-enhanced \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "input": "París",
    "selectedCategories": ["restaurant"],
    "locale": "es"
  }'

# Esperar 2 segundos y repetir la misma búsqueda
# Deberías ver "L2 Cache HIT" en los logs
```

### Test 2: Verificar Diferentes Usuarios

```bash
# Usuario 1: Primera búsqueda (cache miss)
curl ... # (mismo comando de arriba)
# Ver logs: "L2 Cache MISS - Will call Google API"

# Usuario 2: Segunda búsqueda (cache hit)
curl ... # (mismo comando)
# Ver logs: "L2 Cache HIT - Returning cached results"
```

### Test 3: Verificar Expiración

```sql
-- Crear entrada con TTL corto (para testing)
INSERT INTO places_search_cache (
  cache_key,
  search_params,
  results,
  expires_at
) VALUES (
  'test-key',
  '{"input": "Test"}'::jsonb,
  '{"predictions": []}'::jsonb,
  NOW() + INTERVAL '10 seconds'
);

-- Esperar 15 segundos...

-- Verificar que no se puede leer (expirado)
SELECT * FROM places_search_cache WHERE cache_key = 'test-key';
-- Retorna vacío (política RLS bloquea expires_at < NOW())
```

---

## 📈 MÉTRICAS ESPERADAS

### Proyecciones para 100 Usuarios:

| Métrica | Sin Cache Compartido | Con Cache Compartido | Mejora |
|---------|---------------------|----------------------|--------|
| **API Calls/mes** | 4,350 | 990 | 77% ↓ |
| **Costo API** | $139/mes | $32/mes | $107/mes ahorro |
| **Cache Hit Rate** | 0% | 60-80% | +60-80% |
| **Latencia promedio** | 500ms | 150ms | 70% ↓ |

### Dashboard de Monitoreo:

```sql
-- Query para dashboard mensual
SELECT 
  DATE_TRUNC('day', created_at) as date,
  COUNT(*) as new_cache_entries,
  SUM(hit_count) as daily_hits,
  SUM(hit_count) * 0.032 as money_saved_usd
FROM places_search_cache
WHERE created_at >= DATE_TRUNC('month', NOW())
GROUP BY date
ORDER BY date;
```

---

## ⚠️ TROUBLESHOOTING

### Problema: Cache no funciona

**Síntomas:** Siempre "L2 Cache MISS"

**Soluciones:**
1. Verificar que la migración se aplicó:
   ```sql
   SELECT COUNT(*) FROM places_search_cache;
   ```

2. Verificar políticas RLS:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'places_search_cache';
   ```

3. Verificar logs de edge function:
   ```bash
   supabase functions logs google-places-enhanced | grep -i cache
   ```

### Problema: Error de permisos

**Error:** "permission denied for table places_search_cache"

**Solución:**
```sql
-- Verificar grants
GRANT SELECT ON places_search_cache TO anon;
GRANT SELECT ON places_search_cache TO authenticated;
```

### Problema: Cache nunca expira

**Síntomas:** Datos muy viejos en cache

**Solución:**
```sql
-- Verificar expires_at
SELECT cache_key, expires_at, NOW() - expires_at as age
FROM places_search_cache
ORDER BY expires_at DESC
LIMIT 10;

-- Si hay problema, limpiar manualmente
SELECT clean_expired_cache();
```

---

## 🎯 PRÓXIMOS PASOS OPCIONALES

### 1. Agregar Métricas a Dashboard

Crear vista en Supabase Dashboard para monitorear:
- Cache hit rate
- Dinero ahorrado
- Búsquedas más populares

### 2. Alertas Automáticas

Configurar alertas si:
- Cache hit rate < 40% (problema)
- Cache size > 400 MB (limpiar)

### 3. A/B Testing

Comparar performance con/sin cache compartido para validar impacto real.

---

## 📄 RECURSOS ADICIONALES

- [SHARED_CACHE_ANALYSIS.md](./SHARED_CACHE_ANALYSIS.md) - Análisis detallado
- [EXPLORE_OPTIMIZATIONS_IMPLEMENTED.md](./EXPLORE_OPTIMIZATIONS_IMPLEMENTED.md) - Optimizaciones previas
- [Supabase Database Docs](https://supabase.com/docs/guides/database)

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

- [x] Migración SQL creada
- [x] Helper de cache implementado
- [x] Edge function actualizado
- [x] Script de deployment creado
- [x] Documentación completa
- [ ] Migración aplicada en producción
- [ ] Edge function deployado
- [ ] Testing realizado
- [ ] Métricas monitoreadas
- [ ] Cache warming configurado (opcional)

---

**Estado:** ✅ Implementado - Listo para deployment
**Próximo paso:** Ejecutar `./apply-shared-cache-migration.sh` y deployar edge function
