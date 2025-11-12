import React, { useState, useEffect } from 'react';

import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { Modal } from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';

import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';

import { supabase } from '~/lib/supabase';
import { useTheme } from '~/lib/theme';

import ConditionalMapView from './ConditionalMapView';

interface SmartRouteModalProps {
  visible: boolean;
  onClose: () => void;
  tripId: string;
  tripTitle?: string;
  tripStartDate?: string;
  tripEndDate?: string;
}

interface MLPlace {
  id: string;
  name: string;
  lat: number;
  lon: number;
  type?: string;
  priority?: number;
  min_duration_hours?: number;
  rating?: number;
  address?: string;
  google_place_id?: string;
}

interface SmartRouteConfig {
  start_date: string;
  end_date: string;
  transport_mode: 'walk' | 'drive' | 'transit' | 'bike';
  daily_start_hour: number;
  daily_end_hour: number;
  max_walking_distance_km: number;
  max_daily_activities: number;
  preferences: {
    culture_weight: number;
    nature_weight: number;
    food_weight: number;
  };
}

interface ItineraryDay {
  day: number;
  date: string;
  places: Array<{
    id: string;
    name: string;
    category: string;
    rating?: number;
    description?: string;
    estimated_time?: string;
    duration_minutes?: number;
    duration_h?: number;
    priority?: number;
    order?: number;
    lat: number;
    lng: number;
    start?: string;
    end?: string;
    type?: string;
  }>;
  total_places: number;
  total_time: string;
  free_time: string;
  transport_time?: string;
  walking_time?: string;
  is_suggested?: boolean;
  suggested_day?: boolean;
  suggestion_reason?: string;
  base?: {
    name: string;
    address: string;
    lat: number;
    lon: number;
    rating?: number;
    type: string;
  };
  actionable_recommendations?: Array<{
    message?: string;
    description?: string;
  }>;
}

const TRANSPORT_MODES = [
  { value: 'walk', label: 'Caminar', icon: '🚶' },
  { value: 'drive', label: 'Auto', icon: '🚗' },
  { value: 'transit', label: 'Transporte Público', icon: '🚌' },
  { value: 'bike', label: 'Bicicleta', icon: '🚲' },
];

