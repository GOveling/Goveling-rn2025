#!/bin/bash

# Script para desplegar la Edge Function de recuperación de PIN
# Usage: ./deploy-recovery-email-function.sh

echo "🚀 Desplegando Edge Function: send-recovery-email"
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI no está instalado"
    echo "📦 Instala con: npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI encontrado"
echo ""

# Check if logged in
if ! supabase projects list &> /dev/null; then
    echo "⚠️  No estás autenticado en Supabase"
    echo "🔐 Ejecuta: supabase login"
    exit 1
fi

echo "✅ Autenticado en Supabase"
echo ""

# Deploy the function
echo "📤 Desplegando función..."
supabase functions deploy send-recovery-email --no-verify-jwt

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Edge Function desplegada exitosamente!"
    echo ""
    echo "📋 Próximos pasos:"
    echo "1. Configura RESEND_API_KEY en Supabase Dashboard"
    echo "   → Settings → Edge Functions → Environment Variables"
    echo ""
    echo "2. Obtén tu API key de Resend:"
    echo "   → https://resend.com/api-keys"
    echo ""
    echo "3. Prueba la función desde la app"
    echo ""
else
    echo ""
    echo "❌ Error al desplegar la función"
    echo "💡 Verifica tu conexión y proyecto de Supabase"
    exit 1
fi
