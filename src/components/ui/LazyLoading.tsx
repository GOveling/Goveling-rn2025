import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';

// Fallback component for lazy loading
export const LazyLoadingFallback: React.FC = () => (
  <View
    style={{
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    }}
  >
    <ActivityIndicator size="large" color="#007aff" />
    <Text
      style={{
        marginTop: 10,
        color: '#666',
        textAlign: 'center',
      }}
    >
      Cargando...
    </Text>
  </View>
);

// Skeleton component for better loading experience
export const SkeletonLoader: React.FC<{ height?: number; widthPercent?: number }> = ({
  height = 20,
  widthPercent = 100,
}) => (
  <View
    style={{
      height,
      width: `${widthPercent}%`,
      backgroundColor: '#f0f0f0',
      borderRadius: 4,
      marginVertical: 4,
    }}
  />
);
