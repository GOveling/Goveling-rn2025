# 🔧 Fix para Sistema de Ciudades

## Problema 1: Error en Base de Datos
**Error**: `column "updated_at" of relation "travel_stats" does not exist`

### Solución: Ejecutar esta migración en Supabase SQL Editor

1. Ve a: https://supabase.com/dashboard/project/iwsuyrlrbmnbfyfkqowl/sql
2. Copia y pega el siguiente SQL:

```sql
-- Ejecutar en Supabase SQL Editor

-- Ver el contenido del archivo:
-- supabase/migrations/20251101000000_city_visits.sql

-- O copiar directamente desde el archivo creado
```

---

## Problema 2: Error en Edge Function
**Error**: `FunctionsHttpError: Edge Function returned a non-2xx status code`

### Diagnóstico:

El error indica que la Edge Function está devolviendo un código no-2xx (probablemente 400, 403, 404 o 500).

### Posibles Causas:

1. **API Key no configurada** en la Edge Function
2. **Formato incorrecto** en la llamada a Google Places API
3. **Cuota excedida** de Google Places API
4. **Ciudad no encontrada** en Google Places

### Solución: Revisar logs

Accede al dashboard de Supabase:
https://supabase.com/dashboard/project/iwsuyrlrbmnbfyfkqowl/functions/google-places-city-details

Busca el log más reciente que muestra el error exacto.

---

## Pasos Inmediatos:

### 1. Aplicar Migración SQL

```bash
# Opción A: Copiar contenido del archivo
cat supabase/migrations/20251101000000_city_visits.sql
```

Luego ejecutar en: https://supabase.com/dashboard/project/iwsuyrlrbmnbfyfkqowl/sql

### 2. Verificar Edge Function

Ir a Dashboard → Functions → google-places-city-details → Logs

Buscar el error específico de Google Places API.

---

## Workaround Temporal:

Mientras se arregla la Edge Function, el sistema funcionará con datos básicos (sin enriquecimiento):

- ✅ Modal de ciudad aparece
- ✅ Nombre, estado, país mostrados
- ❌ Sin descripción editorial
- ❌ Sin timezone
- ❌ Sin población

El sistema tiene **fallback gracioso** - no crashea, solo muestra info básica.

