
// src/components/ui/Themed.tsx
import React from 'react';
import { TouchableOpacity, View, Text, TextInput, ViewStyle, TextStyle, GestureResponderEvent } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../lib/theme';

type BtnProps = { title: string; onPress: (e: GestureResponderEvent) => void; kind?: 'primary' | 'tonal' | 'plain'; size?: 'compact' | 'regular' | 'large'; loading?: boolean; style?: ViewStyle; testID?: string; accessibilityLabel?: string; haptic?: boolean };
export function ThemedButton({ title, onPress, kind = 'primary', size = 'regular', loading = false, style, testID, accessibilityLabel, haptic = true }: BtnProps) {
  const { colors, radius, spacing } = useTheme();
  const bg = kind === 'primary' ? colors.primary : (kind === 'tonal' ? '#F2F2F6' : 'transparent');
  const border = kind === 'plain' ? 'transparent' : colors.border;
  const color = kind === 'primary' ? colors.primaryText : (kind === 'plain' ? colors.primary : colors.text);
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      testID={testID}
      onPress={(e) => { if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onPress(e); }}
      style={[{ backgroundColor: bg, borderColor: border, borderWidth: 1, paddingVertical: (size === 'large' ? 14 : size === 'compact' ? 8 : 12), paddingHorizontal: (size === 'large' ? 18 : (size === 'compact' ? 10 : 16)), borderRadius: radius.lg, alignItems: 'center' }, style]}
    >
      {loading ? <Text style={{ color, fontWeight: '700' }}>…</Text> : <Text style={{ color, fontWeight: '700' }}>{title}</Text>}
    </TouchableOpacity>
  );
}

export function ThemedCard({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const { colors, radius, spacing } = useTheme();
  return (
    <View style={[{ backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing(2), borderWidth: 1, borderColor: colors.border }, style]}>{children}</View>
  );
}

export function ThemedChip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, marginRight: 8, backgroundColor: active ? colors.chipBgActive : colors.chipBg }}>
      <Text style={{ color: active ? colors.chipTextActive : colors.chipText }}>{label}</Text>
    </TouchableOpacity>
  );
}

export function ThemedInput({ label, value, onChangeText, placeholder, style }: { label: string; value: string; onChangeText: (t: string) => void; placeholder?: string; style?: ViewStyle }) {
  const { colors, radius } = useTheme();
  return (
    <View style={[{ flex: 1 }, style]}>
      <Text style={{ fontWeight: '700', marginBottom: 6, color: colors.text }}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 10, color: colors.text, backgroundColor: 'transparent' }}
      />
    </View>
  );
}
