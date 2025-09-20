#!/bin/bash

# Script para aplicar migraciones usando la API REST de Supabase
echo "🚀 Aplicando migraciones a Supabase..."

API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3c3V5cmxyYm1uYmZ5Zmtxb3dsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyNjM4NTcsImV4cCI6MjA3MzgzOTg1N30.qC14nN1H4JcsubN31he9Y9VUWa3Dl1sDY28iAyKcIPg"
BASE_URL="https://iwsuyrlrbmnbfyfkqowl.supabase.co"

echo "📋 Aplicando migración base..."

# Aplicar la migración principal usando el endpoint de SQL
SQL_CONTENT=$(cat supabase/migrations/20250918_v141_base_consolidated.sql)

curl -X POST "${BASE_URL}/rest/v1/rpc/exec_sql" \
  -H "apikey: ${API_KEY}" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"sql\":\"$(echo "$SQL_CONTENT" | sed 's/"/\\"/g' | tr '\n' ' ')\"}"

echo ""
echo "✅ Migraciones aplicadas!"
echo "🔗 Verifica en: https://supabase.com/dashboard/project/iwsuyrlrbmnbfyfkqowl"
