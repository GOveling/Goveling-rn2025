import React, { useState, useEffect } from 'react';

import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '~/lib/theme';
import {
  checkBiometricCapabilities,
  isBiometricAuthEnabled,
  setBiometricAuthEnabled,
  authenticateWithBiometrics,
  getBiometricTypeName,
  getBiometricIconName,
  type BiometricCapabilities,
} from '~/services/biometricAuth';

interface SecuritySettingsModalProps {
  visible: boolean;
  onClose: () => void;
  onChangePIN?: () => void; // Optional callback for changing PIN
}

export default function SecuritySettingsModal({
  visible,
  onClose,
  onChangePIN,
}: SecuritySettingsModalProps) {
  const theme = useTheme();
  const [biometricCapabilities, setBiometricCapabilities] = useState<BiometricCapabilities | null>(
    null
  );
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadBiometricSettings();
    }
  }, [visible]);

  const loadBiometricSettings = async () => {
    try {
      console.log('🔧 SecuritySettingsModal: Loading biometric settings...');
      const capabilities = await checkBiometricCapabilities();
      console.log('🔧 SecuritySettingsModal: Capabilities:', capabilities);
      setBiometricCapabilities(capabilities);

      if (capabilities.isAvailable) {
        const enabled = await isBiometricAuthEnabled();
        console.log('🔧 SecuritySettingsModal: Current enabled state:', enabled);
        setBiometricEnabledState(enabled);
      }
    } catch (error) {
      console.error('❌ SecuritySettingsModal: Error loading biometric settings:', error);
    }
  };

  const handleToggleBiometric = async (value: boolean) => {
    console.log('🔧 SecuritySettingsModal: Toggle biometric called with value:', value);

    if (!biometricCapabilities?.isAvailable) {
      console.log('❌ SecuritySettingsModal: Biometric not available');
      Alert.alert(
        'No disponible',
        'La autenticación biométrica no está disponible en este dispositivo.'
      );
      return;
    }

    // Don't allow toggling while loading
    if (loading) {
      console.log('⏳ SecuritySettingsModal: Already loading, skipping...');
      return;
    }

    setLoading(true);

    try {
      if (value) {
        console.log('🔓 SecuritySettingsModal: Attempting to ENABLE biometric...');
        // Enabling - require authentication first (skip enabled check since we're setting it up)
        const result = await authenticateWithBiometrics(
          `Habilitar ${getBiometricTypeName(biometricCapabilities.biometricType)}`,
          true // Skip the "isEnabled" check during setup
        );

        console.log('🔧 SecuritySettingsModal: Biometric auth result:', result);

        if (result.success) {
          console.log('✅ SecuritySettingsModal: Auth successful, saving to storage...');
          await setBiometricAuthEnabled(true);
          setBiometricEnabledState(true);
          console.log('✅ SecuritySettingsModal: Biometric ENABLED successfully');
          Alert.alert(
            '✅ Habilitado',
            `${getBiometricTypeName(biometricCapabilities.biometricType)} ha sido habilitado correctamente.`
          );
        } else {
          console.log('❌ SecuritySettingsModal: Auth failed:', result.error);
          // Authentication failed or cancelled - keep switch OFF
          setBiometricEnabledState(false);
          Alert.alert('Error', result.error || 'No se pudo habilitar la autenticación biométrica');
        }
      } else {
        // Disabling - just confirm
        Alert.alert(
          'Deshabilitar autenticación biométrica',
          'Deberás usar tu PIN para acceder a tus documentos. ¿Estás seguro?',
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Deshabilitar',
              style: 'destructive',
              onPress: async () => {
                await setBiometricAuthEnabled(false);
                setBiometricEnabledState(false);
                Alert.alert(
                  '✅ Deshabilitado',
                  'La autenticación biométrica ha sido deshabilitada.'
                );
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error toggling biometric auth:', error);
      Alert.alert('Error', 'No se pudo cambiar la configuración de autenticación biométrica.');
    } finally {
      setLoading(false);
    }
  };

  const renderBiometricSection = () => {
    // ✅ ENABLED: Face ID now works in iOS Simulator and Development/Production builds
    // Note: Face ID requires Xcode simulator or a production build - NOT supported in Expo Go
    // See: BUG5_FACEID_EXPO_GO_LIMITATION.md for details

    if (!biometricCapabilities) {
      return null;
    }

    const { isAvailable, biometricType, hasHardware, isEnrolled } = biometricCapabilities;

    return (
      <View style={styles.settingSection}>
        <View style={styles.settingSectionHeader}>
          <Ionicons name="shield-checkmark" size={20} color={theme.colors.primary} />
          <Text style={[styles.settingSectionTitle, { color: theme.colors.text }]}>
            Autenticación
          </Text>
        </View>

        <View style={[styles.settingCard, { backgroundColor: theme.colors.card }]}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons
                // @ts-expect-error - Dynamic icon name from biometric service
                name={getBiometricIconName(biometricType)}
                size={24}
                color={isAvailable ? theme.colors.primary : theme.colors.textMuted}
              />
              <View style={styles.settingText}>
                <Text style={[styles.settingTitle, { color: theme.colors.text }]}>
                  {getBiometricTypeName(biometricType)}
                </Text>
                <Text style={[styles.settingSubtitle, { color: theme.colors.textMuted }]}>
                  {isAvailable
                    ? 'Acceso rápido a tus documentos'
                    : !hasHardware
                      ? 'No disponible en este dispositivo'
                      : !isEnrolled
                        ? 'Configura primero en Ajustes del dispositivo'
                        : 'No disponible'}
                </Text>
              </View>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={handleToggleBiometric}
              disabled={!isAvailable || loading}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={biometricEnabled ? '#FFFFFF' : '#F4F3F4'}
            />
          </View>
        </View>

        {isAvailable && biometricEnabled && (
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={16} color={theme.colors.primary} />
            <Text style={[styles.infoText, { color: theme.colors.textMuted }]}>
              Podrás usar {getBiometricTypeName(biometricType)} en lugar de tu PIN. Si falla,
              siempre podrás usar tu PIN como respaldo.
            </Text>
          </View>
        )}

        {!isAvailable && hasHardware && !isEnrolled && (
          <View style={styles.warningBox}>
            <Ionicons name="warning" size={16} color="#FF9500" />
            <Text style={[styles.infoText, { color: '#FF9500' }]}>
              Ve a Ajustes del dispositivo y configura {getBiometricTypeName(biometricType)} para
              usar esta función.
            </Text>
          </View>
        )}
      </View>
    );
  };
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Configuración de Seguridad
          </Text>
          <View style={styles.spacer} />
        </View>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {renderBiometricSection()}

          {/* Other Security Settings */}
          <View style={styles.settingSection}>
            <View style={styles.settingSectionHeader}>
              <Ionicons name="key" size={20} color={theme.colors.primary} />
              <Text style={[styles.settingSectionTitle, { color: theme.colors.text }]}>PIN</Text>
            </View>

            <View style={[styles.settingCard, { backgroundColor: theme.colors.card }]}>
              <TouchableOpacity
                style={styles.settingRow}
                onPress={() => {
                  if (onChangePIN) {
                    onChangePIN();
                  } else {
                    Alert.alert(
                      'Próximamente',
                      'La función de cambiar PIN estará disponible pronto.'
                    );
                  }
                }}
              >
                <View style={styles.settingLeft}>
                  <Ionicons name="lock-closed" size={24} color={theme.colors.text} />
                  <View style={styles.settingText}>
                    <Text style={[styles.settingTitle, { color: theme.colors.text }]}>
                      Cambiar PIN
                    </Text>
                    <Text style={[styles.settingSubtitle, { color: theme.colors.textMuted }]}>
                      Actualiza tu PIN de seguridad
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Info Section */}
          <View style={styles.infoSection}>
            <Ionicons name="shield-checkmark-outline" size={48} color={theme.colors.textMuted} />
            <Text style={[styles.infoSectionTitle, { color: theme.colors.text }]}>
              Tus documentos están seguros
            </Text>
            <Text style={[styles.infoSectionText, { color: theme.colors.textMuted }]}>
              Todos tus documentos están encriptados con cifrado de nivel militar AES-256-GCM. Solo
              tú puedes acceder a ellos con tu PIN o autenticación biométrica.
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  spacer: {
    width: 36,
  },
  content: {
    flex: 1,
  },
  settingSection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  settingSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  settingSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  settingCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
  },
  infoBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  warningBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  infoText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  infoSection: {
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  infoSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  infoSectionText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
