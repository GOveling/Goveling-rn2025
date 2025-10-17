import React from 'react';

import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

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
      <View style={[styles.loadingContainer, style]}>
        <Text style={styles.loadingText}>📍 Cargando...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.errorContainer, style]}>
        <Text style={styles.errorText}>
          📍 {latitude.toFixed(3)}, {longitude.toFixed(3)}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.mainContainer, style]}>
      <View style={styles.locationContainer}>
        <View style={styles.locationRow}>
          {/* Line 185 equivalent - this is where the location name is rendered */}
          <Text style={styles.locationText}>
            📍{' '}
            <Text style={styles.locationName}>
              {weatherData?.location?.city || `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`}
            </Text>
          </Text>
          <Text style={styles.dateText}>
            • {new Date().toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
          </Text>
        </View>
      </View>

      <TouchableOpacity onPress={onUnitsToggle} style={styles.weatherButton}>
        <Text style={styles.weatherIcon}>🌡️</Text>
        <Text style={styles.temperatureText}>
          {typeof weatherData?.temperature === 'number'
            ? weatherData.temperature.toFixed(1).replace('.', ',')
            : '—'}
          °{units === 'c' ? 'C' : 'F'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  // Common Containers
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mainContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // Text Styles
  loadingText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  errorText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },

  // Location Section
  locationContainer: {
    flex: 1,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  locationName: {
    fontWeight: '600',
  },
  dateText: {
    fontSize: 16,
    color: 'white',
    marginLeft: 8,
  },

  // Weather Section
  weatherButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  weatherIcon: {
    fontSize: 16,
    color: 'white',
    marginRight: 4,
  },
  temperatureText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
});
