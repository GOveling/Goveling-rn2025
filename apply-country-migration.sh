#!/bin/bash

# ============================================================================
# Script para aplicar migración de country_code a trip_places
# ============================================================================
# Este script ejecuta SOLO las migraciones necesarias para el sistema de
# detección de países global.
# ============================================================================

set -e  # Exit on error

echo "🌍 Aplicando migraciones para sistema global de países..."
echo ""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar que exista el archivo de configuración
if [ ! -f .env ]; then
    echo -e "${RED}❌ Error: No se encuentra el archivo .env${NC}"
    echo "Crea un archivo .env con tu SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY"
    exit 1
fi

# Cargar variables de entorno
source .env

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo -e "${RED}❌ Error: Falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env${NC}"
    exit 1
fi

echo -e "${YELLOW}📍 Usando Supabase URL: ${SUPABASE_URL}${NC}"
echo ""

# Función para ejecutar SQL
execute_sql() {
    local sql_file=$1
    local description=$2
    
    echo -e "${YELLOW}📄 Ejecutando: ${description}${NC}"
    echo "   Archivo: ${sql_file}"
    
    if [ ! -f "$sql_file" ]; then
        echo -e "${RED}   ❌ Archivo no encontrado${NC}"
        return 1
    fi
    
    response=$(curl -s -w "\n%{http_code}" -X POST \
        "${SUPABASE_URL}/rest/v1/rpc/exec_sql" \
        -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
        -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
        -H "Content-Type: application/json" \
        --data-binary @- << EOF
{
  "query": $(cat "$sql_file" | jq -Rs .)
}
EOF
    )
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" -eq 200 ] || [ "$http_code" -eq 201 ] || [ "$http_code" -eq 204 ]; then
        echo -e "${GREEN}   ✅ Migración aplicada correctamente${NC}"
        echo ""
        return 0
    else
        echo -e "${RED}   ❌ Error HTTP ${http_code}${NC}"
        echo "   Response: ${body}"
        echo ""
        return 1
    fi
}

# ============================================================================
# MIGRACIÓN 1: Agregar columnas a trip_places
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 PASO 1: Agregar columnas (type, city, address, country_code)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if execute_sql "supabase/migrations/20251101_add_trip_places_columns.sql" \
    "Agregar columnas a trip_places"; then
    echo -e "${GREEN}✅ Columnas agregadas correctamente${NC}"
else
    echo -e "${YELLOW}⚠️  Es posible que las columnas ya existan (esto es normal)${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 PASO 2: Poblar country_code para 60 países"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${YELLOW}⏳ Esto puede tomar 10-30 segundos dependiendo de tus datos...${NC}"
echo ""

if execute_sql "supabase/migrations/20251101_populate_all_country_codes.sql" \
    "Poblar country_code para lugares existentes"; then
    echo -e "${GREEN}✅ Datos poblados correctamente${NC}"
else
    echo -e "${RED}❌ Error al poblar datos${NC}"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ ¡MIGRACIONES COMPLETADAS!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Ahora puedes verificar en Supabase:"
echo "   1. Ve a Table Editor → trip_places"
echo "   2. Verifica que existe la columna 'country_code'"
echo "   3. Revisa que tus lugares tienen el country_code correcto"
echo ""
echo "🔍 Query de verificación:"
echo "   SELECT country_code, COUNT(*) as count"
echo "   FROM trip_places"
echo "   WHERE country_code IS NOT NULL"
echo "   GROUP BY country_code"
echo "   ORDER BY count DESC;"
echo ""
echo -e "${GREEN}🎉 El modal de bienvenida ahora mostrará lugares guardados!${NC}"
