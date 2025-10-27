import React from 'react';

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Switch,
  Alert,
  Modal,
  StyleSheet,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useRouter, useLocalSearchParams } from 'expo-router';

import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import AppMap from '../../src/components/AppMap';
import PlaceCard from '../../src/components/PlaceCard';
import PlaceDetailModal from '../../src/components/PlaceDetailModal';
import {
  allUICategories as _allUICategories,
  uiCategoriesGeneral,
  uiCategoriesSpecific,
  categoryDisplayToInternal,
} from '../../src/lib/categories';
import { reverseGeocode } from '../../src/lib/geocoding';
import { searchPlacesEnhanced, EnhancedPlace, clearPlacesCache } from '../../src/lib/placesSearch';
import { supabase } from '../../src/lib/supabase';
import { resolveCurrentUserRoleForTripId } from '../../src/lib/userUtils';

export default function ExploreTab() {
  const { t: _t, i18n } = useTranslation();
  const router = useRouter();
  const { tripId, returnTo } = useLocalSearchParams<{ tripId?: string; returnTo?: string }>();

  const [search, setSearch] = React.useState('');
  const [selectedCategories, setSelectedCategories] = React.useState<string[]>([]);
  const [expandedCategories, setExpandedCategories] = React.useState(false);
  const [nearCurrentLocation, setNearCurrentLocation] = React.useState(false); // inicia apagado
  const [showMap, setShowMap] = React.useState(false);
  const [_currentLocation, setCurrentLocation] = React.useState('Ubicación desactivada');
  const [userCoords, setUserCoords] = React.useState<{ lat: number; lng: number } | undefined>(
    undefined
  );
  const [searchResults, setSearchResults] = React.useState<EnhancedPlace[]>([]);
  const [hasSearched, setHasSearched] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [locLoading, setLocLoading] = React.useState(false);
  const [selectedPlace, setSelectedPlace] = React.useState<EnhancedPlace | null>(null);
  const [modalVisible, setModalVisible] = React.useState(false);
  const [tripTitle, setTripTitle] = React.useState<string>('');
  const abortRef = React.useRef<AbortController | null>(null);

  // Location handling functions for the map
  const handleLocationFound = (location: { latitude: number; longitude: number }) => {
    setUserCoords({ lat: location.latitude, lng: location.longitude });
    // No longer show alert with coordinates
  };

  const handleLocationError = (error: string) => {
    Alert.alert('Error de ubicación', error);
  };

  // Removed inline definitions of categories and use centralized ones
  const generalCategories = uiCategoriesGeneral;
  const specificCategories = uiCategoriesSpecific;

  const toggleCategory = (categoryName: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryName) ? prev.filter((c) => c !== categoryName) : [...prev, categoryName]
    );
  };

  const ensureLocation = React.useCallback(async () => {
    try {
      setLocLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setCurrentLocation('Permiso denegado');
        setUserCoords(undefined);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setUserCoords({ lat, lng });
      // Primero usar reverse geocode Nominatim (más rico)
      const geo = await reverseGeocode(lat, lng);
      if (geo) {
        setCurrentLocation(
          [geo.city, geo.country].filter(Boolean).join(', ') || geo.displayName || 'Ubicación lista'
        );
      } else {
        setCurrentLocation('Ubicación lista');
      }
    } catch (e) {
      setCurrentLocation('Error obteniendo ubicación');
    } finally {
      setLocLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (nearCurrentLocation && !userCoords && !locLoading) {
      ensureLocation();
    }
  }, [nearCurrentLocation, userCoords, locLoading, ensureLocation]);

  // Load trip information if tripId is provided
  React.useEffect(() => {
    const loadTripInfo = async () => {
      if (tripId) {
        try {
          const { data: trip, error } = await supabase
            .from('trips')
            .select('title')
            .eq('id', tripId)
            .single();

          if (error) {
            console.error('Error loading trip info:', error);
          } else if (trip) {
            setTripTitle(trip.title);
          }
        } catch (error) {
          console.error('Error loading trip info:', error);
        }
      }
    };

    loadTripInfo();
  }, [tripId]);

  const handlePlacePress = (place: EnhancedPlace) => {
    setSelectedPlace(place);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedPlace(null);
  };

  // Function to add place to trip
  const addPlaceToTrip = async (place: EnhancedPlace) => {
    if (!tripId) {
      Alert.alert('Error', 'No se pudo identificar el viaje');
      return;
    }

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user?.id) {
        Alert.alert('Error', 'Usuario no autenticado');
        return;
      }

      // Verificar permisos: solo owner/editor
      try {
        const role = await resolveCurrentUserRoleForTripId(tripId);
        if (!(role === 'owner' || role === 'editor')) {
          Alert.alert(
            'Sin permisos',
            'No tienes permisos para agregar lugares a este viaje. Solo el propietario y editores pueden agregar.'
          );
          return;
        }
      } catch (e) {
        console.warn('[Explore] No se pudo resolver el rol del usuario, asumiendo sin permisos', e);
        Alert.alert('Sin permisos', 'No fue posible verificar permisos para agregar al viaje');
        return;
      }

      // Check if place already exists in trip
      const { data: existingPlace } = await supabase
        .from('trip_places')
        .select('id')
        .eq('trip_id', tripId)
        .eq('place_id', place.id)
        .maybeSingle();

      if (existingPlace) {
        Alert.alert('Lugar ya agregado', 'Este lugar ya está en tu viaje');
        return;
      }

      // Helper function to convert price level string to number
      const convertPriceLevel = (priceLevel?: number | string | null): number | null => {
        if (typeof priceLevel === 'number') return priceLevel;
        if (!priceLevel) return null;

        const priceLevelMap: { [key: string]: number } = {
          PRICE_LEVEL_FREE: 0,
          PRICE_LEVEL_INEXPENSIVE: 1,
          PRICE_LEVEL_MODERATE: 2,
          PRICE_LEVEL_EXPENSIVE: 3,
          PRICE_LEVEL_VERY_EXPENSIVE: 4,
        };

        return priceLevelMap[priceLevel] ?? null;
      };

      // Prepare place data for insertion
      const placeData = {
        trip_id: tripId,
        place_id: place.id,
        name: place.name,
        address: place.address || '',
        lat: place.coordinates?.lat || 0,
        lng: place.coordinates?.lng || 0,
        category: place.types?.[0] || place.category || 'establishment',
        photo_url: place.photos && place.photos.length > 0 ? place.photos[0] : null,
        added_by: user.user.id,
        added_at: new Date().toISOString(),
        // Google Places API fields
        google_rating: place.rating || null,
        reviews_count: place.reviews_count || null,
        price_level: convertPriceLevel(place.priceLevel),
        editorial_summary: place.editorialSummary || null,
        opening_hours: place.openingHours ? { weekdayDescriptions: place.openingHours } : null,
        website: place.website || null,
        phone: place.phone || null,
      };

      // Use notification function to add place with notifications to collaborators
      const { addPlaceToTripWithNotification } = await import('~/lib/placesNotifications');
      const { error } = await addPlaceToTripWithNotification(tripId, placeData, user.user.id);

      if (error) {
        console.error('Error adding place to trip:', error);
        Alert.alert('Error', 'No se pudo agregar el lugar al viaje');
        return;
      }

      Alert.alert('Lugar agregado', `${place.name} ha sido agregado a ${tripTitle}`, [
        {
          text: 'Continuar explorando',
          style: 'default',
          onPress: () => {
            // ✅ Navigate to explore without tripId to reset context
            console.log('🔄 Explore: Resetting context - navigating to explore without tripId');
            router.replace('/(tabs)/explore');
          },
        },
        {
          text: 'Ver lugares del viaje',
          style: 'default',
          onPress: () => {
            if (returnTo === 'trip-places') {
              router.back(); // Go back to trip places
            } else {
              router.push(`/trips/${tripId}/places`);
            }
          },
        },
      ]);
    } catch (error) {
      console.error('Error adding place to trip:', error);
      Alert.alert('Error', 'Ocurrió un error inesperado');
    }
  };

  const performSearch = async () => {
    console.log('[performSearch] Starting search with input:', search);
    console.log('[performSearch] Current state:', {
      search: search,
      searchLength: search.length,
      searchTrim: search.trim(),
      selectedCategories,
      nearCurrentLocation,
      userCoords,
      hasSearched,
      loading,
    });

    if (!search.trim()) {
      console.log('[performSearch] Empty search, returning early');
      return;
    }

    // Clear cache for fresh data
    clearPlacesCache();

    if (nearCurrentLocation && !userCoords) {
      console.log('[performSearch] Need location, calling ensureLocation');
      await ensureLocation();
    }
    if (nearCurrentLocation && !userCoords) {
      console.log('[performSearch] Still no location after ensureLocation, aborting');
      return; // still not available
    }

    // Cancelar búsqueda previa
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);

    try {
      const locale = (i18n?.language || 'es').split('-')[0];
      const internalCats = selectedCategories
        .map((c) => categoryDisplayToInternal[c])
        .filter(Boolean);
      const userLocation = nearCurrentLocation && userCoords ? userCoords : undefined;

      console.log('[performSearch] Calling searchPlacesEnhanced with:', {
        input: search,
        selectedCategories: internalCats,
        userLocation,
        locale,
      });

      const resp = await searchPlacesEnhanced(
        { input: search, selectedCategories: internalCats, userLocation, locale },
        controller.signal
      );

      console.log('[performSearch] Got response:', resp);
      console.log('[performSearch] Response status:', resp?.status);
      console.log('[performSearch] Response predictions count:', resp?.predictions?.length);
      console.log('[performSearch] First prediction:', resp?.predictions?.[0]);

      if (resp?.status === 'ERROR') {
        console.error('[performSearch] API returned error:', resp.error);
        Alert.alert('Error de búsqueda', resp.error || 'Error desconocido en la búsqueda');
        setSearchResults([]);
      } else {
        setSearchResults(resp.predictions || []);
      }
      setHasSearched(true);
    } catch (e: unknown) {
      const error = e as Error;
      console.error('[performSearch] Error during search:', error);
      console.error('[performSearch] Error stack:', error.stack);
      if (error.name !== 'AbortError') {
        Alert.alert('Error', 'No se pudo completar la búsqueda: ' + error.message);
      }
      setSearchResults([]);
      setHasSearched(true);
    } finally {
      setLoading(false);
    }
  };

  const renderSearchResult = (item: EnhancedPlace) => (
    <PlaceCard key={item.id} place={item} onPress={handlePlacePress} />
  );

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.headerIconContainer}>
              <Text style={styles.headerIcon}>🔍</Text>
            </View>

            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>
                {tripId ? 'Agregar Lugares' : 'Explorar Lugares'}
              </Text>
              <Text style={styles.headerSubtitle}>
                {tripId
                  ? `Agregando lugares a: ${tripTitle}`
                  : 'Descubre destinos de ensueño para tu próxima aventura'}
              </Text>
            </View>

            <View style={styles.toggleContainer}>
              <View style={[styles.toggleTrackOn, { transform: [{ rotate: '15deg' }] }]} />
              <View style={styles.toggleTrackOff} />
            </View>
          </View>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent}>
          {/* Filtros Categorías (UI/UX Mejorado) */}
          <View style={styles.section}>
            {/* Header del filtro (colapsado/expandido) */}
            <View
              style={[
                styles.categoryFilterHeader,
                expandedCategories
                  ? styles.categoryFilterHeaderExpanded
                  : styles.categoryFilterHeaderCollapsed,
              ]}
            >
              <TouchableOpacity
                onPress={() => setExpandedCategories(!expandedCategories)}
                style={styles.sectionRow}
                activeOpacity={0.85}
              >
                <Text style={styles.categoryIcon}>🧪{/* Icono funnel placeholder */}</Text>
                <Text style={styles.categoryTitle}>Buscar Categorías</Text>
              </TouchableOpacity>

              {selectedCategories.length > 0 && (
                <View style={styles.categoryExpandButton}>
                  <Text style={styles.categoryExpandText}>{selectedCategories.length}</Text>
                </View>
              )}

              <TouchableOpacity
                onPress={() => {
                  if (selectedCategories.length > 0) setSelectedCategories([]);
                  else setExpandedCategories(!expandedCategories);
                }}
              >
                <Text style={styles.categoryEmptyIcon}>
                  {selectedCategories.length > 0 ? '×' : expandedCategories ? '˄' : '˅'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Chips seleccionados (solo visible cuando está colapsado y hay selección) */}
            {!expandedCategories && selectedCategories.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoryScrollView}
                contentContainerStyle={styles.categoryScrollViewContent}
              >
                {selectedCategories.map((cat) => {
                  const data = [...generalCategories, ...specificCategories].find(
                    (c) => c.name === cat
                  );
                  return (
                    <View key={cat} style={[styles.categoryChip, styles.categoryChipSelected]}>
                      <Text style={styles.categoryChipIcon}>{data?.icon}</Text>
                      <Text style={styles.categoryChipText}>{cat}</Text>
                      <TouchableOpacity
                        onPress={() => toggleCategory(cat)}
                        style={styles.categoryChipRemove}
                      >
                        <Text style={styles.categoryChipRemoveText}>×</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </ScrollView>
            )}

            {/* Panel expandido */}
            {expandedCategories && (
              <View style={styles.searchButtonContainer}>
                <View style={styles.categoryPanel}>
                  {/* Scroll interno solo para las categorías, manteniendo el header arriba fijo */}
                  <ScrollView
                    style={styles.resultsContainer}
                    contentContainerStyle={styles.categoryPanelContent}
                    showsVerticalScrollIndicator={false}
                  >
                    {/* Sección General */}
                    <Text style={styles.categorySectionTitle}>General</Text>
                    {[...generalCategories].map((cat) => {
                      const isSelected = selectedCategories.includes(cat.name);
                      return (
                        <TouchableOpacity
                          key={cat.name}
                          activeOpacity={0.9}
                          onPress={() => toggleCategory(cat.name)}
                          style={styles.categoryItemButton}
                        >
                          {isSelected ? (
                            <LinearGradient
                              colors={['#8B5CF6', '#C151E6', '#EC6A3C']}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 0 }}
                              style={styles.categoryItemSelected}
                            >
                              <Text style={styles.categoryItemIcon}>{cat.icon}</Text>
                              <Text style={styles.categoryItemTextSelected}>{cat.name}</Text>
                            </LinearGradient>
                          ) : (
                            <View style={styles.categoryItemUnselected}>
                              <Text style={styles.categoryItemIcon}>{cat.icon}</Text>
                              <Text style={styles.categoryItemTextUnselected}>{cat.name}</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}

                    {/* Sección Lugares Específicos */}
                    <Text style={styles.categorySectionTitle}>Lugares Específicos</Text>
                    {[...specificCategories].map((cat) => {
                      const isSelected = selectedCategories.includes(cat.name);
                      return (
                        <TouchableOpacity
                          key={cat.name}
                          activeOpacity={0.9}
                          onPress={() => toggleCategory(cat.name)}
                          style={styles.categoryItemButton}
                        >
                          {isSelected ? (
                            <LinearGradient
                              colors={['#8B5CF6', '#C151E6', '#EC6A3C']}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 0 }}
                              style={styles.categoryItemSelected}
                            >
                              <Text style={styles.categoryItemIcon}>{cat.icon}</Text>
                              <Text style={styles.categoryItemTextSelected}>{cat.name}</Text>
                            </LinearGradient>
                          ) : (
                            <View style={styles.categoryItemUnselected}>
                              <Text style={styles.categoryItemIcon}>{cat.icon}</Text>
                              <Text style={styles.categoryItemTextUnselected}>{cat.name}</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}

                    {/* Chips dentro del panel para feedback */}
                    {selectedCategories.length > 0 && (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.categoryItemsScrollView}
                        contentContainerStyle={styles.categoryItemsScrollViewContent}
                      >
                        {selectedCategories.map((cat) => {
                          const data = [...generalCategories, ...specificCategories].find(
                            (c) => c.name === cat
                          );
                          return (
                            <View key={cat} style={styles.categoryChipSelected}>
                              <Text style={styles.categoryChipIcon}>{data?.icon}</Text>
                              <Text style={styles.categoryChipText}>{cat}</Text>
                              <TouchableOpacity
                                onPress={() => toggleCategory(cat)}
                                style={styles.categoryChipRemove}
                              >
                                <Text style={styles.categoryChipRemoveText}>×</Text>
                              </TouchableOpacity>
                            </View>
                          );
                        })}
                      </ScrollView>
                    )}
                  </ScrollView>
                </View>
              </View>
            )}
          </View>

          {/* Ubicación actual */}
          <View style={styles.searchInputContainer}>
            <Switch
              value={nearCurrentLocation}
              onValueChange={setNearCurrentLocation}
              trackColor={{ false: '#CBD5E1', true: '#3B82F6' }}
              thumbColor={nearCurrentLocation ? '#FFFFFF' : '#FFFFFF'}
              ios_backgroundColor="#CBD5E1"
              style={styles.searchInputIcon}
            />

            <View style={styles.searchInputField}>
              <Text style={styles.searchInputText}>Cerca de mi ubicación actual</Text>
            </View>

            <TouchableOpacity onPress={() => setShowMap(true)} style={styles.searchLocationButton}>
              <Text style={styles.searchLocationText}>🗺️ Ver Mapa</Text>
            </TouchableOpacity>
          </View>

          {/* Barra de búsqueda */}
          <View style={styles.searchContainer}>
            <TextInput
              placeholder="Busca tu próximo destino..."
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={performSearch}
              style={styles.searchInput}
              placeholderTextColor="#9CA3AF"
            />
            <TouchableOpacity
              onPress={performSearch}
              disabled={loading}
              style={styles.searchButtonWrapper}
            >
              <LinearGradient colors={['#8B5CF6', '#EC4899']} style={styles.searchGradient}>
                <Text style={styles.searchButtonText}>{loading ? '…' : '🔍'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Resultados */}
          {hasSearched && (
            <View style={styles.resultsSection}>
              <View style={styles.resultsHeader}>
                <View style={styles.resultsHeaderContent}>
                  <View style={styles.resultsHeaderIcon} />
                  <Text style={styles.resultsHeaderTitle}>
                    {searchResults.length} resultados encontrados
                  </Text>
                </View>
              </View>

              {searchResults.map((item) => renderSearchResult(item))}

              {searchResults.length === 0 && (
                <View style={styles.resultsEmptyContainer}>
                  <Text style={styles.resultsEmptyTitle}>No se encontraron resultados</Text>
                  <Text style={styles.resultsEmptyText}>
                    Intenta con otros términos de búsqueda o ajusta los filtros
                  </Text>
                </View>
              )}
            </View>
          )}
          {hasSearched && searchResults.length === 0 && !loading && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Sin resultados</Text>
            </View>
          )}
          {loading && (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Buscando…</Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Modal de detalles del lugar - Aparece por encima del mapa si está abierto */}
      {!showMap && (
        <PlaceDetailModal
          visible={modalVisible}
          place={selectedPlace}
          onClose={handleCloseModal}
          tripId={tripId}
          tripTitle={tripTitle}
          onAddToTrip={tripId ? addPlaceToTrip : undefined}
        />
      )}

      {/* Modal de mapa */}
      {showMap && (
        <Modal
          visible={showMap}
          animationType="slide"
          presentationStyle="pageSheet"
          transparent={false}
        >
          <View style={styles.mapModalContainer}>
            <View style={styles.mapHeader}>
              <TouchableOpacity onPress={() => setShowMap(false)} style={styles.mapHeaderButton}>
                <Ionicons name="arrow-back" size={24} color="#333" />
              </TouchableOpacity>
              <Text style={styles.mapHeaderTitle}>Mapa de Lugares</Text>
              <View style={styles.mapHeaderSpacer} />
            </View>
            <AppMap
              center={
                userCoords
                  ? {
                      latitude: userCoords.lat,
                      longitude: userCoords.lng,
                    }
                  : searchResults[0]?.coordinates
                    ? {
                        latitude: searchResults[0].coordinates.lat,
                        longitude: searchResults[0].coordinates.lng,
                      }
                    : { latitude: 40.4168, longitude: -3.7038 }
              }
              markers={searchResults
                .filter((p) => p.coordinates)
                .map((p, idx) => ({
                  id: `p-${idx}`,
                  coord: {
                    latitude: p.coordinates!.lat,
                    longitude: p.coordinates!.lng,
                  },
                  title: p.name || `Lugar ${idx + 1}`,
                }))}
              showUserLocation={true}
              onLocationFound={handleLocationFound}
              onLocationError={handleLocationError}
              onMarkerPress={(markerId, markerData) => {
                console.log('[Explore] Marker pressed:', markerId, markerData);
                // Encontrar el lugar correspondiente al marcador
                const markerIndex = parseInt(markerId.split('-')[1]);
                if (!isNaN(markerIndex) && markerIndex < searchResults.length) {
                  const place = searchResults[markerIndex];
                  if (place) {
                    console.log('[Explore] Opening place:', place.name);
                    // Abrir la ficha directamente encima del mapa
                    handlePlacePress(place);
                  }
                }
              }}
              style={styles.mapContainer}
            />

            {/* Modal de detalles del lugar - Overlay encima del mapa */}
            {modalVisible && (
              <View style={styles.placeModalOverlay}>
                <PlaceDetailModal
                  visible={modalVisible}
                  place={selectedPlace}
                  onClose={handleCloseModal}
                  tripId={tripId}
                  tripTitle={tripTitle}
                  onAddToTrip={tripId ? addPlaceToTrip : undefined}
                />
              </View>
            )}
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  // Container styles
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },

  // Header styles
  header: {
    backgroundColor: '#F3F4F6',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  headerIcon: {
    fontSize: 24,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },

  // Toggle switch styles
  toggleContainer: {
    width: 80,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  toggleTrackOn: {
    backgroundColor: '#FF6B35',
    width: 60,
    height: 40,
    borderRadius: 30,
    position: 'absolute',
    right: -10,
    top: 0,
  },
  toggleTrackOff: {
    backgroundColor: '#8B5CF6',
    width: 40,
    height: 25,
    borderRadius: 15,
    position: 'absolute',
    right: 15,
    bottom: 8,
  },

  // Content styles
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: 16,
  },

  // Section styles
  section: {
    marginBottom: 16,
  },
  sectionRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Category styles
  categoryIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  categoryExpandButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginLeft: 8,
  },
  categoryExpandText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5B21B6',
  },
  categoryEmptyIcon: {
    fontSize: 18,
    color: '#6B7280',
  },
  categoryScrollView: {
    marginTop: 10,
  },
  categoryScrollViewContent: {
    paddingRight: 4,
  },

  // Category chip styles
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1.5,
  },
  categoryChipSelected: {
    backgroundColor: '#EDE9FE',
    borderColor: '#4B0082',
  },
  categoryChipUnselected: {
    backgroundColor: '#fff',
    borderColor: '#D1D5DB',
  },
  categoryChipIcon: {
    fontSize: 14,
    color: '#4B0082',
    marginRight: 6,
  },
  categoryChipText: {
    fontSize: 14,
    color: '#4B0082',
    fontWeight: '500',
  },
  categoryChipRemove: {
    marginLeft: 8,
  },
  categoryChipRemoveText: {
    fontSize: 16,
    color: '#4B0082',
  },

  // Category filter header styles
  categoryFilterHeader: {
    borderWidth: 1,
    borderColor: '#C6B4F5',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryFilterHeaderExpanded: {
    backgroundColor: 'white',
  },
  categoryFilterHeaderCollapsed: {
    backgroundColor: '#FBF9FF',
  },

  // Category panel styles
  categoryPanel: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderTopWidth: 0,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    overflow: 'hidden',
  },
  categoryPanelContent: {
    padding: 16,
    paddingBottom: 12,
  },
  categorySectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },
  categoryItemButton: {
    marginBottom: 10,
    borderRadius: 10,
    overflow: 'hidden',
  },
  categoryItemSelected: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryItemUnselected: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryItemIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  categoryItemTextSelected: {
    fontSize: 15,
    fontWeight: '600',
    color: 'white',
  },
  categoryItemTextUnselected: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  categoryItemsScrollView: {
    marginTop: 4,
    marginBottom: 4,
  },
  categoryItemsScrollViewContent: {
    paddingRight: 4,
  },

  // Search input styles
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  searchInputIcon: {
    marginRight: 12,
  },
  searchInputField: {
    flex: 1,
  },
  searchInputText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  searchButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchClearButton: {
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    marginRight: 8,
  },
  searchClearButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  searchLocationButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    marginLeft: 12,
  },
  searchLocationGradient: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchLocationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Results section styles
  resultsSection: {
    marginBottom: 16,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  resultsHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultsHeaderIcon: {
    marginRight: 8,
    fontSize: 20,
  },
  resultsHeaderTitle: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  resultsMapButton: {
    padding: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  resultsEmptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  resultsEmptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  resultsEmptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  resultsLoadingContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  resultsLoadingText: {
    fontSize: 16,
    color: '#6B7280',
  },

  // Search button styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1F2937',
  },
  searchButtonWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  searchButtonContainer: {
    marginTop: 12,
  },
  searchButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  searchGradient: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },

  // Results styles
  resultsContainer: {
    maxHeight: 420,
  },
  resultCard: {
    marginBottom: 12,
  },

  // Loading/Empty states
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6B7280',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },

  // Map modal styles
  mapModalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  mapHeaderButton: {
    padding: 8,
  },
  mapHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  mapHeaderSpacer: {
    width: 40,
  },
  mapContainer: {
    flex: 1,
  },

  // Place modal overlay
  placeModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    elevation: 9999,
  },
});
