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

    // Generar código de 6 dígitos
    const code = generateRecoveryCode();
    const codeHash = await hashRecoveryCode(code);

    // Calcular expiración (15 minutos desde ahora)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // Invalidar códigos anteriores no usados
    await supabase
      .from('recovery_codes')
      .update({ is_used: true })
      .eq('user_id', user.id)
      .eq('is_used', false);

    // Guardar nuevo código en la base de datos
    const { error: insertError } = await supabase.from('recovery_codes').insert({
      user_id: user.id,
      code_hash: codeHash,
      sent_to_email: user.email,
      expires_at: expiresAt,
      is_used: false,
      attempts: 0,
      max_attempts: 3,
    });

    if (insertError) {
      console.error('Error inserting recovery code:', insertError);
      return {
        success: false,
        message: 'Error al generar el código de recuperación',
        error: insertError.message,
      };
    }

    // Llamar Edge Function para enviar email
    console.log('📧 Calling send-recovery-email Edge Function...', {
      email: user.email,
      userId: user.id,
    });

    const { data: emailData, error: emailError } = await supabase.functions.invoke(
      'send-recovery-email',
      {
        body: {
          email: user.email,
          code: code,
          userId: user.id,
        },
      }
    );

    console.log('📧 Edge Function response:', { data: emailData, error: emailError });

    if (emailError) {
      console.error('❌ Error sending recovery email:', emailError);
      console.error('❌ Error details:', JSON.stringify(emailError, null, 2));
      return {
        success: false,
        message: 'Error al enviar el email de recuperación',
        error: emailError.message,
      };
    }

    // Check if we're in development mode
    if (emailData?.developmentMode) {
      console.log('🔧 MODO DESARROLLO - Código de recuperación:', emailData.code);
      console.log('🔧 Este código es válido por 15 minutos');

      // In development, show the code in an alert for easy copying
      if (__DEV__) {
        console.log('═══════════════════════════════════════');
        console.log('📋 CÓDIGO DE RECUPERACIÓN: ' + emailData.code);
        console.log('═══════════════════════════════════════');
      }
    }

    console.log('✅ Recovery code sent successfully to:', user.email);

    return {
      success: true,
      message: `Código enviado a ${user.email}`,
      email: user.email,
      developmentCode: emailData?.developmentMode ? emailData.code : undefined,
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
