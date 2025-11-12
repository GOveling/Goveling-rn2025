/**
 * Biometric Authentication Service
 * Handles Face ID, Touch ID, and fallback to PIN
 */

import { Platform } from 'react-native';

import * as LocalAuthentication from 'expo-local-authentication';

import AsyncStorage from '@react-native-async-storage/async-storage';

const BIOMETRIC_ENABLED_KEY = 'biometric_auth_enabled';

export interface BiometricCapabilities {
  isAvailable: boolean;
  hasHardware: boolean;
  isEnrolled: boolean;
  supportedTypes: LocalAuthentication.AuthenticationType[];
  biometricType: 'faceId' | 'touchId' | 'fingerprint' | 'iris' | 'none';
}

/**
 * Check if device supports biometric authentication
 */
export async function checkBiometricCapabilities(): Promise<BiometricCapabilities> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

    // Determine biometric type
    let biometricType: BiometricCapabilities['biometricType'] = 'none';

    if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      biometricType = 'faceId';
    } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      biometricType = Platform.OS === 'ios' ? 'touchId' : 'fingerprint';
    } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      biometricType = 'iris';
    }

    return {
      isAvailable: hasHardware && isEnrolled,
      hasHardware,
      isEnrolled,
      supportedTypes,
      biometricType,
    };
  } catch (error) {
    console.error('Error checking biometric capabilities:', error);
    return {
      isAvailable: false,
      hasHardware: false,
      isEnrolled: false,
      supportedTypes: [],
      biometricType: 'none',
    };
  }
}

/**
 * Get biometric type display name
 */
export function getBiometricTypeName(type: BiometricCapabilities['biometricType']): string {
  switch (type) {
    case 'faceId':
      return 'Face ID';
    case 'touchId':
      return 'Touch ID';
    case 'fingerprint':
      return 'Huella Digital';
    case 'iris':
      return 'Reconocimiento de Iris';
    default:
      return 'Autenticación Biométrica';
  }
}

/**
 * Get icon name for biometric type
 */
export function getBiometricIconName(type: BiometricCapabilities['biometricType']): string {
  switch (type) {
    case 'faceId':
      return 'scan-outline';
    case 'touchId':
    case 'fingerprint':
      return 'finger-print';
    case 'iris':
      return 'eye-outline';
    default:
      return 'lock-closed';
  }
}

/**
 * Authenticate with biometrics
 */
export async function authenticateWithBiometrics(
  promptMessage: string = 'Autentícate para continuar',
  skipEnabledCheck: boolean = false // Allow bypassing enabled check for setup
): Promise<{
  success: boolean;
  error?: string;
  biometricType?: BiometricCapabilities['biometricType'];
}> {
  try {
    // Check if biometrics are available
    const capabilities = await checkBiometricCapabilities();

    if (!capabilities.isAvailable) {
      return {
        success: false,
        error: capabilities.hasHardware
          ? 'No hay datos biométricos registrados en el dispositivo'
          : 'Este dispositivo no soporta autenticación biométrica',
      };
    }

    // Check if user has enabled biometric auth in app (skip during setup)
    if (!skipEnabledCheck) {
      const isEnabled = await isBiometricAuthEnabled();
      if (!isEnabled) {
        return {
          success: false,
          error: 'La autenticación biométrica no está habilitada',
        };
      }
    }

    // Authenticate with biometrics ONLY first (no device PIN fallback)
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Cancelar',
      disableDeviceFallback: true, // ONLY biometrics, no device PIN
      requireConfirmation: false, // Don't require additional confirmation
    });

    if (result.success) {
      console.log('✅ Biometric authentication successful');
      return {
        success: true,
        biometricType: capabilities.biometricType,
      };
    }

    // Authentication failed - provide more details
    console.log('❌ Biometric authentication failed:', JSON.stringify(result));

    return {
      success: false,
      error: 'Autenticación cancelada o fallida',
    };
  } catch (error: any) {
    console.error('Error during biometric authentication:', error);

    // Check if it's the missing usage description error
    if (
      error?.message?.includes('NSFaceIDUsageDescription') ||
      error?.code === 'missing_usage_description'
    ) {
      return {
        success: false,
        error:
          'Face ID requiere un Development Build. No funciona en Expo Go. Usa "eas build --profile development --platform ios" para crear un build.',
      };
    }

    return {
      success: false,
      error: 'Error al autenticar con biometría',
    };
  }
}

/**
 * Check if user has enabled biometric authentication in app
 */
export async function isBiometricAuthEnabled(): Promise<boolean> {
  try {
    console.log('🔍 [biometricAuth] Checking if biometric is enabled...');
    const value = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
    console.log(`🔍 [biometricAuth] AsyncStorage value for "${BIOMETRIC_ENABLED_KEY}":`, value);
    const isEnabled = value === 'true';
    console.log('🔍 [biometricAuth] Is enabled:', isEnabled);
    return isEnabled;
  } catch (error) {
    console.error('❌ [biometricAuth] Error checking biometric auth status:', error);
    return false;
  }
}

/**
 * Enable or disable biometric authentication
 */
export async function setBiometricAuthEnabled(enabled: boolean): Promise<void> {
  try {
    console.log(`🔧 [biometricAuth] Setting biometric auth to: ${enabled}`);
    await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, enabled ? 'true' : 'false');
    console.log(
      `✅ [biometricAuth] Successfully saved to AsyncStorage: ${enabled ? 'true' : 'false'}`
    );

    // Verify it was saved
    const savedValue = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
    console.log(`🔍 [biometricAuth] Verification read from AsyncStorage:`, savedValue);
  } catch (error) {
    console.error('❌ [biometricAuth] Error setting biometric auth status:', error);
    throw error;
  }
}

/**
 * Prompt user to enable biometric authentication
 * Returns true if user enabled it, false otherwise
 */
export async function promptEnableBiometrics(): Promise<boolean> {
  try {
    const capabilities = await checkBiometricCapabilities();

    if (!capabilities.isAvailable) {
      return false;
    }

    // Test biometric authentication
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: `Habilitar ${getBiometricTypeName(capabilities.biometricType)}`,
      cancelLabel: 'Ahora no',
      fallbackLabel: 'Cancelar',
      disableDeviceFallback: true, // Force biometrics only for setup
    });

    if (result.success) {
      await setBiometricAuthEnabled(true);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error prompting biometric setup:', error);
    return false;
  }
}

/**
 * Disable biometric authentication
 */
export async function disableBiometricAuth(): Promise<void> {
  await setBiometricAuthEnabled(false);
}
