-- =====================================================
-- Migration: Trip Messages System (Optimized)
-- Date: 2025-11-02
-- Description: Sistema de chat grupal para viajes con
--              optimizaciones de escalabilidad y rendimiento
-- =====================================================

-- ============================================================
-- 1. TABLA PRINCIPAL: trip_messages
-- ============================================================
CREATE TABLE IF NOT EXISTS public.trip_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'location', 'system')),
  
  -- Metadata para mensajes multimedia (futuro)
  media_url TEXT,
  media_thumbnail_url TEXT,
  media_size_bytes INTEGER,
  
  -- Geolocalización para mensajes de ubicación
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  
  -- Mensajes del sistema (ej: "Usuario X se unió al viaje")
  is_system_message BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Soft delete (para mantener historial)
  deleted_at TIMESTAMPTZ,
  
  -- Metadatos adicionales
  metadata JSONB DEFAULT '{}'::jsonb
);

-- ============================================================
-- 2. TABLA: trip_message_reads (tracking de lectura)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.trip_message_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.trip_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Evitar duplicados
  UNIQUE(message_id, user_id)
);

-- ============================================================
-- 3. ÍNDICES DE RENDIMIENTO
-- ============================================================

-- Índice principal: Consultas filtradas por trip_id
CREATE INDEX IF NOT EXISTS idx_trip_messages_trip_id 
ON public.trip_messages(trip_id) 
WHERE deleted_at IS NULL;

-- Índice para ordenamiento cronológico inverso (paginación)
CREATE INDEX IF NOT EXISTS idx_trip_messages_created_at_desc 
ON public.trip_messages(trip_id, created_at DESC) 
WHERE deleted_at IS NULL;

-- Índice para mensajes de un usuario específico
CREATE INDEX IF NOT EXISTS idx_trip_messages_user_id 
ON public.trip_messages(user_id) 
WHERE deleted_at IS NULL;

-- Índice compuesto para paginación eficiente
CREATE INDEX IF NOT EXISTS idx_trip_messages_trip_created 
ON public.trip_messages(trip_id, created_at DESC, id) 
WHERE deleted_at IS NULL;

-- Índices para trip_message_reads
CREATE INDEX IF NOT EXISTS idx_message_reads_user_trip 
ON public.trip_message_reads(user_id, trip_id);

CREATE INDEX IF NOT EXISTS idx_message_reads_message_id 
ON public.trip_message_reads(message_id);

-- ============================================================
-- 4. TRIGGER: Auto-actualización de updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_trip_messages_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_trip_messages_timestamp
BEFORE UPDATE ON public.trip_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_trip_messages_timestamp();

-- ============================================================
-- 5. FUNCIÓN: Verificar membresía de trip (helper)
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_trip_member(
  p_user_id UUID,
  p_trip_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Verificar si es dueño
  IF EXISTS (
    SELECT 1 FROM public.trips 
    WHERE id = p_trip_id AND owner_id = p_user_id
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Verificar si es colaborador
  IF EXISTS (
    SELECT 1 FROM public.trip_collaborators 
    WHERE trip_id = p_trip_id AND user_id = p_user_id
  ) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

-- Activar RLS
ALTER TABLE public.trip_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_message_reads ENABLE ROW LEVEL SECURITY;

-- Política de LECTURA (SELECT) para trip_messages
-- Solo pueden leer miembros del viaje
DROP POLICY IF EXISTS trip_messages_select_policy ON public.trip_messages;
CREATE POLICY trip_messages_select_policy
ON public.trip_messages
FOR SELECT
USING (
  deleted_at IS NULL 
  AND public.is_trip_member(auth.uid(), trip_id)
);

-- Política de CREACIÓN (INSERT) para trip_messages
-- Solo miembros pueden crear mensajes
-- El user_id debe coincidir con el usuario autenticado
DROP POLICY IF EXISTS trip_messages_insert_policy ON public.trip_messages;
CREATE POLICY trip_messages_insert_policy
ON public.trip_messages
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND public.is_trip_member(auth.uid(), trip_id)
);

-- Política de ACTUALIZACIÓN (UPDATE) para trip_messages
-- Solo el autor puede editar su propio mensaje (dentro de 15 minutos)
DROP POLICY IF EXISTS trip_messages_update_policy ON public.trip_messages;
CREATE POLICY trip_messages_update_policy
ON public.trip_messages
FOR UPDATE
USING (
  auth.uid() = user_id 
  AND deleted_at IS NULL
  AND (NOW() - created_at) < INTERVAL '15 minutes'
)
WITH CHECK (
  auth.uid() = user_id
);

-- Política de ELIMINACIÓN (DELETE - soft delete)
-- Solo el autor puede "eliminar" su mensaje
DROP POLICY IF EXISTS trip_messages_delete_policy ON public.trip_messages;
CREATE POLICY trip_messages_delete_policy
ON public.trip_messages
FOR UPDATE
USING (
  auth.uid() = user_id 
  AND deleted_at IS NULL
)
WITH CHECK (
  deleted_at IS NOT NULL
);

-- Políticas para trip_message_reads
DROP POLICY IF EXISTS trip_message_reads_select_policy ON public.trip_message_reads;
CREATE POLICY trip_message_reads_select_policy
ON public.trip_message_reads
FOR SELECT
USING (
  auth.uid() = user_id 
  OR public.is_trip_member(auth.uid(), trip_id)
);

DROP POLICY IF EXISTS trip_message_reads_insert_policy ON public.trip_message_reads;
CREATE POLICY trip_message_reads_insert_policy
ON public.trip_message_reads
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND public.is_trip_member(auth.uid(), trip_id)
);

