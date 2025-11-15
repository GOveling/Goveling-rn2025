// ⚠️ VERSIÓN STANDALONE - Para copiar directamente en Supabase Dashboard
// No requiere archivos externos

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

// CORS headers inline
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, code, userId } = await req.json();

    console.log('📧 send-recovery-email called:', { email, userId, hasCode: !!code });

    if (!email || !code) {
      console.error('❌ Missing email or code');
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'Email and code are required',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    // MODO DESARROLLO: Si no hay RESEND_API_KEY, retornar código para testing
    if (!resendApiKey) {
      console.log('⚠️ RESEND_API_KEY not configured, returning code for development');
      console.log('📋 Recovery code:', code);
      return new Response(
        JSON.stringify({
          ok: true,
          code: code, // ← El código se retorna en la respuesta para testing
          message: 'Development mode - check server logs for code',
          developmentMode: true,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // MODO PRODUCCIÓN: Enviar email real via Resend
    const emailSubject = 'Código de Recuperación de PIN - Goveling';

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${emailSubject}</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            background-color: #f9fafb;
            margin: 0;
            padding: 0;
          }
          .container { 
            max-width: 600px; 
            margin: 40px auto; 
            background: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            overflow: hidden;
          }
          .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 32px 20px;
            text-align: center;
          }
          .logo { 
            color: #ffffff; 
            font-size: 28px; 
            font-weight: bold; 
            margin-bottom: 8px;
          }
          .header-subtitle {
            color: rgba(255, 255, 255, 0.9);
            font-size: 14px;
          }
          .content {
            padding: 32px 20px;
          }
          .code-box { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 12px;
            padding: 24px; 
            text-align: center; 
            margin: 24px 0;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
          }
          .code-label {
            color: rgba(255, 255, 255, 0.9);
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 8px;
          }
          .code { 
            font-size: 42px; 
            font-weight: 800; 
            color: #ffffff; 
            letter-spacing: 8px;
            font-family: 'Courier New', monospace;
          }
          .warning-box {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 16px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .warning-box strong {
            color: #d97706;
          }
          .security-tips {
            background: #f3f4f6;
            border-radius: 8px;
            padding: 20px;
            margin-top: 24px;
          }
          .security-tips h3 {
            margin-top: 0;
            color: #374151;
            font-size: 16px;
          }
          .security-tips ul {
            margin: 12px 0;
            padding-left: 20px;
          }
          .security-tips li {
            margin: 8px 0;
            color: #6b7280;
            font-size: 14px;
          }
          .footer { 
            background: #f9fafb;
            padding: 24px 20px;
            text-align: center; 
            color: #6b7280; 
            font-size: 14px;
            border-top: 1px solid #e5e7eb;
          }
          .footer p {
            margin: 8px 0;
          }
          .icon {
            font-size: 48px;
            margin-bottom: 16px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🔐 Goveling</div>
            <div class="header-subtitle">Recuperación de PIN - Documentos de Viaje</div>
          </div>
          
          <div class="content">
            <div style="text-align: center;">
              <div class="icon">🗝️</div>
            </div>
            
            <h2 style="color: #111827; text-align: center;">Código de Recuperación</h2>
            
            <p style="text-align: center; color: #6b7280;">
              Has solicitado recuperar tu PIN de Documentos de Viaje.<br>
              Usa el siguiente código para establecer un nuevo PIN:
            </p>
            
            <div class="code-box">
              <div class="code-label">Tu código de seguridad</div>
              <div class="code">${code}</div>
            </div>
            
            <div class="warning-box">
              <strong>⏰ Este código expira en 15 minutos.</strong><br>
              Tienes un máximo de 3 intentos para ingresar el código correcto.
            </div>
            
            <div class="security-tips">
              <h3>🛡️ Consejos de Seguridad</h3>
              <ul>
                <li><strong>No compartas este código</strong> con nadie, ni siquiera con el equipo de Goveling.</li>
                <li>Si no solicitaste este código, <strong>ignora este correo</strong> e inicia sesión para cambiar tu PIN.</li>
                <li>Asegúrate de estar en la app oficial de Goveling antes de ingresar el código.</li>
                <li>Después de recuperar tu acceso, considera habilitar Face ID/Touch ID para mayor seguridad.</li>
              </ul>
            </div>
            
            <p style="text-align: center; margin-top: 32px; color: #9ca3af; font-size: 14px;">
              Si tienes problemas, contacta a nuestro equipo de soporte.
            </p>
          </div>
          
          <div class="footer">
            <p style="font-weight: 600; color: #374151;">Goveling - Tus documentos, siempre seguros</p>
            <p>© ${new Date().getFullYear()} Goveling. Todos los derechos reservados.</p>
            <p style="margin-top: 16px;">🌍 ¡Viaja con confianza!</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Goveling Security <noreply@team.goveling.com>',
        to: [email],
        subject: emailSubject,
        html: emailHtml,
      }),
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      console.error('❌ Resend API error:', errorText);
      throw new Error(`Resend error: ${errorText}`);
    }

    const data = await resendResponse.json();

    console.log(`✅ Recovery email sent to ${email} for user ${userId}`);

    return new Response(
      JSON.stringify({
        ok: true,
        emailId: data.id,
        message: 'Recovery email sent successfully',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('❌ send-recovery-email error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        ok: false,
        error: errorMessage,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
