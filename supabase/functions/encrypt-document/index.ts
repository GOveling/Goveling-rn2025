import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EncryptRequest {
  documentId: string;
  title: string;
  documentType: string;
  documentNumber?: string;
  issuingCountry?: string;
  issuingDate?: string;
  expiryDate?: string;
  notes?: string;
  imageUri?: string;
  primaryKeyDerived: string; // Base64 encoded key from PIN
  recoveryKeyDerived: string; // Base64 encoded key from userID
}

interface EncryptResponse {
  success: boolean;
  encryptedData?: {
    encryptedWithPrimary: string;
    encryptedWithRecovery: string;
    primaryIv: string;
    recoveryIv: string;
    primaryAuthTag: string;
    recoveryAuthTag: string;
  };
  metadata?: {
    documentId: string;
    userId: string;
    documentType: string;
    expiryDate?: string;
    hasImage: boolean;
    createdAt: string;
    updatedAt: string;
  };
  error?: string;
}

/**
 * Encripta datos usando AES-256-GCM
 */
async function encryptData(
  data: string,
  keyBase64: string
): Promise<{ encrypted: string; iv: string; authTag: string }> {
  // Decodificar la clave desde base64
  const keyBuffer = Uint8Array.from(atob(keyBase64), (c) => c.charCodeAt(0));

  // Generar IV aleatorio de 12 bytes (recomendado para GCM)
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Importar la clave para usar con Web Crypto API
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  // Convertir datos a ArrayBuffer
  const dataBuffer = new TextEncoder().encode(data);

  // Encriptar usando AES-256-GCM
  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
      tagLength: 128, // 128 bits = 16 bytes auth tag
    },
    cryptoKey,
    dataBuffer
  );

  // GCM devuelve: encrypted data + authentication tag (últimos 16 bytes)
  const encrypted = new Uint8Array(encryptedBuffer);
  const authTag = encrypted.slice(-16); // Últimos 16 bytes
  const ciphertext = encrypted.slice(0, -16); // Todo menos los últimos 16

  return {
    encrypted: btoa(String.fromCharCode(...ciphertext)),
    iv: btoa(String.fromCharCode(...iv)),
    authTag: btoa(String.fromCharCode(...authTag)),
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validar autenticación
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Crear cliente de Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Obtener usuario autenticado
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Parsear request body
    const body: EncryptRequest = await req.json();

    // Validar campos requeridos
    if (
      !body.documentId ||
      !body.title ||
      !body.documentType ||
      !body.primaryKeyDerived ||
      !body.recoveryKeyDerived
    ) {
      throw new Error('Missing required fields');
    }

    // Crear objeto con los datos sensibles a encriptar
    const sensitiveData = {
      title: body.title,
      documentNumber: body.documentNumber,
      issuingCountry: body.issuingCountry,
      issuingDate: body.issuingDate,
      expiryDate: body.expiryDate,
      notes: body.notes,
      imageUri: body.imageUri,
    };

    // Convertir a JSON string
    const dataString = JSON.stringify(sensitiveData);

    // Encriptar con clave primaria (derivada del PIN)
    const primaryEncryption = await encryptData(dataString, body.primaryKeyDerived);

    // Encriptar con clave de recuperación (derivada del userID)
    const recoveryEncryption = await encryptData(dataString, body.recoveryKeyDerived);

    // Preparar respuesta
    const response: EncryptResponse = {
      success: true,
      encryptedData: {
        encryptedWithPrimary: primaryEncryption.encrypted,
        encryptedWithRecovery: recoveryEncryption.encrypted,
        primaryIv: primaryEncryption.iv,
        recoveryIv: recoveryEncryption.iv,
        primaryAuthTag: primaryEncryption.authTag,
        recoveryAuthTag: recoveryEncryption.authTag,
      },
      metadata: {
        documentId: body.documentId,
        userId: user.id,
        documentType: body.documentType,
        expiryDate: body.expiryDate,
        hasImage: !!body.imageUri,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Encryption error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
