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
    console.log('🔍 Auth header present:', !!authHeader);

    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Crear cliente de Supabase con SERVICE_ROLE_KEY para bypass RLS
    // (ya validamos la autenticación del usuario con el JWT)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    // Extraer JWT del header y validar usuario
    const jwt = authHeader.replace('Bearer ', '');
    console.log('🔑 JWT length:', jwt.length);

    // Obtener usuario autenticado pasando el JWT
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser(jwt);

    console.log('👤 User validation:', {
      hasUser: !!user,
      hasError: !!userError,
      errorMessage: userError?.message,
    });

    if (userError) {
      console.error('❌ User authentication error:', userError.message);
      throw new Error(`User not authenticated: ${userError.message}`);
    }

    if (!user) {
      console.error('❌ No user found after JWT validation');
      throw new Error('User not authenticated: No user found');
    }

    console.log('🔄 About to parse request body...');

    // Parsear request body con manejo de errores específico
    let body: DecryptRequest;
    try {
      body = await req.json();
      console.log('✅ Body parsed successfully');
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError);
      const errorMsg = parseError instanceof Error ? parseError.message : String(parseError);
      throw new Error(`Invalid JSON in request body: ${errorMsg}`);
    }

    console.log('📦 Request body:', {
      hasDocumentId: !!body.documentId,
      documentIdLength: body.documentId?.length || 0,
      hasEncryptedData: !!body.encryptedData,
      encryptedDataLength: body.encryptedData?.length || 0,
      hasIv: !!body.iv,
      ivLength: body.iv?.length || 0,
      hasAuthTag: !!body.authTag,
      authTagLength: body.authTag?.length || 0,
      hasKeyDerived: !!body.keyDerived,
      keyDerivedLength: body.keyDerived?.length || 0,
      useRecoveryKey: body.useRecoveryKey,
    });

    // Validar campos requeridos
    if (!body.documentId || !body.encryptedData || !body.iv || !body.authTag || !body.keyDerived) {
      const missing = [];
      if (!body.documentId) missing.push('documentId');
      if (!body.encryptedData) missing.push('encryptedData');
      if (!body.iv) missing.push('iv');
      if (!body.authTag) missing.push('authTag');
      if (!body.keyDerived) missing.push('keyDerived');
      console.error('❌ Missing required fields:', missing);
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }

    // Verificar que el documento pertenece al usuario
    console.log('🔍 Checking document ownership for:', body.documentId);
    const { data: docMetadata, error: docError } = await supabaseClient
      .from('travel_documents')
      .select('user_id')
      .eq('id', body.documentId)
      .single();

    console.log('📄 Document query result:', {
      hasData: !!docMetadata,
      hasError: !!docError,
      errorMessage: docError?.message,
      errorDetails: docError?.details,
      errorHint: docError?.hint,
      errorCode: docError?.code,
    });

    if (docError || !docMetadata) {
      console.error('❌ Document not found or error:', {
        docError,
        userId: user.id,
        documentId: body.documentId,
      });
      throw new Error('Document not found');
    }

    console.log('✅ Document found, checking ownership...');
    if (docMetadata.user_id !== user.id) {
      console.error('❌ Unauthorized: document belongs to different user');
      throw new Error('Unauthorized access to document');
    }

    console.log('✅ Document ownership verified');

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

    // Si hay una imagen (filePath en imageUri), generar signed URL
    if (decryptedData.imageUri) {
      console.log('🖼️ Generating signed URL for image:', decryptedData.imageUri);

      const { data: signedUrlData, error: signedUrlError } = await supabaseClient.storage
        .from('travel-documents')
        .createSignedUrl(decryptedData.imageUri, 3600); // 1 hora de validez

      if (signedUrlError) {
        console.error('❌ Error generating signed URL:', signedUrlError);
        // No fallar la desencriptación por esto, solo loguear
      } else if (signedUrlData?.signedUrl) {
        console.log('✅ Signed URL generated successfully');
        // Reemplazar el filePath con la signed URL
        decryptedData.imageUri = signedUrlData.signedUrl;
      }
    }

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
    const errorMsg = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({
        success: false,
        error:
          errorMsg === 'OperationError'
            ? 'Invalid key or corrupted data'
            : errorMsg || 'Internal server error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
