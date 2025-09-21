#!/bin/bash

# Script para ejecutar migraciones de Supabase via SQL Editor
# Copia y pega estos comandos en el SQL Editor de Supabase Dashboard

echo "🚀 Para ejecutar las migraciones en Supabase:"
echo ""
echo "1. Ve a: https://supabase.com/dashboard/project/iwsuyrlrbmnbfyfkqowl"
echo "2. Navega a: SQL Editor"
echo "3. Ejecuta estos archivos EN ORDEN:"
echo ""

migrations=(
    "20250918_p0_minimal.sql"
    "20250918_p1.sql"
    "20250918_v141_base_consolidated.sql"
    "20250918_p2_visits_stats.sql"
    "20250918_trips_pulido.sql"
    "20250918_directions_cache.sql"
    "20250918_route_cache_summary.sql"
    "20250918_trip_place_visits.sql"
    "20250918_email_otps.sql"
    "20250918_notifications_push.sql"
    "20250919_v142_storage_policies_triggers.sql"
    "20250919_v143_push_queue.sql"
    "20250919_v144_booking_clickouts.sql"
    "20250920030659_curly_lagoon.sql"
    "20250920031232_teal_boat.sql"
    "20250920031239_tiny_meadow.sql"
    "20250920031244_teal_coast.sql"
    "20250920031511_silver_shadow.sql"
    "20250920031518_nameless_resonance.sql"
)

count=1
for migration in "${migrations[@]}"; do
    migration_file="supabase/migrations/$migration"
    
    if [ -f "$migration_file" ]; then
        echo "📄 $count. $migration"
        echo "   Archivo: $migration_file"
        echo ""
    else
        echo "⚠️  $count. $migration - ARCHIVO NO ENCONTRADO"
        echo ""
    fi
    ((count++))
done

echo ""
echo "💡 INSTRUCCIONES:"
echo "1. Abre cada archivo de migración en VS Code"
echo "2. Copia el contenido SQL completo"
echo "3. Pégalo en el SQL Editor de Supabase"
echo "4. Ejecuta (Run)"
echo "5. Repite para el siguiente archivo EN ORDEN"
echo ""
echo "🎯 Una vez completadas las 19 migraciones:"
echo "   - Tu base de datos estará 100% lista"
echo "   - Todas las tablas y políticas RLS estarán configuradas"
echo "   - Las Edge Functions podrán ejecutarse correctamente"
