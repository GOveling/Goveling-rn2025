#!/bin/bash
# Script simple para subir datasets a Supabase Storage usando curl

set -e

# Verificar que SUPABASE_SERVICE_ROLE_KEY esté configurado
if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ Error: SUPABASE_SERVICE_ROLE_KEY no está configurado"
    echo ""
    echo "Configúralo con:"
    echo "export SUPABASE_SERVICE_ROLE_KEY=\"tu-service-key\""
    exit 1
fi

SUPABASE_URL="https://iwsuyrlrbmnbfyfkqowl.supabase.co"
BUCKET="geo"

echo "🌍 Subiendo datasets actualizados a Supabase Storage"
echo "==========================================================="
echo ""

# Función para subir archivo
upload_file() {
    local LOCAL_FILE=$1
    local REMOTE_NAME=$2
    
    if [ ! -f "$LOCAL_FILE" ]; then
        echo "❌ Archivo no encontrado: $LOCAL_FILE"
        return 1
    fi
    
    local SIZE=$(du -h "$LOCAL_FILE" | cut -f1)
    echo "📤 Subiendo $REMOTE_NAME ($SIZE)..."
    
    # Usar upsert=true para sobrescribir si existe
    curl -X POST \
        "$SUPABASE_URL/storage/v1/object/$BUCKET/$REMOTE_NAME?upsert=true" \
        -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
        -H "Content-Type: application/json" \
        --data-binary @"$LOCAL_FILE" \
        -w "\nStatus: %{http_code}\n"
    
    echo ""
}

# Subir archivos
upload_file "assets/geo/admin0_10m.topo.json" "admin0_10m.topo.json"
upload_file "assets/geo/admin1_10m.topo.json" "admin1_10m.topo.json"
upload_file "assets/geo/usa_states.topo.json" "usa_states.topo.json"

echo "==========================================================="
echo "✅ Upload completado"
echo ""
echo "Próximo paso:"
echo "  npx supabase functions deploy geo-lookup"
echo ""
