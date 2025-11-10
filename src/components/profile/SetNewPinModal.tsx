import React, { useState } from 'react';

import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '~/lib/theme';
import { savePinHash } from '~/services/documentEncryption';

interface SetNewPinModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (newPin: string) => void;
}

export default function SetNewPinModal({ visible, onClose, onSuccess }: SetNewPinModalProps) {
  const theme = useTheme();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [loading, setLoading] = useState(false);

  const handleKeyPress = (digit: string) => {
    const currentPin = step === 'enter' ? pin : confirmPin;
    if (currentPin.length < 6) {
      if (step === 'enter') {
        setPin(currentPin + digit);
      } else {
        setConfirmPin(currentPin + digit);
      }
    }
  };

  const handleBackspace = () => {
    if (step === 'enter') {
      if (pin.length > 0) {
        setPin(pin.slice(0, -1));
      }
    } else {
      if (confirmPin.length > 0) {
        setConfirmPin(confirmPin.slice(0, -1));
      }
    }
  };

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
        const newPin = pin;
        Alert.alert(
          '✅ PIN Restablecido',
          'Tu nuevo PIN ha sido configurado exitosamente. Ahora puedes acceder a tus documentos con el nuevo PIN.',
          [
            {
              text: 'Continuar',
              onPress: () => {
                resetModal();
                onSuccess(newPin);
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
            <View style={[styles.iconCircle, { backgroundColor: theme.colors.chipBg }]}>
              <Ionicons
                name={step === 'enter' ? 'key-outline' : 'checkmark-circle-outline'}
                size={64}
                color={theme.colors.primary}
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

          {/* PIN Dots Display */}
          <View style={styles.dotsContainer}>
            {[0, 1, 2, 3, 4, 5].map((index) => {
              const currentPin = step === 'enter' ? pin : confirmPin;
              return (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    {
                      backgroundColor:
                        currentPin.length > index ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                />
              );
            })}
          </View>

          {/* Security Tips */}
          <View style={[styles.tipsContainer, { backgroundColor: theme.colors.chipBg }]}>
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

          {/* Custom Numeric Keyboard */}
          <View style={styles.customKeyboard}>
            <View style={styles.keyboardRow}>
              {[1, 2, 3].map((num) => (
                <TouchableOpacity
                  key={num}
                  style={[styles.keyButton, { backgroundColor: theme.colors.card }]}
                  onPress={() => handleKeyPress(num.toString())}
                  activeOpacity={0.7}
                  disabled={loading}
                >
                  <Text style={[styles.keyText, { color: theme.colors.text }]}>{num}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.keyboardRow}>
              {[4, 5, 6].map((num) => (
                <TouchableOpacity
                  key={num}
                  style={[styles.keyButton, { backgroundColor: theme.colors.card }]}
                  onPress={() => handleKeyPress(num.toString())}
                  activeOpacity={0.7}
                  disabled={loading}
                >
                  <Text style={[styles.keyText, { color: theme.colors.text }]}>{num}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.keyboardRow}>
              {[7, 8, 9].map((num) => (
                <TouchableOpacity
                  key={num}
                  style={[styles.keyButton, { backgroundColor: theme.colors.card }]}
                  onPress={() => handleKeyPress(num.toString())}
                  activeOpacity={0.7}
                  disabled={loading}
                >
                  <Text style={[styles.keyText, { color: theme.colors.text }]}>{num}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.keyboardRow}>
              <TouchableOpacity
                style={[styles.keyButton, { backgroundColor: theme.colors.card }]}
                onPress={handleBackspace}
                activeOpacity={0.7}
                disabled={loading}
              >
                <Ionicons name="backspace-outline" size={28} color={theme.colors.text} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.keyButton, { backgroundColor: theme.colors.card }]}
                onPress={() => handleKeyPress('0')}
                activeOpacity={0.7}
                disabled={loading}
              >
                <Text style={[styles.keyText, { color: theme.colors.text }]}>0</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.keyButton,
                  styles.enterButton,
                  {
                    backgroundColor:
                      (step === 'enter' ? pin.length >= 4 : confirmPin.length >= 4) && !loading
                        ? theme.colors.primary
                        : theme.colors.card,
                    opacity:
                      (step === 'enter' ? pin.length >= 4 : confirmPin.length >= 4) && !loading
                        ? 1
                        : 0.5,
                  },
                ]}
                onPress={handlePinSubmit}
                disabled={loading || (step === 'enter' ? pin.length < 4 : confirmPin.length < 4)}
                activeOpacity={0.7}
              >
                {loading ? (
                  <ActivityIndicator color={theme.colors.primaryText} size="small" />
                ) : (
                  <Ionicons
                    name="checkmark-circle"
                    size={32}
                    color={
                      (step === 'enter' ? pin.length >= 4 : confirmPin.length >= 4)
                        ? theme.colors.primaryText
                        : theme.colors.textMuted
                    }
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const SHADOW_COLOR = '#000000';

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
    opacity: 0.3,
  },
  stepDotActive: {
    opacity: 1,
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
    marginBottom: 24,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
    justifyContent: 'center',
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  tipsContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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
  customKeyboard: {
    width: '100%',
    marginTop: 8,
    marginBottom: 16,
  },
  keyboardRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    justifyContent: 'center',
  },
  keyButton: {
    width: 72,
    height: 72,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  keyText: {
    fontSize: 24,
    fontWeight: '600',
  },
  enterButton: {
    shadowOpacity: 0.15,
    elevation: 3,
  },
});
