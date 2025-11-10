#!/bin/bash

# =============================================
# Script para desplegar request-pin-recovery
# =============================================

echo "📦 Desplegando Edge Function: request-pin-recovery"
echo "Proyecto: iwsuyrlrbmnbfyfkqowl"
echo ""
echo "✨ Mejoras incluidas:"
echo "   - Email desde seguridad@team.goveling.com"
echo "   - Template HTML profesional y responsive"
echo "   - Compatible con modo desarrollo y producción"
echo ""

# Cambiar al directorio del proyecto
cd /Users/sebastianaraos/Desktop/Goveling-rn2025

# Desplegar la función
echo "🚀 Desplegando función..."
supabase functions deploy request-pin-recovery --project-ref iwsuyrlrbmnbfyfkqowl

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Despliegue completado exitosamente"
  echo ""
  echo "� Próximos pasos:"
  echo "1. Configura RESEND_API_KEY en Supabase (si no lo has hecho)"
  echo "   https://supabase.com/dashboard/project/iwsuyrlrbmnbfyfkqowl/settings/functions"
  echo ""
  echo "2. Verifica el despliegue:"
  echo "   https://supabase.com/dashboard/project/iwsuyrlrbmnbfyfkqowl/functions/request-pin-recovery"
  echo ""
  echo "3. Prueba la función:"
  echo "   node test-pin-recovery.js"
  echo ""
else
  echo ""
  echo "❌ Error en el despliegue"
  echo "Verifica que tengas configurado el access token de Supabase"
  echo ""
  echo "💡 Alternativa: Despliega manualmente desde el Dashboard"
  echo "   https://supabase.com/dashboard/project/iwsuyrlrbmnbfyfkqowl/functions"
  echo ""
fi
