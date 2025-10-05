import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform, Image, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '~/lib/theme';
import { useRouter } from 'expo-router';
import { supabase } from '~/lib/supabase';
import NewTripModal from '../../src/components/NewTripModal';

export default function TripsTab() {
  const { colors, spacing } = useTheme();
  const router = useRouter();

  // Estados
  const [showNewTripModal, setShowNewTripModal] = useState(false);

  // Stats data - these would come from your database
  const [stats, setStats] = useState({
    totalTrips: 3,
    upcomingTrips: 0,
    groupTrips: 1
  });

  const [loading, setLoading] = useState(true);

  // Load trip statistics from database
  const loadTripStats = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user?.id) return;

      // Get total trips count
      const { count: totalTrips } = await supabase
        .from('trips')
        .select('*', { count: 'exact', head: true })
        .or(`owner_id.eq.${user.user.id},trip_collaborators.user_id.eq.${user.user.id}`);

      // Get upcoming trips (start date is in the future)
      const { count: upcomingTrips } = await supabase
        .from('trips')
        .select('*', { count: 'exact', head: true })
        .or(`owner_id.eq.${user.user.id},trip_collaborators.user_id.eq.${user.user.id}`)
        .gt('start_date', new Date().toISOString());

      // Get group trips (trips with collaborators)
      const { data: groupTripsData } = await supabase
        .from('trips')
        .select(`
          id,
          trip_collaborators(count)
        `)
        .or(`owner_id.eq.${user.user.id},trip_collaborators.user_id.eq.${user.user.id}`);

      const groupTrips = groupTripsData?.filter(trip => 
        trip.trip_collaborators && trip.trip_collaborators.length > 0
      ).length || 0;

      setStats({
        totalTrips: totalTrips || 0,
        upcomingTrips: upcomingTrips || 0,
        groupTrips: groupTrips
      });
    } catch (error) {
      console.error('Error loading trip stats:', error);
      // Keep default values if there's an error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTripStats();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ 
          padding: 16,
          paddingTop: Platform.OS === 'ios' ? 60 : 20
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ 
            fontSize: 32, 
            fontWeight: '900', 
            color: '#1A1A1A',
            marginBottom: 8
          }}>
            Mis Viajes
          </Text>
          <Text style={{ 
            fontSize: 16,
            color: '#666666',
            fontWeight: '500'
          }}>
            Planea y gestiona tus aventuras
          </Text>
        </View>

        {/* Vista de Mapa Button */}
        <TouchableOpacity
          onPress={() => Alert.alert('Mapa', 'Funcionalidad de mapa de trips próximamente disponible')}
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            padding: 16,
            marginBottom: 16,
            borderWidth: 2,
            borderColor: '#007AFF',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 3
          }}
        >
          <Text style={{ 
            fontSize: 18,
            fontWeight: '600',
            color: '#007AFF',
            marginRight: 8
          }}>
            🗺️
          </Text>
          <Text style={{ 
            fontSize: 18,
            fontWeight: '600',
            color: '#007AFF'
          }}>
            Vista de Mapa
          </Text>
        </TouchableOpacity>

        {/* Nuevo Viaje Button */}
        <TouchableOpacity
          onPress={() => setShowNewTripModal(true)}
          style={{
            borderRadius: 16,
            padding: 18,
            marginBottom: 24,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 5
          }}
        >
          <LinearGradient
            colors={['#8B5CF6', '#EC4899']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              borderRadius: 16,
              padding: 18,
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Text style={{ 
              color: '#FFFFFF', 
              fontWeight: '700',
              fontSize: 18
            }}>
              + Nuevo Viaje
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Stats Cards */}
        <View style={{ 
          flexDirection: 'row', 
          justifyContent: 'space-between',
          marginBottom: 24,
          gap: 12
        }}>
          <View style={{
            flex: 1,
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            padding: 16,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 3
          }}>
            <Text style={{
              fontSize: 32,
              fontWeight: '900',
              color: '#007AFF',
              marginBottom: 4
            }}>
              {stats.totalTrips}
            </Text>
            <Text style={{
              fontSize: 14,
              fontWeight: '600',
              color: '#666666',
              textAlign: 'center'
            }}>
              Total de Viajes
            </Text>
          </View>

          <View style={{
            flex: 1,
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            padding: 16,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 3
          }}>
            <Text style={{
              fontSize: 32,
              fontWeight: '900',
              color: '#34C759',
              marginBottom: 4
            }}>
              {stats.upcomingTrips}
            </Text>
            <Text style={{
              fontSize: 14,
              fontWeight: '600',
              color: '#666666',
              textAlign: 'center'
            }}>
              Próximos
            </Text>
          </View>

          <View style={{
            flex: 1,
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            padding: 16,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 3
          }}>
            <Text style={{
              fontSize: 32,
              fontWeight: '900',
              color: '#FF9500',
              marginBottom: 4
            }}>
              {stats.groupTrips}
            </Text>
            <Text style={{
              fontSize: 14,
              fontWeight: '600',
              color: '#666666',
              textAlign: 'center'
            }}>
              Viajes Grupales
            </Text>
          </View>
        </View>

        {/* Trip Card - Test SA */}
        <View style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 24,
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.12,
          shadowRadius: 12,
          elevation: 6
        }}>
          {/* Chile Image Header */}
          <View style={{
            width: '100%',
            height: 150,
            backgroundColor: '#E8D5B7',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row'
          }}>
            {/* Chile themed illustration mockup */}
            <View style={{
              backgroundColor: '#D32F2F',
              width: 60,
              height: 40,
              borderRadius: 8,
              marginRight: 20,
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Text style={{ fontSize: 20 }}>🇨🇱</Text>
            </View>
            <Text style={{
              fontSize: 48,
              fontWeight: '900',
              color: '#8B4513',
              textShadowColor: '#000',
              textShadowOffset: { width: 2, height: 2 },
              textShadowRadius: 4
            }}>
              CHILE
            </Text>
            <View style={{
              marginLeft: 20,
              alignItems: 'center'
            }}>
              <Text style={{ fontSize: 24 }}>🦅</Text>
              <Text style={{ fontSize: 20 }}>🌲</Text>
            </View>
          </View>
          
          {/* Trip Content */}
          <View style={{ padding: 20 }}>
            {/* Trip Title and Status */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: 16
            }}>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: 24,
                  fontWeight: '800',
                  color: '#1A1A1A',
                  marginBottom: 4
                }}>
                  Test SA
                </Text>
                <Text style={{
                  fontSize: 16,
                  color: '#666666',
                  fontWeight: '500'
                }}>
                  Viajando
                </Text>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginTop: 4
                }}>
                  <Text style={{ fontSize: 16, color: '#8B5CF6', marginRight: 8 }}>👥</Text>
                  <Text style={{
                    fontSize: 16,
                    color: '#8B5CF6',
                    fontWeight: '600'
                  }}>
                    Grupo
                  </Text>
                </View>
              </View>
            </View>

            {/* Destinations */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 16
            }}>
              <Text style={{ fontSize: 16, marginRight: 8 }}>📍</Text>
              <View style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 8
              }}>
                <View style={{
                  backgroundColor: '#EBF4FF',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#007AFF'
                }}>
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: '#007AFF'
                  }}>
                    🌍 Chile
                  </Text>
                </View>
                <View style={{
                  backgroundColor: '#EBF4FF',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#007AFF'
                }}>
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: '#007AFF'
                  }}>
                    🇫🇷 France
                  </Text>
                </View>
                <View style={{
                  backgroundColor: '#EBF4FF',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#007AFF'
                }}>
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: '#007AFF'
                  }}>
                    🇯🇵 Japan
                  </Text>
                </View>
              </View>
            </View>

            {/* Dates */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 16
            }}>
              <Text style={{ fontSize: 16, marginRight: 8 }}>📅</Text>
              <Text style={{
                fontSize: 16,
                color: '#1A1A1A',
                fontWeight: '500'
              }}>
                Sep 16, 2025 - Sep 20, 2025
              </Text>
            </View>

            {/* Travelers */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 24
            }}>
              <Text style={{ fontSize: 16, marginRight: 8 }}>👥</Text>
              <Text style={{
                fontSize: 16,
                color: '#1A1A1A',
                fontWeight: '500'
              }}>
                2 viajeros
              </Text>
            </View>

            {/* Team Member */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 24
            }}>
              <Text style={{
                fontSize: 14,
                color: '#666666',
                fontWeight: '500',
                marginRight: 8
              }}>
                Equipo:
              </Text>
              <View style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: '#8B5CF6',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Text style={{
                  color: '#FFFFFF',
                  fontWeight: '700',
                  fontSize: 14
                }}>
                  SA
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={{
              flexDirection: 'row',
              gap: 12,
              marginBottom: 16
            }}>
              <TouchableOpacity
                onPress={() => Alert.alert('Trip Details', 'Funcionalidad de detalles del trip próximamente disponible')}
                style={{
                  flex: 1,
                  borderRadius: 16,
                  padding: 16,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 6,
                  elevation: 3
                }}
              >
                <LinearGradient
                  colors={['#8B5CF6', '#EC4899']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    borderRadius: 16,
                    padding: 16,
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Text style={{
                    color: '#FFFFFF',
                    fontWeight: '700',
                    fontSize: 16
                  }}>
                    Ver Detalles
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => Alert.alert('Lugares', 'Funcionalidad de lugares del trip próximamente disponible')}
                style={{
                  flex: 1,
                  backgroundColor: '#FFFFFF',
                  borderRadius: 16,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: '#FF3B30',
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 6,
                  elevation: 3
                }}
              >
                <Text style={{
                  color: '#FF3B30',
                  fontWeight: '700',
                  fontSize: 16
                }}>
                  ❤️ Ver Mis lugares
                </Text>
              </TouchableOpacity>
            </View>

            <View style={{
              flexDirection: 'row',
              gap: 12
            }}>
              <TouchableOpacity
                onPress={() => Alert.alert('AI Route', 'Funcionalidad de rutas con IA próximamente disponible')}
                style={{
                  flex: 1,
                  backgroundColor: '#FFFFFF',
                  borderRadius: 16,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: '#007AFF',
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 6,
                  elevation: 3
                }}
              >
                <Text style={{
                  color: '#007AFF',
                  fontWeight: '700',
                  fontSize: 16
                }}>
                  🧠 Ruta Inteligente IA
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => Alert.alert('Alojamiento', 'Funcionalidad de alojamiento próximamente disponible')}
                style={{
                  flex: 1,
                  backgroundColor: '#FFFFFF',
                  borderRadius: 16,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: '#34C759',
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 6,
                  elevation: 3
                }}
              >
                <Text style={{
                  color: '#34C759',
                  fontWeight: '700',
                  fontSize: 16
                }}>
                  🏠 Estadía
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Bottom padding */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Modal de Nuevo Viaje */}
      <NewTripModal
        visible={showNewTripModal}
        onClose={() => setShowNewTripModal(false)}
        onTripCreated={() => {
          loadTripStats(); // Recargar estadísticas
        }}
      />
    </View>
  );
}
