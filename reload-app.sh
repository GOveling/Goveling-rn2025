#!/bin/bash

echo "🧹 Limpiando caché de Expo..."
echo ""

# Limpiar watchman
echo "📡 Limpiando watchman..."
watchman watch-del-all 2>/dev/null || echo "⚠️  Watchman no disponible (opcional)"

# Limpiar caché de Metro
echo "🗑️  Limpiando caché de Metro..."
rm -rf $TMPDIR/metro-* 2>/dev/null
rm -rf $TMPDIR/haste-* 2>/dev/null

# Limpiar caché de Expo
echo "📦 Limpiando caché de Expo..."
rm -rf .expo 2>/dev/null

echo ""
echo "✅ Caché limpiada"
echo ""
echo "🚀 Iniciando Expo con caché limpia..."
echo ""

npx expo start --clear
