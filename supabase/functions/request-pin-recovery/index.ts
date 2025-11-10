// =============================================
// Edge Function: request-pin-recovery
// Maneja TODO el proceso de recuperación de PIN de forma segura
// Usa service_role para bypasear RLS y manejar usuarios no autenticados
// =============================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generateRecoveryCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function hashCode(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`recovery_${code}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();
    console.log('🔐 PIN Recovery requested for:', email);

    if (!email) {
      return new Response(JSON.stringify({ ok: false, error: 'Email is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Buscar usuario por email en profiles (usa 'id' no 'user_id')
    const { data: users, error: userError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', email.toLowerCase().trim())
      .limit(1);

    if (userError) {
      console.error('❌ Error querying profiles:', userError);
      return new Response(
        JSON.stringify({
          ok: true,
          message: 'Si el email existe, recibirás un código de recuperación',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!users || users.length === 0) {
      console.error('❌ User not found:', email);
      return new Response(
        JSON.stringify({
          ok: true,
          message: 'Si el email existe, recibirás un código de recuperación',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const user = users[0];
    console.log('✅ User found:', user.id);

    // Invalidar códigos antiguos (service_role bypasea RLS)
    const { error: updateError } = await supabase
      .from('recovery_codes')
      .update({ is_used: true })
      .eq('user_id', user.id)
      .eq('is_used', false);

    if (updateError) {
      console.warn('⚠️ Warning invalidating old codes:', updateError.message);
    }

    // Generar nuevo código
    const code = generateRecoveryCode();
    const codeHash = await hashCode(code);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    console.log('🔑 Generated recovery code:', code);
    console.log('🔑 Code hash (first 10 chars):', codeHash.substring(0, 10));

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
      console.error('❌ Error inserting code:', insertError);
      return new Response(JSON.stringify({ ok: false, error: 'Error al generar código' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ Recovery code saved to database');

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    console.log('🔍 RESEND_API_KEY status:', resendApiKey ? 'CONFIGURED' : 'NOT CONFIGURED');

    if (!resendApiKey) {
      console.log('⚠️ DEVELOPMENT MODE - Returning code in response');
      return new Response(
        JSON.stringify({
          ok: true,
          code: code,
          message: 'Código generado (modo desarrollo)',
          developmentMode: true,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PRODUCCIÓN: Enviar email via Resend
    console.log('📧 Sending email via Resend to:', user.email);

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Goveling Security <seguridad@team.goveling.com>',
        to: [user.email],
        subject: 'Código de Recuperación de PIN - Goveling',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Código de Recuperación de PIN - Goveling</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 0;">
              <tr>
                <td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
                    
                    <!-- Header con gradiente -->
                    <tr>
                      <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                        <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0; padding: 0;">
                          🔐 Recuperación de PIN
                        </h1>
                        <p style="color: rgba(255, 255, 255, 0.95); font-size: 16px; margin: 12px 0 0 0;">
                          Goveling Security
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Contenido principal -->
                    <tr>
                      <td style="padding: 40px 30px;">
                        <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                          Hola,
                        </p>
                        <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                          Has solicitado recuperar tu PIN de seguridad en <strong>Goveling</strong>. 
                          Utiliza el siguiente código de verificación para continuar:
                        </p>
                        
                        <!-- Código de recuperación -->
                        <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                          <tr>
                            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 32px; text-align: center; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">
                              <p style="color: rgba(255, 255, 255, 0.9); font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; margin: 0 0 12px 0; font-weight: 600;">
                                TU CÓDIGO DE RECUPERACIÓN
                              </p>
                              <p style="color: #ffffff; font-size: 48px; font-weight: 800; letter-spacing: 12px; margin: 0; font-family: 'Courier New', monospace;">
                                ${code}
                              </p>
                            </td>
                          </tr>
                        </table>
                        
                        <!-- Información importante -->
                        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 30px 0; border-radius: 4px;">
                          <p style="color: #92400e; font-size: 14px; line-height: 1.6; margin: 0 0 12px 0;">
                            <strong>⏰ Tiempo de validez:</strong> Este código expira en <strong>15 minutos</strong>
                          </p>
                          <p style="color: #92400e; font-size: 14px; line-height: 1.6; margin: 0;">
                            <strong>🔒 Intentos disponibles:</strong> Tienes <strong>3 intentos</strong> para ingresar el código correcto
                          </p>
                        </div>
                        
                        <!-- Instrucciones -->
                        <div style="background-color: #f3f4f6; border-radius: 8px; padding: 24px; margin: 30px 0;">
                          <h3 style="color: #374151; font-size: 18px; margin: 0 0 16px 0; font-weight: 600;">
                            📱 Cómo usar este código
                          </h3>
                          <ol style="color: #6b7280; font-size: 15px; line-height: 1.8; margin: 0; padding-left: 20px;">
                            <li style="margin-bottom: 8px;">Abre la app Goveling en tu dispositivo</li>
                            <li style="margin-bottom: 8px;">Ingresa el código de 6 dígitos mostrado arriba</li>
                            <li style="margin-bottom: 8px;">Crea tu nuevo PIN de seguridad (4 dígitos)</li>
                            <li>Confirma tu nuevo PIN para finalizar</li>
                          </ol>
                        </div>
                        
                        <!-- Aviso de seguridad -->
                        <div style="border-top: 1px solid #e5e7eb; padding-top: 24px; margin-top: 30px;">
                          <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 12px 0;">
                            <strong style="color: #dc2626;">⚠️ ¿No solicitaste este código?</strong>
                          </p>
                          <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0;">
                            Si no solicitaste recuperar tu PIN, puedes ignorar este email de forma segura. 
                            Tu cuenta permanece protegida y ningún cambio será realizado.
                          </p>
                        </div>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                        <p style="color: #9ca3af; font-size: 13px; line-height: 1.6; margin: 0 0 8px 0;">
                          Este es un email automático de seguridad de <strong>Goveling</strong>
                        </p>
                        <p style="color: #9ca3af; font-size: 13px; line-height: 1.6; margin: 0;">
                          Por favor, no respondas a este correo electrónico.
                        </p>
                        <p style="color: #d1d5db; font-size: 12px; margin: 16px 0 0 0;">
                          © ${new Date().getFullYear()} Goveling. Todos los derechos reservados.
                        </p>
                      </td>
                    </tr>
                    
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      }),
    });

    console.log('📧 Resend API response status:', emailResponse.status);

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('❌ Resend API error:', errorText);

      // En caso de error, retornar código en desarrollo
      return new Response(
        JSON.stringify({
          ok: true,
          code: code,
          message: 'Error al enviar email, pero código generado (desarrollo)',
          developmentMode: true,
          emailError: errorText,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const emailData = await emailResponse.json();
    console.log('✅ Email sent successfully:', emailData);

    return new Response(
      JSON.stringify({
        ok: true,
        message: 'Código enviado exitosamente por email',
        emailSent: true,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return new Response(JSON.stringify({ ok: false, error: 'Error interno del servidor' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
