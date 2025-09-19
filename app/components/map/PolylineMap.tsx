import React from 'react';
import { View, Text } from 'react-native';

type Coord = { lat:number; lng:number };

export default function PolylineMap({ coords, origin, dest, refitKey }:{
  coords: Coord[]; 
  origin?:Coord; 
  dest?:Coord; 
  refitKey?: any
}){
  const height = 300;
  
  return (
    <View style={{ 
      height, 
      backgroundColor:'#eef2ff', 
      borderRadius:12, 
      alignItems:'center', 
      justifyContent:'center',
      borderWidth: 1,
      borderColor: '#ddd'
    }}>
      <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
        Route Map Preview
      </Text>
      <Text style={{ fontSize: 12, color: '#666' }}>
        {coords?.length || 0} coordinates
      </Text>
      {origin && (
        <Text style={{ fontSize: 10, color: '#999' }}>
          From: {origin.lat.toFixed(4)}, {origin.lng.toFixed(4)}
        </Text>
      )}
      {dest && (
        <Text style={{ fontSize: 10, color: '#999' }}>
          To: {dest.lat.toFixed(4)}, {dest.lng.toFixed(4)}
        </Text>
      )}
    </View>
  );
}