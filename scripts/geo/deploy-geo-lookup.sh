#!/bin/bash

echo "🚀 Desplegando Edge Function: geo-lookup"
echo "========================================"
echo ""

# Configurar access token
export SUPABASE_ACCESS_TOKEN=sbp_457b13bbe793ef1c117726faabce557a31549978

# Verificar que existan los archivos necesarios
if [ ! -f "supabase/functions/geo-lookup/index.ts" ]; then
  echo "❌ Error: supabase/functions/geo-lookup/index.ts no existe"
  exit 1
fi

if [ ! -f "supabase/functions/_shared/cache.ts" ]; then
  echo "❌ Error: supabase/functions/_shared/cache.ts no existe"
  exit 1
fi

if [ ! -f "supabase/functions/_shared/geohash.ts" ]; then
  echo "❌ Error: supabase/functions/_shared/geohash.ts no existe"
  exit 1
fi

echo "✅ Archivos de función encontrados"
echo ""

# Desplegar Edge Function con --no-verify-jwt
echo "📤 Desplegando función..."
supabase functions deploy geo-lookup \
  --project-ref iwsuyrlrbmnbfyfkqowl \
  --no-verify-jwt

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Función desplegada exitosamente"
  echo ""
  echo "📍 URL de la función:"
  echo "   https://iwsuyrlrbmnbfyfkqowl.supabase.co/functions/v1/geo-lookup"
  echo ""
  echo "📋 Próximo paso: Subir archivos TopoJSON a Storage"
  echo "   1. Ve a Supabase Dashboard → Storage"
  echo "   2. Crea bucket 'geo' (público)"
  echo "   3. Sube admin0.topo.json y admin1.topo.json desde assets/geo/"
  echo ""
  echo "🧪 Luego ejecuta: npx tsx scripts/geo/test-geo-lookup.ts"
else
  echo ""
  echo "❌ Error al desplegar función"
  exit 1
fi
