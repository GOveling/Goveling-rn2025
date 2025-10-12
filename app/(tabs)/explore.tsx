import { useTranslation } from 'react-i18next';
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StatusBar, Switch, Alert, Animated, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { searchPlacesEnhanced, EnhancedPlace, clearPlacesCache } from '../../src/lib/placesSearch';
import * as Location from 'expo-location';
import { allUICategories, uiCategoriesGeneral, uiCategoriesSpecific, categoryDisplayToInternal } from '../../src/lib/categories';
import { reverseGeocode } from '../../src/lib/geocoding';
import PlaceDetailModal from '../../src/components/PlaceDetailModal';
import PlaceCard from '../../src/components/PlaceCard';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppMap from '../../src/components/AppMap';
import { supabase } from '../../src/lib/supabase';

export default function ExploreTab() {
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
          category: place.types?.[0] || place.category || 'establishment',
          photo_url: (place.photos && place.photos.length > 0) ? place.photos[0] : null,
          added_by: user.user.id,
          added_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error adding place to trip:', error);
        Alert.alert('Error', 'No se pudo agregar el lugar al viaje');
        return;
      }

      Alert.alert(
        'Lugar agregado',
        `${place.name} ha sido agregado a ${tripTitle}`,
        [
          {
            text: 'Continuar explorando',
            style: 'default'
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
            }
          }
        ]
      );

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
      loading
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
      const internalCats = selectedCategories.map(c => categoryDisplayToInternal[c]).filter(Boolean);
      const userLocation = nearCurrentLocation && userCoords ? userCoords : undefined;

      console.log('[performSearch] Calling searchPlacesEnhanced with:', {
        input: search,
        selectedCategories: internalCats,
        userLocation,
        locale
      });

      const resp = await searchPlacesEnhanced({ input: search, selectedCategories: internalCats, userLocation, locale }, controller.signal);

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
    } catch (e: any) {
      console.error('[performSearch] Error during search:', e);
      console.error('[performSearch] Error stack:', e.stack);
      if (e.name !== 'AbortError') {
        Alert.alert('Error', 'No se pudo completar la búsqueda: ' + e.message);
      }
      setSearchResults([]);
      setHasSearched(true);
    } finally {
      setLoading(false);
    }
  };

  const renderSearchResult = (item: EnhancedPlace) => (
    <PlaceCard
      key={item.id}
      place={item}
      onPress={handlePlacePress}
    />
  );

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
        {/* Header */}
        <View style={{
          backgroundColor: '#F3F4F6',
          paddingTop: 50,
          paddingHorizontal: 20,
          paddingBottom: 20,
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <View style={{
              width: 60,
              height: 60,
              borderRadius: 12,
              backgroundColor: '#FEF3C7',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 16
            }}>
              <Text style={{ fontSize: 24 }}>🔍</Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 24, fontWeight: '700', color: '#1F2937', marginBottom: 4 }}>
                {tripId ? 'Agregar Lugares' : 'Explorar Lugares'}
              </Text>
              <Text style={{ fontSize: 14, color: '#6B7280' }}>
                {tripId
                  ? `Agregando lugares a: ${tripTitle}`
                  : 'Descubre destinos de ensueño para tu próxima aventura'
                }
              </Text>
            </View>

            <View style={{
              width: 80,
              height: 40,
              borderRadius: 20,
              overflow: 'hidden'
            }}>
              <View style={{
                backgroundColor: '#FF6B35',
                width: 60,
                height: 40,
                borderRadius: 30,
                transform: [{ rotate: '15deg' }],
                position: 'absolute',
                right: -10,
                top: 0
              }} />
              <View style={{
                backgroundColor: '#8B5CF6',
                width: 40,
                height: 25,
                borderRadius: 15,
                position: 'absolute',
                right: 15,
                bottom: 8
              }} />
            </View>
          </View>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          {/* Filtros Categorías (UI/UX Mejorado) */}
          <View style={{ marginBottom: 16 }}>
            {/* Header del filtro (colapsado/expandido) */}
            <View
              style={{
                backgroundColor: expandedCategories ? 'white' : '#FBF9FF',
                borderWidth: 1,
                borderColor: '#C6B4F5',
                borderRadius: 16,
                paddingHorizontal: 14,
                paddingVertical: 14,
                flexDirection: 'row',
                alignItems: 'center'
              }}
            >
              <TouchableOpacity
                onPress={() => setExpandedCategories(!expandedCategories)}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
                activeOpacity={0.85}
              >
                <Text style={{ fontSize: 18, marginRight: 10 }}>🧪{/* Icono funnel placeholder */}</Text>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>Buscar Categorías</Text>
              </TouchableOpacity>

              {selectedCategories.length > 0 && (
                <View style={{
                  backgroundColor: '#F1E9FF',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                  marginRight: 12
                }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#5B21B6' }}>{selectedCategories.length}</Text>
                </View>
              )}

              <TouchableOpacity onPress={() => {
                if (selectedCategories.length > 0) setSelectedCategories([]);
                else setExpandedCategories(!expandedCategories);
              }}>
                <Text style={{ fontSize: 18, color: '#6B7280' }}>
                  {selectedCategories.length > 0 ? '×' : (expandedCategories ? '˄' : '˅')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Chips seleccionados (solo visible cuando está colapsado y hay selección) */}
            {!expandedCategories && selectedCategories.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginTop: 10 }}
                contentContainerStyle={{ paddingRight: 4 }}
              >
                {selectedCategories.map(cat => {
                  const data = [...generalCategories, ...specificCategories].find(c => c.name === cat);
                  return (
                    <View
                      key={cat}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#EFE4FF',
                        borderColor: '#C6B4F5',
                        borderWidth: 1,
                        paddingHorizontal: 14,
                        height: 40,
                        borderRadius: 22,
                        marginRight: 8
                      }}
                    >
                      <Text style={{ fontSize: 14, color: '#4B0082', marginRight: 6 }}>
                        {data?.icon}
                      </Text>
                      <Text style={{ fontSize: 14, color: '#4B0082', fontWeight: '500' }}>{cat}</Text>
                      <TouchableOpacity onPress={() => toggleCategory(cat)} style={{ marginLeft: 8 }}>
                        <Text style={{ fontSize: 16, color: '#4B0082' }}>×</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </ScrollView>
            )}

            {/* Panel expandido */}
            {expandedCategories && (
              <View style={{ marginTop: 12 }}>
                <View
                  style={{
                    backgroundColor: 'white',
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                    borderTopWidth: 0,
                    borderBottomLeftRadius: 16,
                    borderBottomRightRadius: 16,
                    overflow: 'hidden'
                  }}
                >
                  {/* Scroll interno solo para las categorías, manteniendo el header arriba fijo */}
                  <ScrollView
                    style={{ maxHeight: 420 }}
                    contentContainerStyle={{ padding: 16, paddingBottom: 12 }}
                    showsVerticalScrollIndicator={false}
                  >
                    {/* Sección General */}
                    <Text style={{ fontSize: 15, fontWeight: '600', color: '#374151', marginBottom: 10 }}>General</Text>
                    {[...generalCategories].map(cat => {
                      const isSelected = selectedCategories.includes(cat.name);
                      return (
                        <TouchableOpacity
                          key={cat.name}
                          activeOpacity={0.9}
                          onPress={() => toggleCategory(cat.name)}
                          style={{
                            marginBottom: 10,
                            borderRadius: 10,
                            overflow: 'hidden'
                          }}
                        >
                          {isSelected ? (
                            <LinearGradient
                              colors={['#8B5CF6', '#C151E6', '#EC6A3C']}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 0 }}
                              style={{ padding: 16, flexDirection: 'row', alignItems: 'center' }}
                            >
                              <Text style={{ fontSize: 16, marginRight: 12 }}>{cat.icon}</Text>
                              <Text style={{ fontSize: 15, fontWeight: '600', color: 'white' }}>{cat.name}</Text>
                            </LinearGradient>
                          ) : (
                            <View style={{
                              backgroundColor: 'white',
                              borderWidth: 1,
                              borderColor: '#E5E7EB',
                              padding: 16,
                              flexDirection: 'row',
                              alignItems: 'center'
                            }}>
                              <Text style={{ fontSize: 16, marginRight: 12 }}>{cat.icon}</Text>
                              <Text style={{ fontSize: 15, fontWeight: '500', color: '#111827' }}>{cat.name}</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}

                    {/* Sección Lugares Específicos */}
                    <Text style={{ fontSize: 15, fontWeight: '600', color: '#374151', marginTop: 4, marginBottom: 10 }}>Lugares Específicos</Text>
                    {[...specificCategories].map(cat => {
                      const isSelected = selectedCategories.includes(cat.name);
                      return (
                        <TouchableOpacity
                          key={cat.name}
                          activeOpacity={0.9}
                          onPress={() => toggleCategory(cat.name)}
                          style={{
                            marginBottom: 10,
                            borderRadius: 10,
                            overflow: 'hidden'
                          }}
                        >
                          {isSelected ? (
                            <LinearGradient
                              colors={['#8B5CF6', '#C151E6', '#EC6A3C']}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 0 }}
                              style={{ padding: 16, flexDirection: 'row', alignItems: 'center' }}
                            >
                              <Text style={{ fontSize: 16, marginRight: 12 }}>{cat.icon}</Text>
                              <Text style={{ fontSize: 15, fontWeight: '600', color: 'white' }}>{cat.name}</Text>
                            </LinearGradient>
                          ) : (
                            <View style={{
                              backgroundColor: 'white',
                              borderWidth: 1,
                              borderColor: '#E5E7EB',
                              padding: 16,
                              flexDirection: 'row',
                              alignItems: 'center'
                            }}>
                              <Text style={{ fontSize: 16, marginRight: 12 }}>{cat.icon}</Text>
                              <Text style={{ fontSize: 15, fontWeight: '500', color: '#111827' }}>{cat.name}</Text>
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
                        style={{ marginTop: 4, marginBottom: 4 }}
                        contentContainerStyle={{ paddingRight: 4 }}
                      >
                        {selectedCategories.map(cat => {
                          const data = [...generalCategories, ...specificCategories].find(c => c.name === cat);
                          return (
                            <View
                              key={cat}
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: '#EFE4FF',
                                borderColor: '#C6B4F5',
                                borderWidth: 1,
                                paddingHorizontal: 14,
                                height: 38,
                                borderRadius: 22,
                                marginRight: 8
                              }}
                            >
                              <Text style={{ fontSize: 14, color: '#4B0082', marginRight: 6 }}>{data?.icon}</Text>
                              <Text style={{ fontSize: 14, color: '#4B0082', fontWeight: '500' }}>{cat}</Text>
                              <TouchableOpacity onPress={() => toggleCategory(cat)} style={{ marginLeft: 8 }}>
                                <Text style={{ fontSize: 16, color: '#4B0082' }}>×</Text>
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
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'white',
            borderRadius: 12,
            padding: 16,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: '#E5E7EB'
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Switch
                value={nearCurrentLocation}
                onValueChange={setNearCurrentLocation}
                trackColor={{ false: '#CBD5E1', true: '#3B82F6' }}
                thumbColor={nearCurrentLocation ? '#FFFFFF' : '#FFFFFF'}
                ios_backgroundColor="#CBD5E1"
                style={{ marginRight: 12 }}
              />

              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '500', color: '#1F2937' }}>
                  Cerca de mi ubicación actual
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity
                onPress={() => setShowMap(true)}
                style={{
                  backgroundColor: '#3B82F6',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                  flexDirection: 'row',
                  alignItems: 'center'
                }}
              >
                <Text style={{ color: 'white', fontSize: 14, fontWeight: '600', marginRight: 4 }}>
                  🗺️ Ver Mapa
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Barra de búsqueda */}
          <View style={{
            flexDirection: 'row',
            backgroundColor: 'white',
            borderRadius: 12,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: '#E5E7EB',
            overflow: 'hidden'
          }}>
            <TextInput
              placeholder="Busca tu próximo destino..."
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={performSearch}
              style={{
                flex: 1,
                padding: 16,
                fontSize: 16,
                color: '#1F2937'
              }}
              placeholderTextColor="#9CA3AF"
            />
            <TouchableOpacity onPress={performSearch} disabled={loading}>
              <LinearGradient
                colors={['#8B5CF6', '#EC4899']}
                style={{
                  paddingVertical: 16,
                  paddingHorizontal: 20,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: loading ? 0.6 : 1
                }}
              >
                <Text style={{ fontSize: 16 }}>{loading ? '…' : '🔍'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Resultados */}
          {hasSearched && (
            <View style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: '#10B981',
                    marginRight: 8
                  }} />
                  <Text style={{ fontSize: 16, color: '#1F2937', fontWeight: '500' }}>
                    {searchResults.length} resultados encontrados
                  </Text>
                </View>
              </View>

              {searchResults.map(item => renderSearchResult(item))}

              {searchResults.length === 0 && (
                <View style={{
                  backgroundColor: 'white',
                  borderRadius: 16,
                  padding: 32,
                  alignItems: 'center'
                }}>
                  <Text style={{ fontSize: 18, fontWeight: '600', color: '#6B7280', marginBottom: 8 }}>
                    No se encontraron resultados
                  </Text>
                  <Text style={{ fontSize: 14, color: '#9CA3AF', textAlign: 'center' }}>
                    Intenta con otros términos de búsqueda o ajusta los filtros
                  </Text>
                </View>
              )}
            </View>
          )}
          {hasSearched && searchResults.length === 0 && !loading && (
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <Text style={{ fontSize: 16, color: '#6B7280' }}>Sin resultados</Text>
            </View>
          )}
          {loading && (
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <Text style={{ fontSize: 16, color: '#6B7280' }}>Buscando…</Text>
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
        <Modal visible={showMap} animationType="slide" presentationStyle="pageSheet" transparent={false}>
          <View style={{ flex: 1, backgroundColor: '#fff' }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              paddingTop: 50,
              paddingBottom: 12,
              borderBottomWidth: 1,
              borderBottomColor: '#e5e5e5'
            }}>
              <TouchableOpacity onPress={() => setShowMap(false)} style={{ padding: 8 }}>
                <Ionicons name="arrow-back" size={24} color="#333" />
              </TouchableOpacity>
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#333' }}>Mapa de Lugares</Text>
              <View style={{ width: 40 }} />
            </View>
            <AppMap
              center={userCoords ? {
                latitude: userCoords.lat,
                longitude: userCoords.lng
              } : searchResults[0]?.coordinates ? {
                latitude: searchResults[0].coordinates.lat,
                longitude: searchResults[0].coordinates.lng
              } : { latitude: 40.4168, longitude: -3.7038 }}
              markers={searchResults.filter(p => p.coordinates).map((p, idx) => ({
                id: `p-${idx}`,
                coord: {
                  latitude: p.coordinates!.lat,
                  longitude: p.coordinates!.lng
                },
                title: p.name || `Lugar ${idx + 1}`
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
              style={{ flex: 1 }}
            />

            {/* Modal de detalles del lugar - Overlay encima del mapa */}
            {modalVisible && (
              <View style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 9999,
                elevation: 9999, // Para Android
              }}>
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