-- ============================================================
-- 7. FUNCIÓN RPC: Obtener mensajes con perfiles (paginado)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_trip_messages_paginated(
  p_trip_id UUID,
  p_limit INTEGER DEFAULT 30,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  trip_id UUID,
  user_id UUID,
  message TEXT,
  message_type TEXT,
  media_url TEXT,
  media_thumbnail_url TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  is_system_message BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  user_full_name TEXT,
  user_avatar_url TEXT,
  user_email TEXT
) AS $$
BEGIN
  -- Verificar membresía
  IF NOT public.is_trip_member(auth.uid(), p_trip_id) THEN
    RAISE EXCEPTION 'No tienes permiso para ver estos mensajes';
  END IF;

  RETURN QUERY
  SELECT 
    m.id,
    m.trip_id,
    m.user_id,
    m.message,
    m.message_type,
    m.media_url,
    m.media_thumbnail_url,
    m.latitude,
    m.longitude,
    m.is_system_message,
    m.created_at,
    m.updated_at,
    COALESCE(p.full_name, p.email, 'Usuario') AS user_full_name,
    p.avatar_url AS user_avatar_url,
    p.email AS user_email
  FROM public.trip_messages m
  LEFT JOIN public.profiles p ON p.id = m.user_id
  WHERE 
    m.trip_id = p_trip_id 
    AND m.deleted_at IS NULL
  ORDER BY m.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================
-- 8. FUNCIÓN RPC: Obtener perfiles de usuarios en batch
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_trip_members_profiles(
  p_trip_id UUID
)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  avatar_url TEXT,
  email TEXT
) AS $$
BEGIN
  -- Verificar membresía
  IF NOT public.is_trip_member(auth.uid(), p_trip_id) THEN
    RAISE EXCEPTION 'No tienes permiso para ver estos perfiles';
  END IF;

  RETURN QUERY
  SELECT DISTINCT
    p.id,
    p.full_name,
    p.avatar_url,
    p.email
  FROM public.profiles p
  WHERE p.id IN (
    -- Dueño del trip
    SELECT owner_id FROM public.trips WHERE id = p_trip_id
    UNION
    -- Colaboradores
    SELECT user_id FROM public.trip_collaborators WHERE trip_id = p_trip_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================
-- 9. FUNCIÓN RPC: Obtener contador de mensajes no leídos
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_unread_messages_count(
  p_trip_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Verificar membresía
  IF NOT public.is_trip_member(auth.uid(), p_trip_id) THEN
    RETURN 0;
  END IF;

  SELECT COUNT(*)::INTEGER INTO v_count
  FROM public.trip_messages m
  WHERE 
    m.trip_id = p_trip_id
    AND m.deleted_at IS NULL
    AND m.user_id != auth.uid() -- No contar mis propios mensajes
    AND NOT EXISTS (
      SELECT 1 
      FROM public.trip_message_reads r 
      WHERE r.message_id = m.id AND r.user_id = auth.uid()
    );

  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================
-- 10. FUNCIÓN RPC: Marcar mensajes como leídos (batch)
-- ============================================================
CREATE OR REPLACE FUNCTION public.mark_messages_as_read(
  p_trip_id UUID,
  p_message_ids UUID[] DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_inserted INTEGER := 0;
BEGIN
  -- Verificar membresía
  IF NOT public.is_trip_member(auth.uid(), p_trip_id) THEN
    RAISE EXCEPTION 'No tienes permiso para realizar esta acción';
  END IF;

  -- Si no se especifican IDs, marcar todos como leídos
  IF p_message_ids IS NULL THEN
    INSERT INTO public.trip_message_reads (message_id, user_id, trip_id)
    SELECT m.id, auth.uid(), p_trip_id
    FROM public.trip_messages m
    WHERE 
      m.trip_id = p_trip_id
      AND m.deleted_at IS NULL
      AND m.user_id != auth.uid()
      AND NOT EXISTS (
        SELECT 1 
        FROM public.trip_message_reads r 
        WHERE r.message_id = m.id AND r.user_id = auth.uid()
      )
    ON CONFLICT (message_id, user_id) DO NOTHING;
  ELSE
    -- Marcar solo los mensajes especificados
    INSERT INTO public.trip_message_reads (message_id, user_id, trip_id)
    SELECT unnest(p_message_ids), auth.uid(), p_trip_id
    ON CONFLICT (message_id, user_id) DO NOTHING;
  END IF;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 11. ACTIVAR REALTIME (Change Data Capture)
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_message_reads;

-- ============================================================
-- 12. COMENTARIOS DE DOCUMENTACIÓN
-- ============================================================
COMMENT ON TABLE public.trip_messages IS 'Mensajes de chat grupal para viajes. Soporta texto, imágenes, ubicaciones y mensajes del sistema.';
COMMENT ON TABLE public.trip_message_reads IS 'Tracking de mensajes leídos por usuario para sistema de badges y notificaciones.';
COMMENT ON FUNCTION public.get_trip_messages_paginated IS 'Obtiene mensajes paginados con perfiles de usuarios en una sola consulta optimizada.';
COMMENT ON FUNCTION public.get_unread_messages_count IS 'Cuenta mensajes no leídos para mostrar badge de notificaciones.';
COMMENT ON FUNCTION public.mark_messages_as_read IS 'Marca mensajes como leídos en batch para optimizar rendimiento.';

-- ============================================================
-- FIN DE MIGRACIÓN
-- ============================================================