export default function SmartRouteModal({
  visible,
  onClose,
  tripId,
  tripTitle,
  tripStartDate,
  tripEndDate,
}: SmartRouteModalProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  // States
  const [loading, setLoading] = useState(false);
  const [places, setPlaces] = useState<MLPlace[]>([]);
  const [config, setConfig] = useState<SmartRouteConfig>({
    start_date: tripStartDate || new Date().toISOString().split('T')[0],
    end_date: tripEndDate || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    transport_mode: 'drive',
    daily_start_hour: 9,
    daily_end_hour: 18,
    max_walking_distance_km: 15.0,
    max_daily_activities: 6,
    preferences: {
      culture_weight: 0.8,
      nature_weight: 0.6,
      food_weight: 0.9,
    },
  });
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showTransportPicker, setShowTransportPicker] = useState(false);
  const [itinerary, setItinerary] = useState<ItineraryDay[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedDayFilter, setSelectedDayFilter] = useState<number | null>(null);
  const [showOnlyHotels, setShowOnlyHotels] = useState(false);
  const [showOnlyActivities, setShowOnlyActivities] = useState(false);

  // Load places when modal opens
  useEffect(() => {
    if (visible && tripId) {
      console.log('🔄 Modal opened, loading places for trip:', tripId);
      loadTripPlaces();
    } else {
      console.log('🚫 Modal conditions not met - visible:', visible, 'tripId:', tripId);
    }
  }, [visible, tripId]);

  // Update config dates when trip dates change
  useEffect(() => {
    if (tripStartDate || tripEndDate) {
      setConfig((prev) => ({
        ...prev,
        start_date: tripStartDate || prev.start_date,
        end_date: tripEndDate || prev.end_date,
      }));
    }
  }, [tripStartDate, tripEndDate]);

  const loadTripPlaces = async () => {
    try {
      console.log('🔍 Loading places for trip:', tripId);

      // Get all trip places directly (no separate places table exists)
      const { data: tripPlaces, error } = await supabase
        .from('trip_places')
        .select(
          `
          id,
          place_id,
          name,
          lat,
          lng,
          address,
          category,
          rating
        `
        )
        .eq('trip_id', tripId);

      if (error) {
        console.error('Error loading trip places:', error);
        Alert.alert('Error', 'No se pudieron cargar los lugares del viaje');
        return;
      }

      if (!tripPlaces || tripPlaces.length === 0) {
        Alert.alert(
          'Sin lugares',
          'Este viaje no tiene lugares guardados. Agrega algunos lugares primero.'
        );
        onClose();
        return;
      }

      console.log('📍 Found trip places:', tripPlaces.length);

      // Convert to ML format
      const mlPlaces: MLPlace[] = tripPlaces.map((place, index) => {
        const mlPlace = {
          id: place.id || place.place_id,
          name: place.name,
          lat: place.lat,
          lon: place.lng,
          type: getMLPlaceType(place.category, []),
          priority: Math.max(1, Math.min(10, Math.round((place.rating || 5) * 2))),
          min_duration_hours: getEstimatedDuration(place.category),
          rating: place.rating,
          address: place.address,
          google_place_id: place.place_id,
        };

        console.log(`📍 Converted place ${index + 1}:`, {
          name: mlPlace.name,
          type: mlPlace.type,
          priority: mlPlace.priority,
          duration: mlPlace.min_duration_hours,
        });

        return mlPlace;
      });

      console.log('✅ Total ML places loaded:', mlPlaces.length);
      setPlaces(mlPlaces);
    } catch (error) {
      console.error('Error in loadTripPlaces:', error);
      Alert.alert('Error', 'Ocurrió un error al cargar los lugares');
    }
  };

  const getMLPlaceType = (category?: string, googleTypes?: string[]): string => {
    // Map from our categories to ML types
    const categoryMap: Record<string, string> = {
      restaurant: 'restaurant',
      attraction: 'tourist_attraction',
      museum: 'museum',
      park: 'park',
      shopping: 'shopping',
      hotel: 'lodging',
      bar: 'bar',
      cafe: 'cafe',
      food: 'restaurant',
      entertainment: 'tourist_attraction',
    };

    // First try category mapping
    if (category && categoryMap[category]) {
      return categoryMap[category];
    }

    // Try to infer from Google types if available
    if (googleTypes && Array.isArray(googleTypes) && googleTypes.length > 0) {
      const types = googleTypes as string[];
      if (types.includes('restaurant')) return 'restaurant';
      if (types.includes('tourist_attraction')) return 'tourist_attraction';
      if (types.includes('museum')) return 'museum';
      if (types.includes('park')) return 'park';
      if (types.includes('shopping_mall')) return 'shopping_mall';
      if (types.includes('lodging')) return 'lodging';
    }

    // Default fallback
    return 'point_of_interest';
  };

  const getEstimatedDuration = (category?: string): number => {
    const durationMap: Record<string, number> = {
      restaurant: 1.5,
      attraction: 2.0,
      museum: 2.5,
      park: 1.0,
      shopping: 1.5,
      bar: 1.0,
      cafe: 0.5,
    };

    return durationMap[category || ''] || 1.5;
  };

  const getCategoryIcon = (category: string): string => {
    const icons: Record<string, string> = {
      activity: '🎯',
      accommodation: '🏨',
      transfer: '🚗',
      restaurant: '🍽️',
      attraction: '🎭',
      museum: '🏛️',
      park: '🌳',
      shopping: '🛍️',
      bar: '🍻',
      cafe: '☕',
    };
    return icons[category] || '📍';
  };

  const getCategoryLabel = (category: string): string => {
    const labels: Record<string, string> = {
      activity: 'Actividad',
      accommodation: 'Alojamiento',
      transfer: 'Traslado',
      restaurant: 'Restaurante',
      attraction: 'Atracción',
      museum: 'Museo',
      park: 'Parque',
      shopping: 'Compras',
      bar: 'Bar',
      cafe: 'Café',
    };
    return labels[category] || 'Lugar';
  };

  const getCategoryBadgeStyle = (category: string) => {
    const colors: Record<string, any> = {
      activity: { backgroundColor: '#3B82F6', color: 'white' },
      accommodation: { backgroundColor: '#10B981', color: 'white' },
      transfer: { backgroundColor: '#6B7280', color: 'white' },
      restaurant: { backgroundColor: '#EF4444', color: 'white' },
      attraction: { backgroundColor: '#8B5CF6', color: 'white' },
    };
    return colors[category] || { backgroundColor: '#F3F4F6', color: '#374151' };
  };

  const generateItinerary = async () => {
    console.log('🔥 generateItinerary called!');
    console.log('📊 Current state:', {
      placesCount: places.length,
      startDate: config.start_date,
      endDate: config.end_date,
      transport: config.transport_mode,
    });

    if (places.length === 0) {
      console.log('❌ No places available');
      Alert.alert('Sin lugares', 'No hay lugares disponibles para generar el itinerario');
      return;
    }

    // Validate dates
    if (!config.start_date || !config.end_date) {
      console.log('❌ Missing dates');
      Alert.alert('Fechas requeridas', 'Por favor selecciona las fechas de inicio y fin');
      return;
    }

    try {
      console.log('✅ Starting ML API call...');
      setLoading(true);
      console.log('🚀 Generating itinerary with config:', config);
      console.log('📍 Places count:', places.length);

      const payload = {
        places,
        start_date: config.start_date,
        end_date: config.end_date,
        transport_mode: config.transport_mode,
        daily_start_hour: config.daily_start_hour,
        daily_end_hour: config.daily_end_hour,
        max_walking_distance_km: config.max_walking_distance_km,
        max_daily_activities: config.max_daily_activities,
        preferences: config.preferences,
        accommodations: [],
      };

      console.log('📤 Sending payload to ML API:', JSON.stringify(payload, null, 2));

      const response = await fetch('https://goveling-ml.onrender.com/itinerary/multimodal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ ML API Error:', response.status, errorText);
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ ML API Response:', result);

      if (result.itinerary && Array.isArray(result.itinerary)) {
        console.log('✅ Itinerary received:', result.itinerary);
        setItinerary(result.itinerary);
        setShowResults(true);

        // Show success message with summary
        const totalDays = result.itinerary.length;
        const totalActivities = result.itinerary.reduce(
          (sum, day) => sum + (day.places?.filter((p) => p.category === 'activity').length || 0),
          0
        );

        Alert.alert(
          '🎉 ¡Itinerario generado!',
          `Se creó un itinerario de ${totalDays} días con ${totalActivities} actividades principales.`
        );
      } else {
        throw new Error('Respuesta inválida del servidor ML');
      }
    } catch (error) {
      console.error('❌ Error generating itinerary:', error);
      Alert.alert(
        'Error',
        error instanceof Error
          ? `No se pudo generar el itinerario: ${error.message}`
          : 'Error desconocido al generar el itinerario'
      );
    } finally {
      setLoading(false);
    }
  };

  const renderConfigForm = () => (
    <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Ruta Inteligente IA</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
          Genera un itinerario optimizado para {tripTitle || 'tu viaje'}
        </Text>
      </View>

      {/* Places Info */}
      <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          📍 Lugares del viaje
        </Text>
        <Text style={[styles.sectionSubtitle, { color: theme.colors.textMuted }]}>
          {places.length} lugares disponibles para optimizar
        </Text>
      </View>

      {/* Dates */}
      <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          📅 Fechas del itinerario
        </Text>

        <TouchableOpacity
          style={[
            styles.input,
            { backgroundColor: theme.colors.background, borderColor: theme.colors.border },
          ]}
          onPress={() => setShowStartDatePicker(true)}
        >
          <Text style={[styles.inputText, { color: theme.colors.text }]}>
            Fecha inicio: {config.start_date}
          </Text>
          <Ionicons name="calendar-outline" size={20} color={theme.colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.input,
            { backgroundColor: theme.colors.background, borderColor: theme.colors.border },
          ]}
          onPress={() => setShowEndDatePicker(true)}
        >
          <Text style={[styles.inputText, { color: theme.colors.text }]}>
            Fecha fin: {config.end_date}
          </Text>
          <Ionicons name="calendar-outline" size={20} color={theme.colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Transport Mode */}
      <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          🚗 Modo de transporte
        </Text>

        <TouchableOpacity
          style={[
            styles.input,
            { backgroundColor: theme.colors.background, borderColor: theme.colors.border },
          ]}
          onPress={() => setShowTransportPicker(true)}
        >
          <Text style={[styles.inputText, { color: theme.colors.text }]}>
            {TRANSPORT_MODES.find((mode) => mode.value === config.transport_mode)?.icon}{' '}
            {TRANSPORT_MODES.find((mode) => mode.value === config.transport_mode)?.label}
          </Text>
          <Ionicons name="chevron-down" size={20} color={theme.colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Schedule */}
      <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>⏰ Horario diario</Text>

        <View style={styles.row}>
          <View style={styles.timeInputContainer}>
            <Text style={[styles.label, { color: theme.colors.textMuted }]}>Inicio</Text>
            <TextInput
              style={[
                styles.timeInput,
                {
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                },
              ]}
              value={config.daily_start_hour.toString()}
              onChangeText={(text) => {
                const hour = parseInt(text) || 9;
                setConfig((prev) => ({
                  ...prev,
                  daily_start_hour: Math.max(6, Math.min(12, hour)),
                }));
              }}
              keyboardType="numeric"
              placeholder="9"
            />
            <Text style={[styles.label, { color: theme.colors.textMuted }]}>hrs</Text>
          </View>

          <View style={styles.timeInputContainer}>
            <Text style={[styles.label, { color: theme.colors.textMuted }]}>Fin</Text>
            <TextInput
              style={[
                styles.timeInput,
                {
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                },
              ]}
              value={config.daily_end_hour.toString()}
              onChangeText={(text) => {
                const hour = parseInt(text) || 18;
                setConfig((prev) => ({
                  ...prev,
                  daily_end_hour: Math.max(15, Math.min(23, hour)),
                }));
              }}
              keyboardType="numeric"
              placeholder="18"
            />
            <Text style={[styles.label, { color: theme.colors.textMuted }]}>hrs</Text>
          </View>
        </View>
      </View>

      {/* Preferences */}
      <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>⚖️ Preferencias</Text>

        <View style={styles.preferenceRow}>
          <Text style={[styles.preferenceLabel, { color: theme.colors.text }]}>🎭 Cultura</Text>
          <Text style={[styles.preferenceValue, { color: theme.colors.textMuted }]}>
            {Math.round(config.preferences.culture_weight * 100)}%
          </Text>
        </View>

        <View style={styles.preferenceRow}>
          <Text style={[styles.preferenceLabel, { color: theme.colors.text }]}>🌿 Naturaleza</Text>
          <Text style={[styles.preferenceValue, { color: theme.colors.textMuted }]}>
            {Math.round(config.preferences.nature_weight * 100)}%
          </Text>
        </View>

        <View style={styles.preferenceRow}>
          <Text style={[styles.preferenceLabel, { color: theme.colors.text }]}>🍽️ Gastronomía</Text>
          <Text style={[styles.preferenceValue, { color: theme.colors.textMuted }]}>
            {Math.round(config.preferences.food_weight * 100)}%
          </Text>
        </View>
      </View>

      {/* Generate Button */}
      <TouchableOpacity
        style={[styles.generateButton, loading && styles.disabledButton]}
        onPress={generateItinerary}
        disabled={loading || places.length === 0}
      >
        <LinearGradient
          colors={loading ? ['#9CA3AF', '#6B7280'] : ['#8B5CF6', '#7C3AED']}
          style={styles.generateButtonGradient}
        >
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Ionicons name="sparkles" size={20} color="white" />
              <Text style={styles.generateButtonText}>Generar Itinerario IA</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>

      <View style={{ height: 50 }} />
    </ScrollView>
  );

  const renderResults = () => (
    <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
      {/* Header mejorado con estadísticas */}
      <View style={styles.resultsHeader}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => setShowResults(false)} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={[styles.resultsTitle, { color: theme.colors.text }]}>
              Itinerario Generado
            </Text>
            <Text style={[styles.resultsSubtitle, { color: theme.colors.textMuted }]}>
              {itinerary.length} días optimizados por IA
            </Text>
          </View>
        </View>
      </View>

      {/* Lista de días mejorada */}
      {itinerary.map((day, index) => (
        <View
          key={day.day}
          style={[
            styles.dayCard,
            { backgroundColor: theme.colors.card },
            day.is_suggested && styles.suggestedDayCard,
          ]}
        >
          {/* Header del día */}
          <View style={styles.dayHeader}>
            <View style={styles.dayHeaderLeft}>
              <Text style={[styles.dayNumber, { color: theme.colors.text }]}>Día {day.day}</Text>
              <Text style={[styles.dayDate, { color: theme.colors.textMuted }]}>
                {formatDate(day.date)}
              </Text>
              {day.is_suggested && (
                <View style={styles.aiSuggestedBadge}>
                  <Ionicons name="sparkles" size={12} color="#8B5CF6" />
                  <Text style={styles.aiSuggestedText}>IA Sugerido</Text>
                </View>
              )}
            </View>
            <View>
              <Text style={[styles.dayStatsText, { color: theme.colors.textMuted }]}>
                {day.total_places || 0} lugares • {day.total_time || '0h'} total •{' '}
                {day.free_time || '0h'} libre
              </Text>
            </View>
          </View>

          {/* Hotel/Base del día */}
          {day.base && (
            <View style={[styles.baseLocation, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
              <Ionicons name="bed" size={16} color="#10B981" />
              <View style={styles.baseLocationInfo}>
                <Text style={[styles.baseLocationName, { color: theme.colors.text }]}>
                  {day.base.name}
                </Text>
                <Text
                  style={[styles.baseLocationAddress, { color: theme.colors.textMuted }]}
                  numberOfLines={1}
                >
                  {day.base.address}
                </Text>
                {day.base.rating && day.base.rating > 0 && (
                  <View style={styles.ratingContainer}>
                    <Ionicons name="star" size={12} color="#F59E0B" />
                    <Text style={[styles.ratingText, { color: theme.colors.text }]}>
                      {day.base.rating}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Actividades del día */}
          {day.places && day.places.length > 0 && (
            <View style={styles.activitiesContainer}>
              <Text style={[styles.activitiesTitle, { color: theme.colors.text }]}>
                🎯 Actividades programadas ({day.places.length})
              </Text>
              {day.places.map((place: any, placeIndex: number) => (
                <View
                  key={placeIndex}
                  style={[
                    styles.activityItem,
                    {
                      borderBottomColor:
                        theme.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#F3F4F6',
                    },
                  ]}
                >
                  <View style={styles.activityIconContainer}>
                    <Text style={styles.activityIcon}>
                      {getActivityIcon(place.type || place.category)}
                    </Text>
                  </View>
                  <View style={styles.activityInfo}>
                    <Text
                      style={[styles.activityName, { color: theme.colors.text }]}
                      numberOfLines={1}
                    >
                      {place.name}
                    </Text>
                    <View style={styles.activityDetails}>
                      {place.start && place.end && (
                        <Text style={[styles.activityTime, { color: theme.colors.primary }]}>
                          {place.start} - {place.end}
                        </Text>
                      )}
                      {place.duration_h && (
                        <Text style={[styles.activityDuration, { color: theme.colors.textMuted }]}>
                          {place.duration_h}h
                        </Text>
                      )}
                      {(place.priority || place.order) && (
                        <View style={styles.priorityBadge}>
                          <Text style={styles.priorityText}>#{place.priority || place.order}</Text>
                        </View>
                      )}
                    </View>
                    {place.description && (
                      <Text
                        style={[styles.activityDescription, { color: theme.colors.textMuted }]}
                        numberOfLines={2}
                      >
                        {place.description}
                      </Text>
                    )}
                  </View>
                  {place.rating && place.rating > 0 && (
                    <View style={styles.activityRating}>
                      <Ionicons name="star" size={14} color="#F59E0B" />
                      <Text style={[styles.activityRatingText, { color: theme.colors.text }]}>
                        {place.rating}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Recomendaciones accionables */}
          {day.actionable_recommendations && day.actionable_recommendations.length > 0 && (
            <View style={styles.recommendationsContainer}>
              <Text style={styles.recommendationsTitle}>💡 Recomendaciones</Text>
              {day.actionable_recommendations.map((rec: any, recIndex: number) => (
                <View key={recIndex} style={styles.recommendationItem}>
                  <Ionicons name="bulb" size={14} color="#F59E0B" />
                  <Text style={[styles.recommendationText, { color: theme.colors.text }]}>
                    {rec.message || rec.description || JSON.stringify(rec)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Razón de sugerencia si es día IA */}
          {day.suggestion_reason && (
            <View style={styles.suggestionReason}>
              <Ionicons name="information-circle" size={14} color="#8B5CF6" />
              <Text style={styles.suggestionReasonText}>{day.suggestion_reason}</Text>
            </View>
          )}

          {/* Show if no places */}
          {(!day.places || day.places.length === 0) && (
            <View style={styles.emptyDay}>
              <Text style={[styles.emptyDayText, { color: theme.colors.textMuted }]}>
                📅 Día libre - {day.free_time || '0h'} disponible para explorar
              </Text>
            </View>
          )}
        </View>
      ))}

      {/* Botones de acción mejorados */}
      <View style={styles.resultsActions}>
        <TouchableOpacity style={styles.mapButton} onPress={() => setShowMapModal(true)}>
          <LinearGradient
            colors={['#10B981', '#059669']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.mapButtonGradient}
          >
            <Ionicons name="map" size={20} color="#FFFFFF" />
            <Text style={styles.mapButtonText}>Ver en Mapa</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveButton, { borderColor: theme.colors.border }]}
          onPress={handleSaveItinerary}
        >
          <Ionicons name="bookmark" size={20} color={theme.colors.primary} />
          <Text style={[styles.saveButtonText, { color: theme.colors.primary }]}>
            Guardar Itinerario
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );

  // Función para formatear fechas
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
      });
    } catch (error) {
      return dateString;
    }
  };

  // Función para obtener iconos de actividades
  const getActivityIcon = (type?: string) => {
    const iconMap: { [key: string]: string } = {
      restaurant: '🍽️',
      tourist_attraction: '🏛️',
      museum: '🏛️',
      park: '🌳',
      shopping: '🛍️',
      entertainment: '🎭',
      accommodation: '🏨',
      transport: '🚗',
      food: '🍴',
      cafe: '☕',
      bar: '🍸',
      church: '⛪',
      monument: '🗿',
      beach: '🏖️',
      viewpoint: '👁️',
      point_of_interest: '📍',
      activity: '🎯',
    };
    return iconMap[type || ''] || iconMap.point_of_interest;
  };

  // Función para manejar guardar itinerario
  const handleSaveItinerary = () => {
    Alert.alert('Guardar Itinerario', '¿Deseas guardar este itinerario generado por IA?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Guardar',
        onPress: () => {
          // TODO: Implementar guardado en backend
          Alert.alert('Éxito', 'Itinerario guardado correctamente');
        },
      },
    ]);
  };

  const buildMapMarkersFromItinerary = () => {
    let markers: any[] = [];

    // Construir todos los marcadores primero
    itinerary.forEach((day) => {
      // Agregar hoteles base de cada día
      if (day.base && day.base.lat && day.base.lon) {
        markers.push({
          id: `base-${day.day}`,
          name: `🏠 BASE: ${day.base.name}`, // Distintivo con icono de casa
          type: 'accommodation',
          address: day.base.address,
          latitude: day.base.lat,
          longitude: day.base.lon,
          rating: day.base.rating,
          // Metadatos para identificación y filtrado
          isBase: true,
          isActivity: false,
          dayNumber: day.day,
          markerColor: '#059669', // Verde más oscuro para hoteles
          icon: '�', // Icono de casa en lugar de hotel
          priority: 999, // Hoteles siempre tienen prioridad alta
          markerSize: 'large', // Marcador más grande para hoteles
        });
      }

      // Agregar actividades/lugares de cada día
      (day.places || []).forEach((place, idx) => {
        if (place.lat && place.lng) {
          const activityNumber = place.priority || place.order || idx + 1;
          markers.push({
            id: `activity-${day.day}-${place.id || idx}`,
            name: `${activityNumber}. ${place.name}`, // Número de actividad al inicio
            type: place.category || place.type || 'activity',
            address: place.description || '',
            latitude: place.lat,
            longitude: place.lng,
            rating: place.rating,
            // Metadatos para contexto
            isBase: false,
            isActivity: true,
            dayNumber: day.day,
            activityOrder: activityNumber,
            duration: place.duration_h ? `${place.duration_h}h` : null,
            timeSlot: place.start && place.end ? `${place.start}-${place.end}` : null,
            markerColor: getMarkerColorByType(place.category || place.type),
            icon: getActivityIcon(place.type || place.category),
            markerSize: 'medium', // Tamaño medio para actividades
          });
        }
      });
    });

    // Aplicar filtros
    if (selectedDayFilter !== null) {
      markers = markers.filter((m) => m.dayNumber === selectedDayFilter);
    }

    if (showOnlyHotels) {
      markers = markers.filter((m) => m.isBase);
    }

    if (showOnlyActivities) {
      markers = markers.filter((m) => m.isActivity);
    }

    console.log('🗺️ Map markers built:', {
      total: markers.length,
      hotels: markers.filter((m) => m.isBase).length,
      activities: markers.filter((m) => m.isActivity).length,
      dayFilter: selectedDayFilter,
      hotelFilter: showOnlyHotels,
      activityFilter: showOnlyActivities,
      sampleMarkers: markers.slice(0, 5).map((m) => ({
        name: m.name,
        isBase: m.isBase,
        color: m.markerColor,
        icon: m.icon,
        day: m.dayNumber,
      })),
    });

    return markers;
  };

  const getMarkerColorByType = (type?: string): string => {
    const colorMap: Record<string, string> = {
      restaurant: '#EF4444', // Rojo
      tourist_attraction: '#8B5CF6', // Púrpura
      museum: '#6366F1', // Índigo
      park: '#22C55E', // Verde claro
      shopping: '#F59E0B', // Ámbar
      entertainment: '#EC4899', // Rosa
      accommodation: '#059669', // Verde oscuro (reservado para hoteles base)
      transport: '#6B7280', // Gris
      food: '#EF4444', // Rojo
      cafe: '#92400E', // Café
      bar: '#7C3AED', // Violeta
      church: '#1F2937', // Gris oscuro
      monument: '#78716C', // Piedra
      beach: '#06B6D4', // Cian
      viewpoint: '#0EA5E9', // Azul
      activity: '#3B82F6', // Azul
    };
    return colorMap[type || ''] || '#3B82F6'; // Azul por defecto
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header */}
        <View style={[styles.modalHeader, { backgroundColor: theme.colors.card }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {showResults ? renderResults() : renderConfigForm()}

        {/* Date Pickers */}
        {showStartDatePicker && (
          <DateTimePicker
            value={new Date(config.start_date)}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowStartDatePicker(false);
              if (selectedDate) {
                setConfig((prev) => ({
                  ...prev,
                  start_date: selectedDate.toISOString().split('T')[0],
                }));
              }
            }}
          />
        )}

        {showEndDatePicker && (
          <DateTimePicker
            value={new Date(config.end_date)}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowEndDatePicker(false);
              if (selectedDate) {
                setConfig((prev) => ({
                  ...prev,
                  end_date: selectedDate.toISOString().split('T')[0],
                }));
              }
            }}
          />
        )}

        {/* Transport Picker */}
        {showTransportPicker && (
          <Modal
            visible={showTransportPicker}
            transparent
            animationType="fade"
            onRequestClose={() => setShowTransportPicker(false)}
          >
            <TouchableOpacity
              style={styles.pickerOverlay}
              activeOpacity={1}
              onPress={() => setShowTransportPicker(false)}
            >
              <View style={[styles.pickerModal, { backgroundColor: theme.colors.card }]}>
                {TRANSPORT_MODES.map((mode) => (
                  <TouchableOpacity
                    key={mode.value}
                    style={styles.pickerOption}
                    onPress={() => {
                      setConfig((prev) => ({ ...prev, transport_mode: mode.value as any }));
                      setShowTransportPicker(false);
                    }}
                  >
                    <Text style={[styles.pickerOptionText, { color: theme.colors.text }]}>
                      {mode.icon} {mode.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          </Modal>
        )}

        {/* Map Modal (reuses existing ConditionalMapView) */}
        <Modal
          visible={showMapModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowMapModal(false)}
        >
          <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.modalHeader, { backgroundColor: theme.colors.card }]}>
              <View style={styles.mapHeaderContent}>
                <Text style={[styles.mapTitle, { color: theme.colors.text }]}>
                  Mapa del Itinerario
                </Text>
                <TouchableOpacity onPress={() => setShowMapModal(false)} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color={theme.colors.text} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Controles de filtrado */}
            <View style={[styles.mapFilters, { backgroundColor: theme.colors.card }]}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterScrollContent}
              >
                {/* Filtro por día */}
                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    selectedDayFilter === null && styles.filterButtonActive,
                    { borderColor: theme.colors.border },
                  ]}
                  onPress={() => setSelectedDayFilter(null)}
                >
                  <Text
                    style={[
                      styles.filterButtonText,
                      selectedDayFilter === null && styles.filterButtonTextActive,
                      { color: selectedDayFilter === null ? '#FFFFFF' : theme.colors.text },
                    ]}
                  >
                    Todos los días
                  </Text>
                </TouchableOpacity>

                {itinerary.slice(0, 10).map((day) => (
                  <TouchableOpacity
                    key={day.day}
                    style={[
                      styles.filterButton,
                      selectedDayFilter === day.day && styles.filterButtonActive,
                      { borderColor: theme.colors.border },
                    ]}
                    onPress={() => setSelectedDayFilter(day.day)}
                  >
                    <Text
                      style={[
                        styles.filterButtonText,
                        selectedDayFilter === day.day && styles.filterButtonTextActive,
                        { color: selectedDayFilter === day.day ? '#FFFFFF' : theme.colors.text },
                      ]}
                    >
                      Día {day.day}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Filtros por tipo */}
              <View style={styles.typeFilters}>
                <TouchableOpacity
                  style={[
                    styles.typeFilterButton,
                    showOnlyHotels && styles.typeFilterActive,
                    { borderColor: theme.colors.border },
                  ]}
                  onPress={() => {
                    setShowOnlyHotels(!showOnlyHotels);
                    setShowOnlyActivities(false);
                  }}
                >
                  <Text style={styles.typeFilterIcon}>🏨</Text>
                  <Text
                    style={[
                      styles.typeFilterText,
                      { color: showOnlyHotels ? '#FFFFFF' : theme.colors.text },
                    ]}
                  >
                    Hoteles
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.typeFilterButton,
                    showOnlyActivities && styles.typeFilterActive,
                    { borderColor: theme.colors.border },
                  ]}
                  onPress={() => {
                    setShowOnlyActivities(!showOnlyActivities);
                    setShowOnlyHotels(false);
                  }}
                >
                  <Text style={styles.typeFilterIcon}>🎯</Text>
                  <Text
                    style={[
                      styles.typeFilterText,
                      { color: showOnlyActivities ? '#FFFFFF' : theme.colors.text },
                    ]}
                  >
                    Actividades
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.typeFilterButton,
                    !showOnlyHotels && !showOnlyActivities && styles.typeFilterActive,
                    { borderColor: theme.colors.border },
                  ]}
                  onPress={() => {
                    setShowOnlyHotels(false);
                    setShowOnlyActivities(false);
                  }}
                >
                  <Text style={styles.typeFilterIcon}>📍</Text>
                  <Text
                    style={[
                      styles.typeFilterText,
                      {
                        color:
                          !showOnlyHotels && !showOnlyActivities ? '#FFFFFF' : theme.colors.text,
                      },
                    ]}
                  >
                    Todo
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.mapContainer}>
              <ConditionalMapView
                accommodations={buildMapMarkersFromItinerary()}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    padding: 8,
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    paddingVertical: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
  },
  section: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 12,
  },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 12,
  },
  inputText: {
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  timeInputContainer: {
    flex: 1,
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    marginBottom: 4,
  },
  timeInput: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 6,
    textAlign: 'center',
    fontSize: 16,
    width: 60,
  },
  preferenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  preferenceLabel: {
    fontSize: 16,
  },
  preferenceValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  generateButton: {
    marginVertical: 20,
  },
  disabledButton: {
    opacity: 0.6,
  },
  generateButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  generateButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  dayCard: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  dayHeader: {
    marginBottom: 12,
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  dayStats: {
    fontSize: 14,
  },
  activityCard: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  activityTimeLegacy: {
    width: 80,
    justifyContent: 'center',
  },
  activityTimeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  activityContent: {
    flex: 1,
    paddingLeft: 12,
  },
  activityName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  activityDetailsLegacy: {
    fontSize: 14,
  },
  activityDescription: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  ratingText: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyDay: {
    padding: 20,
    alignItems: 'center',
  },
  emptyDayText: {
    fontSize: 16,
    textAlign: 'center',
  },
  accommodationCard: {
    backgroundColor: '#F0FDF4',
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '600',
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerModal: {
    width: '80%',
    borderRadius: 12,
    padding: 16,
  },
  pickerOption: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  pickerOptionText: {
    fontSize: 16,
  },
  actionBarContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1200,
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    elevation: 4,
  },
  mapButtonText: {
    color: 'white',
    fontWeight: '700',
    marginLeft: 8,
  },
  mapButtonSecondary: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  mapButtonSecondaryText: {
    fontWeight: '700',
  },
  mapContainer: {
    flex: 1,
    padding: 0,
  },
  // Enhanced results styles
  resultsHeader: {
    padding: 20,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerContent: {
    flex: 1,
    marginLeft: 12,
  },
  resultsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  resultsSubtitle: {
    fontSize: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  suggestedDayCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#8B5CF6',
  },
  dayHeaderLeft: {
    flex: 1,
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  dayDate: {
    fontSize: 14,
    marginBottom: 4,
  },
  dayStatsText: {
    fontSize: 12,
    textAlign: 'right',
  },
  aiSuggestedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  aiSuggestedText: {
    fontSize: 10,
    color: '#8B5CF6',
    fontWeight: '600',
    marginLeft: 4,
  },
  baseLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  baseLocationInfo: {
    flex: 1,
    marginLeft: 12,
  },
  baseLocationName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  baseLocationAddress: {
    fontSize: 12,
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activitiesContainer: {
    marginBottom: 12,
  },
  activitiesTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  activityIconContainer: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityIcon: {
    fontSize: 16,
  },
  activityInfo: {
    flex: 1,
    paddingLeft: 8,
  },
  activityDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  activityTime: {
    fontSize: 12,
    fontWeight: '600',
  },
  activityDuration: {
    fontSize: 12,
  },
  priorityBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 10,
    color: '#3B82F6',
    fontWeight: '600',
  },
  activityRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  activityRatingText: {
    fontSize: 12,
    marginLeft: 4,
  },
  recommendationsContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.05)',
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  recommendationsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F59E0B',
    marginBottom: 8,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  recommendationText: {
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
  suggestionReason: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
    backgroundColor: 'rgba(139, 92, 246, 0.05)',
    borderRadius: 8,
  },
  suggestionReasonText: {
    fontSize: 11,
    color: '#8B5CF6',
    marginLeft: 6,
    fontStyle: 'italic',
  },
  resultsActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  mapButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    flex: 1,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    flex: 1,
  },
  saveButtonText: {
    fontWeight: '600',
    fontSize: 14,
  },
  // Estilos para el mapa
  mapHeaderContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  mapFilters: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterScrollContent: {
    paddingRight: 16,
    gap: 8,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: 'transparent',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  typeFilters: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    justifyContent: 'center',
  },
  typeFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: 'transparent',
    gap: 6,
  },
  typeFilterActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  typeFilterIcon: {
    fontSize: 14,
  },
  typeFilterText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
