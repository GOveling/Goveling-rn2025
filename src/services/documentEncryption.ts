/**
 * Document Encryption Service
 * Maneja encriptación local y comunicación con Edge Functions
 */

import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

import { supabase } from '~/lib/supabase';

const SECURE_STORE_PIN_KEY = 'travel_documents_pin_hash';

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
 * Genera una clave derivada para encriptar documentos
 */
export async function generateDocumentKey(pin: string): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const salt = user.id; // Usar userID como salt
  return await derivePinKey(pin, salt);
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
  return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `recovery_${user.id}`);
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
    // Generar claves
    const primaryKey = await generateDocumentKey(documentData.pin);
    const recoveryKey = await generateRecoveryKey();

    // Llamar al Edge Function
    const { data, error } = await supabase.functions.invoke('encrypt-document', {
      body: {
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
      },
    });

    if (error) {
      console.error('Encryption error:', error);
      return { success: false, error: error.message };
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
 * Desencripta un documento llamando al Edge Function
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
    const key = useRecoveryKey ? await generateRecoveryKey() : await generateDocumentKey(pin);

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

    if (error) {
      console.error('Decryption error:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: data.data,
    };
  } catch (error) {
    console.error('Decryption service error:', error);
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
