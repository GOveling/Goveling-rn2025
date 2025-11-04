/**
 * SettingsModal - Comprehensive app settings screen
 * Handles language, theme, notifications, units, and privacy settings
 */

import React, { useState } from 'react';

import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Modal,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';

import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';

import { useAppSettings, Language, Theme, Units } from '~/contexts/AppSettingsContext';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

const LANGUAGES = [
  { code: 'es' as Language, name: 'Español', flag: '🇪🇸', native: 'Español' },
  { code: 'en' as Language, name: 'English', flag: '🇬🇧', native: 'English' },
  { code: 'pt' as Language, name: 'Portuguese', flag: '🇵🇹', native: 'Português' },
  { code: 'fr' as Language, name: 'French', flag: '🇫🇷', native: 'Français' },
  { code: 'it' as Language, name: 'Italian', flag: '🇮🇹', native: 'Italiano' },
  { code: 'zh' as Language, name: 'Chinese', flag: '🇨🇳', native: '中文' },
  { code: 'ja' as Language, name: 'Japanese', flag: '🇯🇵', native: '日本語' },
];

const THEMES = [
  { value: 'light' as Theme, label: 'Claro', icon: 'sunny-outline' as const },
  { value: 'dark' as Theme, label: 'Oscuro', icon: 'moon-outline' as const },
  { value: 'auto' as Theme, label: 'Automático', icon: 'phone-portrait-outline' as const },
];

