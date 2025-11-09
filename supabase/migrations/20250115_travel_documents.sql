-- =============================================
-- Travel Documents Database Migration
-- Phase 1.3: Tables, RLS, and Functions
-- =============================================

-- Tabla principal: travel_documents
-- Almacena metadata no sensible y referencias a datos encriptados
CREATE TABLE IF NOT EXISTS travel_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Metadata no sensible (no encriptada)
  document_type TEXT NOT NULL CHECK (document_type IN (
    'passport',
    'visa',
    'id_card',
    'drivers_license',
    'insurance',
    'vaccination',
    'tickets',
    'reservation',
    'other'
  )),
  
  -- Fechas para validación y alertas
  expiry_date TIMESTAMPTZ,
  
  -- Estado del documento (calculado)
  status TEXT NOT NULL DEFAULT 'valid' CHECK (status IN (
    'valid',
    'warning',    -- 30 días o menos para expirar
    'critical',   -- 7 días o menos para expirar
    'expired'
  )),
  
  -- Flags de almacenamiento
  storage_mode TEXT NOT NULL DEFAULT 'online' CHECK (storage_mode IN ('online', 'offline')),
  has_image BOOLEAN DEFAULT FALSE,
  
  -- Datos encriptados (doble capa)
  -- Encriptados con clave primaria (derivada del PIN)
  encrypted_data_primary TEXT NOT NULL,
  primary_iv TEXT NOT NULL,
  primary_auth_tag TEXT NOT NULL,
  
  -- Encriptados con clave de recuperación (derivada del userID)
  encrypted_data_recovery TEXT NOT NULL,
  recovery_iv TEXT NOT NULL,
  recovery_auth_tag TEXT NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMPTZ,
  
  -- Índices para búsquedas rápidas
  CONSTRAINT unique_user_document UNIQUE (user_id, id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_travel_documents_user_id ON travel_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_travel_documents_status ON travel_documents(status);
CREATE INDEX IF NOT EXISTS idx_travel_documents_expiry ON travel_documents(expiry_date);
CREATE INDEX IF NOT EXISTS idx_travel_documents_type ON travel_documents(document_type);

-- =============================================
-- Tabla: recovery_codes
-- Códigos de recuperación enviados por email
-- =============================================
CREATE TABLE IF NOT EXISTS recovery_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Código de 6 dígitos (hasheado)
  code_hash TEXT NOT NULL,
  
  -- Estado del código
  is_used BOOLEAN DEFAULT FALSE,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  
  -- Expiración (15 minutos)
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  used_at TIMESTAMPTZ,
  
  -- Email donde se envió
  sent_to_email TEXT NOT NULL,
  
  CONSTRAINT unique_active_code UNIQUE (user_id, is_used)
);

CREATE INDEX IF NOT EXISTS idx_recovery_codes_user_id ON recovery_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_recovery_codes_expires ON recovery_codes(expires_at);

