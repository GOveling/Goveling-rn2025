#!/bin/bash

# Script para aplicar la migración de política UPDATE para post_images
# Permite a los usuarios reordenar sus propias fotos

set -e

echo "🚀 Aplicando migración: post_images UPDATE policy..."

# Obtener el project ref y URL de Supabase
PROJECT_REF=$(grep 'EXPO_PUBLIC_SUPABASE_URL' .env | cut -d '=' -f2 | sed 's|https://||' | sed 's|.supabase.co||')
SUPABASE_URL=$(grep 'EXPO_PUBLIC_SUPABASE_URL' .env | cut -d '=' -f2)
SERVICE_ROLE_KEY=$(grep 'SUPABASE_SERVICE_ROLE_KEY' .env | cut -d '=' -f2)

if [ -z "$PROJECT_REF" ] || [ -z "$SUPABASE_URL" ] || [ -z "$SERVICE_ROLE_KEY" ]; then
  echo "❌ Error: No se pudieron cargar las variables de entorno desde .env"
  exit 1
fi

echo "📍 Project: $PROJECT_REF"
echo "🔗 URL: $SUPABASE_URL"

# Aplicar la migración usando curl
echo ""
echo "📝 Ejecutando SQL..."

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "$SUPABASE_URL/rest/v1/rpc/exec_sql" \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d @- << EOF
{
  "query": "$(cat supabase/migrations/20251120_add_post_images_update_policy.sql | sed 's/"/\\"/g' | tr '\n' ' ')"
}
EOF
)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
  echo "✅ Migración aplicada exitosamente"
  echo ""
  echo "🎉 Política de UPDATE agregada a post_images"
  echo "   Los usuarios ahora pueden reordenar sus fotos"
else
  echo "❌ Error al aplicar migración (HTTP $HTTP_CODE)"
  echo "Respuesta: $BODY"
  exit 1
fi
