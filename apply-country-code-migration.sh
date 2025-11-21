#!/bin/bash

# Script to apply country_code migration to global_places table
# This fixes the "column gp.country_code does not exist" error

echo "🚀 Aplicando migración de country_code a global_places..."

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI no está instalado"
    echo "Instala con: npm install -g supabase"
    exit 1
fi

# Apply the migration
supabase db push --db-url "$SUPABASE_DB_URL" \
  --file supabase/migrations/20231119_add_country_code_to_global_places.sql

if [ $? -eq 0 ]; then
    echo "✅ Migración aplicada exitosamente"
    echo ""
    echo "Ahora la tabla global_places tiene la columna country_code"
    echo "Puedes volver a intentar abrir el perfil de usuario"
else
    echo "❌ Error aplicando la migración"
    exit 1
fi
