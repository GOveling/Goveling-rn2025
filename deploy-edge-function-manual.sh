#!/bin/bash

# ========================================================================
# DESPLIEGUE MANUAL DE EDGE FUNCTION VIA CURL
# ========================================================================
# 
# IMPORTANTE: Las Edge Functions NO se pueden desplegar via SQL Editor.
# Este script usa el Management API de Supabase para desplegar la función.
# 
# ========================================================================

echo "⚠️  IMPORTANTE: Las Edge Functions NO se despliegan via SQL Editor"
echo ""
echo "📋 Tienes 2 opciones para desplegar:"
echo ""
echo "OPCIÓN 1: Supabase CLI (RECOMENDADO)"
echo "────────────────────────────────────"
echo "  1. Instala CLI (si no lo tienes):"
echo "     npm install -g supabase"
echo ""
echo "  2. Login:"
echo "     supabase login"
echo ""
echo "  3. Despliega:"
echo "     ./deploy-city-details-function.sh"
echo ""
echo "OPCIÓN 2: Supabase Dashboard (Manual)"
echo "──────────────────────────────────────"
echo "  1. Ve a: https://supabase.com/dashboard/project/qhllumcjsovhpzfbdqap/functions"
echo ""
echo "  2. Click en 'New Function'"
echo ""
echo "  3. Nombre: google-places-city-details"
echo ""
echo "  4. Copia el código de:"
echo "     supabase/functions/google-places-city-details/index.ts"
echo ""
echo "  5. Click en 'Deploy'"
echo ""
echo "  6. Configura el secret GOOGLE_PLACES_API_KEY:"
echo "     - Ve a Project Settings > Edge Functions > Secrets"
echo "     - Agrega: GOOGLE_PLACES_API_KEY = tu_api_key"
echo ""
echo "════════════════════════════════════════════════════════════════════"
echo ""

# Preguntar qué opción prefiere
read -p "¿Deseas ver las instrucciones completas? (y/n): " answer

if [[ "$answer" == "y" || "$answer" == "Y" ]]; then
    echo ""
    echo "📝 CONTENIDO DE LA EDGE FUNCTION:"
    echo "════════════════════════════════════════════════════════════════════"
    echo ""
    cat supabase/functions/google-places-city-details/index.ts
    echo ""
    echo "════════════════════════════════════════════════════════════════════"
    echo ""
    echo "✅ Copia este código y pégalo en Supabase Dashboard"
    echo "   URL: https://supabase.com/dashboard/project/qhllumcjsovhpzfbdqap/functions"
fi

echo ""
echo "💡 TIP: Si tienes Supabase CLI instalado, es más fácil:"
echo "   ./deploy-city-details-function.sh"
echo ""
