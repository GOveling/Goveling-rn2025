-- Verificar que todos los campos necesarios existen en trip_invitations
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'trip_invitations' 
  AND column_name IN ('accepted_at', 'accepted_by', 'updated_at', 'status', 'created_at')
ORDER BY column_name;

-- Verificar estructura de notifications_inbox
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'notifications_inbox'
ORDER BY column_name;