import React, { useState } from 'react';

import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '~/lib/theme';
import { verifyPin } from '~/services/documentEncryption';

import ForgotPinModal from './ForgotPinModal';
import RecoveryCodeModal from './RecoveryCodeModal';
import SetNewPinModal from './SetNewPinModal';

interface PinVerificationInlineProps {
  onSuccess: () => void;
  onCancel: () => void;
  title?: string;
  message?: string;
}

export default function PinVerificationInline({
  onSuccess,
  onCancel,
  title = 'Verificar PIN',
  message = 'Ingresa tu PIN para continuar',
}: PinVerificationInlineProps) {
  const theme = useTheme();
  const [pin, setPin] = useState('');
  const [attempts, setAttempts] = useState(0);

  // Recovery flow states
  const [showForgotPin, setShowForgotPin] = useState(false);
  const [showRecoveryCode, setShowRecoveryCode] = useState(false);
  const [showSetNewPin, setShowSetNewPin] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');

  const handleKeyPress = (digit: string) => {
    if (pin.length < 6) {
      setPin(pin + digit);
    }
  };

  const handleBackspace = () => {
    if (pin.length > 0) {
      setPin(pin.slice(0, -1));
    }
  };

  const handleVerify = async () => {
    if (pin.length < 4) {
      Alert.alert('Error', 'El PIN debe tener al menos 4 dígitos');
      return;
    }

    const isValid = await verifyPin(pin);

    if (isValid) {
      setPin('');
      setAttempts(0);
      onSuccess();
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (newAttempts >= 3) {
        Alert.alert('Demasiados intentos', 'Has excedido el número de intentos permitidos.', [
          { text: 'OK', onPress: onCancel },
        ]);
      } else {
        Alert.alert('PIN Incorrecto', `Te quedan ${3 - newAttempts} intentos`);
        setPin('');
      }
    }
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
            setPin('');
            setAttempts(0);
            onSuccess();
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="lock-closed" size={80} color="#2196F3" />
        </View>

        {/* Message */}
        <Text style={[styles.message, { color: theme.colors.text }]}>{message}</Text>

        {/* PIN Dots */}
        <View style={styles.dotsContainer}>
          {[0, 1, 2, 3, 4, 5].map((index) => (
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

        {/* Custom Numeric Keyboard */}
        <View style={styles.customKeyboard}>
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
          <View style={styles.keyboardRow}>
            {/* Backspace */}
            <TouchableOpacity
              style={[styles.keyButton, { backgroundColor: theme.colors.card }]}
              onPress={handleBackspace}
              activeOpacity={0.7}
            >
              <Ionicons name="backspace-outline" size={28} color={theme.colors.text} />
            </TouchableOpacity>
            {/* Zero */}
            <TouchableOpacity
              style={[styles.keyButton, { backgroundColor: theme.colors.card }]}
              onPress={() => handleKeyPress('0')}
              activeOpacity={0.7}
            >
              <Text style={[styles.keyText, { color: theme.colors.text }]}>0</Text>
            </TouchableOpacity>
            {/* Enter/Accept */}
            <TouchableOpacity
              style={[
                styles.keyButton,
                styles.enterButton,
                {
                  backgroundColor: pin.length >= 4 && attempts < 3 ? '#2196F3' : theme.colors.card,
                  opacity: pin.length >= 4 && attempts < 3 ? 1 : 0.5,
                },
              ]}
              onPress={handleVerify}
              disabled={pin.length < 4 || attempts >= 3}
              activeOpacity={0.7}
            >
              <Ionicons
                name="checkmark-circle"
                size={32}
                color={pin.length >= 4 && attempts < 3 ? '#FFFFFF' : theme.colors.textMuted}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Forgot PIN Button */}
        <TouchableOpacity
          style={styles.forgotPinButton}
          onPress={handleForgotPin}
          activeOpacity={0.7}
        >
          <Ionicons name="help-circle-outline" size={18} color={theme.colors.primary} />
          <Text style={[styles.forgotPinText, { color: theme.colors.primary }]}>
            ¿Olvidaste tu PIN?
          </Text>
        </TouchableOpacity>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
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
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
    justifyContent: 'center',
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
    borderColor: 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  keyText: {
    fontSize: 28,
    fontWeight: '400',
  },
  enterButton: {
    borderWidth: 2,
  },
  forgotPinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  forgotPinText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
