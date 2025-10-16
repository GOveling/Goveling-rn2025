#!/bin/bash

# Script para reemplazar console.log/error/warn con logger en archivos específicos
# Uso: ./replace-console-logs.sh

echo "🔄 Reemplazando console.logs con logger..."

# Array de archivos a procesar
files=(
  "app/(tabs)/trips.tsx"
  "app/_layout.tsx"
  "src/lib/home.ts"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "📝 Procesando: $file"
    
    # Reemplazar console.log con logger.debug
    sed -i.bak 's/console\.log(/logger.debug(/g' "$file"
    
    # Reemplazar console.error con logger.error
    sed -i.bak 's/console\.error(/logger.error(/g' "$file"
    
    # Reemplazar console.warn con logger.warn
    sed -i.bak 's/console\.warn(/logger.warn(/g' "$file"
    
    # Reemplazar console.info con logger.info
    sed -i.bak 's/console\.info(/logger.info(/g' "$file"
    
    # Eliminar archivo backup
    rm -f "${file}.bak"
    
    echo "✅ Completado: $file"
  else
    echo "❌ No encontrado: $file"
  fi
done

echo ""
echo "🎉 Reemplazo completado para todos los archivos!"
echo ""
echo "📋 Archivos procesados:"
for file in "${files[@]}"; do
  count=$(grep -c "logger\." "$file" 2>/dev/null || echo "0")
  echo "  - $file: $count logger calls"
done
