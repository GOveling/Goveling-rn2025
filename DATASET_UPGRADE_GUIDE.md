# 📦 Guía de Upgrade de Datasets - Natural Earth 10m + USA

## ✅ Paso 1: Datasets Descargados

Los siguientes datasets han sido descargados y procesados:

```
assets/geo/
├── admin0.topo.json        (128KB) ← Original 50m
├── admin1.topo.json        (113KB) ← Original 50m
├── admin0_10m.topo.json    (722KB) ← ⭐ NUEVO 10m (3x más detalle)
├── admin1_10m.topo.json    (2.1MB) ← ⭐ NUEVO 10m (regiones)
└── usa_states.topo.json     (17KB) ← ⭐ NUEVO USA específico
```

### Mejoras Esperadas

**Natural Earth 10m (admin0_10m.topo.json):**
- ✅ Resolverá: Montevideo (Uruguay), Cape Town (Sudáfrica), Auckland (NZ)
- ✅ Resolverá: Marseille (Francia), Copenhagen (Dinamarca)
- ✅ Resolverá: North Cape Norway (Ártico)
- **Total:** ~10 casos edge resueltos

**USA States (usa_states.topo.json):**
- ✅ Resolverá: New York, Miami, Seattle, Anchorage
- **Total:** 4 casos USA resueltos

**Proyección:** De 84.7% (72/85) → **98.8% (84/85)**

Solo quedará pendiente: Hong Kong (región administrativa especial) e Istanbul (frontera Europa-Asia).

---

## 🚀 Paso 2: Subir Datasets a Supabase Storage

### Opción A: Interfaz Web (Recomendado)

1. Ir a: https://supabase.com/dashboard/project/iwsuyrlrbmnbfyfkqowl/storage/buckets/geo

2. Subir archivos:
   - `assets/geo/admin0_10m.topo.json` → `admin0_10m.topo.json`
   - `assets/geo/admin1_10m.topo.json` → `admin1_10m.topo.json`
   - `assets/geo/usa_states.topo.json` → `usa_states.topo.json`

3. Verificar que sean públicos (checkbox "Public")

### Opción B: CLI (Requiere Service Key)

```bash
# Configurar service key
export SUPABASE_SERVICE_ROLE_KEY="tu-service-key-aqui"

# Ejecutar script de upload
chmod +x upload-to-storage.sh
./upload-to-storage.sh
```

---

## 🔧 Paso 3: Desplegar Edge Function Actualizado

El Edge Function ya está actualizado con:
- Fallback inteligente: 10m → 50m
- Validación especial para USA
- Mejor logging

```bash
# Desplegar
npx supabase functions deploy geo-lookup

# Verificar que funcione
curl -X POST 'https://iwsuyrlrbmnbfyfkqowl.supabase.co/functions/v1/geo-lookup' \
  -H 'Content-Type: application/json' \
  -d '{"lat": -34.9011, "lng": -56.1645}'

# Debería retornar: {"country_iso": "UY", ...}
```

---

## 🧪 Paso 4: Re-ejecutar Tests Globales

```bash
node test-geo-global.js
```

### Resultados Esperados

```
ANTES (50m):
✗ Montevideo, Uruguay        undefined
✗ New York, USA              undefined
✗ Miami, USA                 undefined
✗ Seattle, USA               undefined
✗ Anchorage, Alaska          undefined
✗ Marseille, France          undefined
✗ Copenhagen, Denmark        undefined
✗ Cape Town, South Africa    undefined
✗ Auckland, New Zealand      undefined
✗ North Cape, Norway         undefined
✗ Hong Kong                  undefined
✗ Istanbul, Turkey           undefined
✗ Montreal, Canada           undefined

Total: 72/85 (84.7%)
```

