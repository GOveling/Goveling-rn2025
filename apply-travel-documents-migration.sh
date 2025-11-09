#!/bin/bash

# =============================================
# Apply Travel Documents Migration
# =============================================

echo "🚀 Aplicando migración de Travel Documents..."

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar que existan las variables de entorno
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo -e "${RED}❌ Error: Variables SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY deben estar definidas${NC}"
  echo "Ejemplo:"
  echo "export SUPABASE_URL='https://xxxxx.supabase.co'"
  echo "export SUPABASE_SERVICE_ROLE_KEY='eyJhbGc...'"
  exit 1
fi

# Leer el archivo SQL
MIGRATION_FILE="supabase/migrations/20250115_travel_documents.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
  echo -e "${RED}❌ Error: No se encontró el archivo $MIGRATION_FILE${NC}"
  exit 1
fi

echo -e "${YELLOW}📄 Leyendo migración desde: $MIGRATION_FILE${NC}"

# Ejecutar la migración usando la API REST de Supabase
# Nota: Esto requiere tener acceso al dashboard o usar Supabase CLI
echo -e "${YELLOW}⚙️  Ejecutando migración...${NC}"

# Opción 1: Usar psql directamente si tienes las credenciales
# psql "$DATABASE_URL" < "$MIGRATION_FILE"

# Opción 2: Usar Supabase CLI (recomendado)
if command -v supabase &> /dev/null; then
  echo -e "${GREEN}✓ Supabase CLI detectado${NC}"
  supabase db push
  echo -e "${GREEN}✓ Migración aplicada exitosamente${NC}"
else
  echo -e "${YELLOW}⚠️  Supabase CLI no encontrado${NC}"
  echo -e "${YELLOW}📝 Por favor, aplica manualmente el archivo SQL en el dashboard de Supabase:${NC}"
  echo -e "   1. Ve a: $SUPABASE_URL/project/_/sql/new"
  echo -e "   2. Copia el contenido de: $MIGRATION_FILE"
  echo -e "   3. Ejecuta el SQL"
  echo ""
  echo -e "${YELLOW}O instala Supabase CLI:${NC}"
  echo -e "   npm install -g supabase"
  echo -e "   supabase login"
  echo -e "   supabase link --project-ref YOUR_PROJECT_REF"
  echo -e "   supabase db push"
fi

echo ""
echo -e "${GREEN}✅ Script completado${NC}"
