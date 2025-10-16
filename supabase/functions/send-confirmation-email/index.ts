import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!);
  const supabaseServiceRole = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const { email, fullName } = await req.json();

    if (!email) {
      throw new Error('Email is required');
    }

    console.log('🔍 Checking if user already exists:', email);

    // Check if user already exists
    const { data: users, error: listError } = await supabaseServiceRole.auth.admin.listUsers();

    if (listError) {
      console.error('❌ Error checking users:', listError);
    } else {
      const existingUser = users.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

      if (existingUser) {
        console.log('👤 User already exists:', email);
        // Return success response with userExists flag instead of error status
        return new Response(
          JSON.stringify({
            ok: false,
            error: 'user_already_exists',
            message: 'Este email ya está registrado en Goveling. Por favor inicia sesión.',
            userExists: true,
          }),
          {
            status: 200, // Return 200 instead of 409 to avoid Edge Function error
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
            },
          }
        );
      }
    }

    console.log('✅ Email available, proceeding with registration');

    // Generate OTP code
    const code = (Math.floor(Math.random() * 900000) + 100000).toString();

    // Store OTP in database
    await supabase.from('email_otps').insert({
      email,
      code,
      type: 'confirmation',
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
    });

    // Get Resend API key from environment
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!resendApiKey) {
      console.log('⚠️ RESEND_API_KEY not configured, returning code for development');
      return new Response(
        JSON.stringify({
          ok: true,
          code,
          message: 'Development mode - check server logs for code',
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
          },
        }
      );
    }

    // Send email via Resend
    const emailSubject = '¡Bienvenido a Goveling! Confirma tu cuenta';

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
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 20px; 
            background-color: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header { 
            text-align: center; 
            margin-bottom: 30px; 
            padding: 20px 0;
            border-bottom: 1px solid #e5e7eb;
          }
          .logo { 
            color: #6366F1; 
            font-size: 28px; 
            font-weight: bold; 
            margin-bottom: 8px;
          }
          .tagline {
            color: #6b7280;
            font-size: 14px;
          }
          .welcome-section {
            text-align: center;
            margin-bottom: 30px;
          }
          .welcome-title {
            font-size: 24px;
            color: #1f2937;
            margin-bottom: 8px;
          }
          .user-name {
            color: #6366F1;
            font-weight: 600;
          }
          .code-box { 
            background: linear-gradient(135deg, #f3f4f6, #e5e7eb);
            border: 2px dashed #6366F1; 
            padding: 25px; 
            text-align: center; 
            margin: 25px 0; 
            border-radius: 12px;
          }
          .code-label {
            font-size: 14px;
            color: #6b7280;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .code { 
            font-size: 36px; 
            font-weight: bold; 
            color: #6366F1; 
            letter-spacing: 6px;
            font-family: 'Courier New', monospace;
          }
          .instructions {
            background-color: #f3f4f6;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
          }
          .instructions h3 {
            margin-top: 0;
            color: #374151;
          }
          .step {
            margin: 10px 0;
            padding-left: 20px;
            position: relative;
          }
          .step::before {
            content: "→";
            position: absolute;
            left: 0;
            color: #6366F1;
            font-weight: bold;
          }
          .warning {
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
            border-radius: 0 8px 8px 0;
          }
          .footer { 
            margin-top: 40px; 
            text-align: center; 
            color: #6b7280; 
            font-size: 14px;
            border-top: 1px solid #e5e7eb;
            padding-top: 20px;
          }
          .social-links {
            margin: 15px 0;
          }
          .social-links a {
            color: #6366F1;
            text-decoration: none;
            margin: 0 10px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🗺️ Goveling</div>
            <div class="tagline">Tu compañero de viaje inteligente</div>
          </div>
          
          <div class="welcome-section">
            <h1 class="welcome-title">
              ¡Bienvenido${fullName ? `, <span class="user-name">${fullName}</span>` : ''}!
            </h1>
            <p>Estás a solo un paso de comenzar tu aventura con Goveling.</p>
          </div>
          
          <div class="instructions">
            <h3>🔐 Confirma tu cuenta</h3>
            <p>Para activar tu cuenta y comenzar a planificar viajes increíbles, ingresa este código en la aplicación:</p>
          </div>
          
          <div class="code-box">
            <div class="code-label">Código de Verificación</div>
            <div class="code">${code}</div>
          </div>
          
          <div class="instructions">
            <h3>📱 Cómo usarlo:</h3>
            <div class="step">Abre la aplicación Goveling</div>
            <div class="step">Ve a la pantalla de verificación</div>
            <div class="step">Ingresa el código de 6 dígitos</div>
            <div class="step">¡Comienza a explorar!</div>
          </div>
          
          <div class="warning">
            <strong>⏰ Importante:</strong> Este código expira en <strong>10 minutos</strong> por razones de seguridad.
          </div>
          
          <p style="text-align: center; margin: 30px 0;">
            Si no creaste esta cuenta, puedes ignorar este correo de forma segura.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <p style="color: #6b7280; font-size: 16px;">
              ¿Listo para descubrir el mundo? 🌍✈️
            </p>
            <p style="color: #6366F1; font-weight: 600;">
              ¡Tu próxima aventura te espera!
            </p>
          </div>
          
          <div class="footer">
            <p>© 2025 Goveling. Todos los derechos reservados.</p>
            <div class="social-links">
              <a href="https://goveling.com">Web</a> |
              <a href="https://twitter.com/goveling">Twitter</a> |
              <a href="https://instagram.com/goveling">Instagram</a>
            </div>
            <p style="font-size: 12px; margin-top: 15px;">
              Este correo fue enviado porque creaste una cuenta en Goveling.<br>
              Si tienes problemas, contáctanos en soporte@goveling.com
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Goveling <bienvenida@team.goveling.com>',
        to: [email],
        subject: emailSubject,
        html: emailHtml,
      }),
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.text();
      throw new Error(`Resend API error: ${errorData}`);
    }

    const resendData = await resendResponse.json();

    return new Response(
      JSON.stringify({
        ok: true,
        message: 'Confirmation email sent successfully',
        emailId: resendData.id,
        code: resendApiKey ? undefined : code, // Solo devolver código en desarrollo
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      }
    );
  } catch (e) {
    console.error('Confirmation email error:', e);
    return new Response(
      JSON.stringify({
        ok: false,
        error: e.message,
      }),
      {
        status: 200, // Return 200 instead of 400 to avoid Edge Function errors
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      }
    );
  }
});
