#!/bin/bash

set -e

echo "🌍 Preparando datos geográficos para geo-lookup"
echo "================================================"
echo ""

# Cambiar al directorio assets/geo
cd "$(dirname "$0")/../../assets/geo"

echo "📥 Descargando Natural Earth Admin 0 (países - 50m scale)..."
curl -L "https://naciscdn.org/naturalearth/50m/cultural/ne_50m_admin_0_countries.zip" -o admin0.zip

echo "📦 Extrayendo archivos..."
unzip -o admin0.zip
rm admin0.zip

echo ""
echo "📥 Descargando Natural Earth Admin 1 (regiones/estados - 50m scale)..."
curl -L "https://naciscdn.org/naturalearth/50m/cultural/ne_50m_admin_1_states_provinces.zip" -o admin1.zip

echo "📦 Extrayendo archivos..."
unzip -o admin1.zip
rm admin1.zip

echo ""
echo "🔧 Verificando instalación de mapshaper..."
if ! command -v mapshaper &> /dev/null; then
    echo "⚠️  mapshaper no está instalado. Instalando..."
    npm install -g mapshaper
else
    echo "✅ mapshaper ya está instalado"
fi

echo ""
echo "🗜️  Simplificando y convirtiendo Admin 0 a TopoJSON..."
mapshaper ne_50m_admin_0_countries.shp \
  -simplify visvalingam 10% keep-shapes \
  -filter-fields ISO_A2,ISO_A2_EH,ISO_A3,ADMIN,NAME \
  -o format=topojson admin0.topo.json

echo ""
echo "🗜️  Simplificando y convirtiendo Admin 1 a TopoJSON..."
mapshaper ne_50m_admin_1_states_provinces.shp \
  -simplify visvalingam 10% keep-shapes \
  -filter-fields iso_a2,name,name_en,code_local,adm0_a3 \
  -o format=topojson admin1.topo.json

echo ""
echo "🧹 Limpiando archivos temporales..."
rm -f *.shp *.shx *.dbf *.prj *.cpg *.xml *.README.html *.VERSION.txt

echo ""
echo "✅ Archivos generados:"
ls -lh admin0.topo.json admin1.topo.json

echo ""
echo "📊 Tamaño de archivos:"
du -h admin0.topo.json admin1.topo.json

echo ""
echo "✅ ¡Preparación completa! Archivos listos en assets/geo/"
echo ""
echo "📋 Próximo paso: Ejecutar 'npx tsx scripts/geo/upload-to-supabase.ts'"
