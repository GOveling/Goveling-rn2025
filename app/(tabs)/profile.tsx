import React from 'react';

import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  Dimensions,
  Pressable,
  Platform,
  Image,
  Modal,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

import { Ionicons, MaterialIcons, Feather, AntDesign } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import PersonalInfoEditModal from '~/components/profile/PersonalInfoEditModal';
import TravelDocumentsModal from '~/components/profile/TravelDocumentsModal';
import SettingsModal from '~/components/SettingsModal';
import { useAuth } from '~/contexts/AuthContext';
import { supabase } from '~/lib/supabase';
import { useTheme } from '~/lib/theme';
import { hasPinConfigured, removePinHash, verifyPin } from '~/services/documentEncryption';

import ProfileEditModal from '../../src/components/profile/ProfileEditModal';
import { VisitedCitiesModal } from '../../src/components/profile/VisitedCitiesModal';
import { VisitedCountriesModal } from '../../src/components/profile/VisitedCountriesModal';
import { VisitedPlacesModal } from '../../src/components/profile/VisitedPlacesModal';
import { useGetProfileQuery, useUpdateProfileMutation } from '../../src/store/api/userApi';

const { width } = Dimensions.get('window');

export default function ProfileTab() {
  const { t } = useTranslation();
  const { user, signOut: authSignOut } = useAuth();
  const theme = useTheme();

  // RTK Query: Get cached profile (5min cache)
  const {
    data: profile,
    isLoading: profileLoading,
    refetch: refetchProfile,
  } = useGetProfileQuery();
  const [updateProfile, { isLoading: isUpdating }] = useUpdateProfileMutation();

  // Modal states
  const [showVisitedPlacesModal, setShowVisitedPlacesModal] = React.useState(false);
  const [showVisitedCountriesModal, setShowVisitedCountriesModal] = React.useState(false);
  const [showVisitedCitiesModal, setShowVisitedCitiesModal] = React.useState(false);
  const [showSettingsModal, setShowSettingsModal] = React.useState(false);
  const [showTravelDocumentsModal, setShowTravelDocumentsModal] = React.useState(false);

  React.useEffect(() => {
    console.log('📱 ProfileTab rendered');
    console.log('👤 Current user:', user?.email);
  }, [user]);

  const [profileData, setProfileData] = React.useState({
    fullName: '',
    description: t('profile.travel_enthusiast'),
    avatarUrl: '',
    initials: '',
    level: t('profile.level_badge'),
    stats: {
      countriesVisited: 0,
      citiesExplored: 0,
      placesVisited: 0,
      achievementPoints: 0,
    },
  });

  // Sync RTK Query profile data with local state
  React.useEffect(() => {
    if (profile) {
      setProfileData((prev) => ({
        ...prev,
        fullName: profile.full_name || '',
        description: profile.bio || t('profile.travel_enthusiast'),
        avatarUrl: profile.avatar_url || '',
        initials: profile.full_name
          ? profile.full_name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .substring(0, 2)
              .toUpperCase()
          : '',
      }));
    }
  }, [profile, t]);

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
    // RTK Query loads profile automatically on mount
    // Just load travel stats
    loadTravelStats();
  }, []);

  // No longer needed - RTK Query handles profile loading
  // const loadProfileData = async () => { ... }

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
          .in('id', visits?.map((v) => v.trip_id) || []);

        const uniqueCountries = new Set();
        const uniqueCities = new Set();

        // Simular conteo de países y ciudades desde los trips
        trips?.forEach((trip) => {
          // Simular datos de ejemplo ya que no tenemos columna locations
          uniqueCountries.add('Chile'); // Ejemplo
          uniqueCities.add('Santiago'); // Ejemplo
        });

        setProfileData((prev) => ({
          ...prev,
          stats: {
            countriesVisited: uniqueCountries.size,
            citiesExplored: uniqueCities.size,
            placesVisited: visits?.length || 0,
            achievementPoints: calculateAchievementPoints(visits?.length || 0),
          },
        }));
      } else {
        // Usar estadísticas precalculadas
        setProfileData((prev) => ({
          ...prev,
          stats: {
            countriesVisited: travelStats.countries_count || 0,
            citiesExplored: travelStats.cities_count || 0,
            placesVisited: travelStats.places_count || 0,
            achievementPoints: calculateAchievementPoints(travelStats.places_count || 0),
          },
        }));
      }
    } catch (error) {
      console.error('Error loading stats:', error);
      // Usar datos de ejemplo si hay error
      setProfileData((prev) => ({
        ...prev,
        stats: {
          countriesVisited: 0,
          citiesExplored: 0,
          placesVisited: 0,
          achievementPoints: 0,
        },
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

  const MenuSection = ({
    icon,
    title,
    subtitle,
    onPress,
    iconColor = '#666',
    iconLib = 'Ionicons',
    textColor,
    subtitleColor,
    borderColor,
  }) => {
    const IconComponent =
      iconLib === 'MaterialIcons'
        ? MaterialIcons
        : iconLib === 'Feather'
          ? Feather
          : iconLib === 'AntDesign'
            ? AntDesign
            : Ionicons;

    return (
      <TouchableOpacity
        style={[styles.menuSection, borderColor ? { borderBottomColor: borderColor } : null]}
        onPress={onPress}
      >
        <View style={styles.menuLeft}>
          <View style={[styles.menuIconContainer, { backgroundColor: iconColor + '20' }]}>
            <IconComponent name={icon} size={20} color={iconColor} />
          </View>
          <View style={styles.menuText}>
            <Text style={[styles.menuTitle, textColor ? { color: textColor } : null]}>{title}</Text>
            <Text style={[styles.menuSubtitle, subtitleColor ? { color: subtitleColor } : null]}>
              {subtitle}
            </Text>
          </View>
        </View>
        <Feather name="chevron-right" size={20} color={subtitleColor || '#666'} />
      </TouchableOpacity>
    );
  };

  // 🔐 DEBUG: Verificar si el PIN está guardado
  const handleVerifyPinSaved = async () => {
    const hasPin = await hasPinConfigured();
    Alert.alert('🔐 Estado del PIN', hasPin ? '✅ PIN está guardado' : '❌ No hay PIN guardado');
  };

  // 🔐 DEBUG: Resetear el PIN
  const handleResetPin = async () => {
    Alert.alert(
      '⚠️ Resetear PIN',
      '¿Estás seguro de que quieres eliminar el PIN? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Resetear',
          style: 'destructive',
          onPress: async () => {
            await removePinHash();
            Alert.alert('✅ PIN Eliminado', 'El PIN ha sido eliminado correctamente.');
          },
        },
      ]
    );
  };

  // 🔐 DEBUG: Probar verificación de PIN
  const handleTestVerifyPin = async () => {
    const hasPin = await hasPinConfigured();
    if (!hasPin) {
      Alert.alert('❌ Error', 'No hay PIN configurado');
      return;
    }

    Alert.prompt(
      '🔐 Verificar PIN',
      'Ingresa tu PIN para verificar:',
      async (text) => {
        const isValid = await verifyPin(text);
        Alert.alert('🔐 Resultado', isValid ? '✅ PIN correcto' : '❌ PIN incorrecto');
      },
      'plain-text'
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
        const confirmed = window.confirm(t('profile.sign_out_confirmation'));
        console.log('🚪 User confirmation result:', confirmed);

        if (!confirmed) {
          console.log('🚪 Sign out cancelled by user');
          return;
        }

        console.log('🚪 User confirmed sign out, proceeding...');

        if (!authSignOut) {
          console.error('🚪 ERROR: authSignOut function not available from AuthContext');
          window.alert(t('common.error'));
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
        Alert.alert(t('profile.sign_out'), t('profile.sign_out_confirmation'), [
          {
            text: t('common.cancel'),
            style: 'cancel',
            onPress: () => console.log('🚪 Mobile - Sign out cancelled by user'),
          },
          {
            text: t('profile.sign_out'),
            style: 'destructive',
            onPress: async () => {
              try {
                console.log('🚪 Mobile - User confirmed, proceeding with sign out...');
                console.log('🚪 Mobile - AuthSignOut function:', typeof authSignOut, !!authSignOut);

                if (!authSignOut) {
                  console.error('🚪 ERROR: authSignOut function not available from AuthContext');
                  Alert.alert(t('common.error'), t('common.error'));
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
                Alert.alert(t('common.error'), t('common.error'));
              }
            },
          },
        ]);
      }
    } catch (error) {
      console.error('🚪 ❌ Unexpected error in handleSignOut:', error);
      // More user-friendly error message
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(t('common.error'));
      } else {
        Alert.alert(t('common.error'), t('common.error'));
      }
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={{ paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header con Avatar y Info Personal */}
      <View style={[styles.headerSection, { backgroundColor: theme.colors.card }]}>
        <View style={styles.avatarContainer}>
          {profileData.avatarUrl ? (
            <Image source={{ uri: profileData.avatarUrl }} style={styles.avatarImage} />
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

        <Text style={[styles.userName, { color: theme.colors.text }]}>{profileData.fullName}</Text>
        <Text style={[styles.userDescription, { color: theme.colors.textMuted }]}>
          {profileData.description}
        </Text>

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
      <View style={[styles.statsCard, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.statsTitle, { color: theme.colors.text }]}>
          {t('profile.travel_stats_title')}
        </Text>

        <View style={styles.statsGrid}>
          <TouchableOpacity
            style={styles.statItem}
            onPress={() => setShowVisitedCountriesModal(true)}
          >
            <Text style={styles.statNumber}>{profileData.stats.countriesVisited}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>
              {t('profile.countries_visited')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statItem} onPress={() => setShowVisitedCitiesModal(true)}>
            <Text style={styles.statNumber}>{profileData.stats.citiesExplored}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>
              {t('profile.cities_explored')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.statItem} onPress={() => setShowVisitedPlacesModal(true)}>
            <Text style={styles.statNumber}>{profileData.stats.placesVisited}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>
              {t('profile.places_visited')}
            </Text>
          </TouchableOpacity>

          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{profileData.stats.achievementPoints}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>
              {t('profile.achievement_points')}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.detailsButton}
          onPress={() =>
            Alert.alert(t('profile.achievements'), t('profile.achievements_coming_soon'))
          }
        >
          <Text style={styles.detailsButtonText}>{t('profile.view_details')}</Text>
        </TouchableOpacity>
      </View>

      {/* Secciones del Menú */}
      <View style={[styles.menuContainer, { backgroundColor: theme.colors.card }]}>
        <MenuSection
          icon="person"
          title={t('profile.menu.personal_info')}
          subtitle={t('profile.menu.personal_info_desc')}
          iconColor="#00C853"
          textColor={theme.colors.text}
          subtitleColor={theme.colors.textMuted}
          borderColor={theme.colors.border}
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
          title={t('profile.menu.travel_documents')}
          subtitle={t('profile.menu.travel_documents_desc')}
          iconColor="#2196F3"
          textColor={theme.colors.text}
          subtitleColor={theme.colors.textMuted}
          borderColor={theme.colors.border}
          onPress={() => setShowTravelDocumentsModal(true)}
        />

        <MenuSection
          icon="chatbubble"
          title={t('profile.menu.my_reviews')}
          subtitle={t('profile.menu.my_reviews_desc')}
          iconColor="#673AB7"
          textColor={theme.colors.text}
          subtitleColor={theme.colors.textMuted}
          borderColor={theme.colors.border}
          onPress={() =>
            Alert.alert(t('profile.menu.my_reviews'), t('profile.reviews_coming_soon'))
          }
        />

        <MenuSection
          icon="notifications"
          title={t('profile.menu.notifications')}
          subtitle={t('profile.menu.notifications_desc')}
          iconColor="#00C853"
          textColor={theme.colors.text}
          subtitleColor={theme.colors.textMuted}
          borderColor={theme.colors.border}
          onPress={() => router.push('/settings')}
        />

        <MenuSection
          icon="trophy"
          iconLib="Ionicons"
          title={t('profile.menu.travel_achievements')}
          subtitle={t('profile.menu.travel_achievements_desc', {
            level: profileData.level,
            points: profileData.stats.achievementPoints,
          })}
          iconColor="#673AB7"
          textColor={theme.colors.text}
          subtitleColor={theme.colors.textMuted}
          borderColor={theme.colors.border}
          onPress={() =>
            Alert.alert(t('profile.achievements'), t('profile.achievements_coming_soon'))
          }
        />

        <MenuSection
          icon="share"
          iconLib="Feather"
          title={t('profile.menu.share_profile')}
          subtitle={t('profile.menu.share_profile_desc')}
          iconColor="#FF8C42"
          textColor={theme.colors.text}
          subtitleColor={theme.colors.textMuted}
          borderColor={theme.colors.border}
          onPress={() =>
            Alert.alert(t('profile.menu.share_profile'), t('profile.share_coming_soon'))
          }
        />

        <MenuSection
          icon="settings"
          title={t('profile.menu.settings')}
          subtitle={t('profile.menu.settings_desc')}
          iconColor="#666"
          textColor={theme.colors.text}
          subtitleColor={theme.colors.textMuted}
          borderColor={theme.colors.border}
          onPress={() => setShowSettingsModal(true)}
        />
      </View>

      {/* 🔐 DEBUG: Sección de utilidades para el PIN */}
      {__DEV__ && (
        <View style={[styles.menuContainer, { backgroundColor: theme.colors.card, marginTop: 12 }]}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: '700',
              color: '#FF9800',
              paddingHorizontal: 20,
              paddingTop: 16,
              paddingBottom: 12,
            }}
          >
            🔐 DEBUG: Utilidades del PIN
          </Text>

          <TouchableOpacity
            style={[styles.menuSection, { borderBottomColor: theme.colors.border }]}
            onPress={handleVerifyPinSaved}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#4CAF5020' }]}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              </View>
              <View style={styles.menuText}>
                <Text style={[styles.menuTitle, { color: theme.colors.text }]}>
                  Verificar si PIN está guardado
                </Text>
                <Text style={[styles.menuSubtitle, { color: theme.colors.textMuted }]}>
                  Comprobar estado en SecureStore
                </Text>
              </View>
            </View>
            <Feather name="chevron-right" size={20} color={theme.colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuSection, { borderBottomColor: theme.colors.border }]}
            onPress={handleTestVerifyPin}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#2196F320' }]}>
                <Ionicons name="key" size={20} color="#2196F3" />
              </View>
              <View style={styles.menuText}>
                <Text style={[styles.menuTitle, { color: theme.colors.text }]}>
                  Probar verificación de PIN
                </Text>
                <Text style={[styles.menuSubtitle, { color: theme.colors.textMuted }]}>
                  Ingresar PIN para validar
                </Text>
              </View>
            </View>
            <Feather name="chevron-right" size={20} color={theme.colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuSection, { borderBottomWidth: 0 }]}
            onPress={handleResetPin}
          >
            <View style={styles.menuLeft}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#FF3B3020' }]}>
                <Ionicons name="trash" size={20} color="#FF3B30" />
              </View>
              <View style={styles.menuText}>
                <Text style={[styles.menuTitle, { color: '#FF3B30' }]}>
                  Resetear PIN (eliminar)
                </Text>
                <Text style={[styles.menuSubtitle, { color: theme.colors.textMuted }]}>
                  Borrar PIN de SecureStore
                </Text>
              </View>
            </View>
            <Feather name="chevron-right" size={20} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {/* Botón Cerrar Sesión */}
      <Pressable
        style={({ pressed }) => [
          styles.signOutButton,
          { backgroundColor: theme.colors.card },
          Platform.OS === 'web' && pressed && { opacity: 0.8 },
        ]}
        onPress={() => {
          console.log('🚪 Button clicked for logout');
          console.log('🚪 Current user:', user?.email);
          console.log('🚪 AuthSignOut available:', !!authSignOut);
          handleSignOut();
        }}
      >
        <Feather name="log-out" size={20} color="#FF3B30" />
        <Text style={styles.signOutText}>{t('profile.sign_out')}</Text>
      </Pressable>

      {/* Personal Info Modal */}
      <PersonalInfoEditModal
        visible={showPersonalModal}
        onClose={() => {
          console.log(
            '🎯 PersonalInfoEditModal: onClose called, setting showPersonalModal to false'
          );
          setShowPersonalModal(false);
        }}
        userId={user?.id || ''}
        userEmail={user?.email}
        onSaved={refetchProfile}
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
          refetchProfile();
          setShowProfileEditModal(false);
        }}
      />

      {/* Visited Places Modal */}
      <VisitedPlacesModal
        visible={showVisitedPlacesModal}
        onClose={() => setShowVisitedPlacesModal(false)}
        userId={user?.id || ''}
      />

      {/* Visited Countries Modal */}
      <VisitedCountriesModal
        visible={showVisitedCountriesModal}
        onClose={() => setShowVisitedCountriesModal(false)}
        userId={user?.id || ''}
      />

      {/* Visited Cities Modal */}
      <VisitedCitiesModal
        visible={showVisitedCitiesModal}
        onClose={() => setShowVisitedCitiesModal(false)}
        userId={user?.id || ''}
      />

      {/* Settings Modal */}
      <SettingsModal visible={showSettingsModal} onClose={() => setShowSettingsModal(false)} />

      {/* Travel Documents Modal */}
      <TravelDocumentsModal
        visible={showTravelDocumentsModal}
        onClose={() => setShowTravelDocumentsModal(false)}
      />

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  avatarContainer: {
    marginBottom: 16,
    position: 'relative',
  },
  avatarGradient: {
    alignItems: 'center',
    borderRadius: 60,
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.3)',
    elevation: 8,
    height: 120,
    justifyContent: 'center',
    width: 120,
  },
  avatarImage: {
    borderRadius: 60,
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.3)',
    elevation: 8,
    height: 120,
    width: 120,
  },
  avatarText: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '700',
  },
  container: {
    backgroundColor: '#F8F9FA',
    flex: 1,
  },
  detailsButton: {
    alignSelf: 'center',
    marginTop: 10,
  },
  detailsButtonText: {
    color: '#4F8EF7',
    fontSize: 16,
    fontWeight: '600',
  },
  editButton: {
    alignItems: 'center',
    backgroundColor: '#4F8EF7',
    borderColor: '#fff',
    borderRadius: 20,
    borderWidth: 3,
    bottom: 0,
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 4,
    height: 40,
    justifyContent: 'center',
    position: 'absolute',
    right: 0,
    width: 40,
    zIndex: 10,
  },
  headerSection: {
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingBottom: 30,
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  levelBadge: {
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  levelText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  menuContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 4,
    marginHorizontal: 20,
    marginTop: 20,
    overflow: 'hidden',
  },
  menuIconContainer: {
    alignItems: 'center',
    borderRadius: 12,
    height: 40,
    justifyContent: 'center',
    marginRight: 16,
    width: 40,
  },
  menuLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    flex: 1,
  },
  menuSection: {
    alignItems: 'center',
    borderBottomColor: '#f0f0f0',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  menuSubtitle: {
    color: '#666',
    fontSize: 14,
  },
  menuText: {
    flex: 1,
  },
  menuTitle: {
    color: '#1a1a1a',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  signOutButton: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderColor: '#FF3B30',
    borderRadius: 16,
    borderWidth: 1,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 4,
    flexDirection: 'row',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 16,
  },
  signOutText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  statItem: {
    alignItems: 'center',
    marginBottom: 20,
    width: '48%',
  },
  statLabel: {
    color: '#666',
    fontSize: 14,
    lineHeight: 18,
    textAlign: 'center',
  },
  statNumber: {
    color: '#4F8EF7',
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 4,
  },
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 4,
    marginHorizontal: 20,
    marginTop: 20,
    padding: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statsTitle: {
    color: '#1a1a1a',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  userDescription: {
    color: '#666',
    fontSize: 16,
    marginBottom: 20,
  },
  userName: {
    color: '#1a1a1a',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
});
