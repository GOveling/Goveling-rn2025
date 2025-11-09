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
import { changePIN } from '~/services/documentEncryption';

interface ChangePINModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
}

export default function ChangePINModal({
  visible,
  onClose,
  onSuccess,
  userId,
}: ChangePINModalProps) {
  const theme = useTheme();
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'current' | 'new' | 'confirm'>('current');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const resetModal = () => {
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setStep('current');
    setProgress({ current: 0, total: 0 });
  };

  const handleClose = () => {
    if (loading) {
      Alert.alert(
        'Proceso en curso',
        'No puedes cerrar mientras se están re-encriptando los documentos. Por favor espera.'
      );
      return;
    }
    resetModal();
    onClose();
  };

  const handleNext = () => {
    if (step === 'current') {
      if (currentPin.length < 4) {
        Alert.alert('Error', 'El PIN debe tener al menos 4 dígitos');
        return;
      }
      setStep('new');
    } else if (step === 'new') {
      if (newPin.length < 4) {
        Alert.alert('PIN muy corto', 'El nuevo PIN debe tener al menos 4 dígitos');
        return;
      }
      if (newPin.length > 6) {
        Alert.alert('PIN muy largo', 'El nuevo PIN debe tener máximo 6 dígitos');
        return;
      }
      if (newPin === currentPin) {
        Alert.alert('Error', 'El nuevo PIN debe ser diferente al actual');
        return;
      }
      setStep('confirm');
    } else {
      // Confirmar y ejecutar cambio
      handleChangePIN();
    }
  };

  const handleChangePIN = async () => {
    if (newPin !== confirmPin) {
      Alert.alert('Error', 'Los PINs no coinciden. Inténtalo de nuevo.');
      setConfirmPin('');
      return;
    }

    setLoading(true);

    try {
      const result = await changePIN(currentPin, newPin, userId, (current, total) => {
        setProgress({ current, total });
      });

      setLoading(false);

      if (result.success) {
        Alert.alert(
          '✅ PIN Cambiado',
          `Tu PIN ha sido actualizado exitosamente. ${result.documentsUpdated} documento(s) re-encriptado(s).`,
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
        Alert.alert('❌ Error', result.error || 'No se pudo cambiar el PIN.');
      }
    } catch (error) {
      setLoading(false);
      console.error('Error changing PIN:', error);
      Alert.alert('❌ Error', 'Ocurrió un error inesperado al cambiar el PIN.');
    }
  };

  const handleKeyPress = (digit: string) => {
    const currentSetter =
      step === 'current' ? setCurrentPin : step === 'new' ? setNewPin : setConfirmPin;
    const currentValue = step === 'current' ? currentPin : step === 'new' ? newPin : confirmPin;

    if (currentValue.length < 6) {
      currentSetter(currentValue + digit);
    }
  };

  const handleBackspace = () => {
    const currentSetter =
      step === 'current' ? setCurrentPin : step === 'new' ? setNewPin : setConfirmPin;
    const currentValue = step === 'current' ? currentPin : step === 'new' ? newPin : confirmPin;

    if (currentValue.length > 0) {
      currentSetter(currentValue.slice(0, -1));
    }
  };

  const handleBack = () => {
    if (step === 'confirm') {
      setStep('new');
      setConfirmPin('');
    } else if (step === 'new') {
      setStep('current');
      setNewPin('');
    }
  };

  const getCurrentInput = () => {
    switch (step) {
      case 'current':
        return currentPin;
      case 'new':
        return newPin;
      case 'confirm':
        return confirmPin;
    }
  };

  const getStepInfo = () => {
    switch (step) {
      case 'current':
        return {
          title: 'Cambiar PIN',
          icon: 'key' as const,
          message: 'Ingresa tu PIN actual para continuar',
          placeholder: 'PIN actual',
        };
      case 'new':
        return {
          title: 'Nuevo PIN',
          icon: 'keypad' as const,
          message: 'Crea tu nuevo PIN (4-6 dígitos)',
          placeholder: 'Nuevo PIN',
        };
      case 'confirm':
        return {
          title: 'Confirmar PIN',
          icon: 'checkmark-circle' as const,
          message: 'Confirma tu nuevo PIN',
          placeholder: 'Confirmar nuevo PIN',
        };
    }
  };

  const stepInfo = getStepInfo();
  const currentInput = getCurrentInput();

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
          <TouchableOpacity onPress={handleBack} style={styles.backButton} disabled={loading}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.colors.text }]}>{stepInfo.title}</Text>
          <View style={styles.headerRight} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          {loading ? (
            /* Loading State */
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2196F3" />
              <Text style={[styles.loadingTitle, { color: theme.colors.text }]}>
                Re-encriptando Documentos
              </Text>
              {progress.total > 0 && (
                <Text style={[styles.loadingText, { color: theme.colors.textMuted }]}>
                  Documento {progress.current} de {progress.total}
                </Text>
              )}
              <View style={styles.warningBox}>
                <Ionicons name="warning" size={20} color="#FF9800" />
                <Text style={[styles.warningText, { color: theme.colors.textMuted }]}>
                  No cierres esta ventana hasta que termine
                </Text>
              </View>
            </View>
          ) : (
            /* Input State */
            <>
              {/* Icon */}
              <View style={styles.iconContainer}>
                <Ionicons name={stepInfo.icon} size={80} color="#2196F3" />
              </View>

              {/* Message */}
              <Text style={[styles.message, { color: theme.colors.text }]}>{stepInfo.message}</Text>

              {/* Progress Indicator */}
              <View style={styles.progressContainer}>
                {['current', 'new', 'confirm'].map((s, index) => (
                  <View
                    key={s}
                    style={[
                      styles.progressDot,
                      {
                        backgroundColor:
                          s === step
                            ? '#2196F3'
                            : ['current', 'new', 'confirm'].indexOf(step) > index
                              ? '#4CAF50'
                              : theme.colors.border,
                      },
                    ]}
                  />
                ))}
              </View>

              {/* PIN Dots */}
              <View style={styles.dotsContainer}>
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <View
                    key={index}
                    style={[
                      styles.dot,
                      {
                        backgroundColor:
                          currentInput.length > index ? '#2196F3' : theme.colors.border,
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
                        backgroundColor: currentInput.length >= 4 ? '#2196F3' : theme.colors.card,
                        opacity: currentInput.length >= 4 ? 1 : 0.5,
                      },
                    ]}
                    onPress={handleNext}
                    disabled={currentInput.length < 4}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="checkmark-circle"
                      size={32}
                      color={currentInput.length >= 4 ? '#FFFFFF' : theme.colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Info Box */}
              {step === 'new' && (
                <View style={styles.infoBox}>
                  <Ionicons name="information-circle" size={20} color="#2196F3" />
                  <Text style={[styles.infoText, { color: theme.colors.textMuted }]}>
                    Todos tus documentos serán re-encriptados con el nuevo PIN
                  </Text>
                </View>
              )}
            </>
          )}
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
  loadingContainer: {
    alignItems: 'center',
    gap: 16,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  loadingText: {
    fontSize: 15,
  },
  iconContainer: {
    marginBottom: 24,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  progressContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 32,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
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
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(33, 150, 243, 0.08)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  infoText: {
    fontSize: 13,
    flex: 1,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 152, 0, 0.08)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  warningText: {
    fontSize: 13,
    flex: 1,
  },
});
