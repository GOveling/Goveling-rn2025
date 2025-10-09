import React from 'react';
import { View, Text, Platform } from 'react-native';

type Props = { lat:number; lng:number; height?:number };

export default function MiniMap({ lat, lng, height=120 }: Props){
  // Web fallback or if maps not available
  if (Platform.OS === 'web') {
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
        <Text style={{ fontSize: 12, color: '#666' }}>
          Map Preview
        </Text>
        <Text style={{ fontSize: 10, color: '#999' }}>
          {lat.toFixed(4)}, {lng.toFixed(4)}
        </Text>
      </View>
    );
  }

  // Try to load react-native-maps for native platforms
  let MapView: any = null;
  let Marker: any = null;
  let PROVIDER_GOOGLE: any = null;
  
  try {
    const maps = require('react-native-maps');
    MapView = maps.default;
    Marker = maps.Marker;
    PROVIDER_GOOGLE = maps.PROVIDER_GOOGLE;
  } catch (e) {
    // Maps not available, return fallback
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
        <Text style={{ fontSize: 12, color: '#666' }}>
          Map not available
        </Text>
      </View>
    );
  }

  return (
    <View style={{ 
      height, 
      borderRadius:10, 
      overflow:'hidden', 
      borderWidth:1, 
      borderColor:'#eee'
    }}>
      <MapView
        style={{ flex: 1 }}
        provider={PROVIDER_GOOGLE}
        region={{
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
      >
        <Marker
          coordinate={{ latitude: lat, longitude: lng }}
          pinColor="#8B5CF6"
        />
      </MapView>
    </View>
  );
}