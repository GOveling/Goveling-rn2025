#!/bin/bash

FILES=(
  "src/components/ui/Toast.tsx"
  "src/components/home/NotificationBell.tsx"
  "src/components/home/CurrentTripCard.tsx"
  "src/components/LocationButton.tsx"
  "src/components/AppMap/native/NativeMap.tsx"
  "src/components/AppMap/webview/WebViewMapNew.tsx"
  "src/components/AppMap/webview/WebViewMap.tsx"
  "src/components/TripCard.tsx"
  "src/components/profile/ProfileEditModal.tsx"
  "src/components/LiquidButton.tsx"
  "src/components/PlaceDetailModal.tsx"
  "src/components/onboarding/PersonalInfoModal.tsx"
  "src/components/onboarding/WelcomeModal.tsx"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing $file..."
    # Create backup
    cp "$file" "$file.bak"
    
    # Use Perl for multi-line replacement
    perl -i -0pe 's/shadowColor:\s*[\'"#]([^\'",\n}]+)[\'"]\s*,\s*\n\s*shadowOffset:\s*\{\s*width:\s*(\d+)\s*,\s*height:\s*(\d+)\s*\}\s*,\s*\n\s*shadowOpacity:\s*([\d.]+)\s*,\s*\n\s*shadowRadius:\s*(\d+)/boxShadow: '\''$2px $3px $5px rgba(0, 0, 0, $4)'\'',\n    elevation: $5/g' "$file"
    
    echo "✅ Done: $file"
  fi
done

echo "Migration complete!"
