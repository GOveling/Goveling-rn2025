-- 🧹 Script para limpiar países visitados incorrectos (falsos positivos)
-- Ejecutar con precaución después de revisar los datos

-- =============================================================================
-- PASO 1: IDENTIFICAR POSIBLES FALSOS POSITIVOS
-- =============================================================================

-- 1.1. Ver todas las visitas con coordenadas y distancias entre ellas
-- Esto ayuda a identificar "saltos" imposibles o muy cortos
WITH country_visits_with_next AS (
  SELECT 
    cv.*,
    LEAD(cv.country_code) OVER (PARTITION BY cv.user_id ORDER BY cv.entry_date) as next_country,
    LEAD(cv.country_name) OVER (PARTITION BY cv.user_id ORDER BY cv.entry_date) as next_country_name,
    LEAD(cv.latitude) OVER (PARTITION BY cv.user_id ORDER BY cv.entry_date) as next_lat,
    LEAD(cv.longitude) OVER (PARTITION BY cv.user_id ORDER BY cv.entry_date) as next_lng,
    LEAD(cv.entry_date) OVER (PARTITION BY cv.user_id ORDER BY cv.entry_date) as next_entry_date
  FROM country_visits cv
)
SELECT 
  user_id,
  country_code,
  country_name,
  entry_date,
  next_country,
  next_country_name,
  next_entry_date,
  -- Calcular tiempo entre visitas (en minutos)
  EXTRACT(EPOCH FROM (next_entry_date - entry_date)) / 60 as minutes_between_visits,
  latitude,
  longitude,
  next_lat,
  next_lng
FROM country_visits_with_next
WHERE next_country IS NOT NULL
ORDER BY user_id, entry_date DESC;

-- 1.2. Identificar visitas con tiempo muy corto (<30 min) entre países diferentes
SELECT 
  cv1.user_id,
  cv1.country_name as from_country,
  cv2.country_name as to_country,
  cv1.entry_date as first_visit,
  cv2.entry_date as second_visit,
  EXTRACT(EPOCH FROM (cv2.entry_date - cv1.entry_date)) / 60 as minutes_apart,
  cv1.latitude as lat1,
  cv1.longitude as lng1,
  cv2.latitude as lat2,
  cv2.longitude as lng2
FROM country_visits cv1
JOIN country_visits cv2 ON cv1.user_id = cv2.user_id
WHERE cv2.entry_date > cv1.entry_date
  AND cv1.country_code != cv2.country_code
  AND EXTRACT(EPOCH FROM (cv2.entry_date - cv1.entry_date)) / 60 < 30  -- Menos de 30 minutos
ORDER BY cv1.user_id, cv1.entry_date DESC;

-- 1.3. Ver visitas de un usuario específico (reemplazar USER_ID)
SELECT 
  country_code,
  country_name,
  entry_date,
  latitude,
  longitude,
  is_return,
  previous_country_code,
  places_count
FROM country_visits
WHERE user_id = 'USER_ID'  -- ⚠️ REEMPLAZAR CON USER_ID REAL
ORDER BY entry_date DESC;

-- =============================================================================
-- PASO 2: ELIMINAR VISITAS INCORRECTAS IDENTIFICADAS
-- =============================================================================

-- ⚠️ ADVERTENCIA: Estos comandos DELETE son PERMANENTES. 
-- Verificar primero con los SELECTs de arriba.

-- 2.1. Eliminar una visita específica (ej: Argentina falsa para info@goveling.com)
-- Primero obtener el user_id:
SELECT id, email FROM auth.users WHERE email = 'info@goveling.com';

-- Luego eliminar la visita incorrecta:
/*
DELETE FROM country_visits 
WHERE user_id = 'USER_ID_AQUI'  -- Reemplazar con ID real
  AND country_code = 'AR'
  AND entry_date::date = '2025-11-03';  -- Ajustar fecha si es necesario
*/

