import React, { useState, useEffect } from 'react';

import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '~/lib/theme';
import { requestRecoveryCode, getUserEmail } from '~/services/pinRecovery';

interface ForgotPinModalProps {
  visible: boolean;
  onClose: () => void;
  onCodeSent: (email: string) => void;
}

export default function ForgotPinModal({ visible, onClose, onCodeSent }: ForgotPinModalProps) {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      loadUserEmail();
    }
  }, [visible]);

  const loadUserEmail = async () => {
    const email = await getUserEmail();
    setUserEmail(email);
  };

  const handleRequestRecovery = async () => {
    Alert.alert(
      '¿Recuperar PIN?',
      `Se enviará un código de recuperación a tu email${userEmail ? ` (${userEmail})` : ''}.\n\n¿Deseas continuar?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Enviar Código',
          style: 'default',
          onPress: async () => {
            setLoading(true);
            const result = await requestRecoveryCode();
            setLoading(false);

            if (result.success) {
              // En modo desarrollo, mostrar el código en el Alert
              const devMessage = result.developmentCode
                ? `\n\n🔧 MODO DESARROLLO\nCódigo: ${result.developmentCode}\n\n(En producción se enviará por email)`
                : '';

              Alert.alert(
                '✅ Código Enviado',
                `Hemos enviado un código de 6 dígitos a ${result.email}.\n\nEl código expira en 15 minutos.${devMessage}`,
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      onClose();
                      if (result.email) {
                        onCodeSent(result.email);
                      }
                    },
                  },
                ]
              );
            } else {
              Alert.alert(
                '❌ Error',
                result.message || 'No se pudo enviar el código de recuperación. Intenta de nuevo.',
                [{ text: 'OK' }]
              );
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
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
            <View style={styles.iconCircle}>
              <Ionicons name="key-outline" size={48} color="#F59E0B" />
            </View>
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: theme.colors.text }]}>¿Olvidaste tu PIN?</Text>

          {/* Description */}
          <Text style={[styles.description, { color: theme.colors.textMuted }]}>
            No te preocupes, te enviaremos un código de recuperación por email para que puedas
            establecer un nuevo PIN.
          </Text>

          {/* Email Info */}
          {userEmail && (
            <View style={styles.emailBox}>
              <Ionicons name="mail-outline" size={20} color={theme.colors.textMuted} />
              <Text style={[styles.emailText, { color: theme.colors.text }]}>{userEmail}</Text>
            </View>
          )}

          {/* Info Box */}
          <View style={styles.infoBox}>
            <View style={styles.infoItem}>
              <Ionicons name="time-outline" size={20} color="#6366F1" />
              <Text style={[styles.infoText, { color: theme.colors.textMuted }]}>
                El código expira en 15 minutos
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#10B981" />
              <Text style={[styles.infoText, { color: theme.colors.textMuted }]}>
                Máximo 3 intentos por código
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="lock-closed-outline" size={20} color="#F59E0B" />
              <Text style={[styles.infoText, { color: theme.colors.textMuted }]}>
                Tus documentos permanecen seguros
              </Text>
            </View>
          </View>

          {/* Request Button */}
          <TouchableOpacity
            style={[styles.requestButton, loading && styles.requestButtonDisabled]}
            onPress={handleRequestRecovery}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="mail" size={20} color="#FFFFFF" />
                <Text style={styles.requestButtonText}>Enviar Código de Recuperación</Text>
              </>
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
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
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
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  emailBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    marginBottom: 20,
  },
  emailText: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  requestButton: {
    flexDirection: 'row',
    backgroundColor: '#F59E0B',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  requestButtonDisabled: {
    opacity: 0.6,
  },
  requestButtonText: {
    color: '#FFFFFF',
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
