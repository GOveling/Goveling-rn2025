import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  Linking,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '~/lib/supabase';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';
import HotelBookingModal from '~/components/HotelBookingModal';
import ConditionalMapView from '~/components/ConditionalMapView';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Accommodation {
  id: string;
  name: string;
  type: 'hotel' | 'airbnb' | 'resort' | 'hostel' | 'cabin' | 'apartment';
  address: string;
  latitude: number;
  longitude: number;
  price_per_night?: number;
  rating?: number;
  photos?: string[];
  amenities?: string[];
  contact_info?: {
    phone?: string;
    email?: string;
    website?: string;
  };
  availability?: {
    check_in: string;
    check_out: string;
  };
}

const accommodationTypes = [
  { type: 'hotel', label: 'Hoteles', icon: '🏨', color: '#FF6B6B' },
  { type: 'airbnb', label: 'Airbnb/Casa Particular', icon: '🏠', color: '#4ECDC4' },
  { type: 'resort', label: 'Resorts', icon: '🏖️', color: '#45B7D1' },
  { type: 'hostel', label: 'Hostales', icon: '🏠', color: '#96CEB4' },
  { type: 'cabin', label: 'Cabañas', icon: '🏘️', color: '#FFEAA7' },
  { type: 'apartment', label: 'Apartamentos', icon: '🏢', color: '#DDA0DD' },
];

const quickBookingOptions = [
  {
    title: 'Buscar Hoteles',
    subtitle: 'Encuentra y compara hoteles',
    icon: '🏨',
    color: '#FF6B6B',
    action: 'hotels',
  },
  {
    title: 'Booking.com',
    subtitle: 'Hoteles y apartamentos',
    icon: '🔗',
    color: '#0071C2',
    action: 'booking',
  },
  {
    title: 'Airbnb',
    subtitle: 'Casas y experiencias únicas',
    icon: '🏠',
    color: '#FF5A5F',
    action: 'airbnb',
  },
  {
    title: 'Dirección Específica',
    subtitle: 'Agregar ubicación personalizada',
    icon: '📍',
    color: '#8B5CF6',
    action: 'custom',
  },
];

