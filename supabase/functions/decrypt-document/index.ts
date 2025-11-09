import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DecryptRequest {
  documentId: string;
  encryptedData: string;
  iv: string;
  authTag: string;
  keyDerived: string; // Base64 encoded key (puede ser primary o recovery)
  useRecoveryKey?: boolean;
}

interface DecryptResponse {
  success: boolean;
  data?: {
    title: string;
    documentNumber?: string;
    issuingCountry?: string;
    issuingDate?: string;
    expiryDate?: string;
    notes?: string;
    imageUri?: string;
  };
  error?: string;
}

/**
 * Desencripta datos usando AES-256-GCM
 */
async function decryptData(
  encryptedBase64: string,
  ivBase64: string,
  authTagBase64: string,
  keyBase64: string
): Promise<string> {
  // Decodificar desde base64
  const keyBuffer = Uint8Array.from(atob(keyBase64), (c) => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(ivBase64), (c) => c.charCodeAt(0));
  const authTag = Uint8Array.from(atob(authTagBase64), (c) => c.charCodeAt(0));
  const ciphertext = Uint8Array.from(atob(encryptedBase64), (c) => c.charCodeAt(0));

  // Concatenar ciphertext + authTag (GCM lo espera así)
  const encryptedBuffer = new Uint8Array(ciphertext.length + authTag.length);
  encryptedBuffer.set(ciphertext);
  encryptedBuffer.set(authTag, ciphertext.length);

  // Importar la clave
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  // Desencriptar
  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
      tagLength: 128,
    },
    cryptoKey,
    encryptedBuffer
  );

  // Convertir a string
  return new TextDecoder().decode(decryptedBuffer);
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
    const body: DecryptRequest = await req.json();

    // Validar campos requeridos
    if (!body.documentId || !body.encryptedData || !body.iv || !body.authTag || !body.keyDerived) {
      throw new Error('Missing required fields');
    }

    // Verificar que el documento pertenece al usuario
    const { data: docMetadata, error: docError } = await supabaseClient
      .from('travel_documents')
      .select('user_id')
      .eq('id', body.documentId)
      .single();

    if (docError || !docMetadata) {
      throw new Error('Document not found');
    }

    if (docMetadata.user_id !== user.id) {
      throw new Error('Unauthorized access to document');
    }

    // Registrar acceso (auditoría)
    await supabaseClient.from('document_access_logs').insert({
      document_id: body.documentId,
      user_id: user.id,
      access_type: body.useRecoveryKey ? 'recovery_key' : 'primary_key',
      accessed_at: new Date().toISOString(),
    });

    // Desencriptar
    const decryptedString = await decryptData(
      body.encryptedData,
      body.iv,
      body.authTag,
      body.keyDerived
    );

    // Parsear JSON
    const decryptedData = JSON.parse(decryptedString);

    const response: DecryptResponse = {
      success: true,
      data: decryptedData,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Decryption error:', error);

    // Si falla la desencriptación, puede ser:
    // 1. Clave incorrecta (PIN wrong)
    // 2. Datos corruptos
    // 3. AuthTag no coincide (tampering detected)
    return new Response(
      JSON.stringify({
        success: false,
        error:
          error.message === 'OperationError'
            ? 'Invalid key or corrupted data'
            : error.message || 'Internal server error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
