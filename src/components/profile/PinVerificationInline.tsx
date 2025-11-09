import React, { useState } from 'react';

import { View, Text, TouchableOpacity, StyleSheet, Alert, TextInput } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '~/lib/theme';
import { verifyPin } from '~/services/documentEncryption';

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

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
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

        {/* PIN Input */}
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.card,
              color: theme.colors.text,
              borderColor: attempts > 0 ? '#FF9800' : theme.colors.border,
            },
          ]}
          value={pin}
          onChangeText={setPin}
          placeholder="Ingresa tu PIN"
          placeholderTextColor={theme.colors.textMuted}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={6}
          autoFocus
        />

        {/* PIN Dots */}
        <View style={styles.dotsContainer}>
          {[0, 1, 2, 3].map((index) => (
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
          style={[styles.button, { opacity: pin.length >= 4 && attempts < 3 ? 1 : 0.5 }]}
          onPress={handleVerify}
          disabled={pin.length < 4 || attempts >= 3}
          activeOpacity={0.7}
        >
          <Text style={styles.buttonText}>Verificar</Text>
        </TouchableOpacity>

        {/* Help Text */}
        <Text style={[styles.helpText, { color: theme.colors.textMuted }]}>
          Si olvidaste tu PIN, contacta al soporte para recuperar el acceso.
        </Text>
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
  closeButton: {
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
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  input: {
    width: '100%',
    height: 50,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 2,
    marginBottom: 16,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  button: {
    backgroundColor: '#2196F3',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    marginBottom: 24,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  helpText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
