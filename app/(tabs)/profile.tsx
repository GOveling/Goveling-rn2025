import { useTranslation } from 'react-i18next';
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, StyleSheet, Dimensions, Pressable, Platform, Image, Modal } from 'react-native';
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
import PersonalInfoEditModal from '~/components/profile/PersonalInfoEditModal';
import ProfileEditModal from '../../src/components/profile/ProfileEditModal';

const { width } = Dimensions.get('window');

export default function ProfileTab(){
  const { t } = useTranslation();
  const { user, signOut: authSignOut } = useAuth();
  
  React.useEffect(() => {
    console.log('📱 ProfileTab rendered');
    console.log('👤 Current user:', user?.email);
  }, [user]);
  
  const [profileData, setProfileData] = React.useState({
    fullName: '',
    description: 'Travel Enthusiast',
    avatarUrl: '',
    initials: '',
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

  React.useEffect(() => {
    console.log('🎯 ProfileTab: showPersonalModal state changed to:', showPersonalModal);
  }, [showPersonalModal]);

  React.useEffect(() => {
    console.log('🎯 ProfileTab: showProfileEditModal state changed to:', showProfileEditModal);
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
          fullName: profile.full_name || '',
          description: profile.description || 'Travel Enthusiast',
          avatarUrl: profile.avatar_url || '',
          initials: profile.full_name ? profile.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : ''
        }));
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

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

  // Sign out function with comprehensive debug logging
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
      console.error('🚪 ❌ Unexpected error in handleSignOut:', error);
      // More user-friendly error message
      if (typeof window !== 'undefined' && window.alert) {
        window.alert('No se pudo cerrar sesión. Inténtalo de nuevo.');
      } else {
        Alert.alert('Error', 'No se pudo cerrar sesión. Inténtalo de nuevo.');
      }
    }
  };

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={{ paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
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
          onPress={() => Alert.alert('Logros', 'Funcionalidad de logros próximamente disponible')}
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
            console.log('🔥 Current showPersonalModal state:', showPersonalModal);
            console.log('🔥 Setting showPersonalModal to true...');
            setShowPersonalModal(true);
            console.log('🔥 Modal should now be visible');
          }}
        />

        <MenuSection
          icon="document-text"
          iconLib="Ionicons"
          title="Documentos de Viaje"
          subtitle="Pasaportes, visas, boletos"
          iconColor="#2196F3"
          onPress={() => Alert.alert('Documentos', 'Funcionalidad de documentos próximamente disponible')}
        />

        <MenuSection
          icon="chatbubble"
          title="Mis Reseñas"
          subtitle="Gestiona tus reseñas de lugares"
          iconColor="#673AB7"
          onPress={() => Alert.alert('Reseñas', 'Funcionalidad de reseñas próximamente disponible')}
        />

        <MenuSection
          icon="notifications"
          title="Notificaciones"
          subtitle="Gestionar alertas y actualizaciones"
          iconColor="#00C853"
          onPress={() => router.push('/settings')}
        />

        <MenuSection
          icon="trophy"
          iconLib="Ionicons"
          title="Logros de Viaje"
          subtitle={`Nivel 1 ${profileData.level} • ${profileData.stats.achievementPoints} puntos ganados`}
          iconColor="#673AB7"
          onPress={() => Alert.alert('Logros', 'Funcionalidad de logros próximamente disponible')}
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
          onPress={() => router.push('/settings')}
        />
      </View>

      {/* Botón Cerrar Sesión */}
      <Pressable 
        style={({ pressed }) => [
          styles.signOutButton,
          Platform.OS === 'web' && pressed && { opacity: 0.8 }
        ]}
        onPress={() => {
          console.log('🚪 Button clicked for logout');
          console.log('🚪 Current user:', user?.email);
          console.log('🚪 AuthSignOut available:', !!authSignOut);
          handleSignOut();
        }}
      >
        <Feather name="log-out" size={20} color="#FF3B30" />
        <Text style={styles.signOutText}>Cerrar Sesión</Text>
      </Pressable>

      {/* Personal Info Modal */}
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

      {/* Profile Edit Modal */}
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
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.3)',
    elevation: 8,
    elevation: 8,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.3)',
    elevation: 8,
    elevation: 8,
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
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 4,
    elevation: 4,
    zIndex: 10,
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
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 8,
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
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 8,
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
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 8,
    elevation: 4,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
    marginLeft: 8,
  },
});