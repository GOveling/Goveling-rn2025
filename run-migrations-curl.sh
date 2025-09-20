#!/bin/bash

# Script para ejecutar migraciones de Supabase usando curl
# Uso: ./run-migrations-curl.sh <SERVICE_ROLE_KEY>

SUPABASE_URL="https://iwsuyrlrbmnbfyfkqowl.supabase.co"
SERVICE_ROLE_KEY="$1"

if [ -z "$SERVICE_ROLE_KEY" ]; then
    echo "❌ Error: Se requiere la SERVICE_ROLE_KEY"
    echo "Uso: ./run-migrations-curl.sh <SERVICE_ROLE_KEY>"
    exit 1
fi

# Orden de las migraciones
migrations=(
    "20250918_p0_minimal.sql"
    "20250918_v141_base_consolidated.sql"
    "20250918_p1.sql"
    "20250918_p2_visits_stats.sql"
    "20250918_trips_pulido.sql"
    "20250918_trip_place_visits.sql"
    "20250918_directions_cache.sql"
    "20250918_route_cache_summary.sql"
    "20250918_email_otps.sql"
    "20250918_notifications_push.sql"
    "20250919_v142_storage_policies_triggers.sql"
    "20250919_v143_push_queue.sql"
    "20250919_v144_booking_clickouts.sql"
)

success_count=0
total_count=${#migrations[@]}

echo "🚀 Iniciando migraciones de Supabase..."
echo ""

for migration in "${migrations[@]}"; do
    migration_file="supabase/migrations/$migration"
    
    if [ ! -f "$migration_file" ]; then
        echo "⚠️  Archivo no encontrado: $migration"
        continue
    fi
    
    echo "🔄 Ejecutando: $migration"
    
    # Leer el archivo SQL y ejecutarlo
    sql_content=$(cat "$migration_file")
    
    response=$(curl -s -w "%{http_code}" -X POST \
        "$SUPABASE_URL/rest/v1/rpc/exec_sql" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
        -H "apikey: $SERVICE_ROLE_KEY" \
        -d "{\"sql\": $(echo "$sql_content" | jq -Rs .)}" \
        -o /tmp/migration_response.json)
    
    http_code="${response: -3}"
    
    if [ "$http_code" = "200" ]; then
        echo "✅ Completado: $migration"
        ((success_count++))
    else
        echo "❌ Error en $migration (HTTP $http_code)"
        if [ -f /tmp/migration_response.json ]; then
            echo "   Respuesta: $(cat /tmp/migration_response.json)"
        fi
    fi
    
    # Pausa entre migraciones
    sleep 2
done

echo ""
echo "📊 Resumen:"
echo "✅ Exitosas: $success_count/$total_count"
echo "❌ Fallaron: $((total_count - success_count))/$total_count"

if [ $success_count -eq $total_count ]; then
    echo ""
    echo "🎉 ¡Todas las migraciones se ejecutaron correctamente!"
    echo "Tu base de datos de Supabase está lista para producción."
else
    echo ""
    echo "⚠️  Algunas migraciones fallaron. Revisa los errores arriba."
fi
