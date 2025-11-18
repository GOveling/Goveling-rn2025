-- VERIFICACIÓN Y CONFIGURACIÓN FINAL
-- Ejecutar en SQL Editor de Supabase

-- 1. Verificar si la tabla places_search_cache existe
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'places_search_cache';

-- Si la consulta anterior NO devuelve resultados, ejecuta la siguiente migración:

/*
-- ============================================================================
-- MIGRACIÓN: places_search_cache (Solo si la tabla NO existe)
-- ============================================================================

CREATE TABLE IF NOT EXISTS places_search_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key TEXT NOT NULL UNIQUE,
  search_params JSONB NOT NULL,
  results JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  hit_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_places_cache_key ON places_search_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_places_cache_expires ON places_search_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_places_cache_hit_count ON places_search_cache(hit_count DESC);
CREATE INDEX IF NOT EXISTS idx_places_cache_key_expires ON places_search_cache(cache_key, expires_at);

ALTER TABLE places_search_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read valid cache"
  ON places_search_cache FOR SELECT
  USING (expires_at > NOW());

CREATE POLICY "Service role can insert cache"
  ON places_search_cache FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update cache"
  ON places_search_cache FOR UPDATE
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can delete cache"
  ON places_search_cache FOR DELETE
  USING (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION increment_cache_hit(p_cache_key TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE places_search_cache
  SET hit_count = hit_count + 1, last_accessed_at = NOW()
  WHERE cache_key = p_cache_key AND expires_at > NOW();
END;
$$;

CREATE OR REPLACE FUNCTION clean_expired_cache()
RETURNS TABLE(deleted_count BIGINT) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_deleted_count BIGINT;
BEGIN
  DELETE FROM places_search_cache WHERE expires_at < NOW();
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN QUERY SELECT v_deleted_count;
END;
$$;

CREATE OR REPLACE FUNCTION get_cache_stats()
RETURNS TABLE(
  total_entries BIGINT,
  total_hits BIGINT,
  avg_hits_per_entry NUMERIC,
  most_popular_searches JSONB
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT,
    SUM(hit_count)::BIGINT,
    AVG(hit_count)::NUMERIC,
    (SELECT jsonb_agg(jsonb_build_object('search_params', search_params, 'hit_count', hit_count, 'created_at', created_at))
     FROM (SELECT search_params, hit_count, created_at FROM places_search_cache 
           WHERE expires_at > NOW() ORDER BY hit_count DESC LIMIT 10) top_searches)
  FROM places_search_cache WHERE expires_at > NOW();
END;
$$;
*/