-- =============================================
-- Tabla: document_access_logs
-- Auditoría de accesos a documentos
-- =============================================
CREATE TABLE IF NOT EXISTS document_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES travel_documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  access_type TEXT NOT NULL CHECK (access_type IN ('primary_key', 'recovery_key', 'view', 'edit')),
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Info adicional
  ip_address TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_access_logs_document ON document_access_logs(document_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_user ON document_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_date ON document_access_logs(accessed_at);

-- =============================================
-- Row Level Security (RLS) Policies
-- =============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE travel_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_access_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para travel_documents
CREATE POLICY "Users can view own documents"
  ON travel_documents
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents"
  ON travel_documents
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents"
  ON travel_documents
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents"
  ON travel_documents
  FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para recovery_codes
CREATE POLICY "Users can view own recovery codes"
  ON recovery_codes
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recovery codes"
  ON recovery_codes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recovery codes"
  ON recovery_codes
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Políticas para document_access_logs
CREATE POLICY "Users can view own access logs"
  ON document_access_logs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert access logs"
  ON document_access_logs
  FOR INSERT
  WITH CHECK (true); -- Edge functions usan service role

-- =============================================
-- Función: Actualizar updated_at automáticamente
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para travel_documents
CREATE TRIGGER update_travel_documents_updated_at
  BEFORE UPDATE ON travel_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- Función: Calcular status del documento
-- =============================================
CREATE OR REPLACE FUNCTION calculate_document_status(expiry_date TIMESTAMPTZ)
RETURNS TEXT AS $$
DECLARE
  days_until_expiry INTEGER;
BEGIN
  IF expiry_date IS NULL THEN
    RETURN 'valid';
  END IF;
  
  days_until_expiry := EXTRACT(DAY FROM (expiry_date - NOW()));
  
  IF days_until_expiry < 0 THEN
    RETURN 'expired';
  ELSIF days_until_expiry <= 7 THEN
    RETURN 'critical';
  ELSIF days_until_expiry <= 30 THEN
    RETURN 'warning';
  ELSE
    RETURN 'valid';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar status automáticamente
CREATE OR REPLACE FUNCTION update_document_status()
RETURNS TRIGGER AS $$
BEGIN
  NEW.status := calculate_document_status(NEW.expiry_date);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_status_on_insert_or_update
  BEFORE INSERT OR UPDATE OF expiry_date ON travel_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_document_status();

-- =============================================
-- Función: Limpiar códigos de recuperación expirados
-- =============================================
CREATE OR REPLACE FUNCTION cleanup_expired_recovery_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM recovery_codes
  WHERE expires_at < NOW() AND is_used = FALSE;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- CRON Job: Ejecutar limpieza cada hora
-- (requiere extensión pg_cron si está disponible)
-- =============================================
-- Si Supabase tiene pg_cron habilitado:
-- SELECT cron.schedule('cleanup-recovery-codes', '0 * * * *', 'SELECT cleanup_expired_recovery_codes()');

-- Alternativa: Llamar manualmente desde Edge Function o cliente

-- =============================================
-- Función RPC: Obtener documentos del usuario
-- =============================================
CREATE OR REPLACE FUNCTION get_user_documents(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  document_type TEXT,
  expiry_date TIMESTAMPTZ,
  status TEXT,
  storage_mode TEXT,
  has_image BOOLEAN,
  encrypted_data_primary TEXT,
  primary_iv TEXT,
  primary_auth_tag TEXT,
  encrypted_data_recovery TEXT,
  recovery_iv TEXT,
  recovery_auth_tag TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.document_type,
    d.expiry_date,
    d.status,
    d.storage_mode,
    d.has_image,
    d.encrypted_data_primary,
    d.primary_iv,
    d.primary_auth_tag,
    d.encrypted_data_recovery,
    d.recovery_iv,
    d.recovery_auth_tag,
    d.created_at,
    d.updated_at,
    d.synced_at
  FROM travel_documents d
  WHERE d.user_id = p_user_id
  ORDER BY d.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Función RPC: Validar código de recuperación
-- =============================================
CREATE OR REPLACE FUNCTION validate_recovery_code(
  p_user_id UUID,
  p_code_hash TEXT
)
RETURNS TABLE (
  is_valid BOOLEAN,
  code_id UUID,
  attempts_remaining INTEGER,
  error_message TEXT
) AS $$
DECLARE
  v_code recovery_codes;
BEGIN
  -- Buscar código activo más reciente
  SELECT * INTO v_code
  FROM recovery_codes
  WHERE user_id = p_user_id
    AND is_used = FALSE
    AND expires_at > NOW()
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- No existe código activo
  IF v_code IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 0, 'No active recovery code found'::TEXT;
    RETURN;
  END IF;
  
  -- Verificar intentos
  IF v_code.attempts >= v_code.max_attempts THEN
    RETURN QUERY SELECT FALSE, v_code.id, 0, 'Maximum attempts reached'::TEXT;
    RETURN;
  END IF;
  
  -- Incrementar intentos
  UPDATE recovery_codes
  SET attempts = attempts + 1
  WHERE id = v_code.id;
  
  -- Validar código
  IF v_code.code_hash = p_code_hash THEN
    -- Código correcto: marcar como usado
    UPDATE recovery_codes
    SET is_used = TRUE, used_at = NOW()
    WHERE id = v_code.id;
    
    RETURN QUERY SELECT TRUE, v_code.id, 0, NULL::TEXT;
  ELSE
    -- Código incorrecto
    RETURN QUERY SELECT 
      FALSE, 
      v_code.id, 
      (v_code.max_attempts - v_code.attempts - 1), 
      'Invalid code'::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Comentarios finales
-- =============================================
COMMENT ON TABLE travel_documents IS 'Almacena documentos de viaje con encriptación dual (primary + recovery keys)';
COMMENT ON TABLE recovery_codes IS 'Códigos de recuperación temporales enviados por email (15min expiry)';
COMMENT ON TABLE document_access_logs IS 'Auditoría de accesos a documentos sensibles';

COMMENT ON COLUMN travel_documents.encrypted_data_primary IS 'Datos encriptados con clave derivada del PIN del usuario';
COMMENT ON COLUMN travel_documents.encrypted_data_recovery IS 'Datos encriptados con clave derivada del userID (para recovery)';
COMMENT ON COLUMN travel_documents.status IS 'Estado del documento: valid, warning (30d), critical (7d), expired';
