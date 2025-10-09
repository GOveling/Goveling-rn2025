import React from 'react';
import { View, Text, Platform } from 'react-native';

type Coord = { lat:number; lng:number };

export default function PolylineMap({ coords, origin, dest, refitKey }:{
  coords: Coord[]; 
  origin?:Coord; 
  dest?:Coord; 
  refitKey?: any
}){
  const height = 300;
  
  // Web fallback or if maps not available
  if (Platform.OS === 'web') {
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

  // Try to load react-native-maps for native platforms
  let MapView: any = null;
  let Marker: any = null;
  let Polyline: any = null;
  let PROVIDER_GOOGLE: any = null;
  
  try {
    const maps = require('react-native-maps');
    MapView = maps.default;
    Marker = maps.Marker;
    Polyline = maps.Polyline;
    PROVIDER_GOOGLE = maps.PROVIDER_GOOGLE;
  } catch (e) {
    // Maps not available, return fallback
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
          Map not available in this environment
        </Text>
      </View>
    );
  }

  // Calculate region to fit all coordinates
  let region = {
    latitude: 0,
    longitude: 0,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  if (coords && coords.length > 0) {
    const latitudes = coords.map(c => c.lat);
    const longitudes = coords.map(c => c.lng);
    
    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLng = Math.min(...longitudes);
    const maxLng = Math.max(...longitudes);
    
    region = {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(maxLat - minLat, 0.01) * 1.2,
      longitudeDelta: Math.max(maxLng - minLng, 0.01) * 1.2,
    };
  } else if (origin) {
    region.latitude = origin.lat;
    region.longitude = origin.lng;
  }
  
  return (
    <View style={{ 
      height, 
      borderRadius:12, 
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: '#ddd'
    }}>
      <MapView
        style={{ flex: 1 }}
        provider={PROVIDER_GOOGLE}
        region={region}
        key={refitKey}
      >
        {/* Route polyline */}
        {coords && coords.length > 1 && (
          <Polyline
            coordinates={coords.map(c => ({ latitude: c.lat, longitude: c.lng }))}
            strokeColor="#8B5CF6"
            strokeWidth={4}
            lineDashPattern={[0]}
          />
        )}
        
        {/* Origin marker */}
        {origin && (
          <Marker
            coordinate={{ latitude: origin.lat, longitude: origin.lng }}
            title="Origen"
            pinColor="#10B981"
          />
        )}
        
        {/* Destination marker */}
        {dest && (
          <Marker
            coordinate={{ latitude: dest.lat, longitude: dest.lng }}
            title="Destino"
            pinColor="#EF4444"
          />
        )}
        
        {/* Route points */}
        {coords && coords.map((coord, index) => (
          <Marker
            key={index}
            coordinate={{ latitude: coord.lat, longitude: coord.lng }}
            pinColor="#8B5CF6"
          />
        ))}
      </MapView>
    </View>
  );
}