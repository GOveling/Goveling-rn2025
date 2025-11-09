import React, { useState } from 'react';

import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '~/lib/theme';
import { savePinHash } from '~/services/documentEncryption';

interface PinSetupInlineProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function PinSetupInline({ onSuccess, onCancel }: PinSetupInlineProps) {
  const theme = useTheme();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [loading, setLoading] = useState(false);

  const handleKeyPress = (digit: string) => {
    if (step === 'enter') {
      if (pin.length < 6) {
        setPin(pin + digit);
      }
    } else {
      if (confirmPin.length < 6) {
        setConfirmPin(confirmPin + digit);
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
                setPin('');
                setConfirmPin('');
                setStep('enter');
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

  const handleBack = () => {
    if (step === 'confirm') {
      setStep('enter');
      setConfirmPin('');
    } else {
      onCancel();
    }
  };

  return (
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
          {step === 'enter' ? 'Crea un PIN de 4-6 dígitos' : 'Confirma tu PIN para continuar'}
        </Text>

        {/* PIN Dots */}
        <View style={styles.dotsContainer}>
          {[0, 1, 2, 3, 4, 5].map((index) => (
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

        {/* Custom Numeric Keyboard */}
        <View style={styles.customKeyboard}>
          {/* Row 1: 1 2 3 */}
          <View style={styles.keyboardRow}>
            {[1, 2, 3].map((num) => (
              <TouchableOpacity
                key={num}
                style={[styles.keyButton, { backgroundColor: theme.colors.card }]}
                onPress={() => handleKeyPress(num.toString())}
                activeOpacity={0.7}
              >
                <Text style={[styles.keyText, { color: theme.colors.text }]}>{num}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Row 2: 4 5 6 */}
          <View style={styles.keyboardRow}>
            {[4, 5, 6].map((num) => (
              <TouchableOpacity
                key={num}
                style={[styles.keyButton, { backgroundColor: theme.colors.card }]}
                onPress={() => handleKeyPress(num.toString())}
                activeOpacity={0.7}
              >
                <Text style={[styles.keyText, { color: theme.colors.text }]}>{num}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Row 3: 7 8 9 */}
          <View style={styles.keyboardRow}>
            {[7, 8, 9].map((num) => (
              <TouchableOpacity
                key={num}
                style={[styles.keyButton, { backgroundColor: theme.colors.card }]}
                onPress={() => handleKeyPress(num.toString())}
                activeOpacity={0.7}
              >
                <Text style={[styles.keyText, { color: theme.colors.text }]}>{num}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Row 4: Backspace, 0, Enter */}
          <View style={styles.keyboardRow}>
            <TouchableOpacity
              style={[styles.keyButton, { backgroundColor: theme.colors.card }]}
              onPress={handleBackspace}
              activeOpacity={0.7}
            >
              <Ionicons name="backspace-outline" size={28} color={theme.colors.text} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.keyButton, { backgroundColor: theme.colors.card }]}
              onPress={() => handleKeyPress('0')}
              activeOpacity={0.7}
            >
              <Text style={[styles.keyText, { color: theme.colors.text }]}>0</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.keyButton, styles.enterButton, { backgroundColor: theme.colors.card }]}
              onPress={handlePinSubmit}
              disabled={loading || (step === 'enter' ? pin.length < 4 : confirmPin.length < 4)}
              activeOpacity={0.7}
            >
              <Ionicons
                name="checkmark-circle"
                size={32}
                color={
                  (step === 'enter' && pin.length >= 4) ||
                  (step === 'confirm' && confirmPin.length >= 4)
                    ? '#2196F3'
                    : theme.colors.textMuted
                }
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Security Info */}
        <View style={styles.infoBox}>
          <Ionicons name="shield-checkmark" size={20} color="#4CAF50" />
          <Text style={[styles.infoText, { color: theme.colors.textMuted }]}>
            Tu PIN se guarda de forma segura con hash SHA-256
          </Text>
        </View>
      </View>
    </View>
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
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 32,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
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
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 32,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  customKeyboard: {
    width: '100%',
    marginTop: 16,
    marginBottom: 24,
  },
  keyboardRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 16,
  },
  keyButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  keyText: {
    fontSize: 28,
    fontWeight: '500',
  },
  enterButton: {
    borderWidth: 2,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(76, 175, 80, 0.08)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  infoText: {
    fontSize: 13,
    flex: 1,
  },
});
