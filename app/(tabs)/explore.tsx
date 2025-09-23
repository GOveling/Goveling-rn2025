import { useTranslation } from 'react-i18next';
import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StatusBar, Switch, Alert, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { searchPlacesEnhanced, EnhancedPlace } from '../../src/lib/placesSearch';
import * as Location from 'expo-location';
import { allUICategories, uiCategoriesGeneral, uiCategoriesSpecific, categoryDisplayToInternal } from '../../src/lib/categories';
import { reverseGeocode } from '../../src/lib/geocoding';
import PlaceDetailModal from '../../src/components/PlaceDetailModal';
import PlaceCard from '../../src/components/PlaceCard';

export default function ExploreTab() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  
  const [search, setSearch] = React.useState('');
  const [selectedCategories, setSelectedCategories] = React.useState<string[]>([]);
  const [expandedCategories, setExpandedCategories] = React.useState(false);
  const [nearCurrentLocation, setNearCurrentLocation] = React.useState(false); // inicia apagado
  // Removed showMap state (switch now controls nearCurrentLocation)
  const [currentLocation, setCurrentLocation] = React.useState('Ubicación desactivada');
  const [userCoords, setUserCoords] = React.useState<{lat:number; lng:number} | undefined>(undefined);
  const [searchResults, setSearchResults] = React.useState<EnhancedPlace[]>([]);
  const [hasSearched, setHasSearched] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [locLoading, setLocLoading] = React.useState(false);
  const [selectedPlace, setSelectedPlace] = React.useState<EnhancedPlace | null>(null);
  const [modalVisible, setModalVisible] = React.useState(false);
  const abortRef = React.useRef<AbortController | null>(null);

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

  const handlePlacePress = (place: EnhancedPlace) => {
    setSelectedPlace(place);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedPlace(null);
  };

  const performSearch = async () => {
    console.log('[performSearch] Starting search with input:', search);
    
    if (!search.trim()) {
      console.log('[performSearch] Empty search, returning early');
      return;
    }
    
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
      const internalCats = selectedCategories.map(c=>categoryDisplayToInternal[c]).filter(Boolean);
      const userLocation = nearCurrentLocation && userCoords ? userCoords : undefined;
      
      console.log('[performSearch] Calling searchPlacesEnhanced with:', {
        input: search,
        selectedCategories: internalCats,
        userLocation,
        locale
      });
      
      const resp = await searchPlacesEnhanced({ input: search, selectedCategories: internalCats, userLocation, locale }, controller.signal);
      
      console.log('[performSearch] Got response:', resp);
      
      setSearchResults(resp.predictions);
      setHasSearched(true);
    } catch (e:any) {
      console.error('[performSearch] Error during search:', e);
      if (e.name !== 'AbortError') {
        Alert.alert('Error', 'No se pudo completar la búsqueda');
      }
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
                Explorar Lugares
              </Text>
              <Text style={{ fontSize: 14, color: '#6B7280' }}>
                Descubre destinos de ensueño para tu próxima aventura
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

          <TouchableOpacity
            onPress={() => Alert.alert('Explorar', 'Ya estás en la sección de explorar')}
          >
            <LinearGradient
              colors={['#8B5CF6', '#7C3AED']}
              style={{
                paddingVertical: 12,
                paddingHorizontal: 20,
                borderRadius: 12,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center'
              }}
            >
              <Text style={{ color: 'white', fontSize: 16, fontWeight: '600', marginRight: 8 }}>
                Explorar Ahora
              </Text>
              <Text style={{ color: 'white', fontSize: 16 }}>↗</Text>
            </LinearGradient>
          </TouchableOpacity>
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
              <View style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: '#DBEAFE',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12
              }}>
                <Text style={{ fontSize: 16 }}>📍</Text>
              </View>
              
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '500', color: '#1F2937' }}>
                  Cerca de mi ubicación actual
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 14, color: '#6B7280', marginRight: 8 }}>Ubicación</Text>
              <Switch
                value={nearCurrentLocation}
                onValueChange={setNearCurrentLocation}
                trackColor={{ false: '#CBD5E1', true: '#3B82F6' }}
                thumbColor={nearCurrentLocation ? '#FFFFFF' : '#FFFFFF'}
                ios_backgroundColor="#CBD5E1"
              />
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
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
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

              {searchResults.map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={{
                    backgroundColor: 'white',
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 12,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 8,
                    elevation: 3
                  }}
                  onPress={() => handlePlacePress(item)}
                >
                  {/* Foto principal si existe */}
                  {item.photos && item.photos.length > 0 && (
                    <View style={{ marginBottom: 10, borderRadius: 12, overflow: 'hidden', backgroundColor: '#F3F4F6', height: 160 }}>
                      <Text style={{ position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.5)', color: 'white', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, fontSize: 12 }}>
                        Foto
                      </Text>
                      {/* RN Image could be used; placeholder rectangle for now to avoid import churn */}
                    </View>
                  )}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <Text style={{ fontSize: 18, fontWeight: '600', color: '#1F2937', flex: 1 }}>
                      {item.name}
                    </Text>
                    <TouchableOpacity style={{ padding: 4 }}>
                      <Text style={{ fontSize: 20 }}>🤍</Text>
                    </TouchableOpacity>
                  </View>

                  {item.address && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <Text style={{ fontSize: 14, color: '#6B7280', marginRight: 4 }}>📍</Text>
                      <Text style={{ fontSize: 14, color: '#6B7280', flex: 1 }}>
                        {item.address}
                      </Text>
                    </View>
                  )}

                  {typeof item.distance_km === 'number' && (
                    <Text style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 8 }}>
                      {item.distance_km.toFixed(2)} km
                    </Text>
                  )}

                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                    {item.rating && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16 }}>
                        <Text style={{ fontSize: 14, color: '#F59E0B', marginRight: 2 }}>⭐</Text>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#1F2937', marginRight: 4 }}>
                          {item.rating}
                        </Text>
                        {item.reviews_count && (
                          <Text style={{ fontSize: 14, color: '#6B7280' }}>
                            ({item.reviews_count})
                          </Text>
                        )}
                      </View>
                    )}

                    {item.category && (
                      <View style={{
                        backgroundColor: '#FEF3C7',
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 12,
                        marginRight: 8
                      }}>
                        <Text style={{ fontSize: 12, color: '#92400E', fontWeight: '600' }}>
                          {item.category}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    {item.openNow !== undefined && (
                      <View style={{
                        backgroundColor: item.openNow ? '#D1FAE5' : '#F3F4F6',
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 8,
                        marginRight: 8
                      }}>
                        <Text style={{ fontSize: 12, color: item.openNow ? '#065F46' : '#374151', fontWeight: '600' }}>
                          {item.openNow ? 'Abierto' : 'Cerrado'}
                        </Text>
                      </View>
                    )}
                    {item.priceLevel !== undefined && (
                      <View style={{
                        backgroundColor: '#E0E7FF',
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 8
                      }}>
                        <Text style={{ fontSize: 12, color: '#4338CA', fontWeight: '600' }}>
                          {'$'.repeat(item.priceLevel + 1)}
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}

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

      {/* Modal de detalles del lugar */}
      <PlaceDetailModal
        visible={modalVisible}
        place={selectedPlace}
        onClose={handleCloseModal}
      />
    </>
  );
}