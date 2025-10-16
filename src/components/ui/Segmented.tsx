// src/components/ui/Segmented.tsx
import React from 'react';

import { Platform, View } from 'react-native';

import SegmentedControl from '@react-native-segmented-control/segmented-control';

import { ThemedChip } from './Themed';

export function Segmented({
  values,
  selectedIndex,
  onChange,
}: {
  values: string[];
  selectedIndex: number;
  onChange: (i: number) => void;
}) {
  if (Platform.OS === 'ios') {
    return (
      <SegmentedControl
        values={values}
        selectedIndex={selectedIndex}
        onChange={(e) => onChange(e.nativeEvent.selectedSegmentIndex)}
      />
    );
  }
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
      {values.map((v, i) => (
        <ThemedChip key={v} label={v} active={i === selectedIndex} onPress={() => onChange(i)} />
      ))}
    </View>
  );
}
