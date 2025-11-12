#!/bin/bash

echo "🔄 Rebuilding iOS app with Face ID changes..."
echo ""
echo "⚠️  IMPORTANTE: Este proceso tomará 2-3 minutos"
echo ""

# Kill any expo processes
echo "1️⃣ Deteniendo procesos de Expo..."
pkill -f "expo start" || true
pkill -f "react-native" || true

# Clear watchman
echo "2️⃣ Limpiando watchman..."
watchman watch-del-all 2>/dev/null || true

# Clear metro bundler cache
echo "3️⃣ Limpiando cache de Metro..."
rm -rf $TMPDIR/metro-* 2>/dev/null || true
rm -rf $TMPDIR/haste-* 2>/dev/null || true

# Clear iOS build
echo "4️⃣ Limpiando build de iOS..."
rm -rf ios/build 2>/dev/null || true

# Clean and rebuild
echo "5️⃣ Rebuilding app..."
echo ""
echo "📱 La app se abrirá en el simulador cuando termine..."
echo ""

npx expo run:ios

echo ""
echo "✅ ¡Listo! Ahora abre Documentos de Viaje y deberías ver los logs de biometría."