export default function AccommodationExplorer() {
  const { id: tripId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  // State
  const [activeTab, setActiveTab] = useState<'explore' | 'saved'>('explore');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
  const [savedAccommodations, setSavedAccommodations] = useState<Accommodation[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showCustomAddressModal, setShowCustomAddressModal] = useState(false);
  const [showHotelBookingModal, setShowHotelBookingModal] = useState(false);
  const [tripDestination, setTripDestination] = useState('');
  const [mapRegion, setMapRegion] = useState({
    latitude: 40.7128,
    longitude: -74.006,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  // Custom address state
  const [customAddress, setCustomAddress] = useState({
    name: '',
    address: '',
    city: '',
    country: '',
    type: 'airbnb' as const,
  });

  useEffect(() => {
    getCurrentLocation();
    loadSavedAccommodations();
    loadTripInfo();
  }, []);

  const loadTripInfo = async () => {
    if (!tripId) return;

    try {
      const { data: trip } = await supabase
        .from('trips')
        .select('title, destination')
        .eq('id', tripId)
        .single();

      if (trip?.destination) {
        setTripDestination(trip.destination);
        setSearchQuery(trip.destination);
      }
    } catch (error) {
      console.error('Error loading trip info:', error);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const location = await Location.getCurrentPositionAsync({});
      setMapRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const loadSavedAccommodations = async () => {
    if (!tripId) return;

    try {
      const { data } = await supabase.from('trip_accommodations').select('*').eq('trip_id', tripId);

      setSavedAccommodations(data || []);
    } catch (error) {
      console.error('Error loading saved accommodations:', error);
    }
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'hotels':
        setShowHotelBookingModal(true);
        break;
      case 'booking':
        Linking.openURL('https://www.booking.com');
        break;
      case 'airbnb':
        Linking.openURL('https://www.airbnb.com');
        break;
      case 'custom':
        setShowCustomAddressModal(true);
        break;
    }
  };

  const searchAccommodations = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Error', 'Por favor ingresa una ciudad o dirección');
      return;
    }

    setLoading(true);
    try {
      // In a real app, you would call Google Places API or similar
      // For now, we'll simulate some results
      const mockResults: Accommodation[] = [
        {
          id: '1',
          name: 'Hotel Plaza Central',
          type: 'hotel',
          address: `${searchQuery}, Centro`,
          latitude: mapRegion.latitude + 0.001,
          longitude: mapRegion.longitude + 0.001,
          price_per_night: 120,
          rating: 4.5,
          amenities: ['WiFi', 'Piscina', 'Desayuno', 'Gimnasio'],
          contact_info: {
            phone: '+1234567890',
            website: 'https://hotelplaza.com',
          },
        },
        {
          id: '2',
          name: 'Apartamento Moderno',
          type: 'airbnb',
          address: `${searchQuery}, Zona Residencial`,
          latitude: mapRegion.latitude - 0.002,
          longitude: mapRegion.longitude + 0.002,
          price_per_night: 85,
          rating: 4.8,
          amenities: ['WiFi', 'Cocina', 'Lavadora', 'Balcón'],
        },
        {
          id: '3',
          name: 'Resort Paradise',
          type: 'resort',
          address: `${searchQuery}, Costa`,
          latitude: mapRegion.latitude + 0.003,
          longitude: mapRegion.longitude - 0.001,
          price_per_night: 250,
          rating: 4.7,
          amenities: ['Todo Incluido', 'Spa', 'Playa Privada', 'Golf'],
          contact_info: {
            phone: '+1234567891',
            website: 'https://resortparadise.com',
          },
        },
      ];

      setAccommodations(mockResults);
    } catch (error) {
      console.error('Error searching accommodations:', error);
      Alert.alert('Error', 'No se pudieron cargar los alojamientos');
    } finally {
      setLoading(false);
    }
  };

  const saveAccommodation = async (accommodation: Accommodation) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) return;

      const { error } = await supabase.from('trip_accommodations').insert({
        trip_id: tripId,
        user_id: user.user.id,
        name: accommodation.name,
        type: accommodation.type,
        address: accommodation.address,
        latitude: accommodation.latitude,
        longitude: accommodation.longitude,
        price_per_night: accommodation.price_per_night,
        rating: accommodation.rating,
        amenities: accommodation.amenities,
        contact_info: accommodation.contact_info,
        availability: accommodation.availability,
      });

      if (error) throw error;

      Alert.alert('Éxito', 'Alojamiento guardado en tu viaje');
      loadSavedAccommodations();
    } catch (error) {
      console.error('Error saving accommodation:', error);
      Alert.alert('Error', 'No se pudo guardar el alojamiento');
    }
  };

  const addCustomAccommodation = async () => {
    if (!customAddress.name || !customAddress.address) {
      Alert.alert('Error', 'Por favor completa todos los campos obligatorios');
      return;
    }

    try {
      // Geocode the address to get coordinates
      const geocodeResult = await Location.geocodeAsync(
        `${customAddress.address}, ${customAddress.city}, ${customAddress.country}`
      );

      if (geocodeResult.length === 0) {
        Alert.alert('Error', 'No se pudo encontrar la dirección especificada');
        return;
      }

      const { latitude, longitude } = geocodeResult[0];

      const newAccommodation: Accommodation = {
        id: Date.now().toString(),
        name: customAddress.name,
        type: customAddress.type,
        address: `${customAddress.address}, ${customAddress.city}, ${customAddress.country}`,
        latitude,
        longitude,
      };

      await saveAccommodation(newAccommodation);
      setShowCustomAddressModal(false);
      setCustomAddress({ name: '', address: '', city: '', country: '', type: 'airbnb' });
    } catch (error) {
      console.error('Error adding custom accommodation:', error);
      Alert.alert('Error', 'No se pudo agregar el alojamiento personalizado');
    }
  };

  const openExternalBooking = (accommodation: Accommodation) => {
    const { contact_info } = accommodation;

    if (contact_info?.website) {
      Linking.openURL(contact_info.website);
    } else if (contact_info?.phone) {
      Linking.openURL(`tel:${contact_info.phone}`);
    } else {
      Alert.alert('Contacto', 'No hay información de contacto disponible');
    }
  };

  const renderQuickActions = () => (
    <View style={styles.quickActionsContainer}>
      <Text style={styles.sectionTitle}>Opciones de Búsqueda</Text>
      <View style={styles.quickActionsGrid}>
        {quickBookingOptions.map((option, index) => (
          <TouchableOpacity
            key={index}
            style={styles.quickActionCard}
            onPress={() => handleQuickAction(option.action)}
          >
            <LinearGradient
              colors={[option.color, `${option.color}CC`]}
              style={styles.quickActionGradient}
            >
              <Text style={styles.quickActionIcon}>{option.icon}</Text>
              <Text style={styles.quickActionTitle}>{option.title}</Text>
              <Text style={styles.quickActionSubtitle}>{option.subtitle}</Text>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderAccommodationCard = (accommodation: Accommodation, isSaved = false) => {
    const typeConfig =
      accommodationTypes.find((t) => t.type === accommodation.type) || accommodationTypes[0];

    return (
      <View key={accommodation.id} style={styles.accommodationCard}>
        <View style={styles.cardHeader}>
          <View style={styles.typeContainer}>
            <Text style={styles.typeIcon}>{typeConfig.icon}</Text>
            <Text style={styles.typeName}>{typeConfig.label}</Text>
          </View>
          {accommodation.rating && (
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={16} color="#FFD700" />
              <Text style={styles.rating}>{accommodation.rating}</Text>
            </View>
          )}
        </View>

        <Text style={styles.accommodationName}>{accommodation.name}</Text>
        <Text style={styles.accommodationAddress}>{accommodation.address}</Text>

        {accommodation.price_per_night && (
          <Text style={styles.price}>${accommodation.price_per_night}/noche</Text>
        )}

        {accommodation.amenities && accommodation.amenities.length > 0 && (
          <View style={styles.amenitiesContainer}>
            {accommodation.amenities.slice(0, 3).map((amenity, index) => (
              <View key={index} style={styles.amenityTag}>
                <Text style={styles.amenityText}>{amenity}</Text>
              </View>
            ))}
            {accommodation.amenities.length > 3 && (
              <Text style={styles.moreAmenities}>+{accommodation.amenities.length - 3} más</Text>
            )}
          </View>
        )}

        <View style={styles.cardActions}>
          {!isSaved && (
            <TouchableOpacity
              style={styles.saveButton}
              onPress={() => saveAccommodation(accommodation)}
            >
              <Ionicons name="heart-outline" size={20} color="#8B5CF6" />
              <Text style={styles.saveButtonText}>Guardar</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.contactButton}
            onPress={() => openExternalBooking(accommodation)}
          >
            <Ionicons name="call-outline" size={20} color="white" />
            <Text style={styles.contactButtonText}>Contactar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderCustomAddressModal = () => (
    <Modal visible={showCustomAddressModal} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowCustomAddressModal(false)}>
            <Text style={styles.modalCancel}>Cancelar</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Agregar Dirección Específica</Text>
          <TouchableOpacity onPress={addCustomAccommodation}>
            <Text style={styles.modalSave}>Guardar</Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContent}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Información Básica</Text>

              <TextInput
                style={styles.input}
                placeholder="Nombre del alojamiento *"
                value={customAddress.name}
                onChangeText={(text) => setCustomAddress({ ...customAddress, name: text })}
              />

              <TextInput
                style={styles.input}
                placeholder="Dirección completa *"
                value={customAddress.address}
                onChangeText={(text) => setCustomAddress({ ...customAddress, address: text })}
                multiline
              />

              <TextInput
                style={styles.input}
                placeholder="Ciudad *"
                value={customAddress.city}
                onChangeText={(text) => setCustomAddress({ ...customAddress, city: text })}
              />

              <TextInput
                style={styles.input}
                placeholder="País *"
                value={customAddress.country}
                onChangeText={(text) => setCustomAddress({ ...customAddress, country: text })}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tipo de Alojamiento</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.typeSelector}>
                  {accommodationTypes.map((type) => (
                    <TouchableOpacity
                      key={type.type}
                      style={[
                        styles.typeOption,
                        customAddress.type === type.type && styles.typeOptionSelected,
                      ]}
                      onPress={() => setCustomAddress({ ...customAddress, type: type.type as any })}
                    >
                      <Text style={styles.typeOptionIcon}>{type.icon}</Text>
                      <Text
                        style={[
                          styles.typeOptionText,
                          customAddress.type === type.type && styles.typeOptionTextSelected,
                        ]}
                      >
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient
        colors={['#8B5CF6', '#EC4899']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Explorar Estadías</Text>
          <TouchableOpacity
            onPress={() => setShowFilters(!showFilters)}
            style={styles.filterButton}
          >
            <Ionicons name="options-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'explore' && styles.activeTab]}
            onPress={() => setActiveTab('explore')}
          >
            <Text style={[styles.tabText, activeTab === 'explore' && styles.activeTabText]}>
              Explorar
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'saved' && styles.activeTab]}
            onPress={() => setActiveTab('saved')}
          >
            <Text style={[styles.tabText, activeTab === 'saved' && styles.activeTabText]}>
              Guardados ({savedAccommodations.length})
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'explore' ? (
          <>
            {/* Quick Actions */}
            {renderQuickActions()}

            {/* Search Section for Manual Search */}
            <View style={styles.searchContainer}>
              <Text style={styles.sectionTitle}>Búsqueda Manual</Text>
              <View style={styles.searchBar}>
                <Ionicons name="search-outline" size={20} color="#666" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Buscar por ciudad o destino..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={searchAccommodations}
                />
                <TouchableOpacity onPress={searchAccommodations} disabled={loading}>
                  {loading ? (
                    <ActivityIndicator size="small" color="#8B5CF6" />
                  ) : (
                    <Text style={styles.searchButton}>Buscar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {accommodations.length > 0 && (
              <>
                {/* Map View */}
                <View style={styles.mapContainer}>
                  <ConditionalMapView
                    accommodations={accommodations}
                    style={styles.map}
                    mapRegion={mapRegion}
                  />
                </View>

                {/* Results List */}
                <View style={styles.resultsContainer}>
                  <Text style={styles.resultsTitle}>
                    {accommodations.length} alojamientos encontrados
                  </Text>
                  {accommodations.map((accommodation) => renderAccommodationCard(accommodation))}
                </View>
              </>
            )}

            {accommodations.length === 0 && !loading && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateIcon}>🏨</Text>
                <Text style={styles.emptyStateTitle}>Encuentra Tu Alojamiento Ideal</Text>
                <Text style={styles.emptyStateText}>
                  Utiliza las opciones de arriba para buscar hoteles, Airbnb y más opciones de
                  estadía para tu viaje.
                </Text>
              </View>
            )}
          </>
        ) : (
          <>
            {/* Saved Accommodations */}
            {savedAccommodations.length > 0 ? (
              <View style={styles.savedContainer}>
                <Text style={styles.savedTitle}>Alojamientos Guardados</Text>
                {savedAccommodations.map((accommodation) =>
                  renderAccommodationCard(accommodation, true)
                )}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateIcon}>❤️</Text>
                <Text style={styles.emptyStateTitle}>Sin Alojamientos Guardados</Text>
                <Text style={styles.emptyStateText}>
                  Los alojamientos que guardes aparecerán aquí.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Modals */}
      {renderCustomAddressModal()}

      <HotelBookingModal
        visible={showHotelBookingModal}
        onClose={() => setShowHotelBookingModal(false)}
        destination={tripDestination || searchQuery}
      />
    </View>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: 'white',
    flex: 1,
    textAlign: 'center' as const,
    marginHorizontal: 16,
  },
  filterButton: {
    padding: 8,
  },
  tabContainer: {
    flexDirection: 'row' as const,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center' as const,
  },
  activeTab: {
    backgroundColor: 'white',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.8)',
  },
  activeTabText: {
    color: '#8B5CF6',
  },
  content: {
    flex: 1,
  },
  quickActionsContainer: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  quickActionsGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 12,
  },
  quickActionCard: {
    width: (SCREEN_WIDTH - 64) / 2,
    borderRadius: 16,
    overflow: 'hidden' as const,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  quickActionGradient: {
    padding: 20,
    alignItems: 'center' as const,
    minHeight: 120,
    justifyContent: 'center' as const,
  },
  quickActionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: 'white',
    textAlign: 'center' as const,
    marginBottom: 4,
  },
  quickActionSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center' as const,
  },
  searchContainer: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchBar: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
    color: '#374151',
  },
  searchButton: {
    color: '#8B5CF6',
    fontWeight: '600' as const,
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1F2937',
    marginBottom: 16,
  },
  mapContainer: {
    margin: 20,
    borderRadius: 16,
    overflow: 'hidden' as const,
    minHeight: 200,
  },
  map: {
    flex: 1,
    minHeight: 200,
  },
  mapPlaceholder: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: '#F3F4F6',
  },
  mapPlaceholderText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center' as const,
    marginBottom: 8,
  },
  mapPlaceholderSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center' as const,
    fontStyle: 'italic' as const,
  },
  resultsContainer: {
    padding: 20,
    paddingTop: 0,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1F2937',
    marginBottom: 16,
  },
  accommodationCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  typeContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  typeIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  typeName: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500' as const,
  },
  ratingContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  rating: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#374151',
  },
  accommodationName: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#1F2937',
    marginBottom: 4,
  },
  accommodationAddress: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  price: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#10B981',
    marginBottom: 12,
  },
  amenitiesContainer: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
    marginBottom: 16,
  },
  amenityTag: {
    backgroundColor: '#EBF8FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  amenityText: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '500' as const,
  },
  moreAmenities: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic' as const,
  },
  cardActions: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonText: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '600' as const,
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: '#8B5CF6',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  contactButtonText: {
    fontSize: 14,
    color: 'white',
    fontWeight: '600' as const,
  },
  savedContainer: {
    padding: 20,
  },
  savedTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#1F2937',
    marginBottom: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: 40,
    minHeight: 400,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center' as const,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center' as const,
    lineHeight: 24,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalCancel: {
    fontSize: 16,
    color: '#6B7280',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#1F2937',
  },
  modalSave: {
    fontSize: 16,
    color: '#8B5CF6',
    fontWeight: '600' as const,
  },
  modalContent: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#374151',
    marginBottom: 16,
  },
  typeSelector: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  typeOption: {
    alignItems: 'center' as const,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: 'white',
    minWidth: 100,
  },
  typeOptionSelected: {
    borderColor: '#8B5CF6',
    backgroundColor: '#F3F4F6',
  },
  typeOptionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  typeOptionText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center' as const,
    fontWeight: '500' as const,
  },
  typeOptionTextSelected: {
    color: '#8B5CF6',
    fontWeight: '600' as const,
  },
};
