import { useTranslation } from 'react-i18next';
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StatusBar, Switch, Alert, Animated, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { searchPlacesEnhanced, EnhancedPlace, clearPlacesCache, PlacesSearchParams } from '../src/lib/placesSearch';
import * as Location from 'expo-location';
import { allUICategories, uiCategoriesGeneral, uiCategoriesSpecific, categoryDisplayToInternal, UICategory } from '../src/lib/categories';
import { reverseGeocode } from '../src/lib/geocoding';
import PlaceDetailModal from '../src/components/PlaceDetailModal';
import PlaceCard from '../src/components/PlaceCard';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppMap from '../src/components/AppMap';
import { supabase } from '../src/lib/supabase';

export default function ExploreScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { tripId, returnTo } = useLocalSearchParams<{ tripId?: string; returnTo?: string }>();

  const [search, setSearch] = React.useState('');
  const [selectedCategories, setSelectedCategories] = React.useState<string[]>([]);
  const [expandedCategories, setExpandedCategories] = React.useState(false);
  const [nearCurrentLocation, setNearCurrentLocation] = React.useState(false); // inicia apagado
  const [showMap, setShowMap] = React.useState(false);
  const [currentLocation, setCurrentLocation] = React.useState('Ubicación desactivada');
  const [userCoords, setUserCoords] = React.useState<{ lat: number; lng: number } | undefined>(undefined);
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
    setSelectedCategories(prev =>
      prev.includes(categoryName)
        ? prev.filter(c => c !== categoryName)
        : [...prev, categoryName]
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
        setCurrentLocation([geo.city, geo.country].filter(Boolean).join(', ') || geo.displayName || 'Ubicación lista');
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

      // Add place to trip
      const { error } = await supabase
        .from('trip_places')
        .insert({
          trip_id: tripId,
          place_id: place.id,
          name: place.name,
          address: place.address || '',
          lat: place.coordinates?.lat || 0,
          lng: place.coordinates?.lng || 0,
          category: place.category || 'restaurant',
          added_by: user.user.id
        });

      if (error) {
        console.error('Error adding place to trip:', error);
        Alert.alert('Error', 'No se pudo agregar el lugar al viaje');
      } else {
        Alert.alert('¡Éxito!', `${place.name} agregado a tu viaje`, [
          {
            text: 'OK',
            onPress: () => {
              handleCloseModal();
              // Navigate back to trip places if that's where we came from
              if (returnTo === 'trip-places') {
                router.back();
              }
            }
          }
        ]);
      }
    } catch (error) {
      console.error('Error adding place to trip:', error);
      Alert.alert('Error', 'No se pudo agregar el lugar al viaje');
    }
  };

  const doSearch = React.useCallback(async () => {
    if (!search.trim() && selectedCategories.length === 0) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    if (abortRef.current) {
      abortRef.current.abort();
    }

    abortRef.current = new AbortController();
    setLoading(true);
    setHasSearched(true);

    try {
      const internalCategories = selectedCategories.map(cat => categoryDisplayToInternal[cat] || cat);
      const searchParams: PlacesSearchParams = {
        input: search,
        selectedCategories: internalCategories,
        userLocation: nearCurrentLocation && userCoords ? userCoords : undefined
      };
      const response = await searchPlacesEnhanced(searchParams);
      setSearchResults(response.predictions);
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        console.error('Search error:', e);
        Alert.alert('Error', 'Error en la búsqueda. Intenta de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  }, [search, selectedCategories, nearCurrentLocation, userCoords]);

  React.useEffect(() => {
    const timeout = setTimeout(doSearch, 300);
    return () => clearTimeout(timeout);
  }, [doSearch]);

  const insets = useSafeAreaInsets();

  // Contextual header based on trip context
  const getHeaderTitle = () => {
    if (tripId && tripTitle) {
      return `Explorar para ${tripTitle}`;
    }
    return t('explore.title', 'Explorar lugares');
  };

  const getHeaderSubtitle = () => {
    if (tripId) {
      return 'Busca lugares para agregar a tu viaje';
    }
    return t('explore.subtitle', 'Descubre lugares increíbles');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      <StatusBar barStyle="light-content" />

      {/* Header with contextual information */}
      <LinearGradient
        colors={tripId ? ['#10B981', '#059669'] : ['#8B5CF6', '#7C3AED']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          paddingTop: insets.top + 10,
          paddingHorizontal: 20,
          paddingBottom: 20
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginRight: 16 }}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={{
            fontSize: 20,
            fontWeight: '700',
            color: 'white',
            flex: 1
          }}>
            {getHeaderTitle()}
          </Text>
        </View>
        <Text style={{
          fontSize: 14,
          color: 'rgba(255,255,255,0.9)',
          marginLeft: 40
        }}>
          {getHeaderSubtitle()}
        </Text>
      </LinearGradient>

      {/* Rest of the explore interface */}
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Search bar */}
        <View style={{ padding: 20 }}>
          <View style={{
            flexDirection: 'row',
            backgroundColor: 'white',
            borderRadius: 16,
            paddingHorizontal: 16,
            paddingVertical: 12,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 4
          }}>
            <Ionicons name="search" size={20} color="#666" style={{ marginRight: 12 }} />
            <TextInput
              style={{ flex: 1, fontSize: 16, color: '#333' }}
              placeholder={t('explore.searchPlaceholder', 'Buscar restaurantes, sitios turísticos...')}
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
            />
          </View>
        </View>

        {/* Location toggle */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: 'white',
            borderRadius: 12,
            padding: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 2
          }}>
            <Ionicons
              name={nearCurrentLocation ? "location" : "location-outline"}
              size={20}
              color={nearCurrentLocation ? "#10B981" : "#666"}
              style={{ marginRight: 12 }}
            />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 2 }}>
                {t('explore.nearMe', 'Cerca de mi ubicación')}
              </Text>
              <Text style={{ fontSize: 12, color: '#666' }}>
                {locLoading ? 'Obteniendo ubicación...' : currentLocation}
              </Text>
            </View>
            <Switch
              value={nearCurrentLocation}
              onValueChange={setNearCurrentLocation}
              trackColor={{ false: '#E5E7EB', true: '#10B981' }}
              thumbColor={nearCurrentLocation ? '#FFFFFF' : '#FFFFFF'}
            />
          </View>
        </View>

        {/* Categories */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <TouchableOpacity
            onPress={() => setExpandedCategories(!expandedCategories)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: 'white',
              borderRadius: 12,
              padding: 16,
              marginBottom: 12,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 4,
              elevation: 2
            }}
          >
            <Ionicons name="options" size={20} color="#666" style={{ marginRight: 12 }} />
            <Text style={{ flex: 1, fontSize: 16, fontWeight: '600', color: '#333' }}>
              {t('explore.categories', 'Categorías')} ({selectedCategories.length})
            </Text>
            <Ionicons
              name={expandedCategories ? "chevron-up" : "chevron-down"}
              size={20}
              color="#666"
            />
          </TouchableOpacity>

          {expandedCategories && (
            <View style={{
              backgroundColor: 'white',
              borderRadius: 12,
              padding: 16,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 4,
              elevation: 2
            }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 12 }}>
                {t('explore.generalCategories', 'Categorías generales')}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 }}>
                {generalCategories.map(category => (
                  <TouchableOpacity
                    key={category.name}
                    onPress={() => toggleCategory(category.name)}
                    style={{
                      backgroundColor: selectedCategories.includes(category.name) ? '#8B5CF6' : '#F3F4F6',
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 20,
                      marginRight: 8,
                      marginBottom: 8
                    }}
                  >
                    <Text style={{
                      color: selectedCategories.includes(category.name) ? 'white' : '#666',
                      fontSize: 14,
                      fontWeight: '500'
                    }}>
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={{ fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 12 }}>
                {t('explore.specificCategories', 'Categorías específicas')}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {specificCategories.map(category => (
                  <TouchableOpacity
                    key={category.name}
                    onPress={() => toggleCategory(category.name)}
                    style={{
                      backgroundColor: selectedCategories.includes(category.name) ? '#8B5CF6' : '#F3F4F6',
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 20,
                      marginRight: 8,
                      marginBottom: 8
                    }}
                  >
                    <Text style={{
                      color: selectedCategories.includes(category.name) ? 'white' : '#666',
                      fontSize: 14,
                      fontWeight: '500'
                    }}>
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Map toggle */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <TouchableOpacity
            onPress={() => setShowMap(!showMap)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: 'white',
              borderRadius: 12,
              padding: 16,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 4,
              elevation: 2
            }}
          >
            <Ionicons
              name={showMap ? "list" : "map"}
              size={20}
              color="#666"
              style={{ marginRight: 12 }}
            />
            <Text style={{ flex: 1, fontSize: 16, fontWeight: '600', color: '#333' }}>
              {showMap ? t('explore.showList', 'Ver lista') : t('explore.showMap', 'Ver mapa')}
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Results */}
        {loading && (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <Text style={{ fontSize: 16, color: '#666' }}>
              {t('explore.searching', 'Buscando lugares...')}
            </Text>
          </View>
        )}

        {!loading && hasSearched && searchResults.length === 0 && (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <Ionicons name="search" size={48} color="#CCC" style={{ marginBottom: 16 }} />
            <Text style={{ fontSize: 16, color: '#666', textAlign: 'center' }}>
              {t('explore.noResults', 'No se encontraron lugares')}
            </Text>
            <Text style={{ fontSize: 14, color: '#999', textAlign: 'center', marginTop: 8 }}>
              {t('explore.tryDifferentSearch', 'Intenta con una búsqueda diferente')}
            </Text>
          </View>
        )}

        {!loading && !showMap && searchResults.length > 0 && (
          <View style={{ paddingHorizontal: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 16 }}>
              {t('explore.resultsFound', 'Resultados encontrados')} ({searchResults.length})
            </Text>
            {searchResults.map((place, index) => (
              <PlaceCard
                key={`${place.id}-${index}`}
                place={place}
                onPress={() => handlePlacePress(place)}
              />
            ))}
          </View>
        )}

        {!loading && showMap && (userCoords || searchResults.length > 0) && (
          <View style={{ height: 400, marginHorizontal: 20, borderRadius: 16, overflow: 'hidden' }}>
            <AppMap
              center={userCoords ? { latitude: userCoords.lat, longitude: userCoords.lng } : { latitude: 0, longitude: 0 }}
              showUserLocation={!!userCoords}
              markers={searchResults.map((place, index) => ({
                id: `${place.id}-${index}`,
                coord: {
                  latitude: place.coordinates?.lat || 0,
                  longitude: place.coordinates?.lng || 0
                },
                title: place.name
              }))}
              onLocationFound={handleLocationFound}
              onLocationError={handleLocationError}
              style={{ flex: 1 }}
            />
          </View>
        )}

        {/* Bottom spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Place Detail Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseModal}
      >
        {selectedPlace && (
          <PlaceDetailModal
            visible={modalVisible}
            place={selectedPlace}
            onClose={handleCloseModal}
            tripId={tripId}
            tripTitle={tripTitle}
            onAddToTrip={() => addPlaceToTrip(selectedPlace)}
          />
        )}
      </Modal>
    </View>
  );
}
