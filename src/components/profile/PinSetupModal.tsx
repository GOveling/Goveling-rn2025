import React, { useState } from 'react';

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
import { savePinHash } from '~/services/documentEncryption';

interface PinSetupModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PinSetupModal({ visible, onClose, onSuccess }: PinSetupModalProps) {
  const theme = useTheme();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [loading, setLoading] = useState(false);

  const handlePinSubmit = async () => {
    if (step === 'enter') {
      // Validar PIN
      if (pin.length < 4) {
        Alert.alert('PIN muy corto', 'El PIN debe tener al menos 4 dígitos');
        return;
      }
      if (pin.length > 6) {
        Alert.alert('PIN muy largo', 'El PIN debe tener máximo 6 dígitos');
        return;
      }

      // Pasar a confirmación
      setStep('confirm');
    } else {
      // Confirmar PIN
      if (pin !== confirmPin) {
        Alert.alert('Error', 'Los PINs no coinciden. Inténtalo de nuevo.');
        setConfirmPin('');
        return;
      }

      // Guardar PIN
      setLoading(true);
      const success = await savePinHash(pin);
      setLoading(false);

      if (success) {
        Alert.alert(
          '✅ PIN Configurado',
          'Tu PIN ha sido configurado exitosamente. Ahora puedes guardar documentos de forma segura.',
          [
            {
              text: 'Continuar',
              onPress: () => {
                resetModal();
                onSuccess();
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', 'No se pudo guardar el PIN. Inténtalo de nuevo.');
      }
    }
  };

  const resetModal = () => {
    setPin('');
    setConfirmPin('');
    setStep('enter');
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const handleBack = () => {
    if (step === 'confirm') {
      setStep('enter');
      setConfirmPin('');
    } else {
      handleClose();
    }
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
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.colors.text }]}>Configurar PIN</Text>
          <View style={styles.headerRight} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Ionicons
              name={step === 'enter' ? 'keypad' : 'checkmark-circle'}
              size={80}
              color="#2196F3"
            />
          </View>

          {/* Instructions */}
          <Text style={[styles.instruction, { color: theme.colors.text }]}>
            {step === 'enter'
              ? 'Crea un PIN de 4-6 dígitos'
              : 'Confirma tu PIN ingresándolo nuevamente'}
          </Text>

          {/* PIN Input */}
          <View style={styles.pinInputContainer}>
            <TextInput
              style={[
                styles.pinInput,
                {
                  backgroundColor: theme.colors.card,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                },
              ]}
              value={step === 'enter' ? pin : confirmPin}
              onChangeText={step === 'enter' ? setPin : setConfirmPin}
              keyboardType="number-pad"
              maxLength={6}
              secureTextEntry
              placeholder={step === 'enter' ? 'Ingresa tu PIN' : 'Confirma tu PIN'}
              placeholderTextColor={theme.colors.textMuted}
              autoFocus
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
                    backgroundColor:
                      (step === 'enter' ? pin.length : confirmPin.length) > index
                        ? '#2196F3'
                        : theme.colors.border,
                  },
                ]}
              />
            ))}
          </View>

          {/* Info */}
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={20} color="#2196F3" />
            <Text style={[styles.infoText, { color: theme.colors.textMuted }]}>
              {step === 'enter'
                ? 'Tu PIN se usará para encriptar y proteger tus documentos. Guárdalo en un lugar seguro.'
                : 'Asegúrate de recordar este PIN. Lo necesitarás para acceder a tus documentos.'}
            </Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              {
                opacity:
                  (step === 'enter' && pin.length >= 4) ||
                  (step === 'confirm' && confirmPin.length >= 4)
                    ? 1
                    : 0.5,
              },
            ]}
            onPress={handlePinSubmit}
            disabled={
              loading ||
              (step === 'enter' && pin.length < 4) ||
              (step === 'confirm' && confirmPin.length < 4)
            }
            activeOpacity={0.7}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.submitButtonText}>
                  {step === 'enter' ? 'Continuar' : 'Confirmar PIN'}
                </Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>

          {/* Security Features */}
          <View style={styles.securityFeatures}>
            <View style={styles.securityItem}>
              <Ionicons name="lock-closed" size={16} color={theme.colors.textMuted} />
              <Text style={[styles.securityText, { color: theme.colors.textMuted }]}>
                Encriptación AES-256
              </Text>
            </View>
            <View style={styles.securityItem}>
              <Ionicons name="shield-checkmark" size={16} color={theme.colors.textMuted} />
              <Text style={[styles.securityText, { color: theme.colors.textMuted }]}>
                Almacenamiento seguro
              </Text>
            </View>
          </View>
        </View>
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
  backButton: {
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
  instruction: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 32,
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
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(33, 150, 243, 0.08)' as const,
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    width: '100%',
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 12,
    flex: 1,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3' as const,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    gap: 8,
  },
  submitButtonText: {
    color: '#FFFFFF' as const,
    fontSize: 16,
    fontWeight: '600',
  },
  securityFeatures: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 32,
  },
  securityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  securityText: {
    fontSize: 12,
  },
});
