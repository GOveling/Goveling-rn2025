import React from 'react';
import { View, Text } from 'react-native';

type Props = { lat:number; lng:number; height?:number };

export default function MiniMap({ lat, lng, height=120 }: Props){
  // Fallback component for web preview
  return (
    <View style={{ 
      height, 
      borderRadius:10, 
      overflow:'hidden', 
      borderWidth:1, 
      borderColor:'#eee',
      backgroundColor: '#f0f0f0',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <Text style={{ color: '#666', fontSize: 12 }}>
        Map Preview
      </Text>
      <Text style={{ color: '#999', fontSize: 10 }}>
        {lat.toFixed(4)}, {lng.toFixed(4)}
      </Text>
    </View>
  );
}