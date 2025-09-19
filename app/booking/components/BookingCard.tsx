
// app/booking/components/BookingCard.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

export function BookingCard({ title, subtitle, cta, onPress }:{ title:string; subtitle?:string; cta?:string; onPress:()=>void }){
  return (
    <TouchableOpacity onPress={onPress} style={{ backgroundColor:'#fff', borderRadius:16, padding:14, marginBottom:10, shadowColor:'#000', shadowOpacity:0.05, shadowRadius:6, elevation:2 }}>
      <Text style={{ fontWeight:'800', fontSize:16 }}>{title}</Text>
      {subtitle ? <Text style={{ opacity:0.7, marginTop:4 }}>{subtitle}</Text> : null}
      <Text style={{ color:'#2563eb', fontWeight:'700', marginTop:8 }}>{cta || 'Ver'}</Text>
    </TouchableOpacity>
  );
}
