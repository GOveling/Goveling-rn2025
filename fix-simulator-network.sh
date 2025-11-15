#!/bin/bash

echo "🔍 Diagnosticando problema de red en iOS Simulator..."
echo ""

echo "1️⃣ Verificando servicios de red del sistema..."
sudo killall -HUP mDNSResponder
echo "✅ Servicio mDNSResponder reiniciado"
echo ""

echo "2️⃣ Cerrando simulador si está abierto..."
killall Simulator 2>/dev/null && echo "✅ Simulador cerrado" || echo "ℹ️  Simulador no estaba corriendo"
echo ""

echo "3️⃣ Limpiando caché del simulador..."
xcrun simctl shutdown all
xcrun simctl erase all 2>/dev/null
echo "⚠️  Simuladores reiniciados (datos borrados)"
echo ""

echo "4️⃣ Abriendo simulador..."
open -a Simulator
echo ""

echo "✅ Proceso completado"
echo ""
echo "📋 PASOS MANUALES REQUERIDOS:"
echo ""
echo "   1. En el simulador que se abrió:"
echo "      Settings > General > Reset > Reset Network Settings"
echo ""
echo "   2. Verificar conectividad:"
echo "      Abrir Safari y visitar google.com"
echo ""
echo "   3. Si Safari funciona, relanzar tu app:"
echo "      npx expo start"
echo ""
