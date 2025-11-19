#!/bin/bash

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=================================================${NC}"
echo -e "${YELLOW}Aplicando migración: Social Feed (MIS POST + GOVELING SOCIAL)${NC}"
echo -e "${YELLOW}=================================================${NC}"
echo ""

# Variables de Supabase
SUPABASE_URL="https://iwsuyrlrbmnbfyfkqowl.supabase.co"
SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3c3V5cmxyYm1uYmZ5Zmtxb3dsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNzI4MzY2OSwiZXhwIjoyMDQyODU5NjY5fQ.lzRTsGUXy4lRy7Y4tEKnhCMtKOH6gFN7gY6iGWwfWHI"

# Leer el archivo SQL
SQL_FILE="supabase/migrations/social_my_posts_and_dynamic_feed.sql"

if [ ! -f "$SQL_FILE" ]; then
  echo -e "${RED}❌ Error: No se encuentra el archivo $SQL_FILE${NC}"
  exit 1
fi

echo -e "${GREEN}📄 Leyendo migración...${NC}"
SQL_CONTENT=$(cat "$SQL_FILE")

echo -e "${GREEN}🚀 Ejecutando migración en Supabase...${NC}"
echo ""

# Ejecutar la migración usando la API de Supabase
RESPONSE=$(curl -s -X POST \
  "${SUPABASE_URL}/rest/v1/rpc/exec_sql" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": $(echo "$SQL_CONTENT" | jq -Rs .)}")

# Verificar si hubo error
if echo "$RESPONSE" | grep -q "error"; then
  echo -e "${RED}❌ Error al ejecutar migración:${NC}"
  echo "$RESPONSE" | jq .
  exit 1
fi

echo -e "${GREEN}✅ Migración aplicada exitosamente!${NC}"
echo ""
echo -e "${GREEN}Funciones creadas:${NC}"
echo "  ✓ get_my_posts() - Para sección MIS POST"
echo "  ✓ get_dynamic_social_feed() - Para sección GOVELING SOCIAL"
echo "  ✓ get_nearby_posts() - Auxiliar: posts cercanos"
echo "  ✓ get_my_trips_posts() - Auxiliar: posts de mis trips"
echo "  ✓ get_following_posts() - Auxiliar: posts de seguidos"
echo "  ✓ get_global_random_posts() - Auxiliar: posts globales"
echo ""
echo -e "${YELLOW}=================================================${NC}"
echo -e "${GREEN}🎉 Listo para implementar las secciones en el frontend${NC}"
echo -e "${YELLOW}=================================================${NC}"
