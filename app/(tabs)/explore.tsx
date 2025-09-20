import { useTranslation } from 'react-i18next';
import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StatusBar, Switch, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

export default function ExploreTab() {
  const { t } = useTranslation();
  const router = useRouter();
  
  const [search, setSearch] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState('Todas las categorías');
  const [showCategoryDropdown, setShowCategoryDropdown] = React.useState(false);
  const [nearCurrentLocation, setNearCurrentLocation] = React.useState(true);
  const [showMap, setShowMap] = React.useState(true);
  const [currentLocation, setCurrentLocation] = React.useState('Antofagasta, Chile');
  const [searchResults, setSearchResults] = React.useState<any[]>([]);
  const [hasSearched, setHasSearched] = React.useState(false);

  const categories = [
    'Todas las categorías',
    'Restaurantes',
    'Bares y Pubs', 
    'Cafeterías',
    'Museos',
    'Parques',
    'Compras',
    'Hoteles'
  ];

  // Datos de ejemplo basados en la imagen
  const sampleResults = [
    {
      id: '1',
      name: 'Krossbar Antofagasta',
      address: 'Av. República de Croacia 0738, 1270688 Antofagasta, Chile',
      coordinates: '-23.678465, -70.412717',
      rating: 4.7,
      reviews: 410,
      type: 'restaurant',
      status: 'Abierto',
      priceRange: '$$',
      verified: true,
      openNow: true,
      phone: true,
      website: true,
      photos: 10
    },
    {
      id: '2',
      name: 'Bardos Antofagasta',
      address: 'Av. Angamos 1309, 1270772 Antofagasta, Chile',
      coordinates: '-23.663579, -70.402461',
      rating: 4.6,
      reviews: 774,
      type: 'restaurant',
      status: 'Abierto',
      priceRange: '$$',
      verified: false,
      openNow: true,
      phone: true,
      website: true,
      photos: 8
    }
  ];

  const performSearch = () => {
    if (!search.trim()) {
      Alert.alert('Error', 'Por favor ingresa un término de búsqueda');
      return;
    }
    
    // Simular búsqueda basada en el término
    if (search.toLowerCase().includes('cerveza') || search.toLowerCase().includes('bar')) {
      setSearchResults(sampleResults);
      setHasSearched(true);
    } else {
      setSearchResults([]);
      setHasSearched(true);
    }
  };

  const renderCategoryDropdown = () => {
    if (!showCategoryDropdown) return null;

    return (
      <View style={{
        position: 'absolute',
        top: 100,
        left: 16,
        right: 16,
        backgroundColor: 'white',
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
        zIndex: 1000,
        maxHeight: 200
      }}>
        <ScrollView>
          {categories.map((category, index) => (
            <TouchableOpacity
              key={index}
              style={{
                padding: 16,
                borderBottomWidth: index < categories.length - 1 ? 1 : 0,
                borderBottomColor: '#F3F4F6'
              }}
              onPress={() => {
                setSelectedCategory(category);
                setShowCategoryDropdown(false);
              }}
            >
              <Text style={{ 
                fontSize: 16, 
                color: selectedCategory === category ? '#8B5CF6' : '#374151',
                fontWeight: selectedCategory === category ? '600' : '400'
              }}>
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderSearchResult = (item: any) => (
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
      onPress={() => router.push(`/explore/place?id=${item.id}`)}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <Text style={{ fontSize: 18, fontWeight: '600', color: '#1F2937', flex: 1 }}>
          {item.name}
        </Text>
        <TouchableOpacity style={{ padding: 4 }}>
          <Text style={{ fontSize: 20 }}>🤍</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
        <Text style={{ fontSize: 14, color: '#6B7280', marginRight: 4 }}>📍</Text>
        <Text style={{ fontSize: 14, color: '#6B7280', flex: 1 }}>
          {item.address}
        </Text>
      </View>

      <Text style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 8 }}>
        {item.coordinates}
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16 }}>
          <Text style={{ fontSize: 14, color: '#F59E0B', marginRight: 2 }}>⭐</Text>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#1F2937', marginRight: 4 }}>
            {item.rating}
          </Text>
          <Text style={{ fontSize: 14, color: '#6B7280' }}>
            ({item.reviews})
          </Text>
        </View>
        
        <View style={{
          backgroundColor: '#FEF3C7',
          paddingHorizontal: 8,
          paddingVertical: 2,
          borderRadius: 12,
          marginRight: 8
        }}>
          <Text style={{ fontSize: 12, color: '#92400E', fontWeight: '600' }}>
            {item.type}
          </Text>
        </View>

        <Text style={{ fontSize: 14, color: '#1F2937', fontWeight: '600' }}>
          {item.priceRange}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        {item.verified && (
          <View style={{
            backgroundColor: '#D1FAE5',
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 8
          }}>
            <Text style={{ fontSize: 12, color: '#065F46', fontWeight: '600' }}>
              Google Verified
            </Text>
          </View>
        )}
        
        {item.openNow && (
          <View style={{
            backgroundColor: '#D1FAE5',
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 8
          }}>
            <Text style={{ fontSize: 12, color: '#065F46', fontWeight: '600' }}>
              Open Now
            </Text>
          </View>
        )}

        <Text style={{ fontSize: 14, color: '#1F2937', fontWeight: '600' }}>
          {item.priceRange}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981', marginRight: 4 }} />
          <Text style={{ fontSize: 12, color: '#6B7280' }}>{item.status}</Text>
        </View>
        
        {item.phone && (
          <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 14, color: '#3B82F6', marginRight: 4 }}>📞</Text>
            <Text style={{ fontSize: 14, color: '#3B82F6' }}>Tel</Text>
          </TouchableOpacity>
        )}
        
        {item.website && (
          <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 14, color: '#3B82F6', marginRight: 4 }}>🌐</Text>
            <Text style={{ fontSize: 14, color: '#3B82F6' }}>Web</Text>
          </TouchableOpacity>
        )}
        
        {item.photos && (
          <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 14, color: '#6B7280', marginRight: 4 }}>📷</Text>
            <Text style={{ fontSize: 14, color: '#6B7280' }}>{item.photos}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={{ marginLeft: 'auto' }}>
          <Text style={{ fontSize: 20 }}>📍</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
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
            onPress={() => router.push('/explore')}
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
          {/* Filtros */}
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'white',
              borderRadius: 12,
              padding: 16,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: '#E5E7EB'
            }}
            onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 16, color: '#8B5CF6', marginRight: 8 }}>🔽</Text>
              <Text style={{ fontSize: 16, color: '#1F2937', fontWeight: '500' }}>
                Buscar Categorías
              </Text>
            </View>
            <Text style={{ fontSize: 16, color: '#8B5CF6' }}>🔽</Text>
          </TouchableOpacity>

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
              <Text style={{ fontSize: 14, color: '#6B7280', marginRight: 8 }}>Mapa</Text>
              <Switch
                value={showMap}
                onValueChange={setShowMap}
                trackColor={{ false: '#E5E7EB', true: '#3B82F6' }}
                thumbColor={showMap ? '#FFFFFF' : '#FFFFFF'}
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
              placeholder="Cerveza"
              value={search}
              onChangeText={setSearch}
              style={{
                flex: 1,
                padding: 16,
                fontSize: 16,
                color: '#1F2937'
              }}
              placeholderTextColor="#9CA3AF"
              onSubmitEditing={performSearch}
            />
            <TouchableOpacity onPress={performSearch}>
              <LinearGradient
                colors={['#8B5CF6', '#EC4899']}
                style={{
                  paddingVertical: 16,
                  paddingHorizontal: 20,
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Text style={{ fontSize: 16 }}>🔍</Text>
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

              {searchResults.map(renderSearchResult)}

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
        </ScrollView>

        {renderCategoryDropdown()}
      </View>
    </>
  );
}