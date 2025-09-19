
// app/booking/components/FiltersRow.tsx
import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';

export function Chip({ label, active, onPress }:{ label:string; active?:boolean; onPress:()=>void }){
  return (
    <TouchableOpacity onPress={onPress} style={{ paddingVertical:6, paddingHorizontal:10, borderRadius:999, marginRight:8, backgroundColor: active? '#111827':'#e5e7eb' }}>
      <Text style={{ color: active? '#fff':'#111827' }}>{label}</Text>
    </TouchableOpacity>
  );
}

export function LabeledInput({ label, value, onChangeText, placeholder }:{ label:string; value:string; onChangeText:(t:string)=>void; placeholder?:string }){
  return (
    <View style={{ flex:1 }}>
      <Text style={{ fontWeight:'700', marginBottom:6 }}>{label}</Text>
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} style={{ borderWidth:1, borderColor:'#ddd', borderRadius:8, padding:10 }} />
    </View>
  );
}
