import React, { useState } from 'react';
import { Image, View, ActivityIndicator } from 'react-native';

interface CountryImageProps {
  countryCode: string;
  width?: number;
  height?: number;
  borderRadius?: number;
  fallbackImage?: string;
  style?: any;
}

/**
 * 🖼️ CountryImage Component
 * 
 * Componente optimizado para mostrar imágenes de países desde Supabase Storage
 * con fallback a Unsplash. Incluye optimizaciones para hardware nativo iOS/Android.
 */
export const CountryImage: React.FC<CountryImageProps> = ({
  countryCode,
  width = 60,
  height = 60,
  borderRadius = 12,
  fallbackImage,
  style
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);

  // Construir URL de Supabase Storage
  const getSupabaseImageUrl = (code: string) => {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) return null;

    return `${supabaseUrl}/storage/v1/object/public/public/country-images/${code.toUpperCase()}.jpg`;
  };

  // Fallback URLs de Unsplash optimizadas para móviles
  const getFallbackImageUrl = (code: string) => {
    const fallbackMap: { [key: string]: string } = {
      'MX': 'https://images.unsplash.com/photo-1518105779142-d975f22f1b0a?w=400&h=400&fit=crop&q=80',
      'CL': 'https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?w=400&h=400&fit=crop&q=80',
      'US': 'https://images.unsplash.com/photo-1485738422979-f5c462d49f74?w=400&h=400&fit=crop&q=80',
      'FR': 'https://images.unsplash.com/photo-1502602898536-47ad22581b52?w=400&h=400&fit=crop&q=80',
      'BR': 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=400&h=400&fit=crop&q=80',
      'AR': 'https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?w=400&h=400&fit=crop&q=80',
      'PE': 'https://images.unsplash.com/photo-1587595431973-160d0d94add1?w=400&h=400&fit=crop&q=80',
      'CO': 'https://images.unsplash.com/photo-1605722243979-fe0be8158232?w=400&h=400&fit=crop&q=80',
      'ES': 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=400&h=400&fit=crop&q=80',
      'IT': 'https://images.unsplash.com/photo-1525874684015-58379d421a52?w=400&h=400&fit=crop&q=80',
      'JP': 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=400&h=400&fit=crop&q=80',
      'GB': 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&h=400&fit=crop&q=80',
      'DE': 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=400&h=400&fit=crop&q=80',
      'AU': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop&q=80',
      'TH': 'https://images.unsplash.com/photo-1551986782-d0169b3f8fa7?w=400&h=400&fit=crop&q=80',
      'CN': 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=400&h=400&fit=crop&q=80',
    };

    return fallbackMap[code.toUpperCase()] || fallbackImage;
  };

  React.useEffect(() => {
    if (!countryCode) return;

    // Intentar cargar desde Supabase primero
    const supabaseUrl = getSupabaseImageUrl(countryCode);
    if (supabaseUrl) {
      setCurrentImageUrl(supabaseUrl);
    } else {
      // Usar fallback si no hay Supabase configurado
      const fallbackUrl = getFallbackImageUrl(countryCode);
      setCurrentImageUrl(fallbackUrl);
    }
  }, [countryCode]);

  const handleLoadStart = () => {
    setLoading(true);
    setError(false);
  };

  const handleLoadEnd = () => {
    setLoading(false);
  };

  const handleError = () => {
    setLoading(false);
    setError(true);

    // Si falla la imagen de Supabase, intentar con fallback
    if (currentImageUrl?.includes('supabase')) {
      const fallbackUrl = getFallbackImageUrl(countryCode);
      if (fallbackUrl && fallbackUrl !== currentImageUrl) {
        setCurrentImageUrl(fallbackUrl);
        setError(false);
        setLoading(true);
      }
    }
  };

  const containerStyle = [
    {
      width,
      height,
      borderRadius,
      overflow: 'hidden',
      backgroundColor: 'rgba(255,255,255,0.2)',
      justifyContent: 'center',
      alignItems: 'center',
      // Optimizaciones para sombras en iOS y Android
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3, // Android
    },
    style
  ];

  if (!currentImageUrl || error) {
    return (
      <View style={containerStyle}>
        {/* Placeholder o icono de país */}
        <View style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#E5E7EB',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          {/* Podrías poner aquí un icono de placeholder */}
        </View>
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      <Image
        source={{ uri: currentImageUrl }}
        style={{
          width: '100%',
          height: '100%',
        }}
        resizeMode="cover"
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        fadeDuration={200} // Transición suave
      />

      {/* Loading indicator */}
      {loading && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(255,255,255,0.8)'
        }}>
          <ActivityIndicator size="small" color="#6366F1" />
        </View>
      )}
    </View>
  );
};