import React, { useState, useRef, useEffect } from 'react';

import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '~/lib/theme';
import { verifyRecoveryCode, getRecoveryCodeTimeRemaining } from '~/services/pinRecovery';

interface RecoveryCodeModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  email: string;
}

export default function RecoveryCodeModal({
  visible,
  onClose,
  onSuccess,
  email,
}: RecoveryCodeModalProps) {
  const theme = useTheme();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [timeRemaining, setTimeRemaining] = useState(15);

  const inputRefs = [
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
  ];

  useEffect(() => {
    if (visible) {
      // Reset state
      setCode(['', '', '', '', '', '']);
      setAttemptsLeft(3);
      loadTimeRemaining();

      // Focus first input
      setTimeout(() => {
        inputRefs[0].current?.focus();
      }, 300);

      // Update timer every minute
      const timer = setInterval(loadTimeRemaining, 60000);
      return () => clearInterval(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const loadTimeRemaining = async () => {
    const minutes = await getRecoveryCodeTimeRemaining();
    setTimeRemaining(minutes);
  };

  const handleCodeChange = (text: string, index: number) => {
    // Only allow numbers
    const sanitized = text.replace(/[^0-9]/g, '');

    if (sanitized.length === 0) {
      // User deleted, move to previous input
      const newCode = [...code];
      newCode[index] = '';
      setCode(newCode);

      if (index > 0) {
        inputRefs[index - 1].current?.focus();
      }
      return;
    }

    if (sanitized.length === 1) {
      // Single digit entered
      const newCode = [...code];
      newCode[index] = sanitized;
      setCode(newCode);

      // Move to next input
      if (index < 5) {
        inputRefs[index + 1].current?.focus();
      } else {
        // Last digit entered, auto-verify
        const fullCode = [...newCode].join('');
        if (fullCode.length === 6) {
          handleVerifyCode(fullCode);
        }
      }
    } else if (sanitized.length > 1) {
      // Multiple digits pasted
      const digits = sanitized.slice(0, 6).split('');
      const newCode = [...code];

      digits.forEach((digit, i) => {
        if (index + i < 6) {
          newCode[index + i] = digit;
        }
      });

      setCode(newCode);

      // Focus last filled input or next empty
      const lastFilledIndex = Math.min(index + digits.length - 1, 5);
      if (lastFilledIndex < 5) {
        inputRefs[lastFilledIndex + 1].current?.focus();
      } else {
        inputRefs[lastFilledIndex].current?.blur();
        // Auto-verify if 6 digits
        const fullCode = newCode.join('');
        if (fullCode.length === 6) {
          handleVerifyCode(fullCode);
        }
      }
    }
  };

  const handleVerifyCode = async (fullCode?: string) => {
    const codeToVerify = fullCode || code.join('');

    if (codeToVerify.length !== 6) {
      Alert.alert('Código Incompleto', 'Ingresa los 6 dígitos del código.', [{ text: 'OK' }]);
      return;
    }

    setLoading(true);

    const result = await verifyRecoveryCode(codeToVerify);

    setLoading(false);

    if (result.valid) {
      Alert.alert('✅ Código Válido', 'Ahora puedes establecer un nuevo PIN para tus documentos.', [
        {
          text: 'Continuar',
          onPress: () => {
            onClose();
            onSuccess();
          },
        },
      ]);
    } else {
      // Update attempts left
      if (result.attemptsLeft !== undefined) {
        setAttemptsLeft(result.attemptsLeft);
      }

      // Show error message
      Alert.alert('❌ Código Incorrecto', result.message, [
        {
          text: 'OK',
          onPress: () => {
            // Clear code and focus first input
            setCode(['', '', '', '', '', '']);
            inputRefs[0].current?.focus();

            // If no attempts left, close modal
            if (result.error === 'MAX_ATTEMPTS' || result.error === 'EXPIRED') {
              setTimeout(() => {
                onClose();
              }, 500);
            }
          },
        },
      ]);
    }
  };

  const maskEmail = (email: string) => {
    const [username, domain] = email.split('@');
    if (!username || !domain) return email;

    const maskedUsername =
      username.length <= 3
        ? username[0] + '*'.repeat(username.length - 1)
        : username.slice(0, 2) + '*'.repeat(username.length - 4) + username.slice(-2);

    return `${maskedUsername}@${domain}`;
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.overlay}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
              {/* Header */}
              <View style={styles.header}>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.closeButton}
                  disabled={loading}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={28} color={theme.colors.text} />
                </TouchableOpacity>
              </View>

              {/* Icon */}
              <View style={styles.iconContainer}>
                <View style={[styles.iconCircle, { backgroundColor: theme.colors.chipBg }]}>
                  <Ionicons name="mail-open-outline" size={48} color={theme.colors.primary} />
                </View>
              </View>

              {/* Title */}
              <Text style={[styles.title, { color: theme.colors.text }]}>Ingresa el Código</Text>

              {/* Description */}
              <Text style={[styles.description, { color: theme.colors.textMuted }]}>
                Enviamos un código de 6 dígitos a {maskEmail(email)}
              </Text>

              {/* Code Inputs */}
              <View style={styles.codeContainer}>
                {code.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={inputRefs[index]}
                    style={[
                      styles.codeInput,
                      {
                        backgroundColor: theme.colors.background,
                        color: theme.colors.text,
                        borderColor: digit ? theme.colors.primary : theme.colors.border,
                      },
                    ]}
                    value={digit}
                    onChangeText={(text) => handleCodeChange(text, index)}
                    keyboardType="number-pad"
                    maxLength={6}
                    selectTextOnFocus
                    editable={!loading}
                  />
                ))}
              </View>

              {/* Info */}
              <View style={styles.infoContainer}>
                <View style={styles.infoItem}>
                  <Ionicons name="time-outline" size={18} color={theme.colors.textMuted} />
                  <Text style={[styles.infoText, { color: theme.colors.textMuted }]}>
                    {timeRemaining > 0
                      ? `Expira en ${timeRemaining} minuto${timeRemaining !== 1 ? 's' : ''}`
                      : 'Código expirado'}
                  </Text>
                </View>
                <View style={styles.infoItem}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={18}
                    color={theme.colors.textMuted}
                  />
                  <Text style={[styles.infoText, { color: theme.colors.textMuted }]}>
                    {attemptsLeft} intento{attemptsLeft !== 1 ? 's' : ''} restante
                    {attemptsLeft !== 1 ? 's' : ''}
                  </Text>
                </View>
              </View>

              {/* Verify Button */}
              <TouchableOpacity
                style={[
                  styles.verifyButton,
                  { backgroundColor: theme.colors.primary },
                  (loading || code.join('').length !== 6) && styles.verifyButtonDisabled,
                ]}
                onPress={() => handleVerifyCode()}
                disabled={loading || code.join('').length !== 6}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color={theme.colors.primaryText} />
                ) : (
                  <Text style={[styles.verifyButtonText, { color: theme.colors.primaryText }]}>
                    Verificar Código
                  </Text>
                )}
              </TouchableOpacity>

              {/* Cancel Button */}
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onClose}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Text style={[styles.cancelButtonText, { color: theme.colors.textMuted }]}>
                  Cancelar
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const OVERLAY_BG = 'rgba(0, 0, 0, 0.5)';

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: OVERLAY_BG,
    justifyContent: 'flex-end',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  closeButton: {
    padding: 4,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 8,
  },
  codeInput: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 13,
  },
  verifyButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  verifyButtonDisabled: {
    opacity: 0.5,
  },
  verifyButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