```
DESPUÉS (10m + USA):
✅ Montevideo, Uruguay        UY  (10m dataset)
✅ New York, USA              US  (USA states dataset)
✅ Miami, USA                 US  (USA states dataset)
✅ Seattle, USA               US  (USA states dataset)
✅ Anchorage, Alaska          US  (USA states dataset)
✅ Marseille, France          FR  (10m dataset)
✅ Copenhagen, Denmark        DK  (10m dataset)
✅ Cape Town, South Africa    ZA  (10m dataset)
✅ Auckland, New Zealand      NZ  (10m dataset)
✅ North Cape, Norway         NO  (10m dataset)
✅ Montreal, Canada           CA  (10m dataset)
✗ Hong Kong                  undefined  (región administrativa)
✗ Istanbul, Turkey           undefined  (frontera compleja)

Total: 83/85 (97.6%)
```

---

## 📊 Impacto en Performance

### Tamaños de Archivos

| Dataset | 50m | 10m | Incremento |
|---------|-----|-----|------------|
| Admin0 (países) | 128KB | 722KB | +462% |
| Admin1 (regiones) | 113KB | 2.1MB | +1759% |
| USA States | - | 17KB | Nuevo |

### Cold Start

- **Antes:** ~300ms (50m load)
- **Después (10m):** ~600-800ms (estimado)
- **Con fallback:** ~300-800ms (usa 50m si 10m falla)

### Estrategia de Mitigación

1. **Lazy Loading:** Solo cargar 10m si 50m falla (ya implementado)
2. **Cache Agresivo:** CloudFlare CDN cachea archivos TopoJSON
3. **Warm-up:** Primer request acepta latencia, luego está en cache

---

## 🎯 Casos Especiales Pendientes

### Hong Kong (2 casos restantes)

**Problema:** Hong Kong es región administrativa especial de China, no tiene ISO_A2 propio.

**Soluciones:**
1. Agregar regla manual: Si CN + bbox Hong Kong → retornar "HK"
2. Usar dataset específico de regiones administrativas especiales
3. Aceptar que retorne CN (técnicamente correcto)

### Istanbul, Turkey

**Problema:** Ciudad en la frontera Europa-Asia, geometrías complejas.

**Solución:** Usar dataset Natural Earth 10m con geometrías más precisas de Turquía.

---

## ✅ Checklist de Implementación

- [x] Descargar Natural Earth 10m (admin0 + admin1)
- [x] Descargar USA States dataset
- [x] Convertir a TopoJSON con simplificación
- [x] Actualizar Edge Function con fallback inteligente
- [ ] Subir datasets a Supabase Storage
- [ ] Desplegar Edge Function actualizado
- [ ] Re-ejecutar tests globales
- [ ] Validar mejora de accuracy (objetivo: 95-100%)
- [ ] Documentar casos restantes

---

## 🚀 Comandos Rápidos

```bash
# 1. Subir datasets (después de configurar SUPABASE_SERVICE_ROLE_KEY)
./upload-to-storage.sh

# 2. Desplegar function
npx supabase functions deploy geo-lookup

# 3. Probar casos específicos
curl -X POST 'https://iwsuyrlrbmnbfyfkqowl.supabase.co/functions/v1/geo-lookup' \
  -H 'Content-Type: application/json' \
  -d '{"lat": -34.9011, "lng": -56.1645}'  # Montevideo, Uruguay

# 4. Re-ejecutar suite completa
node test-geo-global.js
```

---

## 📈 Expectativa Final

| Métrica | Antes (50m) | Después (10m + USA) | Mejora |
|---------|-------------|---------------------|--------|
| Accuracy | 84.7% (72/85) | **97.6% (83/85)** | +12.9% |
| Tests Pasando | 72 | **83** | +11 casos |
| Sud América | 95.2% (20/21) | **100% (21/21)** | +1 caso |
| Norte América | 66.7% (8/12) | **100% (12/12)** | +4 casos |
| Europa | 86.4% (19/22) | **95.5% (21/22)** | +2 casos |
| África | 85.7% (6/7) | **100% (7/7)** | +1 caso |
| Oceanía | 85.7% (6/7) | **100% (7/7)** | +1 caso |
| Asia | 87.5% (14/16) | **93.8% (15/16)** | +1 caso |

**Casos pendientes:** Hong Kong (región administrativa), Istanbul (frontera compleja)

---

**Próximo Paso:** Subir los datasets a Supabase Storage y desplegar el Edge Function.
