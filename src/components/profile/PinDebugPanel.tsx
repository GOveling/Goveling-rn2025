import React, { useState, useEffect } from 'react';

import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { hasPinConfigured, verifyPin, removePinHash } from '~/services/documentEncryption';

/**
 * 🔐 Componente de DEBUG para verificar el estado del PIN
 * Solo visible en modo desarrollo (__DEV__)
 *
 * Características:
 * - Muestra si hay PIN configurado
 * - Permite probar verificación de PIN
 * - Permite resetear el PIN
 */
export default function PinDebugPanel() {
  const [hasPin, setHasPin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkPinStatus();
  }, []);

  const checkPinStatus = async () => {
    setLoading(true);
    const pinConfigured = await hasPinConfigured();
    setHasPin(pinConfigured);
    setLoading(false);
  };

  const handleVerifyPin = async () => {
    if (!hasPin) {
      Alert.alert('❌ Error', 'No hay PIN configurado');
      return;
    }

    Alert.prompt(
      '🔐 Verificar PIN',
      'Ingresa tu PIN para verificar:',
      async (text) => {
        if (!text || text.trim() === '') {
          Alert.alert('❌ Error', 'Debes ingresar un PIN');
          return;
        }

        const isValid = await verifyPin(text);
        Alert.alert('🔐 Resultado', isValid ? '✅ PIN correcto' : '❌ PIN incorrecto');
      },
      'plain-text'
    );
  };

  const handleResetPin = async () => {
    if (!hasPin) {
      Alert.alert('ℹ️ Info', 'No hay PIN configurado para resetear');
      return;
    }

    Alert.alert(
      '⚠️ Resetear PIN',
      '¿Estás seguro de que quieres eliminar el PIN? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Resetear',
          style: 'destructive',
          onPress: async () => {
            await removePinHash();
            await checkPinStatus();
            Alert.alert('✅ PIN Eliminado', 'El PIN ha sido eliminado correctamente.');
          },
        },
      ]
    );
  };

  if (!__DEV__) {
    return null; // No mostrar en producción
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="bug" size={20} color="#FF9800" />
        <Text style={styles.headerText}>🔐 DEBUG: Estado del PIN</Text>
      </View>

      {/* Estado del PIN */}
      <View style={styles.statusContainer}>
        {loading ? (
          <Text style={styles.statusText}>Cargando...</Text>
        ) : (
          <>
            <Ionicons
              name={hasPin ? 'checkmark-circle' : 'close-circle'}
              size={24}
              color={hasPin ? '#4CAF50' : '#F44336'}
            />
            <Text style={[styles.statusText, { color: hasPin ? '#4CAF50' : '#F44336' }]}>
              {hasPin ? 'PIN Configurado' : 'Sin PIN'}
            </Text>
          </>
        )}
      </View>

      {/* Botones de acción */}
      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={[styles.button, styles.refreshButton]}
          onPress={checkPinStatus}
          activeOpacity={0.7}
        >
          <Ionicons name="refresh" size={18} color="#2196F3" />
          <Text style={[styles.buttonText, { color: '#2196F3' }]}>Actualizar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.verifyButton, !hasPin && styles.buttonDisabled]}
          onPress={handleVerifyPin}
          disabled={!hasPin}
          activeOpacity={0.7}
        >
          <Ionicons name="key" size={18} color={hasPin ? '#4CAF50' : '#999'} />
          <Text style={[styles.buttonText, { color: hasPin ? '#4CAF50' : '#999' }]}>Verificar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.resetButton, !hasPin && styles.buttonDisabled]}
          onPress={handleResetPin}
          disabled={!hasPin}
          activeOpacity={0.7}
        >
          <Ionicons name="trash" size={18} color={hasPin ? '#FF3B30' : '#999'} />
          <Text style={[styles.buttonText, { color: hasPin ? '#FF3B30' : '#999' }]}>Resetear</Text>
        </TouchableOpacity>
      </View>

      {/* Información adicional */}
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          <Text style={styles.infoBold}>SecureStore Key:</Text> travel_documents_pin_hash
        </Text>
        <Text style={styles.infoText}>
          <Text style={styles.infoBold}>Formato:</Text> {'{ hash, salt }'}
        </Text>
        <Text style={styles.infoText}>
          <Text style={styles.infoBold}>Algoritmo:</Text> PBKDF2-SHA256 (100 iter)
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: 10,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  container: {
    backgroundColor: 'rgba(255, 152, 0, 0.05)' as const,
    borderColor: '#FF9800' as const,
    borderRadius: 12,
    borderWidth: 2,
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  headerText: {
    color: '#FF9800' as const,
    fontSize: 14,
    fontWeight: '700',
  },
  infoBold: {
    fontWeight: '600',
  },
  infoContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.03)' as const,
    borderRadius: 8,
    gap: 4,
    padding: 12,
  },
  infoText: {
    color: '#666' as const,
    fontSize: 12,
  },
  refreshButton: {
    backgroundColor: 'rgba(33, 150, 243, 0.1)' as const,
    borderColor: '#2196F3' as const,
  },
  resetButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)' as const,
    borderColor: '#FF3B30' as const,
  },
  statusContainer: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF' as const,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    marginBottom: 16,
    paddingVertical: 12,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  verifyButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)' as const,
    borderColor: '#4CAF50' as const,
  },
});
