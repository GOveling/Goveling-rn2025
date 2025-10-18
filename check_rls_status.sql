-- Script para verificar el estado de RLS en todas las tablas
-- Ejecuta esto en el SQL Editor de Supabase Dashboard
-- https://supabase.com/dashboard/project/iwsuyrlrbmnbfyfkqowl/sql/new

-- 1. Ver todas las tablas y su estado de RLS
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '✅ ENABLED'
        ELSE '❌ DISABLED'
    END as status
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. Ver políticas RLS existentes
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 3. Tablas críticas que DEBEN tener RLS habilitado
SELECT 
    tablename,
    CASE 
        WHEN rowsecurity THEN '✅ RLS Habilitado'
        ELSE '⚠️ RLS DESHABILITADO - CRÍTICO'
    END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles',
    'trips',
    'trip_collaborators',
    'trip_invitations',
    'trip_places',
    'trip_accommodations',
    'bookings',
    'notifications'
  )
ORDER BY tablename;

-- 4. Si necesitas HABILITAR RLS en todas las tablas públicas (CUIDADO: ejecutar solo si es necesario)
-- DESCOMENTA Y EJECUTA SOLO SI LAS TABLAS NO TIENEN RLS:
/*
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        AND tablename NOT LIKE 'pg_%'
        AND tablename NOT LIKE 'sql_%'
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
        RAISE NOTICE 'RLS habilitado en tabla: %', r.tablename;
    END LOOP;
END $$;
*/
