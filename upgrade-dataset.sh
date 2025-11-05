#!/bin/bash
# Script para descargar y procesar datasets de Natural Earth 10m
# Esto mejorará la precisión del 84.7% al ~95-100%

set -e

echo "🌍 Natural Earth Dataset Upgrade - 50m → 10m"
echo "=============================================="
echo ""

TEMP_DIR="./temp-geo-upgrade"
GEO_DIR="./assets/geo"

# Crear directorios
mkdir -p "$TEMP_DIR"
mkdir -p "$GEO_DIR"

echo "📦 Paso 1: Descargando Natural Earth 10m datasets..."
echo ""

# Admin 0 - Countries (10m resolution - más detalle)
echo "  → Descargando países (admin0) 10m..."
curl -L "https://naciscdn.org/naturalearth/10m/cultural/ne_10m_admin_0_countries.zip" \
  -o "$TEMP_DIR/ne_10m_admin_0_countries.zip"

# Admin 1 - States/Provinces (10m resolution)
echo "  → Descargando estados/provincias (admin1) 10m..."
curl -L "https://naciscdn.org/naturalearth/10m/cultural/ne_10m_admin_1_states_provinces.zip" \
  -o "$TEMP_DIR/ne_10m_admin_1_states_provinces.zip"

echo ""
echo "📂 Paso 2: Descomprimiendo archivos..."
cd "$TEMP_DIR"
unzip -o ne_10m_admin_0_countries.zip
unzip -o ne_10m_admin_1_states_provinces.zip
cd ..

echo ""
echo "🔧 Paso 3: Instalando herramientas de conversión..."
# Instalar mapshaper si no está instalado
if ! command -v mapshaper &> /dev/null; then
    echo "  → Instalando mapshaper..."
    npm install -g mapshaper
else
    echo "  → mapshaper ya está instalado ✓"
fi

echo ""
echo "🗜️  Paso 4: Convirtiendo a TopoJSON con simplificación..."
echo ""

# Convertir Admin 0 (Countries) a TopoJSON
echo "  → Procesando admin0 (países)..."
mapshaper "$TEMP_DIR/ne_10m_admin_0_countries.shp" \
  -filter-fields ISO_A2,NAME,ADMIN \
  -simplify 15% \
  -o format=topojson "$GEO_DIR/admin0_10m.topo.json"

# Convertir Admin 1 (States/Provinces) a TopoJSON
echo "  → Procesando admin1 (estados/provincias)..."
mapshaper "$TEMP_DIR/ne_10m_admin_1_states_provinces.shp" \
  -filter-fields iso_a2,name,region,admin \
  -simplify 15% \
  -o format=topojson "$GEO_DIR/admin1_10m.topo.json"

echo ""
echo "📊 Paso 5: Verificando tamaños de archivos..."
echo ""
echo "Datasets 50m (actuales):"
ls -lh "$GEO_DIR/admin0.topo.json" 2>/dev/null || echo "  admin0.topo.json: No existe"
ls -lh "$GEO_DIR/admin1.topo.json" 2>/dev/null || echo "  admin1.topo.json: No existe"
echo ""
echo "Datasets 10m (nuevos):"
ls -lh "$GEO_DIR/admin0_10m.topo.json"
ls -lh "$GEO_DIR/admin1_10m.topo.json"

echo ""
echo "🧹 Paso 6: Limpiando archivos temporales..."
rm -rf "$TEMP_DIR"

echo ""
echo "✅ ¡Upgrade completado!"
echo ""
echo "Próximos pasos:"
echo "1. Actualizar Edge Function para usar admin0_10m.topo.json y admin1_10m.topo.json"
echo "2. Subir nuevos archivos a Supabase Storage"
echo "3. Re-ejecutar tests: node test-geo-global.js"
echo ""
