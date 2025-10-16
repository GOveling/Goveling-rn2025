// src/components/ui/BottomSheet.tsx
import React, { useMemo, useRef } from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../../lib/theme';
let BottomSheet: any = null;
try {
  BottomSheet = require('@gorhom/bottom-sheet').default;
} catch (e) {}

export function Sheet({ children, snapPoints = ['50%', '90%'] as any }) {
  const { colors, radius } = useTheme();
  if (!BottomSheet) {
    return (
      <View style={{ backgroundColor: colors.card, borderRadius: radius.xl, padding: 16 }}>
        {children}
      </View>
    );
  }
  const ref = useRef<any>(null);
  const points = useMemo(() => snapPoints, [JSON.stringify(snapPoints)]);
  return (
    <BottomSheet
      ref={ref}
      snapPoints={points}
      backgroundStyle={{ backgroundColor: colors.card, borderRadius: 24 }}
      handleStyle={{}}
    >
      <View style={{ padding: 16 }}>{children}</View>
    </BottomSheet>
  );
}
