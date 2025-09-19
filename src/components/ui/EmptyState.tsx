
// src/components/ui/EmptyState.tsx
import React from 'react';
import { View, Text, Image } from 'react-native';
import { useTheme } from '../../lib/theme';
import { ThemedButton } from './Themed';

export function EmptyState({ title, subtitle, ctaLabel, onCta }:{ title:string; subtitle?:string; ctaLabel?:string; onCta?:()=>void }){
  const { colors, spacing } = useTheme();
  return (
    <View accessibilityRole="summary" style={{ alignItems:'center', padding: spacing(3) }}>
      <Image source={require('../../../assets/branding-zeppeling.png')} style={{ width:180, height:110, marginBottom: spacing(2), resizeMode:'contain', opacity:0.9 }} />
      <Text style={{ fontWeight:'800', fontSize:18, color: colors.text, textAlign:'center' }}>{title}</Text>
      {subtitle ? <Text style={{ color: colors.textMuted, textAlign:'center', marginTop: 6 }}>{subtitle}</Text> : null}
      {ctaLabel && onCta ? <ThemedButton title={ctaLabel} onPress={onCta} kind="primary" style={{ marginTop: spacing(2) }} /> : null}
    </View>
  );
}
