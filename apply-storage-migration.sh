#!/bin/bash

# Script para aplicar la migración de Storage para Travel Documents
# Este script crea el bucket y las políticas de seguridad

echo "🚀 Aplicando migración de Storage para Travel Documents..."

# Cargar variables de entorno
source .env 2>/dev/null || echo "⚠️  No se encontró archivo .env"

# Verificar que existan las variables necesarias
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ Error: Variables SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY requeridas"
    echo "Por favor configúralas en tu archivo .env"
    exit 1
fi

# Ejecutar la migración
psql "$DATABASE_URL" < supabase/migrations/20250115_travel_documents_storage.sql

if [ $? -eq 0 ]; then
    echo "✅ Migración de Storage aplicada correctamente"
    echo ""
    echo "📦 Bucket creado: travel-documents"
    echo "🔒 Políticas de seguridad aplicadas"
    echo ""
    echo "Siguiente paso:"
    echo "1. Verifica en Supabase Dashboard > Storage que el bucket exista"
    echo "2. Prueba subir un documento desde la app"
else
    echo "❌ Error al aplicar la migración"
    exit 1
fi