export default function SettingsModal({ visible, onClose }: SettingsModalProps) {
  const {
    settings,
    setLanguage,
    setTheme,
    setUnits,
    updateNotifications,
    updatePrivacy,
    resetSettings,
    isLoading,
  } = useAppSettings();

  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleLanguageChange = async (lang: Language) => {
    try {
      setIsSaving(true);
      await setLanguage(lang);
      setShowLanguageModal(false);

      // Show success message
      if (Platform.OS === 'web') {
        alert('Idioma actualizado. La aplicación se recargará.');
        window.location.reload();
      } else {
        Alert.alert('Idioma Actualizado', 'El idioma se ha cambiado correctamente.', [
          { text: 'OK' },
        ]);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo cambiar el idioma');
    } finally {
      setIsSaving(false);
    }
  };

  const handleThemeChange = async (theme: Theme) => {
    try {
      setIsSaving(true);
      await setTheme(theme);
      setShowThemeModal(false);
    } catch (error) {
      Alert.alert('Error', 'No se pudo cambiar el tema');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetSettings = () => {
    Alert.alert(
      'Restablecer Configuración',
      '¿Estás seguro de que quieres restablecer toda la configuración a los valores predeterminados?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restablecer',
          style: 'destructive',
          onPress: async () => {
            try {
              await resetSettings();
              Alert.alert('Éxito', 'Configuración restablecida correctamente');
            } catch (error) {
              Alert.alert('Error', 'No se pudo restablecer la configuración');
            }
          },
        },
      ]
    );
  };

  const getCurrentLanguageName = () => {
    const lang = LANGUAGES.find((l) => l.code === settings.language);
    return lang ? `${lang.flag} ${lang.native}` : 'Español';
  };

  const getCurrentThemeName = () => {
    const theme = THEMES.find((t) => t.value === settings.theme);
    return theme?.label || 'Claro';
  };

  if (isLoading) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4F8EF7" />
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        {/* Header */}
        <LinearGradient
          colors={['#4F8EF7', '#7B61FF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <Ionicons name="settings-sharp" size={24} color="#fff" />
              <Text style={styles.headerTitle}>Configuración</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* General Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>GENERAL</Text>

            {/* Language */}
            <TouchableOpacity style={styles.settingItem} onPress={() => setShowLanguageModal(true)}>
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#4F8EF720' }]}>
                  <Ionicons name="language" size={22} color="#4F8EF7" />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Idioma</Text>
                  <Text style={styles.settingValue}>{getCurrentLanguageName()}</Text>
                </View>
              </View>
              <Feather name="chevron-right" size={20} color="#999" />
            </TouchableOpacity>

            {/* Theme */}
            <TouchableOpacity style={styles.settingItem} onPress={() => setShowThemeModal(true)}>
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#7B61FF20' }]}>
                  <Ionicons name="color-palette" size={22} color="#7B61FF" />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Tema</Text>
                  <Text style={styles.settingValue}>{getCurrentThemeName()}</Text>
                </View>
              </View>
              <Feather name="chevron-right" size={20} color="#999" />
            </TouchableOpacity>

            {/* Units */}
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#FF8C4220' }]}>
                  <MaterialIcons name="straighten" size={22} color="#FF8C42" />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Unidades</Text>
                  <Text style={styles.settingValue}>
                    {settings.units === 'metric' ? 'Métrico (km, °C)' : 'Imperial (mi, °F)'}
                  </Text>
                </View>
              </View>
              <Switch
                value={settings.units === 'metric'}
                onValueChange={(value) => setUnits(value ? 'metric' : 'imperial')}
                trackColor={{ false: '#ccc', true: '#4F8EF7' }}
                thumbColor={
                  Platform.OS === 'ios' ? '#fff' : settings.units === 'metric' ? '#fff' : '#f4f3f4'
                }
              />
            </View>
          </View>

          {/* Notifications Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>NOTIFICACIONES</Text>

            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#00C85320' }]}>
                  <Ionicons name="notifications" size={22} color="#00C853" />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Notificaciones Push</Text>
                  <Text style={styles.settingSubtitle}>Recibir alertas generales</Text>
                </View>
              </View>
              <Switch
                value={settings.notifications.enabled}
                onValueChange={(value) => updateNotifications({ enabled: value })}
                trackColor={{ false: '#ccc', true: '#00C853' }}
                thumbColor={
                  Platform.OS === 'ios'
                    ? '#fff'
                    : settings.notifications.enabled
                      ? '#fff'
                      : '#f4f3f4'
                }
              />
            </View>

            {settings.notifications.enabled && (
              <>
                <View style={[styles.settingItem, styles.subItem]}>
                  <View style={styles.settingLeft}>
                    <Text style={styles.settingTitle}>Recordatorios de Viajes</Text>
                  </View>
                  <Switch
                    value={settings.notifications.tripReminders}
                    onValueChange={(value) => updateNotifications({ tripReminders: value })}
                    trackColor={{ false: '#ccc', true: '#4F8EF7' }}
                    thumbColor={Platform.OS === 'ios' ? '#fff' : '#fff'}
                  />
                </View>

                <View style={[styles.settingItem, styles.subItem]}>
                  <View style={styles.settingLeft}>
                    <Text style={styles.settingTitle}>Alertas de Lugares Cercanos</Text>
                  </View>
                  <Switch
                    value={settings.notifications.nearbyAlerts}
                    onValueChange={(value) => updateNotifications({ nearbyAlerts: value })}
                    trackColor={{ false: '#ccc', true: '#4F8EF7' }}
                    thumbColor={Platform.OS === 'ios' ? '#fff' : '#fff'}
                  />
                </View>

                <View style={[styles.settingItem, styles.subItem]}>
                  <View style={styles.settingLeft}>
                    <Text style={styles.settingTitle}>Actualizaciones del Equipo</Text>
                  </View>
                  <Switch
                    value={settings.notifications.teamUpdates}
                    onValueChange={(value) => updateNotifications({ teamUpdates: value })}
                    trackColor={{ false: '#ccc', true: '#4F8EF7' }}
                    thumbColor={Platform.OS === 'ios' ? '#fff' : '#fff'}
                  />
                </View>

                <View style={[styles.settingItem, styles.subItem]}>
                  <View style={styles.settingLeft}>
                    <Text style={styles.settingTitle}>Mensajes de Chat</Text>
                  </View>
                  <Switch
                    value={settings.notifications.chatMessages}
                    onValueChange={(value) => updateNotifications({ chatMessages: value })}
                    trackColor={{ false: '#ccc', true: '#4F8EF7' }}
                    thumbColor={Platform.OS === 'ios' ? '#fff' : '#fff'}
                  />
                </View>
              </>
            )}
          </View>

          {/* Privacy Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PRIVACIDAD</Text>

            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#F4433620' }]}>
                  <Ionicons name="location" size={22} color="#F44336" />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Compartir Ubicación</Text>
                  <Text style={styles.settingSubtitle}>Con miembros del equipo</Text>
                </View>
              </View>
              <Switch
                value={settings.privacy.shareLocation}
                onValueChange={(value) => updatePrivacy({ shareLocation: value })}
                trackColor={{ false: '#ccc', true: '#F44336' }}
                thumbColor={Platform.OS === 'ios' ? '#fff' : '#fff'}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#4CAF5020' }]}>
                  <Ionicons name="radio-button-on" size={22} color="#4CAF50" />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Estado en Línea</Text>
                  <Text style={styles.settingSubtitle}>Mostrar cuando estás activo</Text>
                </View>
              </View>
              <Switch
                value={settings.privacy.showOnlineStatus}
                onValueChange={(value) => updatePrivacy({ showOnlineStatus: value })}
                trackColor={{ false: '#ccc', true: '#4CAF50' }}
                thumbColor={Platform.OS === 'ios' ? '#fff' : '#fff'}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#2196F320' }]}>
                  <Ionicons name="globe" size={22} color="#2196F3" />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Perfil Público</Text>
                  <Text style={styles.settingSubtitle}>Visible para otros viajeros</Text>
                </View>
              </View>
              <Switch
                value={settings.privacy.publicProfile}
                onValueChange={(value) => updatePrivacy({ publicProfile: value })}
                trackColor={{ false: '#ccc', true: '#2196F3' }}
                thumbColor={Platform.OS === 'ios' ? '#fff' : '#fff'}
              />
            </View>
          </View>

          {/* Advanced Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>AVANZADO</Text>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={() => Alert.alert('Cache', 'Funcionalidad próximamente')}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#FF572220' }]}>
                  <MaterialIcons name="cleaning-services" size={22} color="#FF5722" />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Limpiar Caché</Text>
                  <Text style={styles.settingSubtitle}>Liberar espacio de almacenamiento</Text>
                </View>
              </View>
              <Feather name="chevron-right" size={20} color="#999" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingItem} onPress={handleResetSettings}>
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#F4433620' }]}>
                  <MaterialIcons name="restore" size={22} color="#F44336" />
                </View>
                <View style={styles.settingText}>
                  <Text style={[styles.settingTitle, { color: '#F44336' }]}>
                    Restablecer Configuración
                  </Text>
                  <Text style={styles.settingSubtitle}>Volver a valores predeterminados</Text>
                </View>
              </View>
              <Feather name="chevron-right" size={20} color="#999" />
            </TouchableOpacity>
          </View>

          {/* App Info */}
          <View style={styles.appInfo}>
            <Text style={styles.appInfoText}>Goveling v1.0.0</Text>
            <Text style={styles.appInfoSubtext}>
              © 2025 Goveling. Todos los derechos reservados.
            </Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Language Selection Modal */}
        <Modal
          visible={showLanguageModal}
          animationType="slide"
          transparent
          onRequestClose={() => setShowLanguageModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Seleccionar Idioma</Text>
                <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              <ScrollView>
                {LANGUAGES.map((lang) => (
                  <TouchableOpacity
                    key={lang.code}
                    style={[
                      styles.languageOption,
                      settings.language === lang.code && styles.languageOptionSelected,
                    ]}
                    onPress={() => handleLanguageChange(lang.code)}
                    disabled={isSaving}
                  >
                    <Text style={styles.languageFlag}>{lang.flag}</Text>
                    <View style={styles.languageInfo}>
                      <Text style={styles.languageName}>{lang.name}</Text>
                      <Text style={styles.languageNative}>{lang.native}</Text>
                    </View>
                    {settings.language === lang.code && (
                      <Ionicons name="checkmark-circle" size={24} color="#4F8EF7" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Theme Selection Modal */}
        <Modal
          visible={showThemeModal}
          animationType="slide"
          transparent
          onRequestClose={() => setShowThemeModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Seleccionar Tema</Text>
                <TouchableOpacity onPress={() => setShowThemeModal(false)}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              {THEMES.map((theme) => (
                <TouchableOpacity
                  key={theme.value}
                  style={[
                    styles.themeOption,
                    settings.theme === theme.value && styles.themeOptionSelected,
                  ]}
                  onPress={() => handleThemeChange(theme.value)}
                  disabled={isSaving}
                >
                  <Ionicons
                    name={theme.icon}
                    size={28}
                    color={settings.theme === theme.value ? '#4F8EF7' : '#666'}
                  />
                  <Text
                    style={[
                      styles.themeLabel,
                      settings.theme === theme.value && styles.themeLabelSelected,
                    ]}
                  >
                    {theme.label}
                  </Text>
                  {settings.theme === theme.value && (
                    <Ionicons name="checkmark-circle" size={24} color="#4F8EF7" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999',
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  subItem: {
    paddingLeft: 56,
    backgroundColor: '#FAFAFA',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
    color: '#999',
  },
  settingValue: {
    fontSize: 14,
    color: '#666',
  },
  appInfo: {
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 20,
  },
  appInfoText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
  appInfoSubtext: {
    fontSize: 12,
    color: '#CCC',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },

  // Language modal
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 12,
  },
  languageOptionSelected: {
    backgroundColor: '#F0F7FF',
  },
  languageFlag: {
    fontSize: 32,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  languageNative: {
    fontSize: 14,
    color: '#666',
  },

  // Theme modal
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 16,
  },
  themeOptionSelected: {
    backgroundColor: '#F0F7FF',
  },
  themeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    flex: 1,
  },
  themeLabelSelected: {
    color: '#4F8EF7',
  },
});
