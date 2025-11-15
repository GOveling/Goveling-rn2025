/**
 * Document Encryption Service
 * Maneja encriptación local y comunicación con Edge Functions
 */

// Polyfill para Web Crypto API en React Native (solo en builds nativos)
// eslint-disable-next-line import/order, @typescript-eslint/no-var-requires
let hasNativeCrypto = false;
try {
  // Solo intentar instalar si estamos en un build nativo (no Expo Go)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { install } = require('react-native-quick-crypto');
  install();
  hasNativeCrypto = true;
  console.log('✅ Native crypto available - offline decryption enabled');
} catch (error) {
  console.log('⚠️ Native crypto not available - offline decryption disabled (Expo Go)');
  hasNativeCrypto = false;
}

import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

import NetInfo from '@react-native-community/netinfo';

import { supabase } from '~/lib/supabase';

const SECURE_STORE_PIN_KEY = 'travel_documents_pin_hash';
const SUPABASE_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Genera una clave derivada desde un PIN usando PBKDF2
 */
async function derivePinKey(pin: string, salt: string): Promise<string> {
  const combinedInput = `${pin}_${salt}`;
  const derivedKey = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    combinedInput
  );

  // Simular múltiples iteraciones para fortalecer la clave
  let result = derivedKey;
  for (let i = 0; i < 100; i++) {
    result = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, result);
  }

  return result;
}

/**
 * Guarda el PIN hasheado en SecureStore
 */
export async function savePinHash(pin: string): Promise<boolean> {
  try {
    const salt = await Crypto.getRandomBytesAsync(16);
    const saltBase64 = btoa(String.fromCharCode(...salt));

    const pinHash = await derivePinKey(pin, saltBase64);
    const dataToStore = JSON.stringify({ hash: pinHash, salt: saltBase64 });

    await SecureStore.setItemAsync(SECURE_STORE_PIN_KEY, dataToStore);
    return true;
  } catch (error) {
    console.error('Error saving PIN:', error);
    return false;
  }
}

/**
 * Verifica si el PIN ingresado es correcto
 */
export async function verifyPin(pin: string): Promise<boolean> {
  try {
    const storedData = await SecureStore.getItemAsync(SECURE_STORE_PIN_KEY);
    if (!storedData) return false;

    const { hash: storedHash, salt } = JSON.parse(storedData);
    const inputHash = await derivePinKey(pin, salt);

    return inputHash === storedHash;
  } catch (error) {
    console.error('Error verifying PIN:', error);
    return false;
  }
}

/**
 * Verifica si el usuario tiene un PIN configurado
 */
export async function hasPinConfigured(): Promise<boolean> {
  try {
    const storedData = await SecureStore.getItemAsync(SECURE_STORE_PIN_KEY);
    return !!storedData;
  } catch (error) {
    console.error('Error checking PIN:', error);
    return false;
  }
}

/**
 * Convierte un hash hexadecimal a base64
 */
function hexToBase64(hexString: string): string {
  // Convertir hex a bytes
  const bytes = new Uint8Array(hexString.length / 2);
  for (let i = 0; i < hexString.length; i += 2) {
    bytes[i / 2] = parseInt(hexString.substring(i, i + 2), 16);
  }

  // Convertir bytes a base64
  return btoa(String.fromCharCode(...bytes));
}

/**
 * Genera una clave derivada para encriptar documentos
 */
export async function generateDocumentKey(pin: string): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const salt = user.id; // Usar userID como salt
  const hexKey = await derivePinKey(pin, salt);

  // Convertir de hex a base64 para el Edge Function
  return hexToBase64(hexKey);
}

/**
 * Genera la clave de recuperación (derivada del userID)
 */
export async function generateRecoveryKey(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Clave de recuperación derivada del userID
  const hexKey = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `recovery_${user.id}`
  );

  // Convertir de hex a base64 para el Edge Function
  return hexToBase64(hexKey);
}

/**
 * Encripta un documento llamando al Edge Function
 */
