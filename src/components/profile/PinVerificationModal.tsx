import React, { useState, useEffect } from 'react';

import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '~/lib/theme';
import {
  authenticateWithBiometrics,
  isBiometricAuthEnabled,
  checkBiometricCapabilities,
  getBiometricTypeName,
  getBiometricIconName,
  type BiometricCapabilities,
} from '~/services/biometricAuth';
import { verifyPin } from '~/services/documentEncryption';

import ForgotPinModal from './ForgotPinModal';
import RecoveryCodeModal from './RecoveryCodeModal';
import SetNewPinModal from './SetNewPinModal';

interface PinVerificationModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  message?: string;
}

export default function PinVerificationModal({
  visible,
  onClose,
  onSuccess,
  title = 'Verificar PIN',
  message = 'Ingresa tu PIN para continuar',
}: PinVerificationModalProps) {
  const theme = useTheme();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [biometricCapabilities, setBiometricCapabilities] = useState<BiometricCapabilities | null>(
    null
  );
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAttempted, setBiometricAttempted] = useState(false);

  // Recovery flow states
  const [showForgotPin, setShowForgotPin] = useState(false);
  const [showRecoveryCode, setShowRecoveryCode] = useState(false);
  const [showSetNewPin, setShowSetNewPin] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');

  // Check biometric availability and auto-trigger when modal opens
  useEffect(() => {
    if (visible && !biometricAttempted) {
      checkAndTriggerBiometric();
    }
  }, [visible]);

  const checkAndTriggerBiometric = async () => {
    try {
      const capabilities = await checkBiometricCapabilities();
      setBiometricCapabilities(capabilities);

      if (capabilities.isAvailable) {
        const enabled = await isBiometricAuthEnabled();
        setBiometricEnabled(enabled);

        if (enabled) {
          // Auto-trigger biometric auth
          setBiometricAttempted(true);
          setTimeout(() => handleBiometricAuth(), 300); // Small delay for better UX
        }
      }
    } catch (error) {
      console.error('Error checking biometric capabilities:', error);
    }
  };

  const handleBiometricAuth = async () => {
    if (!biometricCapabilities || !biometricEnabled) return;

    setLoading(true);
    const result = await authenticateWithBiometrics(message);
    setLoading(false);

    if (result.success) {
      console.log('✅ Biometric authentication successful');
      handleClose();
      onSuccess();
    } else {
      console.log('❌ Biometric authentication failed, fallback to PIN');
      // User can now enter PIN manually
    }
  };

  const handleVerify = async () => {
    if (pin.length < 4) {
      Alert.alert('PIN inválido', 'El PIN debe tener al menos 4 dígitos');
      return;
    }

    setLoading(true);
    const isValid = await verifyPin(pin);
    setLoading(false);

    if (isValid) {
      // PIN correcto
      setPin('');
      setAttempts(0);
      onSuccess();
    } else {
      // PIN incorrecto
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setPin('');

      if (newAttempts >= 3) {
        Alert.alert(
          'Demasiados intentos',
          'Has excedido el número máximo de intentos. Por seguridad, el acceso ha sido bloqueado.',
          [{ text: 'Cerrar', onPress: handleClose }]
        );
      } else {
        Alert.alert('PIN incorrecto', `Inténtalo de nuevo. Te quedan ${3 - newAttempts} intentos.`);
      }
    }
  };

  const handleClose = () => {
    setPin('');
    setAttempts(0);
    setBiometricAttempted(false);
    onClose();
  };

  const handleForgotPin = () => {
    setShowForgotPin(true);
  };

  const handleRecoveryCodeSent = (email: string) => {
    setRecoveryEmail(email);
    setShowRecoveryCode(true);
  };

  const handleRecoveryCodeVerified = () => {
    setShowSetNewPin(true);
  };

  const handleNewPinSet = () => {
    // PIN reset complete, close all modals and trigger success
    Alert.alert(
      '✅ PIN Restablecido',
      'Tu PIN ha sido restablecido exitosamente. Ahora puedes acceder a tus documentos.',
      [
        {
          text: 'OK',
          onPress: () => {
            handleClose();
            onSuccess();
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
          <View style={styles.headerRight} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="lock-closed" size={80} color="#2196F3" />
          </View>

          {/* Message */}
          <Text style={[styles.message, { color: theme.colors.text }]}>{message}</Text>

          {/* Biometric Button */}
          {biometricCapabilities?.isAvailable && biometricEnabled && (
            <TouchableOpacity
              style={[styles.biometricButton, { backgroundColor: theme.colors.card }]}
              onPress={handleBiometricAuth}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Ionicons
                name={getBiometricIconName(biometricCapabilities.biometricType) as any}
                size={32}
                color={theme.colors.primary}
              />
              <Text style={[styles.biometricButtonText, { color: theme.colors.text }]}>
                Usar {getBiometricTypeName(biometricCapabilities.biometricType)}
              </Text>
            </TouchableOpacity>
          )}

          {biometricCapabilities?.isAvailable && biometricEnabled && (
            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
              <Text style={[styles.dividerText, { color: theme.colors.textMuted }]}>o</Text>
              <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
            </View>
          )}

          {/* Attempts indicator */}
          {attempts > 0 && (
            <View style={styles.attemptsContainer}>
              <Ionicons name="warning" size={20} color="#FF9800" />
              <Text style={styles.attemptsText}>Intentos restantes: {3 - attempts}</Text>
            </View>
          )}

          {/* PIN Input */}
          <View style={styles.pinInputContainer}>
            <TextInput
              style={[
                styles.pinInput,
                {
                  backgroundColor: theme.colors.card,
                  color: theme.colors.text,
                  borderColor: attempts > 0 ? '#FF9800' : theme.colors.border,
                  borderWidth: attempts > 0 ? 2 : 2,
                },
              ]}
              value={pin}
              onChangeText={setPin}
              keyboardType="number-pad"
              maxLength={6}
              secureTextEntry
              placeholder="Ingresa tu PIN"
              placeholderTextColor={theme.colors.textMuted}
              autoFocus
              editable={attempts < 3}
            />
          </View>

          {/* PIN Dots Indicator */}
          <View style={styles.dotsContainer}>
            {[...Array(6)].map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  {
                    backgroundColor: pin.length > index ? '#2196F3' : theme.colors.border,
                  },
                ]}
              />
            ))}
          </View>

          {/* Verify Button */}
          <TouchableOpacity
            style={[
              styles.verifyButton,
              {
                opacity: pin.length >= 4 && attempts < 3 ? 1 : 0.5,
              },
            ]}
            onPress={handleVerify}
            disabled={loading || pin.length < 4 || attempts >= 3}
            activeOpacity={0.7}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.verifyButtonText}>Verificar PIN</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Forgot PIN Button */}
          <TouchableOpacity
            style={styles.forgotPinButton}
            onPress={handleForgotPin}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Ionicons name="help-circle-outline" size={18} color={theme.colors.primary} />
            <Text style={[styles.forgotPinText, { color: theme.colors.primary }]}>
              ¿Olvidaste tu PIN?
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recovery Modals */}
      <ForgotPinModal
        visible={showForgotPin}
        onClose={() => setShowForgotPin(false)}
        onCodeSent={handleRecoveryCodeSent}
      />

      <RecoveryCodeModal
        visible={showRecoveryCode}
        onClose={() => setShowRecoveryCode(false)}
        onSuccess={handleRecoveryCodeVerified}
        email={recoveryEmail}
      />

      <SetNewPinModal
        visible={showSetNewPin}
        onClose={() => setShowSetNewPin(false)}
        onSuccess={handleNewPinSet}
      />
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
    width: 40,
  },
  headerRight: {
    width: 40,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 40,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 24,
  },
  message: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 24,
  },
  attemptsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 152, 0, 0.1)' as const,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  attemptsText: {
    color: '#FF9800' as const,
    fontSize: 14,
    fontWeight: '600',
  },
  pinInputContainer: {
    width: '100%',
    marginBottom: 20,
  },
  pinInput: {
    width: '100%',
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    paddingHorizontal: 20,
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 8,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 32,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3' as const,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    gap: 8,
    marginBottom: 24,
  },
  verifyButtonText: {
    color: '#FFFFFF' as const,
    fontSize: 16,
    fontWeight: '600',
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    gap: 12,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#2196F3' as const,
  },
  biometricButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    width: '100%',
    marginBottom: 20,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  forgotPinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    marginTop: 8,
  },
  forgotPinText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
