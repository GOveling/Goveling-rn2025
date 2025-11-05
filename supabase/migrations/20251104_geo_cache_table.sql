-- ============================================================================
-- Migración: Sistema de Detección Geográfica - Tabla de Cache
-- ============================================================================
-- Descripción: Crea la tabla geo_cache para almacenar resultados de
--              Point-in-Polygon con TTL de 30 días por defecto.
-- Autor: Sistema Geo-Lookup
-- Fecha: 2025-11-04
-- ============================================================================

-- Crear tabla de cache geográfico
create table if not exists public.geo_cache (
  geokey text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  ttl_seconds int not null default 2592000, -- 30 días
  expires_at timestamptz not null
);

-- Índice para limpieza de expirados (permite queries eficientes)
create index if not exists geo_cache_expires_at_idx 
  on public.geo_cache(expires_at);

-- Índice para búsqueda por geokey (ya existe como PK, pero explícito)
-- No es necesario crear índice adicional porque PK ya es índice

-- Habilitar Row Level Security
alter table public.geo_cache enable row level security;

-- Policy: Permitir lectura a todos (authenticated y anon)
-- La Edge Function usa service role que bypasea RLS de todas formas
drop policy if exists "Allow public read access" on public.geo_cache;
create policy "Allow public read access" 
  on public.geo_cache
  for select 
  using (true);

-- Policy: Permitir insert/update solo a autenticados
-- Service role bypasea esto, pero es buena práctica
drop policy if exists "Allow authenticated write" on public.geo_cache;
create policy "Allow authenticated write" 
  on public.geo_cache
  for all 
  using (auth.role() = 'authenticated' or auth.role() = 'service_role');

-- Comentarios para documentación
comment on table public.geo_cache is 
  'Cache de detección geográfica (países/regiones) por geohash';

comment on column public.geo_cache.geokey is 
  'Geohash precision 5 (~4.9km²) prefixed con "geo:gh:5:"';

comment on column public.geo_cache.value is 
  'Resultado JSON: {country_iso?: string, region_code?: string, offshore?: boolean}';

comment on column public.geo_cache.ttl_seconds is 
  'TTL en segundos (default 30 días = 2592000s)';

comment on column public.geo_cache.expires_at is 
  'Timestamp de expiración calculado automáticamente via trigger';

-- ============================================================================
-- Trigger: Calcular expires_at automáticamente
-- ============================================================================

create or replace function public.set_geo_cache_expires_at()
returns trigger
language plpgsql
as $$
begin
  new.expires_at := new.updated_at + (new.ttl_seconds || ' seconds')::interval;
  return new;
end;
$$;

create trigger set_expires_at_on_geo_cache
  before insert or update on public.geo_cache
  for each row
  execute function public.set_geo_cache_expires_at();

-- ============================================================================
-- Función de mantenimiento: Limpiar cache expirado
-- ============================================================================

create or replace function public.clean_expired_geo_cache()
returns table(deleted_count bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  count_deleted bigint;
begin
  delete from public.geo_cache 
  where expires_at < now();
  
  get diagnostics count_deleted = row_count;
  
  return query select count_deleted;
end;
$$;

comment on function public.clean_expired_geo_cache is 
  'Limpia entradas de cache expiradas. Retorna número de filas eliminadas. Ejecutar diariamente con pg_cron o manualmente.';

-- ============================================================================
-- Verificación
-- ============================================================================

-- Verificar que la tabla existe
do $$
begin
  if exists (
    select 1 from information_schema.tables 
    where table_schema = 'public' 
    and table_name = 'geo_cache'
  ) then
    raise notice '✅ Tabla geo_cache creada correctamente';
  else
    raise exception '❌ Error: Tabla geo_cache no fue creada';
  end if;
end $$;

-- Mostrar estructura de la tabla
select 
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public' 
  and table_name = 'geo_cache'
order by ordinal_position;
