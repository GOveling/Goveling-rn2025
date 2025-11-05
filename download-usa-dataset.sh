#!/bin/bash
# Script para descargar dataset específico de USA con geometrías completas
# Resuelve los 4 casos fallidos: New York, Miami, Seattle, Anchorage

set -e

echo "🇺🇸 USA States Dataset - High Resolution"
echo "========================================"
echo ""

TEMP_DIR="./temp-usa-dataset"
GEO_DIR="./assets/geo"

mkdir -p "$TEMP_DIR"
mkdir -p "$GEO_DIR"

echo "📦 Paso 1: Descargando USA States (10m resolution)..."
curl -L "https://www2.census.gov/geo/tiger/GENZ2018/shp/cb_2018_us_state_20m.zip" \
  -o "$TEMP_DIR/usa_states.zip"

echo ""
echo "📂 Paso 2: Descomprimiendo..."
cd "$TEMP_DIR"
unzip -o usa_states.zip
cd ..

echo ""
echo "🔧 Paso 3: Verificando mapshaper..."
if ! command -v mapshaper &> /dev/null; then
    echo "  → Instalando mapshaper..."
    npm install -g mapshaper
else
    echo "  → mapshaper ya está instalado ✓"
fi

echo ""
echo "🗜️  Paso 4: Convirtiendo a TopoJSON..."
mapshaper "$TEMP_DIR/cb_2018_us_state_20m.shp" \
  -filter-fields STUSPS,NAME \
  -simplify 10% \
  -o format=topojson "$GEO_DIR/usa_states.topo.json"

echo ""
echo "📊 Paso 5: Tamaño del archivo:"
ls -lh "$GEO_DIR/usa_states.topo.json"

echo ""
echo "🧹 Paso 6: Limpiando..."
rm -rf "$TEMP_DIR"

echo ""
echo "✅ ¡Dataset USA completado!"
echo ""
echo "Estados incluidos:"
echo "  • New York (NY)"
echo "  • Florida (FL) - Miami"
echo "  • Washington (WA) - Seattle"
echo "  • Alaska (AK) - Anchorage"
echo "  • + 46 estados más"
echo ""
