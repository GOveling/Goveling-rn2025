import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { WeatherService, WeatherData } from '../services/weatherService';

interface LocationWeatherWidgetProps {
  latitude: number;
  longitude: number;
  units: 'c' | 'f';
  onUnitsToggle: () => void;
  style?: any;
}

/**
 * LocationWeatherWidget - Component that displays current location and weather
 * This is the main component that integrates the complete weather + location flow
 */
export default function LocationWeatherWidget({
  latitude,
  longitude,
  units,
  onUnitsToggle,
  style,
}: LocationWeatherWidgetProps) {
  const [weatherData, setWeatherData] = React.useState<WeatherData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchWeatherData = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('🌤️ LocationWeatherWidget: Fetching weather data');
        const data = await WeatherService.getWeatherWithLocation(latitude, longitude, units);

        setWeatherData(data);
        console.log('🌤️ LocationWeatherWidget: Weather data updated', data);
      } catch (err) {
        console.error('🌤️ LocationWeatherWidget error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    if (latitude && longitude) {
      fetchWeatherData();
    }
  }, [latitude, longitude, units]);

  if (loading) {
    return (
      <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>
        <Text style={{ fontSize: 16, color: 'white', fontWeight: '600' }}>📍 Cargando...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>
        <Text style={{ fontSize: 16, color: 'white', fontWeight: '600' }}>
          📍 {latitude.toFixed(3)}, {longitude.toFixed(3)}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
        style,
      ]}
    >
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
          {/* Line 185 equivalent - this is where the location name is rendered */}
          <Text style={{ fontSize: 16, color: 'white', fontWeight: '600' }}>
            📍{' '}
            <Text style={{ fontWeight: '600' }}>
              {weatherData?.location?.city || `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`}
            </Text>
          </Text>
          <Text style={{ fontSize: 16, color: 'white', marginLeft: 8 }}>
            • {new Date().toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        onPress={onUnitsToggle}
        style={{ flexDirection: 'row', alignItems: 'center', marginRight: 15 }}
      >
        <Text style={{ fontSize: 16, color: 'white', marginRight: 4 }}>🌡️</Text>
        <Text style={{ fontSize: 16, color: 'white', fontWeight: '600' }}>
          {typeof weatherData?.temperature === 'number'
            ? weatherData.temperature.toFixed(1).replace('.', ',')
            : '—'}
          °{units === 'c' ? 'C' : 'F'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
