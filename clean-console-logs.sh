#!/bin/bash

# 🧹 Script para Limpiar Console.log Statements
# Mantiene console.warn y console.error

set -e

echo "🧹 ============================================"
echo "   Limpieza de Console.log Statements"
echo "============================================"
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

show_step() {
    echo -e "${BLUE}📍 $1${NC}"
}

show_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

show_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Contar console.log antes
show_step "Contando console.log statements..."
before=$(npm run lint 2>&1 | grep "console" | grep -v "console.warn\|console.error" | wc -l | tr -d ' ')
echo "📊 Console.log encontrados: $before"
echo ""

show_warning "Este script eliminará líneas que contengan SOLO console.log()"
show_warning "NO afectará console.warn() ni console.error()"
echo ""

read -p "¿Continuar? (s/n): " confirm
if [ "$confirm" != "s" ]; then
    show_warning "Operación cancelada"
    exit 0
fi

echo ""
show_step "Eliminando console.log statements..."

# Buscar archivos TypeScript/JavaScript
files=$(find app src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) 2>/dev/null)

count=0
for file in $files; do
    # Eliminar líneas que contienen SOLO console.log (no warn/error)
    # Usando sed de manera compatible con macOS
    if grep -q "console\.log" "$file" 2>/dev/null; then
        # Verificar que no sea console.warn o console.error
        if ! grep "console\.log" "$file" | grep -q "console\.warn\|console\.error"; then
            sed -i '' '/[^a-zA-Z]console\.log/d' "$file"
            count=$((count + 1))
        fi
    fi
done

show_success "Procesados $count archivos"
echo ""

# Verificar reducción
show_step "Verificando resultados..."
after=$(npm run lint 2>&1 | grep "console" | grep -v "console.warn\|console.error" | wc -l | tr -d ' ')
echo "📊 Console.log restantes: $after"
eliminated=$((before - after))
echo "📉 Eliminados: $eliminated"
echo ""

if [ $after -lt $before ]; then
    show_success "¡Limpieza exitosa!"
else
    show_warning "No se eliminaron console.log. Verifica manualmente."
fi

echo ""
echo "🎉 ============================================"
echo "   Proceso completado"
echo "============================================"
echo ""
echo "Siguiente paso:"
echo "  git diff  # Revisar cambios"
echo "  git add . && git commit -m 'chore: remove console.log statements'"
echo ""
