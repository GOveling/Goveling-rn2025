#!/bin/bash

# Script para desplegar la Edge Function de direcciones optimizada
# Incluye OSRM gratuito como primera opción y ORS como fallback

echo "🚀 Deploying Optimized Directions Edge Function"
echo "================================================"
echo ""
echo "Changes in this version:"
echo "✅ OSRM (free, unlimited) as primary routing service"
echo "✅ ORS (paid) as fallback only"
echo "✅ Cache increased to 1 hour (from 10 minutes)"
echo "✅ Source tracking (osrm vs ors)"
echo "✅ Coordenadas decodificadas (coords field)"
echo ""
echo "Expected savings:"
echo "💰 95%+ reduction in ORS API calls"
echo "⚡ Faster responses with extended cache"
echo "🎯 Zero config - works without ORS API key"
echo ""
read -p "Press Enter to deploy or Ctrl+C to cancel..."
echo ""

# Deploy the function
echo "📦 Deploying function..."
supabase functions deploy directions

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment successful!"
    echo ""
    echo "📊 Next steps:"
    echo "1. Test the function: ./test-directions.sh"
    echo "2. Monitor logs: supabase functions logs directions"
    echo "3. Check Supabase dashboard for usage stats"
    echo ""
    echo "🔍 Look for these log patterns:"
    echo "   '🆓 Trying OSRM (free)' - Using free service"
    echo "   '⚠️ OSRM failed, falling back to ORS' - Using paid service"
    echo "   '✅ Cache hit' - Serving from cache (best case)"
    echo ""
else
    echo ""
    echo "❌ Deployment failed!"
    echo "Check your Supabase CLI setup and try again."
    exit 1
fi
