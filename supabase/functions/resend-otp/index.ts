import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
  
  try {
    const { email, type = 'confirmation' } = await req.json();
    
    if (!email) {
      throw new Error('Email is required');
    }

    // Generate OTP code
    const code = (Math.floor(Math.random() * 900000) + 100000).toString();
    
    // Store OTP in database
    await supabase.from('email_otps').insert({ 
      email, 
      code,
      type,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
    });

    // Get Resend API key from environment
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    if (!resendApiKey) {
      console.log('⚠️ RESEND_API_KEY not configured, returning code for development');
      return new Response(JSON.stringify({ 
        ok: true, 
        code,
        message: 'Development mode - check server logs for code'
      }), { 
        headers: { "Content-Type": "application/json" } 
      });
    }

    // Send email via Resend
    const emailSubject = type === 'confirmation' 
      ? 'Confirma tu cuenta en Goveling' 
      : 'Código de verificación - Goveling';
      
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${emailSubject}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { color: #6366F1; font-size: 24px; font-weight: bold; }
          .code-box { background: #F3F4F6; border: 2px dashed #6366F1; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
          .code { font-size: 32px; font-weight: bold; color: #6366F1; letter-spacing: 4px; }
          .footer { margin-top: 30px; text-align: center; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🗺️ Goveling</div>
          </div>
          
          <h2>¡Hola!</h2>
          
          ${type === 'confirmation' 
            ? '<p>Gracias por crear tu cuenta en Goveling. Para completar tu registro, usa el siguiente código de verificación:</p>'
            : '<p>Usa el siguiente código de verificación para continuar:</p>'
          }
          
          <div class="code-box">
            <div class="code">${code}</div>
          </div>
          
          <p><strong>Este código expira en 10 minutos.</strong></p>
          
          <p>Si no solicitaste este código, puedes ignorar este correo de forma segura.</p>
          
          <div class="footer">
            <p>© 2025 Goveling. Todos los derechos reservados.</p>
            <p>¡Prepárate para explorar el mundo! 🌍</p>
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
        from: 'Goveling <noreply@team.goveling.com>',
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
      message: 'Email sent successfully',
      emailId: resendData.id 
    }), { 
      headers: { "Content-Type": "application/json" } 
    });

  } catch (e) {
    console.error('Email sending error:', e);
    return new Response(JSON.stringify({ 
      ok: false, 
      error: e.message 
    }), { 
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
});
