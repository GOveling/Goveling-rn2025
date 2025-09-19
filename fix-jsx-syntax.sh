#!/bin/bash

# Script para arreglar problemas críticos de sintaxis JSX
echo "🔧 Arreglando problemas críticos de sintaxis JSX..."

# Lista de archivos con problemas más comunes
files=(
  "app/trips/[id]/index.tsx"
  "app/explore/place.tsx"
  "app/explore/review-edit.tsx"
  "app/explore/reviews.tsx"
  "app/profile/documents.tsx"
  "app/profile/achievements.tsx"
  "app/profile/index.tsx"
  "app/booking/flights/index.tsx"
  "app/booking/hotels/index.tsx"
  "app/booking/esim/index.tsx"
)

# Función para arreglar sintaxis básica
fix_jsx_syntax() {
    local file="$1"
    echo "Arreglando: $file"
    
    # Arreglar style={{ f{t('...')} gap:12 }} → style={{ flex:1, padding:16, gap:12 }}
    sed -i '' 's/style={{ f{t([^}]*)} \([^}]*\)}}/style={{ flex:1, padding:16, \1 }}/g' "$file"
    
    # Arreglar style{{ -> style={{
    sed -i '' 's/style{{/style={{/g' "$file"
    
    # Arreglar borderRadius{t('...')} -> borderRadius:8 }}
    sed -i '' 's/borderRadius{t([^}]*)}[^}]*/borderRadius:8 }}/g' "$file"
    
    # Arreglar backgroundColor:'#007aff', pad{t('...')} -> backgroundColor:'#007aff', padding:8
    sed -i '' 's/pad{t([^}]*)}[^,]*/padding:8/g' "$file"
    
    echo "✅ $file arreglado"
}

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        fix_jsx_syntax "$file"
    fi
done

echo "🎉 Problemas críticos de sintaxis arreglados!"
echo "📋 Recuerda revisar manualmente los archivos para confirmar los cambios."
