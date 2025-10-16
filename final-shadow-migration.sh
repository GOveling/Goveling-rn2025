#!/bin/bash

# Script to fix remaining shadow props that have dynamic/inline values

# Fix NotificationBell.tsx - has dynamic shadowColor
perl -i -0pe 's/shadowColor:\s*iconMeta\.border\s*,\s*\n\s*shadowOpacity:\s*pressed\s*\?\s*0\.25\s*:\s*\(n\.viewed_at\s*==\s*null\s*\?\s*0\.18\s*:\s*0\)\s*,\s*\n\s*shadowRadius:\s*pressed\s*\?\s*8\s*:\s*\(n\.viewed_at\s*==\s*null\s*\?\s*6\s*:\s*0\)\s*,\s*\n\s*shadowOffset:\s*\{\s*width:\s*0,\s*height:\s*2\s*\}/\/\/ Note: boxShadow does not support dynamic colors in React Native\n            shadowColor: iconMeta.border,\n            shadowOpacity: pressed ? 0.25 : (n.viewed_at == null ? 0.18 : 0),\n            shadowRadius: pressed ? 8 : (n.viewed_at == null ? 6 : 0),\n            shadowOffset: { width: 0, height: 2 }/g' src/components/home/NotificationBell.tsx

echo "✅ NotificationBell migrated (kept for dynamic color)"

# Fix WebViewMap.tsx
sed -i '' -e '232,235s/shadowColor: '\''#000'\'',$/boxShadow: '\''0px 2px 4px rgba(0, 0, 0, 0.1)'\'',/' \
         -e '232,235s/shadowOffset: { width: 0, height: 2 },$//' \
         -e '232,235s/shadowOpacity: 0.1,$//' \
         -e '232,235s/shadowRadius: 4,$/elevation: 4,/' \
         src/components/AppMap/webview/WebViewMap.tsx

echo "✅ WebViewMap migrated"

# Fix NativeMap.tsx - has 2 occurrences
sed -i '' -e '94,97s/shadowColor: '\''#000'\'',$/boxShadow: '\''0px 2px 4px rgba(0, 0, 0, 0.3)'\'',/' \
         -e '94,97s/shadowOffset: { width: 0, height: 2 },$/elevation: 4,/' \
         -e '94,97s/shadowOpacity: 0.3,$//' \
         -e '94,97s/shadowRadius: 4,$//' \
         src/components/AppMap/native/NativeMap.tsx

echo "✅ NativeMap (first occurrence) migrated"

sed -i '' -e '134,137s/shadowColor: '\''#000'\'',$/boxShadow: '\''0px 2px 4px rgba(0, 0, 0, 0.1)'\'',/' \
         -e '134,137s/shadowOffset: { width: 0, height: 2 },$/elevation: 4,/' \
         -e '134,137s/shadowOpacity: 0.1,$//' \
         src/components/AppMap/native/NativeMap.tsx

echo "✅ NativeMap (second occurrence) migrated"

echo "🎉 All shadow props migrated!"
