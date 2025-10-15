import { useTranslation } from 'react-i18next';
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, StyleSheet, Dimensions, Pressable, Platform, Image, Modal, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { supabase } from '~/lib/supabase';
import { useAuth } from '~/contexts/AuthContext';
import { 
  Ionicons, 
  MaterialIcons, 
  Feather, 
  AntDesign 
} from '@expo/vector-icons';
import EmailTester from '../../components/EmailTester';
import PersonalInfoEditModal from '~/components/profile/PersonalInfoEditModal';
import ProfileEditModal from '../../src/components/profile/ProfileEditModal';

const { width } = Dimensions.get('window');

export default function ProfileScreen(){
  const { t } = useTranslation();
  const { user, signOut: authSignOut } = useAuth();
  
  React.useEffect(() => {
    console.log('📱 ProfileScreen rendered');
    console.log('👤 Current user:', user?.email);
  }, [user]);
  
  const [profileData, setProfileData] = React.useState({
    fullName: 'Sebastian Araos',
    description: 'Travel Enthusiast',
    avatarUrl: '',
    initials: 'SA',
    level: 'Backpack Explorer',
    stats: {
      countriesVisited: 0,
      citiesExplored: 0,
      placesVisited: 2,
      achievementPoints: 0
    }
  });

  const [showPersonalModal, setShowPersonalModal] = React.useState(false);
  const [showProfileEditModal, setShowProfileEditModal] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);

  React.useEffect(() => {
    console.log('🎯 ProfileScreen: showPersonalModal state changed to:', showPersonalModal);
  }, [showPersonalModal]);

  React.useEffect(() => {
    console.log('🎯 ProfileScreen: showProfileEditModal state changed to:', showProfileEditModal);
    if (showProfileEditModal) {
      console.log('✅ ProfileEditModal should be visible now!');
    }
  }, [showProfileEditModal]);

  React.useEffect(() => {
    loadProfileData();
    loadTravelStats();
  }, []);

  const loadProfileData = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.user.id)
        .maybeSingle();
      
      if (profile) {
        setProfileData(prev => ({
          ...prev,
          fullName: profile.full_name || 'Sebastian Araos',
          description: profile.description || 'Travel Enthusiast',
          avatarUrl: profile.avatar_url || '',
          initials: (profile.full_name || 'SA').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
        }));
      }
    } catch (error) {
      console.error('Error loading travel stats:', error);
    }
  };

  const onRefresh = React.useCallback(async () => {
    console.log('🔄 ProfileScreen: Pull-to-refresh triggered');
    setRefreshing(true);
    
    try {
      await Promise.all([
        loadProfileData(),
        loadTravelStats()
      ]);
      console.log('✅ ProfileScreen: Pull-to-refresh completed successfully');
    } catch (error) {
      console.error('❌ ProfileScreen: Pull-to-refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const loadTravelStats = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Obtener estadísticas desde travel_stats si existe
      const { data: travelStats } = await supabase
        .from('travel_stats')
        .select('*')
        .eq('user_id', user.user.id)
        .maybeSingle();

      // Si no existe travel_stats, calcular desde trip_place_visits
      if (!travelStats) {
        const { data: visits } = await supabase
          .from('trip_place_visits')
          .select('place_id, trip_id')
          .eq('user_id', user.user.id);

        // Obtener trips únicos para contar países/ciudades visitadas  
        const { data: trips } = await supabase
          .from('trips')
          .select('id, title')
          .in('id', visits?.map(v => v.trip_id) || []);

        const uniqueCountries = new Set();
        const uniqueCities = new Set(); 
        
        // Simular conteo de países y ciudades desde los trips
        trips?.forEach(trip => {
          // Simular datos de ejemplo ya que no tenemos columna locations
          uniqueCountries.add('Chile'); // Ejemplo
          uniqueCities.add('Santiago'); // Ejemplo
        });

        setProfileData(prev => ({
          ...prev,
          stats: {
            countriesVisited: uniqueCountries.size,
            citiesExplored: uniqueCities.size,
            placesVisited: visits?.length || 2,
            achievementPoints: calculateAchievementPoints(visits?.length || 0)
          }
        }));
      } else {
        // Usar estadísticas precalculadas
        setProfileData(prev => ({
          ...prev,
          stats: {
            countriesVisited: travelStats.countries_count || 0,
            citiesExplored: travelStats.cities_count || 0,
            placesVisited: travelStats.places_count || 2,
            achievementPoints: calculateAchievementPoints(travelStats.places_count || 0)
          }
        }));
      }
    } catch (error) {
      console.error('Error loading stats:', error);
      // Usar datos de ejemplo si hay error
      setProfileData(prev => ({
        ...prev,
        stats: {
          countriesVisited: 0,
          citiesExplored: 0,
          placesVisited: 2,
          achievementPoints: 0
        }
      }));
    }
  };

  const calculateAchievementPoints = (placesCount: number) => {
    // Sistema de puntos basado en lugares visitados
    let points = 0;
    if (placesCount >= 100) points += 500; // Scout badge
    if (placesCount >= 50) points += 250;
    if (placesCount >= 25) points += 100;
    if (placesCount >= 10) points += 50;
    if (placesCount >= 5) points += 25;
    return points;
  };

  const handleSignOut = async () => {
    try {
      console.log('🚪 Starting sign out process...');
      console.log('🚪 Current platform:', Platform.OS);
      console.log('🚪 User email:', user?.email);
      console.log('🚪 AuthSignOut function:', typeof authSignOut, !!authSignOut);
      
      // Check if we're on web - use different alert approach
      const isWeb = typeof window !== 'undefined' && window.document;
      console.log('🚪 Is web environment:', isWeb);
      
      if (isWeb) {
        // Use web-compatible confirm dialog
        console.log('🚪 Showing web confirmation dialog...');
        const confirmed = window.confirm('¿Estás seguro de que quieres cerrar sesión?');
        console.log('🚪 User confirmation result:', confirmed);
        
        if (!confirmed) {
          console.log('🚪 Sign out cancelled by user');
          return;
        }
        
        console.log('🚪 User confirmed sign out, proceeding...');
        
        if (!authSignOut) {
          console.error('🚪 ERROR: authSignOut function not available from AuthContext');
          window.alert('No se pudo cerrar sesión. Función no disponible.');
          return;
        }

        console.log('🚪 Calling AuthContext authSignOut...');
        try {
          await authSignOut();
          console.log('🚪 ✅ AuthContext signOut completed successfully');
        } catch (signOutError) {
          console.error('🚪 ❌ Error during authSignOut:', signOutError);
          throw signOutError;
        }
        
      } else {
        // Use React Native Alert for mobile
        console.log('🚪 Showing mobile confirmation dialog...');
        Alert.alert(
          'Cerrar Sesión',
          '¿Estás seguro de que quieres cerrar sesión?',
          [
            {
              text: 'Cancelar',
              style: 'cancel',
              onPress: () => console.log('🚪 Mobile - Sign out cancelled by user')
            },
            {
              text: 'Cerrar Sesión',
              style: 'destructive',
              onPress: async () => {
                try {
                  console.log('🚪 Mobile - User confirmed, proceeding with sign out...');
                  console.log('🚪 Mobile - AuthSignOut function:', typeof authSignOut, !!authSignOut);
                  
                  if (!authSignOut) {
                    console.error('🚪 ERROR: authSignOut function not available from AuthContext');
                    Alert.alert('Error', 'No se pudo cerrar sesión. Función no disponible.');
                    return;
                  }

                  console.log('🚪 Mobile - calling authSignOut...');
                  try {
                    await authSignOut();
                    console.log('🚪 ✅ Mobile - signOut completed successfully');
                  } catch (signOutError) {
                    console.error('🚪 ❌ Mobile - Error during authSignOut:', signOutError);
                    throw signOutError;
                  }
                  
                } catch (signOutError) {
                  console.error('🚪 ❌ Mobile - Error during sign out:', signOutError);
                  Alert.alert(
                    'Error',
                    'Hubo un problema al cerrar sesión. Por favor, intenta de nuevo.'
                  );
                }
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('🚪 Error showing sign out alert:', error);
      const isWeb = typeof window !== 'undefined' && window.document;
      if (isWeb) {
        window.alert('Hubo un problema. Por favor, intenta de nuevo.');
      } else {
        Alert.alert('Error', 'Hubo un problema. Por favor, intenta de nuevo.');
      }
    }
  };

  const MenuSection = ({ icon, title, subtitle, onPress, iconColor = '#666', iconLib = 'Ionicons' }) => {
    const IconComponent = iconLib === 'MaterialIcons' ? MaterialIcons : 
                         iconLib === 'Feather' ? Feather : 
                         iconLib === 'AntDesign' ? AntDesign : Ionicons;
    
    return (
      <TouchableOpacity style={styles.menuSection} onPress={onPress}>
        <View style={styles.menuLeft}>
          <View style={[styles.menuIconContainer, { backgroundColor: iconColor + '20' }]}>
            <IconComponent name={icon} size={20} color={iconColor} />
          </View>
          <View style={styles.menuText}>
            <Text style={styles.menuTitle}>{title}</Text>
            <Text style={styles.menuSubtitle}>{subtitle}</Text>
          </View>
        </View>
        <Feather name="chevron-right" size={20} color="#666" />
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView 
      style={styles.container} 
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#6366F1', '#8B5CF6']} // Android - profile theme colors
          tintColor="#6366F1" // iOS
          title="Actualizando perfil..." // iOS
          titleColor="#666" // iOS
        />
      }
    >
      {/* Header con Avatar y Info Personal */}
      <View style={styles.headerSection}>
        <View style={styles.avatarContainer}>
          {profileData.avatarUrl ? (
            <Image 
              source={{ uri: profileData.avatarUrl }}
              style={styles.avatarImage}
            />
          ) : (
            <LinearGradient
              colors={['#4F8EF7', '#FF8C42']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarGradient}
            >
              <Text style={styles.avatarText}>{profileData.initials}</Text>
            </LinearGradient>
          )}
          
          <TouchableOpacity 
            style={styles.editButton}
            onPress={(e) => {
              e?.stopPropagation?.();
              console.log('🎯 Avatar edit button pressed - opening ProfileEditModal');
              console.log('🔍 Current showProfileEditModal state:', showProfileEditModal);
              setShowProfileEditModal(true);
              console.log('✅ setShowProfileEditModal(true) called');
            }}
          >
            <Ionicons name="create" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
        
        <Text style={styles.userName}>{profileData.fullName}</Text>
        <Text style={styles.userDescription}>{profileData.description}</Text>
        
        <LinearGradient
          colors={['#4F8EF7', '#FF8C42']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.levelBadge}
        >
          <Text style={styles.levelText}>{profileData.level}</Text>
        </LinearGradient>
      </View>

      {/* Estadísticas de Viaje */}
      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>Estadísticas de Viaje</Text>
        
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{profileData.stats.countriesVisited}</Text>
            <Text style={styles.statLabel}>Países Visitados</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{profileData.stats.citiesExplored}</Text>
            <Text style={styles.statLabel}>Ciudades Exploradas</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{profileData.stats.placesVisited}</Text>
            <Text style={styles.statLabel}>Lugares Visitados</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{profileData.stats.achievementPoints}</Text>
            <Text style={styles.statLabel}>Puntos de Logros</Text>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.detailsButton}
          onPress={() => router.push('/profile/achievements')}
        >
          <Text style={styles.detailsButtonText}>Ver detalles</Text>
        </TouchableOpacity>
      </View>

      {/* Secciones del Menú */}
      <View style={styles.menuContainer}>
        <MenuSection
          icon="person"
          title="Información Personal"
          subtitle="Administra tus datos personales"
          iconColor="#00C853"
          onPress={() => {
            console.log('🔥 INFORMACIÓN PERSONAL BUTTON CLICKED');
            Alert.alert(
              'Información Personal',
              'Este botón abre el modal de información personal (datos como país, ciudad, etc.). Para cambiar la foto de perfil, usa el pequeño botón de lápiz al lado del avatar.',
              [{ text: 'OK', onPress: () => setShowPersonalModal(true) }]
            );
          }}
        />

        <MenuSection
          icon="document-text"
          iconLib="Ionicons"
          title="Documentos de Viaje"
          subtitle="Pasaportes, visas, boletos"
          iconColor="#2196F3"
          onPress={() => router.push('/profile/documents')}
        />

        <MenuSection
          icon="chatbubble"
          title="Mis Reseñas"
          subtitle="Gestiona tus reseñas de lugares"
          iconColor="#673AB7"
          onPress={() => router.push('/explore/reviews')}
        />

        <MenuSection
          icon="notifications"
          title="Notificaciones"
          subtitle="Gestionar alertas y actualizaciones"
          iconColor="#00C853"
          onPress={() => {
            console.log('⚠️ Notificaciones pressed - TEMPORALMENTE DESHABILITADO');
            // router.push('/settings')
          }}
        />

        <MenuSection
          icon="trophy"
          iconLib="Ionicons"
          title="Logros de Viaje"
          subtitle={`Nivel 1 ${profileData.level} • ${profileData.stats.achievementPoints} puntos ganados`}
          iconColor="#673AB7"
          onPress={() => router.push('/profile/achievements')}
        />

        <MenuSection
          icon="share"
          iconLib="Feather"
          title="Compartir Perfil"
          subtitle="Conectar con viajeros"
          iconColor="#FF8C42"
          onPress={() => Alert.alert('Compartir', 'Función próximamente disponible')}
        />

        <MenuSection
          icon="settings"
          title="Configuración"
          subtitle="Preferencias de la app"
          iconColor="#666"
          onPress={() => {
            console.log('⚠️ Configuración pressed - TEMPORALMENTE DESHABILITADO');
            // router.push('/settings')
          }}
        />
      </View>

      {/* Botón de Prueba Temporal */}
      <View style={{ padding: 20, backgroundColor: '#fff', margin: 20, borderRadius: 10 }}>
        <TouchableOpacity
          style={{
            backgroundColor: '#FF0000',
            padding: 15,
            borderRadius: 10,
            alignItems: 'center'
          }}
          onPress={() => {
            console.log('🔴 BOTÓN DE PRUEBA PRESIONADO - Abriendo ProfileEditModal');
            setShowProfileEditModal(true);
          }}
        >
          <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>
            PRUEBA - ABRIR MODAL DE PERFIL
          </Text>
        </TouchableOpacity>
        <Text style={{ textAlign: 'center', marginTop: 10, fontSize: 12, color: '#666' }}>
          Estado actual: {showProfileEditModal ? 'ABIERTO' : 'CERRADO'}
        </Text>
      </View>

      {/* Prueba de Email */}
      <EmailTester />

      {/* Botón de Prueba para Debug */}
      <Pressable 
        style={({ pressed }) => [
          styles.signOutButton, 
          { backgroundColor: '#E3F2FD', borderColor: '#2196F3', marginBottom: 10 },
          Platform.OS === 'web' && pressed && { opacity: 0.7 },
          Platform.OS === 'web' && { cursor: 'pointer' }
        ]}
        onPress={() => {
          console.log('🧪 Test button pressed');
          const isWeb = typeof window !== 'undefined' && window.document;
          if (isWeb) {
            window.alert('El botón de prueba funciona correctamente en web');
          } else {
            Alert.alert('Test', 'El botón de prueba funciona correctamente');
          }
        }}
      >
        <Text style={[styles.signOutText, { color: '#2196F3' }]}>🧪 Botón de Prueba</Text>
      </Pressable>

      {/* Botón Cerrar Sesión - Web Compatible */}
      <Pressable 
        style={({ pressed }) => [
          styles.signOutButton,
          Platform.OS === 'web' && pressed && { opacity: 0.7 },
          Platform.OS === 'web' && { cursor: 'pointer' }
        ]}
        onPress={() => {
          console.log('🔥 LOGOUT BUTTON CLICKED - Starting handleSignOut');
          console.log('👤 Current user before logout:', user?.email);
          console.log('🧩 AuthSignOut function available:', !!authSignOut);
          handleSignOut();
        }}
        testID="signout-button"
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Feather name="log-out" size={20} color="#FF3B30" />
        <Text style={styles.signOutText}>Cerrar Sesión</Text>
      </Pressable>

      <PersonalInfoEditModal 
        visible={showPersonalModal} 
        onClose={() => {
          console.log('🎯 PersonalInfoEditModal: onClose called, setting showPersonalModal to false');
          setShowPersonalModal(false);
        }} 
        userId={user?.id || ''} 
        userEmail={user?.email}
        onSaved={loadProfileData}
      />

      <ProfileEditModal 
        visible={showProfileEditModal}
        onClose={() => {
          console.log('🔄 Closing ProfileEditModal');
          setShowProfileEditModal(false);
        }}
        onSaved={() => {
          console.log('💾 Profile saved in ProfileEditModal');
          loadProfileData();
          setShowProfileEditModal(false);
        }}
      />

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  headerSection: {
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 20,
    paddingBottom: 30,
    backgroundColor: '#fff',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
  },
  editButton: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4F8EF7',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 10, // Asegurar que esté encima
    borderWidth: 3,
    borderColor: '#fff',
  },
  userName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  userDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  levelBadge: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  levelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  statsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 20,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 20,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: '#4F8EF7',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
  },
  detailsButton: {
    alignSelf: 'center',
    marginTop: 10,
  },
  detailsButtonText: {
    fontSize: 16,
    color: '#4F8EF7',
    fontWeight: '600',
  },
  menuContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  menuSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuText: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#FF3B30',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
    marginLeft: 8,
  },
});
