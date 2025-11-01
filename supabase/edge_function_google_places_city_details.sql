-- ========================================================================
-- EDGE FUNCTION: google-places-city-details
-- ========================================================================
-- 
-- IMPORTANTE: Esta NO es una función SQL, es una Edge Function de Supabase.
-- NO se puede ejecutar en SQL Editor.
-- 
-- Para desplegar esta Edge Function, debes usar Supabase CLI:
-- 
--   1. Asegúrate de tener Supabase CLI instalado:
--      npm install -g supabase
-- 
--   2. Login a Supabase:
--      supabase login
-- 
--   3. Despliega la función:
--      supabase functions deploy google-places-city-details \
--        --project-ref qhllumcjsovhpzfbdqap \
--        --no-verify-jwt
-- 
--   4. Configura el API key (si no existe):
--      supabase secrets set GOOGLE_PLACES_API_KEY=tu_api_key \
--        --project-ref qhllumcjsovhpzfbdqap
-- 
-- ========================================================================
-- 
-- El código de la Edge Function está en:
-- supabase/functions/google-places-city-details/index.ts
-- 
-- ========================================================================

-- NO EJECUTES ESTE ARCHIVO EN SQL EDITOR
-- Es solo documentación de cómo desplegar la Edge Function

SELECT 'Edge Functions NO se pueden desplegar via SQL Editor' as error,
       'Usa: ./deploy-city-details-function.sh' as solucion;