-- 2.2. Eliminar todas las visitas con tiempo <30 min entre países diferentes
-- (USAR CON CUIDADO - Puede eliminar visitas legítimas en aeropuertos)
/*
WITH suspicious_visits AS (
  SELECT cv2.id
  FROM country_visits cv1
  JOIN country_visits cv2 ON cv1.user_id = cv2.user_id
  WHERE cv2.entry_date > cv1.entry_date
    AND cv1.country_code != cv2.country_code
    AND EXTRACT(EPOCH FROM (cv2.entry_date - cv1.entry_date)) / 60 < 30
)
DELETE FROM country_visits
WHERE id IN (SELECT id FROM suspicious_visits);
*/

-- 2.3. Eliminar visitas sin coordenadas (muy antiguas o con errores)
/*
DELETE FROM country_visits 
WHERE latitude IS NULL 
  OR longitude IS NULL
  OR latitude = ''
  OR longitude = '';
*/

-- =============================================================================
-- PASO 3: RECALCULAR ESTADÍSTICAS DESPUÉS DE LIMPIAR
-- =============================================================================

-- 3.1. Recalcular countries_count para todos los usuarios
UPDATE travel_stats ts
SET countries_count = (
  SELECT COUNT(DISTINCT country_code)
  FROM country_visits cv
  WHERE cv.user_id = ts.user_id
)
WHERE EXISTS (
  SELECT 1 FROM country_visits WHERE user_id = ts.user_id
);

-- 3.2. Verificar que las estadísticas sean correctas
SELECT 
  u.email,
  ts.countries_count as stats_count,
  (SELECT COUNT(DISTINCT country_code) FROM country_visits WHERE user_id = u.id) as actual_count
FROM auth.users u
JOIN travel_stats ts ON ts.user_id = u.id
WHERE ts.countries_count != (
  SELECT COUNT(DISTINCT country_code) 
  FROM country_visits 
  WHERE user_id = u.id
);

-- =============================================================================
-- PASO 4: AGREGAR COLUMNAS SI NO EXISTEN (Para migration)
-- =============================================================================

-- 4.1. Verificar si latitude/longitude existen
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'country_visits' 
  AND column_name IN ('latitude', 'longitude');

-- 4.2. Agregar columnas si no existen
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'country_visits' AND column_name = 'latitude'
  ) THEN
    ALTER TABLE country_visits ADD COLUMN latitude TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'country_visits' AND column_name = 'longitude'
  ) THEN
    ALTER TABLE country_visits ADD COLUMN longitude TEXT;
  END IF;
END $$;

-- =============================================================================
-- UTILIDADES ADICIONALES
-- =============================================================================

-- Ver resumen de países por usuario
SELECT 
  u.email,
  COUNT(DISTINCT cv.country_code) as unique_countries,
  COUNT(*) as total_visits,
  STRING_AGG(DISTINCT cv.country_name, ', ' ORDER BY cv.country_name) as countries_visited
FROM auth.users u
LEFT JOIN country_visits cv ON cv.user_id = u.id
GROUP BY u.id, u.email
ORDER BY unique_countries DESC;

-- Ver países más visitados
SELECT 
  country_code,
  country_name,
  COUNT(*) as visit_count,
  COUNT(DISTINCT user_id) as unique_visitors
FROM country_visits
GROUP BY country_code, country_name
ORDER BY visit_count DESC;

-- Ver usuarios con visitas sospechosas (muchos países en poco tiempo)
SELECT 
  user_id,
  COUNT(DISTINCT country_code) as countries,
  MIN(entry_date) as first_visit,
  MAX(entry_date) as last_visit,
  EXTRACT(DAY FROM (MAX(entry_date) - MIN(entry_date))) as days_span
FROM country_visits
GROUP BY user_id
HAVING COUNT(DISTINCT country_code) > 3
  AND EXTRACT(DAY FROM (MAX(entry_date) - MIN(entry_date))) < 1
ORDER BY countries DESC;
