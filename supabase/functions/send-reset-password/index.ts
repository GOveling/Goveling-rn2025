import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
  const supabaseServiceRole = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  
  try {
    const { email } = await req.json();
    
    if (!email) {
      throw new Error('Email is required');
    }

    console.log('🔍 Checking password reset request for:', email);

    // Check if user exists
    const { data: users, error: listError } = await supabaseServiceRole.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Error checking users:', listError);
      throw new Error('Error verificando usuario');
    }

    const existingUser = users.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (!existingUser) {
      console.log('👤 User does not exist:', email);
      // Return success response for security (don't reveal if email exists)
      return new Response(JSON.stringify({ 
        ok: true, 
        message: 'Si el email está registrado, recibirás un enlace de restablecimiento.'
      }), { 
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
        }
      });
    }

    console.log('✅ User exists, generating reset code');

    // Generate reset code
    const resetCode = (Math.floor(Math.random() * 900000) + 100000).toString();
    
    // Store reset code in database (expires in 30 minutes)
    await supabase.from('email_otps').insert({ 
      email, 
      code: resetCode,
      type: 'password_reset',
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes
    });

    // Get Resend API key from environment
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    if (!resendApiKey) {
      console.log('⚠️ RESEND_API_KEY not configured, returning code for development');
      return new Response(JSON.stringify({ 
        ok: true, 
        code: resetCode,
        message: 'Development mode - check server logs for reset code'
      }), { 
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
        } 
      });
    }

    // Send password reset email via Resend
    const emailSubject = '🔐 Restablece tu contraseña de Goveling';
      
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
            margin: 0;
          }
          .reset-section {
            text-align: center;
            margin: 30px 0;
          }
          .reset-title {
            color: #1f2937;
            font-size: 24px;
            font-weight: 600;
            margin: 0 0 15px 0;
          }
          .instructions {
            background-color: #f3f4f6;
            padding: 20px;
            border-radius: 8px;
            margin: 25px 0;
            border-left: 4px solid #6366F1;
          }
          .instructions h3 {
            color: #374151;
            margin: 0 0 10px 0;
            font-size: 16px;
          }
          .instructions p {
            margin: 0;
            color: #6b7280;
          }
          .code-box {
            background: linear-gradient(135deg, #6366F1, #8B5CF6);
            color: white;
            padding: 25px;
            border-radius: 12px;
            text-align: center;
            margin: 25px 0;
            box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
          }
          .code-label {
            font-size: 14px;
            opacity: 0.9;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .code {
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 8px;
            font-family: 'Courier New', monospace;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
          }
          .step {
            background-color: #fff;
            padding: 12px 16px;
            margin: 8px 0;
            border-radius: 6px;
            border-left: 3px solid #6366F1;
            font-weight: 500;
          }
          .warning {
            background-color: #fef3c7;
            border: 1px solid #f59e0b;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
            text-align: center;
          }
          .security-note {
            background-color: #fee2e2;
            border: 1px solid #ef4444;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
            text-align: center;
          }
          .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 14px;
          }
          .social-links a {
            color: #6366F1;
            text-decoration: none;
            margin: 0 5px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🗺️ Goveling</div>
            <div class="tagline">Tu compañero de viaje inteligente</div>
          </div>
          
          <div class="reset-section">
            <h1 class="reset-title">
              🔐 Restablece tu contraseña
            </h1>
            <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
          </div>
          
          <div class="instructions">
            <h3>🔑 Código de Restablecimiento</h3>
            <p>Usa este código de seguridad para crear una nueva contraseña en la aplicación:</p>
          </div>
          
          <div class="code-box">
            <div class="code-label">Código de Verificación</div>
            <div class="code">${resetCode}</div>
          </div>
          
          <div class="instructions">
            <h3>📱 Cómo usar el código:</h3>
            <div class="step">Abre la aplicación Goveling</div>
            <div class="step">Ve a la pantalla de restablecimiento</div>
            <div class="step">Ingresa el código de 6 dígitos</div>
            <div class="step">Crea tu nueva contraseña</div>
          </div>
          
          <div class="warning">
            <strong>⏰ Importante:</strong> Este código expira en <strong>30 minutos</strong> por razones de seguridad.
          </div>

          <div class="security-note">
            <strong>🛡️ Seguridad:</strong> Si no solicitaste este restablecimiento, ignora este correo. Tu cuenta permanecerá segura.
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <p style="color: #6b7280; font-size: 16px;">
              ¿Listo para volver a explorar? 🌍✈️
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
              Este correo fue enviado porque solicitaste restablecer tu contraseña.<br>
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
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Goveling Security <seguridad@team.goveling.com>',
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
    
    return new Response(JSON.stringify({ 
      ok: true, 
      message: 'Si el email está registrado, recibirás un código de restablecimiento.',
      emailId: resendData.id,
      code: resendApiKey ? undefined : resetCode // Solo devolver código en desarrollo
    }), { 
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
      } 
    });

  } catch (e) {
    console.error('Password reset error:', e);
    return new Response(JSON.stringify({ 
      ok: false, 
      error: e.message 
    }), { 
      status: 200, // Return 200 to avoid Edge Function errors
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
      }
    });
  }
});
