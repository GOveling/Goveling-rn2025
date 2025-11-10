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

interface SetNewPinModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SetNewPinModal({ visible, onClose, onSuccess }: SetNewPinModalProps) {
  const theme = useTheme();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [loading, setLoading] = useState(false);

  const handlePinSubmit = async () => {
    if (step === 'enter') {
      // Validar PIN
      if (pin.length < 4) {
        Alert.alert('PIN muy corto', 'El PIN debe tener al menos 4 dígitos', [{ text: 'OK' }]);
        return;
      }
      if (pin.length > 6) {
        Alert.alert('PIN muy largo', 'El PIN debe tener máximo 6 dígitos', [{ text: 'OK' }]);
        return;
      }

      // Pasar a confirmación
      setStep('confirm');
    } else {
      // Confirmar PIN
      if (pin !== confirmPin) {
        Alert.alert('Error', 'Los PINs no coinciden. Inténtalo de nuevo.', [
          {
            text: 'OK',
            onPress: () => {
              setConfirmPin('');
            },
          },
        ]);
        return;
      }

      // Guardar nuevo PIN
      setLoading(true);
      const success = await savePinHash(pin);
      setLoading(false);

      if (success) {
        Alert.alert(
          '✅ PIN Restablecido',
          'Tu nuevo PIN ha sido configurado exitosamente. Ahora puedes acceder a tus documentos con el nuevo PIN.',
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
        Alert.alert('Error', 'No se pudo guardar el nuevo PIN. Inténtalo de nuevo.', [
          { text: 'OK' },
        ]);
      }
    }
  };

  const resetModal = () => {
    setPin('');
    setConfirmPin('');
    setStep('enter');
  };

  const handleClose = () => {
    Alert.alert(
      '¿Cancelar?',
      'Si cancelas ahora, no se restablecerá tu PIN y no podrás acceder a tus documentos.',
      [
        {
          text: 'Continuar configurando',
          style: 'cancel',
        },
        {
          text: 'Cancelar',
          style: 'destructive',
          onPress: () => {
            resetModal();
            onClose();
          },
        },
      ]
    );
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
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.colors.text }]}>Nuevo PIN</Text>
          <View style={styles.headerRight} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: step === 'enter' ? '#DBEAFE' : '#D1FAE5' },
              ]}
            >
              <Ionicons
                name={step === 'enter' ? 'key-outline' : 'checkmark-circle-outline'}
                size={64}
                color={step === 'enter' ? '#3B82F6' : '#10B981'}
              />
            </View>
          </View>

          {/* Step Indicator */}
          <View style={styles.stepIndicator}>
            <View style={styles.stepDot} />
            <View style={[styles.stepDot, step === 'confirm' && styles.stepDotActive]} />
          </View>

          {/* Instructions */}
          <Text style={[styles.instruction, { color: theme.colors.text }]}>
            {step === 'enter'
              ? 'Crea tu nuevo PIN de 4-6 dígitos'
              : 'Confirma tu nuevo PIN ingresándolo nuevamente'}
          </Text>

          <Text style={[styles.subInstruction, { color: theme.colors.textMuted }]}>
            {step === 'enter'
              ? 'Elige un PIN fácil de recordar pero difícil de adivinar'
              : 'Asegúrate de que coincida con el PIN anterior'}
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
              placeholder={step === 'enter' ? 'Ingresa tu nuevo PIN' : 'Confirma tu nuevo PIN'}
              placeholderTextColor={theme.colors.textMuted}
              autoFocus
              editable={!loading}
            />

            {/* PIN Length Indicator */}
            <View style={styles.pinLengthContainer}>
              {[...Array(6)].map((_, index) => {
                const currentPin = step === 'enter' ? pin : confirmPin;
                return (
                  <View
                    key={index}
                    style={[
                      styles.pinLengthDot,
                      {
                        backgroundColor:
                          index < currentPin.length ? '#3B82F6' : theme.colors.border,
                      },
                    ]}
                  />
                );
              })}
            </View>
          </View>

          {/* Security Tips */}
          <View style={styles.tipsContainer}>
            <Text style={[styles.tipsTitle, { color: theme.colors.text }]}>
              💡 Consejos de seguridad:
            </Text>
            <View style={styles.tipsList}>
              <View style={styles.tipItem}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={[styles.tipText, { color: theme.colors.textMuted }]}>
                  Usa 4-6 dígitos que puedas recordar fácilmente
                </Text>
              </View>
              <View style={styles.tipItem}>
                <Ionicons name="close-circle" size={16} color="#EF4444" />
                <Text style={[styles.tipText, { color: theme.colors.textMuted }]}>
                  Evita secuencias obvias (1234, 0000, etc.)
                </Text>
              </View>
              <View style={styles.tipItem}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={[styles.tipText, { color: theme.colors.textMuted }]}>
                  Considera habilitar Face ID/Touch ID después
                </Text>
              </View>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (loading || (step === 'enter' ? pin.length < 4 : confirmPin.length < 4)) &&
                styles.submitButtonDisabled,
            ]}
            onPress={handlePinSubmit}
            disabled={loading || (step === 'enter' ? pin.length < 4 : confirmPin.length < 4)}
            activeOpacity={0.8}
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
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerRight: {
    width: 32,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D1D5DB',
  },
  stepDotActive: {
    backgroundColor: '#3B82F6',
  },
  instruction: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subInstruction: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  pinInputContainer: {
    marginBottom: 24,
  },
  pinInput: {
    height: 60,
    borderRadius: 12,
    borderWidth: 2,
    paddingHorizontal: 20,
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 8,
  },
  pinLengthContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  pinLengthDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  tipsContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  tipsList: {
    gap: 10,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
