#!/bin/bash

# Script simplificado para desplegar Edge Function sin autenticación previa
# El token se pasará directamente en el comando

PROJECT_REF="iwsuyrlrbmnbfyfkqowl"
FUNCTION_NAME="send-recovery-email"

echo "🚀 Desplegando Edge Function: ${FUNCTION_NAME}"
echo "📦 Proyecto: ${PROJECT_REF}"
echo ""

# Verificar que Supabase CLI esté instalado
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI no está instalado"
    echo "📦 Instala con: npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI encontrado"
echo ""

# Intentar desplegar usando el proyecto directamente
echo "📤 Desplegando función..."
echo ""

# Usar npx para asegurar versión correcta
npx supabase functions deploy ${FUNCTION_NAME} \
  --project-ref ${PROJECT_REF} \
  --no-verify-jwt

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Edge Function desplegada exitosamente!"
    echo ""
    echo "📋 Configuración necesaria:"
    echo "1. Ve a: https://supabase.com/dashboard/project/${PROJECT_REF}/settings/functions"
    echo "2. Agrega variable de entorno: RESEND_API_KEY"
    echo "3. Obtén tu API key en: https://resend.com/api-keys"
    echo ""
    echo "💡 Para testing en desarrollo (sin RESEND_API_KEY):"
    echo "   El código se retornará en la respuesta del Edge Function"
    echo ""
else
    echo ""
    echo "❌ Error al desplegar la función"
    echo ""
    echo "🔧 Alternativa: Deploy manual desde Dashboard"
    echo "1. Ve a: https://supabase.com/dashboard/project/${PROJECT_REF}/functions"
    echo "2. Crea nueva función: ${FUNCTION_NAME}"
    echo "3. Copia el contenido de: supabase/functions/${FUNCTION_NAME}/index.ts"
    echo ""
    exit 1
fi
