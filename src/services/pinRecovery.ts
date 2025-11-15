/**
 * PIN Recovery Service
 * Maneja el flujo de recuperación de PIN por email
 */

import * as Crypto from 'expo-crypto';

import { supabase } from '~/lib/supabase';

/**
 * Genera un código de recuperación de 6 dígitos
 */
export function generateRecoveryCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Hash del código de recuperación para almacenamiento seguro
 */
async function hashRecoveryCode(code: string): Promise<string> {
  return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `recovery_${code}`);
}

/**
 * Obtiene el email del usuario autenticado
 */
export async function getUserEmail(): Promise<string | null> {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      console.error('Error getting user:', error);
      return null;
    }

    return user.email || null;
  } catch (error) {
    console.error('Error in getUserEmail:', error);
    return null;
  }
}

/**
 * Solicita un código de recuperación por email
 * SEGURIDAD: Usa Edge Function con service_role que maneja todo el proceso de forma segura
 * @returns {success, message, email?, developmentCode?}
 */
export async function requestRecoveryCode(): Promise<{
  success: boolean;
  message: string;
  email?: string;
  error?: string;
  developmentCode?: string;
}> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !user.email) {
      return {
        success: false,
        message: 'Usuario no autenticado o sin email',
        error: 'NO_EMAIL',
      };
    }

    console.log('🔐 Requesting PIN recovery via Edge Function for:', user.email);

    // Llamar Edge Function SEGURA - maneja todo el proceso con service_role
    const { data: response, error: functionError } = await supabase.functions.invoke(
      'request-pin-recovery',
      {
        body: {
          email: user.email,
        },
      }
    );

    console.log('📧 Edge Function response:', { data: response, error: functionError });

    if (functionError) {
      console.error('❌ Error calling Edge Function:', functionError);
      return {
        success: false,
        message: 'Error al solicitar código de recuperación',
        error: functionError.message,
      };
    }

    if (!response?.ok) {
      console.error('❌ Edge Function returned error:', response);
      return {
        success: false,
        message: response?.error || 'Error desconocido',
        error: response?.error,
      };
    }

    // Modo desarrollo: mostrar código en consola
    if (response.developmentMode && response.code) {
      console.log('🔧 MODO DESARROLLO - Código de recuperación:', response.code);
      console.log('🔧 Este código es válido por 15 minutos');

      if (__DEV__) {
        console.log('═══════════════════════════════════════');
        console.log('📋 CÓDIGO DE RECUPERACIÓN: ' + response.code);
        console.log('═══════════════════════════════════════');
      }
    }

    console.log('✅ Recovery code process completed successfully');

    return {
      success: true,
      message: response.message || `Código enviado a ${user.email}`,
      email: user.email,
      developmentCode: response.developmentMode ? response.code : undefined,
    };
  } catch (error) {
    console.error('Error in requestRecoveryCode:', error);
    return {
      success: false,
      message: 'Error inesperado',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Verifica un código de recuperación ingresado por el usuario
 * @param code - Código de 6 dígitos ingresado
 * @returns {valid, message, recoveryId?, attemptsLeft?}
 */
export async function verifyRecoveryCode(code: string): Promise<{
  valid: boolean;
  message: string;
  recoveryId?: string;
  attemptsLeft?: number;
  error?: string;
}> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        valid: false,
        message: 'Usuario no autenticado',
        error: 'NO_USER',
      };
    }

    // Buscar el código más reciente no usado del usuario
    const { data: recoveryCodes, error: fetchError } = await supabase
      .from('recovery_codes')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_used', false)
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchError || !recoveryCodes || recoveryCodes.length === 0) {
      return {
        valid: false,
        message: 'No hay códigos de recuperación activos',
        error: 'NO_ACTIVE_CODE',
      };
    }

    const recoveryCode = recoveryCodes[0];

    // Verificar si expiró
    const now = new Date();
    const expiresAt = new Date(recoveryCode.expires_at);

    if (now > expiresAt) {
      // Marcar como usado para que no se pueda usar
      await supabase.from('recovery_codes').update({ is_used: true }).eq('id', recoveryCode.id);

      return {
        valid: false,
        message: 'El código ha expirado. Solicita uno nuevo.',
        error: 'EXPIRED',
      };
    }

    // Verificar intentos máximos
    if (recoveryCode.attempts >= recoveryCode.max_attempts) {
      await supabase.from('recovery_codes').update({ is_used: true }).eq('id', recoveryCode.id);

      return {
        valid: false,
        message: 'Máximo de intentos alcanzado. Solicita un nuevo código.',
        error: 'MAX_ATTEMPTS',
      };
    }

    // Hash del código ingresado
    const inputHash = await hashRecoveryCode(code);

    // Comparar hashes
    if (inputHash !== recoveryCode.code_hash) {
      // Incrementar contador de intentos
      const newAttempts = recoveryCode.attempts + 1;
      await supabase
        .from('recovery_codes')
        .update({ attempts: newAttempts })
        .eq('id', recoveryCode.id);

      const attemptsLeft = recoveryCode.max_attempts - newAttempts;

      return {
        valid: false,
        message: `Código incorrecto. Te quedan ${attemptsLeft} intento${attemptsLeft !== 1 ? 's' : ''}`,
        attemptsLeft,
        error: 'INVALID_CODE',
      };
    }

    // ✅ Código válido!
    // Marcar como usado
    await supabase
      .from('recovery_codes')
      .update({ is_used: true, used_at: new Date().toISOString() })
      .eq('id', recoveryCode.id);

    return {
      valid: true,
      message: 'Código válido',
      recoveryId: recoveryCode.id,
    };
  } catch (error) {
    console.error('Error in verifyRecoveryCode:', error);
    return {
      valid: false,
      message: 'Error al verificar el código',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Verifica si hay un código de recuperación activo
 */
export async function hasActiveRecoveryCode(): Promise<boolean> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return false;

    const { data: recoveryCodes } = await supabase
      .from('recovery_codes')
      .select('id, expires_at')
      .eq('user_id', user.id)
      .eq('is_used', false)
      .order('created_at', { ascending: false })
      .limit(1);

    if (!recoveryCodes || recoveryCodes.length === 0) return false;

    // Verificar si aún no ha expirado
    const now = new Date();
    const expiresAt = new Date(recoveryCodes[0].expires_at);

    return now <= expiresAt;
  } catch (error) {
    console.error('Error checking active recovery code:', error);
    return false;
  }
}

/**
 * Obtiene el tiempo restante para un código de recuperación activo
 * @returns Minutos restantes o 0 si no hay código activo
 */
export async function getRecoveryCodeTimeRemaining(): Promise<number> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return 0;

    const { data: recoveryCodes } = await supabase
      .from('recovery_codes')
      .select('expires_at')
      .eq('user_id', user.id)
      .eq('is_used', false)
      .order('created_at', { ascending: false })
      .limit(1);

    if (!recoveryCodes || recoveryCodes.length === 0) return 0;

    const now = new Date();
    const expiresAt = new Date(recoveryCodes[0].expires_at);
    const diffMs = expiresAt.getTime() - now.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);

    return diffMinutes > 0 ? diffMinutes : 0;
  } catch (error) {
    console.error('Error getting recovery code time:', error);
    return 0;
  }
}