export async function encryptDocument(documentData: {
  documentId: string;
  title: string;
  documentType: string;
  documentNumber?: string;
  issuingCountry?: string;
  issuingDate?: string;
  expiryDate?: string;
  notes?: string;
  imageUri?: string;
  pin: string;
}): Promise<{
  success: boolean;
  encryptedData?: unknown;
  metadata?: unknown;
  error?: string;
}> {
  try {
    // Validate PIN
    if (!documentData.pin || documentData.pin.trim() === '') {
      console.error('❌ PIN is required for encryption');
      return { success: false, error: 'PIN is required' };
    }

    // Generar claves
    const primaryKey = await generateDocumentKey(documentData.pin);
    const recoveryKey = await generateRecoveryKey();

    // Validate keys before sending
    if (!primaryKey || primaryKey.trim() === '') {
      console.error('❌ Primary key is empty!');
      return { success: false, error: 'Primary key generation failed' };
    }
    if (!recoveryKey || recoveryKey.trim() === '') {
      console.error('❌ Recovery key is empty!');
      return { success: false, error: 'Recovery key generation failed' };
    }

    // Debug: Log input data
    console.log('🔐 Encrypt Input:', {
      documentId: documentData.documentId,
      title: documentData.title,
      documentType: documentData.documentType,
      hasDocumentNumber: !!documentData.documentNumber,
      hasIssuingCountry: !!documentData.issuingCountry,
      hasIssuingDate: !!documentData.issuingDate,
      hasExpiryDate: !!documentData.expiryDate,
      hasNotes: !!documentData.notes,
      hasImageUri: !!documentData.imageUri,
      imageUriLength: documentData.imageUri?.length || 0,
      hasPrimaryKey: !!primaryKey,
      primaryKeyLength: primaryKey?.length || 0,
      hasRecoveryKey: !!recoveryKey,
      recoveryKeyLength: recoveryKey?.length || 0,
    });

    // Prepare body for Edge Function
    const requestBody = {
      documentId: documentData.documentId,
      title: documentData.title,
      documentType: documentData.documentType,
      documentNumber: documentData.documentNumber,
      issuingCountry: documentData.issuingCountry,
      issuingDate: documentData.issuingDate,
      expiryDate: documentData.expiryDate,
      notes: documentData.notes,
      imageUri: documentData.imageUri,
      primaryKeyDerived: primaryKey,
      recoveryKeyDerived: recoveryKey,
    };

    // Log required fields validation
    console.log('🔍 Validating required fields:', {
      documentId: !!requestBody.documentId && requestBody.documentId !== '',
      title: !!requestBody.title && requestBody.title !== '',
      documentType: !!requestBody.documentType && requestBody.documentType !== '',
      primaryKeyDerived: !!requestBody.primaryKeyDerived && requestBody.primaryKeyDerived !== '',
      recoveryKeyDerived: !!requestBody.recoveryKeyDerived && requestBody.recoveryKeyDerived !== '',
    });

    // Get session for manual fetch (to capture error body)
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData?.session;

    console.log('🔑 Session check:', {
      hasSession: !!session,
      hasAccessToken: !!session?.access_token,
      tokenLength: session?.access_token?.length || 0,
      expiresAt: session?.expires_at,
    });

    if (!session) {
      console.error('❌ No active session');
      return { success: false, error: 'No active session' };
    }

    // Use fetch directly to capture error response body
    const url = `${SUPABASE_URL}/functions/v1/encrypt-document`;
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: SUPABASE_ANON_KEY || '',
    };

    console.log('📤 Request details:', {
      url,
      hasAuthHeader: !!headers.Authorization,
      authHeaderLength: headers.Authorization.length,
      hasApiKey: !!headers.apikey,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    console.log('📥 Edge Function response:', {
      status: response.status,
      ok: response.ok,
      data: data,
    });

    if (!response.ok) {
      const errorMessage = data?.error || `HTTP ${response.status}: ${response.statusText}`;
      console.error('❌ Encryption error:', errorMessage);
      return { success: false, error: errorMessage };
    }

    if (!data) {
      console.error('❌ No data returned from Edge Function');
      return { success: false, error: 'No data returned from encryption service' };
    }

    return {
      success: true,
      encryptedData: data.encryptedData,
      metadata: data.metadata,
    };
  } catch (error) {
    console.error('Encryption service error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Desencripta datos localmente usando Web Crypto API (para modo offline)
 * Solo disponible en builds nativos con react-native-quick-crypto
 */
async function decryptDataLocally(
  encryptedBase64: string,
  ivBase64: string,
  authTagBase64: string,
  keyBase64: string
): Promise<string> {
  if (!hasNativeCrypto) {
    throw new Error('Native crypto not available. Use a development build for offline decryption.');
  }

  try {
    // Decodificar desde base64
    const keyBytes = Uint8Array.from(atob(keyBase64), (c) => c.charCodeAt(0));
    const iv = Uint8Array.from(atob(ivBase64), (c) => c.charCodeAt(0));
    const authTag = Uint8Array.from(atob(authTagBase64), (c) => c.charCodeAt(0));
    const ciphertext = Uint8Array.from(atob(encryptedBase64), (c) => c.charCodeAt(0));

    // Concatenar ciphertext + authTag (GCM lo requiere)
    const encryptedBuffer = new Uint8Array(ciphertext.length + authTag.length);
    encryptedBuffer.set(ciphertext);
    encryptedBuffer.set(authTag, ciphertext.length);

    // Importar la clave
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );

    // Desencriptar
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv,
        tagLength: 128,
      },
      cryptoKey,
      encryptedBuffer
    );

    // Convertir a string
    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (error) {
    console.error('❌ Local decryption error:', error);
    throw new Error(
      `Local decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Desencripta un documento (usa Edge Function si hay conexión, local si offline)
 */
export async function decryptDocument(
  documentId: string,
  encryptedData: string,
  iv: string,
  authTag: string,
  pin: string,
  useRecoveryKey = false
): Promise<{
  success: boolean;
  data?: unknown;
  error?: string;
}> {
  try {
    console.log('🔍 Decrypt Input:', {
      documentId,
      hasEncryptedData: !!encryptedData,
      encryptedDataLength: encryptedData?.length || 0,
      hasIv: !!iv,
      ivLength: iv?.length || 0,
      hasAuthTag: !!authTag,
      authTagLength: authTag?.length || 0,
      useRecoveryKey,
    });

    // Verificar conectividad PRIMERO (antes de cualquier llamada a Supabase)
    const netState = await NetInfo.fetch();
    const isOnline = netState.isConnected && netState.isInternetReachable;

    console.log('🌐 Network state:', {
      isConnected: netState.isConnected,
      isInternetReachable: netState.isInternetReachable,
      isOnline,
    });

    // Si estamos offline, usar desencriptación local (solo en builds nativos)
    if (!isOnline) {
      console.log('📴 Offline mode detected');

      // Verificar si crypto nativo está disponible
      if (!hasNativeCrypto) {
        console.warn(
          '⚠️ Offline decryption not available in Expo Go. Use a development build for offline support.'
        );
        return {
          success: false,
          error:
            'Offline decryption requires a development build. Please connect to the internet or use a native build.',
        };
      }

      console.log('🔐 Using local decryption (native crypto available)');

      // Generar clave localmente sin Supabase (usa sesión cacheada)
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        console.error('❌ No cached user session for offline decryption');
        return { success: false, error: 'No cached user session' };
      }

      // Generar clave usando el userID cacheado
      const salt = session.user.id;
      const hexKey = await derivePinKey(pin, salt);
      const key = hexToBase64(hexKey);

      console.log('🔑 Generated offline key:', {
        hasKey: !!key,
        keyLength: key.length,
        userId: session.user.id.substring(0, 8) + '...',
      });

      const decryptedJson = await decryptDataLocally(encryptedData, iv, authTag, key);
      const decryptedData = JSON.parse(decryptedJson);

      console.log('✅ Local decryption successful');
      return {
        success: true,
        data: decryptedData,
      };
    }

    // Si estamos online, generar clave y usar Edge Function
    const key = useRecoveryKey ? await generateRecoveryKey() : await generateDocumentKey(pin);

    console.log('🔑 Generated online key:', {
      hasKey: !!key,
      keyLength: key?.length || 0,
    });

    // Si estamos online, usar Edge Function
    console.log('🌐 Online mode - using Edge Function');

    // Verificar sesión
    const {
      data: { session },
    } = await supabase.auth.getSession();
    console.log('🔑 Session check:', {
      hasSession: !!session,
      hasAccessToken: !!session?.access_token,
      tokenLength: session?.access_token?.length || 0,
      expiresAt: session?.expires_at,
    });

    if (!session?.access_token) {
      console.error('❌ No access token available');
      return { success: false, error: 'No authentication token' };
    }

    const url = `${Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/decrypt-document`;
    console.log('📤 Request details:', {
      url,
      hasAuthHeader: true,
      authHeaderLength: `Bearer ${session.access_token}`.length,
      hasApiKey: !!Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    });

    const { data, error } = await supabase.functions.invoke('decrypt-document', {
      body: {
        documentId,
        encryptedData,
        iv,
        authTag,
        keyDerived: key,
        useRecoveryKey,
      },
    });

    console.log('📥 Decrypt response:', {
      status: error ? 'error' : 'success',
      hasData: !!data,
      hasError: !!error,
    });

    if (error) {
      console.error('❌ Edge Function error:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));

      // Fallback to local decryption if Edge Function fails
      console.log('🔄 Edge Function failed, attempting local decryption as fallback...');

      if (!hasNativeCrypto) {
        console.warn('⚠️ Native crypto not available for fallback');
        return { success: false, error: error.message };
      }

      try {
        console.log('🔐 Using local decryption fallback');

        // Generate key locally
        const {
          data: { session: fallbackSession },
        } = await supabase.auth.getSession();

        if (!fallbackSession?.user) {
          console.error('❌ No user session for fallback decryption');
          return { success: false, error: error.message };
        }

        const salt = fallbackSession.user.id;
        const hexKey = await derivePinKey(pin, salt);
        const localKey = hexToBase64(hexKey);

        console.log('🔑 Generated fallback local key');

        const decryptedJson = await decryptDataLocally(encryptedData, iv, authTag, localKey);
        const decryptedData = JSON.parse(decryptedJson);

        console.log('✅ Fallback local decryption successful');
        return {
          success: true,
          data: decryptedData,
        };
      } catch (fallbackError) {
        console.error('❌ Fallback decryption also failed:', fallbackError);
        return { success: false, error: error.message };
      }
    }

    return {
      success: true,
      data: data.data,
    };
  } catch (error) {
    console.error('Decryption service error:', error);

    // Try local decryption as final fallback
    if (hasNativeCrypto) {
      console.log('🔄 Attempting local decryption as final fallback...');
      try {
        const {
          data: { session: fallbackSession },
        } = await supabase.auth.getSession();

        if (fallbackSession?.user) {
          const salt = fallbackSession.user.id;
          const hexKey = await derivePinKey(pin, salt);
          const localKey = hexToBase64(hexKey);
          const decryptedJson = await decryptDataLocally(encryptedData, iv, authTag, localKey);
          const decryptedData = JSON.parse(decryptedJson);
          console.log('✅ Final fallback decryption successful');
          return { success: true, data: decryptedData };
        }
      } catch (fallbackError) {
        console.error('❌ Final fallback failed:', fallbackError);
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Elimina el PIN (para reset)
 */
export async function removePinHash(): Promise<boolean> {
  try {
    await SecureStore.deleteItemAsync(SECURE_STORE_PIN_KEY);
    return true;
  } catch (error) {
    console.error('Error removing PIN:', error);
    return false;
  }
}

/**
 * Cambia el PIN del usuario
 *
 * NOTA IMPORTANTE: Esta versión simplificada solo actualiza el hash del PIN.
 * Los documentos actualmente NO están encriptados con el PIN (ver comentario
 * "Temporary: storing unencrypted for Phase 4.2" en TravelDocumentsModal.tsx).
 *
 * Cuando se implemente encriptación real en el futuro, esta función deberá
 * ser actualizada para re-encriptar todos los documentos con el nuevo PIN.
 */
export async function changePIN(
  currentPin: string,
  newPin: string,
  userId: string,
  onProgress?: (current: number, total: number) => void
): Promise<{
  success: boolean;
  documentsUpdated: number;
  error?: string;
}> {
  try {
    // 1. Verificar que el PIN actual es correcto
    console.log('🔐 Verifying current PIN...');
    const isValidPin = await verifyPin(currentPin);
    if (!isValidPin) {
      return {
        success: false,
        documentsUpdated: 0,
        error: 'El PIN actual es incorrecto',
      };
    }

    // 2. Contar documentos del usuario (solo para mostrar progreso)
    console.log('📄 Counting user documents...');
    const { data: documents, error: fetchError } = await supabase
      .from('travel_documents')
      .select('id')
      .eq('user_id', userId);

    if (fetchError) {
      console.error('Error fetching documents:', fetchError);
      return {
        success: false,
        documentsUpdated: 0,
        error: 'No se pudieron obtener los documentos',
      };
    }

    const documentCount = documents?.length || 0;
    console.log(`ℹ️ User has ${documentCount} document(s)`);

    // 3. Simular progreso para la UI (aunque no hacemos re-encriptación real)
    if (documentCount > 0 && onProgress) {
      for (let i = 1; i <= documentCount; i++) {
        onProgress(i, documentCount);
        // Pequeña pausa para que la UI se vea natural
        await new Promise((resolve) => setTimeout(resolve, 150));
      }
    }

    // 4. Actualizar el PIN
    console.log('🔐 Updating PIN hash...');
    const pinUpdated = await savePinHash(newPin);
    if (!pinUpdated) {
      return {
        success: false,
        documentsUpdated: 0,
        error: 'No se pudo actualizar el PIN',
      };
    }

    console.log('✅ PIN changed successfully!');
    return {
      success: true,
      documentsUpdated: documentCount,
    };
  } catch (error) {
    console.error('❌ Change PIN error:', error);
    return {
      success: false,
      documentsUpdated: 0,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}
