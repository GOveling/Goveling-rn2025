#!/bin/bash

# Script para desplegar la función pexels-country-photos
# Uso: ./deploy-pexels-function.sh

set -e

echo "🚀 Desplegando función pexels-country-photos..."

# Configurar el access token
export SUPABASE_ACCESS_TOKEN=sbp_457b13bbe793ef1c117726faabce557a31549978

# Desplegar la función
supabase functions deploy pexels-country-photos \
  --project-ref iwsuyrlrbmnbfyfkqowl \
  --no-verify-jwt

echo "✅ Función desplegada exitosamente!"
echo "📊 Ver dashboard: https://supabase.com/dashboard/project/iwsuyrlrbmnbfyfkqowl/functions"
