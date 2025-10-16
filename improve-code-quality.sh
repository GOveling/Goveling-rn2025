#!/bin/bash

# 🎨 Script de Mejora de Calidad de Código
# Goveling React Native Project

set -e

echo "🎨 ============================================"
echo "   Mejora de Calidad de Código - Goveling"
echo "============================================"
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para mostrar paso
show_step() {
    echo -e "${BLUE}📍 $1${NC}"
}

# Función para mostrar éxito
show_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Función para mostrar advertencia
show_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Función para mostrar error
show_error() {
    echo -e "${RED}❌ $1${NC}"
}

echo "Este script te ayudará a mejorar la calidad del código del proyecto."
echo ""
echo "Opciones disponibles:"
echo "  1) Formatear TODO el código (191 archivos)"
echo "  2) Solo verificar formato (sin modificar)"
echo "  3) Aplicar ESLint fix automático"
echo "  4) Ejecutar validación completa"
echo "  5) Formatear solo archivos modificados (git)"
echo "  6) Ver reporte de problemas"
echo "  0) Salir"
echo ""

read -p "Selecciona una opción (0-6): " option

case $option in
    1)
        show_step "Formateando TODO el código..."
        show_warning "Esto modificará 191 archivos"
        read -p "¿Estás seguro? (s/n): " confirm
        if [ "$confirm" = "s" ]; then
            npm run format
            show_success "Código formateado exitosamente"
            show_warning "No olvides hacer commit: git commit -m 'chore: apply prettier formatting'"
        else
            show_warning "Operación cancelada"
        fi
        ;;
    
    2)
        show_step "Verificando formato del código..."
        npm run format:check
        ;;
    
    3)
        show_step "Aplicando fixes automáticos de ESLint..."
        npm run lint:fix
        show_success "Fixes aplicados"
        show_warning "Revisa los cambios con: git diff"
        ;;
    
    4)
        show_step "Ejecutando validación completa..."
        echo ""
        show_step "1/3 - Type checking..."
        npm run type-check
        show_success "Types OK"
        
        echo ""
        show_step "2/3 - Linting..."
        npm run lint || show_warning "Hay warnings de lint (ver arriba)"
        
        echo ""
        show_step "3/3 - Format checking..."
        npm run format:check || show_warning "Hay archivos sin formatear"
        
        echo ""
        show_success "Validación completa"
        ;;
    
    5)
        show_step "Formateando solo archivos modificados..."
        if git rev-parse --git-dir > /dev/null 2>&1; then
            modified_files=$(git diff --name-only --diff-filter=AM | grep -E '\.(js|jsx|ts|tsx|json)$' || true)
            
            if [ -z "$modified_files" ]; then
                show_warning "No hay archivos modificados"
            else
                echo "$modified_files" | xargs npx prettier --write
                show_success "Archivos modificados formateados"
                echo ""
                echo "Archivos formateados:"
                echo "$modified_files"
            fi
        else
            show_error "No estás en un repositorio git"
        fi
        ;;
    
    6)
        show_step "Generando reporte de problemas..."
        echo ""
        echo "📊 ============================================"
        echo "   REPORTE DE CALIDAD DE CÓDIGO"
        echo "============================================"
        echo ""
        
        # Contar archivos que necesitan formateo
        format_issues=$(npm run format:check 2>&1 | grep -c "^\\[warn\\]" || true)
        echo "📝 Archivos con problemas de formato: $format_issues"
        
        # Contar problemas de ESLint
        echo ""
        show_step "Analizando con ESLint..."
        npm run lint 2>&1 | head -100
        
        echo ""
        echo "📊 ============================================"
        echo "   FIN DEL REPORTE"
        echo "============================================"
        ;;
    
    0)
        show_success "¡Hasta luego!"
        exit 0
        ;;
    
    *)
        show_error "Opción inválida"
        exit 1
        ;;
esac

echo ""
echo "🎉 ============================================"
echo "   Proceso completado"
echo "============================================"
echo ""
echo "Comandos útiles:"
echo "  npm run format        - Formatear todo"
echo "  npm run lint:fix      - Fix automático"
echo "  npm run validate      - Validación completa"
echo ""
