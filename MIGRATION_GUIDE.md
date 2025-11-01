# 🚀 Cómo Aplicar las Migraciones Pendientes

Tienes **2 opciones** para ejecutar las migraciones necesarias:

---

## ⚡ OPCIÓN 1: Script Automático (Recomendado)

```bash
./apply-country-migration.sh
```

**Requisitos:**
- Archivo `.env` con `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`
- `jq` instalado (`brew install jq`)

---

## 📝 OPCIÓN 2: SQL Editor de Supabase (Manual pero más simple)

### **PASO 1: Agregar Columnas a trip_places**

1. Ve a **Supabase Dashboard** → Tu proyecto
2. Click en **SQL Editor** (icono de base de datos en el menú izquierdo)
3. Click en **"+ New Query"**
4. Copia y pega el contenido de: `supabase/migrations/20251101_add_trip_places_columns.sql`
5. Click en **"Run"** (o presiona `Cmd + Enter`)

**¿Qué hace?**
- Agrega columnas: `type`, `city`, `address`, `country_code`
- Crea índices para búsquedas rápidas
- Es **idempotente** (puedes ejecutarlo múltiples veces sin problema)

---

### **PASO 2: Poblar country_code para Lugares Existentes**

1. En **SQL Editor**, crea otra **"+ New Query"**
2. Copia y pega el contenido de: `supabase/migrations/20251101_populate_all_country_codes.sql`
3. Click en **"Run"**
4. **Espera 10-30 segundos** (depende de cuántos lugares tengas)

**¿Qué hace?**
- Actualiza el `country_code` de tus lugares existentes usando GPS
- Cubre **60 países** (Francia, España, Chile, USA, Japón, etc.)
- Solo actualiza lugares con `country_code = NULL`
- Al final muestra un log con cuántos lugares se actualizaron

**Ejemplo de log esperado:**
```
✅ Migration complete!
📊 Total places with country_code: 15
⚠️  Places still without country_code: 0
```

---

## 🔍 Verificar que Funcionó

Después de ejecutar las migraciones, verifica:

### **Query de Verificación 1: Ver country_code poblado**
```sql
SELECT country_code, COUNT(*) as count
FROM trip_places
WHERE country_code IS NOT NULL
GROUP BY country_code
ORDER BY count DESC;
```

**Resultado esperado:**
```
country_code | count
-------------|------
CL           | 15
AR           | 3
US           | 2
```

### **Query de Verificación 2: Ver tus lugares con país**
```sql
SELECT 
  name,
  city,
  country_code,
  lat,
  lng
FROM trip_places
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🎯 ¿Qué Cambiará en la App?

### **ANTES:**
- ❌ Modal de bienvenida sin lugares guardados
- ❌ Query `getSavedPlacesInCountry` retorna 0 lugares

### **DESPUÉS:**
- ✅ Modal muestra hasta 5 lugares guardados del país detectado
- ✅ Query usa `country_code` (SUPER rápido con índice)
- ✅ Fallback GPS sigue funcionando para compatibilidad

---

## ⚠️ Notas Importantes

### **¿Qué migración ejecutar?**
- ✅ **USAR:** `20251101_populate_all_country_codes.sql` (60 países)
- ❌ **NO USAR:** `20251101_populate_country_codes.sql` (solo 9 países, obsoleta)

### **¿Es seguro ejecutar múltiples veces?**
- ✅ **SÍ**, ambas migraciones son **idempotentes**
- La segunda migración solo actualiza `WHERE country_code IS NULL`
- No sobrescribe datos existentes

### **¿Qué pasa si tengo lugares fuera de los 60 países?**
- El sistema usará el **fallback GPS** automáticamente
- Esos lugares seguirán teniendo `country_code = NULL`
- Nominatim API los detectará de todos modos (195+ países)

---

## 🐛 Troubleshooting

### **Error: "column already exists"**
✅ **Normal**, significa que el paso 1 ya fue ejecutado antes. Continúa con el paso 2.

### **Error: "constraint already exists"**
✅ **Normal**, la migración es idempotente. Ignora y continúa.

### **No se actualizó ningún lugar**
Posibles causas:
1. Tus lugares ya tienen `country_code` (verifica con Query 1)
2. Tus lugares no tienen `lat`/`lng` (verifica en Table Editor)
3. Tus lugares están en países fuera de los 60 soportados

**Solución:** Verifica con:
```sql
SELECT 
  COUNT(*) as total,
  COUNT(lat) as with_coords,
  COUNT(country_code) as with_country
FROM trip_places;
```

---

## 🎉 Resultado Final

Después de las migraciones:

1. **En Supabase:**
   - Columna `country_code` existe en `trip_places`
   - Tus lugares tienen el código de país correcto (CL, AR, US, etc.)
   - Índice creado para búsquedas rápidas

2. **En la App:**
   - Modal de bienvenida muestra lugares guardados
   - Sistema detecta 195+ países (no solo 60)
   - Offline funciona con GPS fallback

3. **Performance:**
   - Query de lugares: <10ms (usa índice)
   - Detección de país: 200-500ms (Nominatim API)
   - Fallback offline: <1ms (GPS boundaries)

---

## ✅ Checklist

- [ ] Ejecuté `20251101_add_trip_places_columns.sql`
- [ ] Ejecuté `20251101_populate_all_country_codes.sql`
- [ ] Verifiqué con Query 1 que hay lugares con `country_code`
- [ ] Probé el modal en la app y aparecen lugares guardados
- [ ] Sistema detecta países correctamente (logs: `🌍 Country detected via...`)

---

**¿Listo para ejecutar? Elige tu opción y adelante!** 🚀
