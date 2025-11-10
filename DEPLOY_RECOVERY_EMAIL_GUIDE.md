# 🚀 GUÍA DE DEPLOY: Edge Function send-recovery-email

## 📋 Paso 1: Crear Tabla en Base de Datos

Copia y pega este SQL en el **SQL Editor** de Supabase:
👉 https://supabase.com/dashboard/project/iwsuyrlrbmnbfyfkqowl/sql/new

```sql
-- 1. Crear tabla recovery_codes
CREATE TABLE IF NOT EXISTS recovery_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  sent_to_email TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  is_used BOOLEAN DEFAULT false,
  used_at TIMESTAMPTZ,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Crear índices para performance
CREATE INDEX IF NOT EXISTS idx_recovery_codes_user_id ON recovery_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_recovery_codes_expires_at ON recovery_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_recovery_codes_is_used ON recovery_codes(is_used);

-- 3. Habilitar RLS
ALTER TABLE recovery_codes ENABLE ROW LEVEL SECURITY;

-- 4. Eliminar políticas antiguas si existen
DROP POLICY IF EXISTS "Users can view own active recovery codes" ON recovery_codes;
DROP POLICY IF EXISTS "Service role can manage recovery codes" ON recovery_codes;
DROP POLICY IF EXISTS "Users can insert own recovery codes" ON recovery_codes;
DROP POLICY IF EXISTS "Users can update own recovery codes" ON recovery_codes;

-- 5. Crear políticas de seguridad
CREATE POLICY "Users can view own active recovery codes"
  ON recovery_codes FOR SELECT
  USING (
    auth.uid() = user_id 
    AND is_used = false 
    AND expires_at > NOW()
  );

CREATE POLICY "Service role can manage recovery codes"
  ON recovery_codes FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can insert own recovery codes"
  ON recovery_codes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recovery codes"
  ON recovery_codes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 6. Verificar tabla creada
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'recovery_codes';

-- 7. Ver políticas creadas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'recovery_codes'
ORDER BY policyname;
```

✅ Ejecuta el SQL y verifica que se creó la tabla con sus políticas.

---

## 📧 Paso 2: Crear Edge Function en Dashboard

1. **Ve a Edge Functions**:
   👉 https://supabase.com/dashboard/project/iwsuyrlrbmnbfyfkqowl/functions

2. **Click en** "Create a new function"

3. **Configuración**:
   - Function name: `send-recovery-email`
   - ✅ Marcar "Verify JWT" como **disabled** (--no-verify-jwt)

4. **Código**: Copia el contenido completo del archivo:
   📄 `supabase/functions/send-recovery-email/index-standalone.ts`

   O copia directamente desde aquí: ⬇️

---

## 📝 CÓDIGO DEL EDGE FUNCTION (Copiar desde aquí)

```typescript
// ⚠️ VERSIÓN STANDALONE - Para copiar directamente en Supabase Dashboard
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, code, userId } = await req.json();

    console.log('📧 send-recovery-email called:', { email, userId, hasCode: !!code });

    if (!email || !code) {
      console.error('❌ Missing email or code');
      return new Response(
        JSON.stringify({ ok: false, error: 'Email and code are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    // MODO DESARROLLO: Si no hay RESEND_API_KEY, retornar código
    if (!resendApiKey) {
      console.log('⚠️ Development mode - Code:', code);
      return new Response(
        JSON.stringify({
          ok: true,
          code: code,
          message: 'Development mode - check logs',
          developmentMode: true,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // MODO PRODUCCIÓN: Enviar email via Resend
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
          .logo { color: #ffffff; font-size: 28px; font-weight: bold; margin-bottom: 8px; }
          .header-subtitle { color: rgba(255, 255, 255, 0.9); font-size: 14px; }
          .content { padding: 32px 20px; }
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
          .warning-box strong { color: #d97706; }
          .security-tips {
            background: #f3f4f6;
            border-radius: 8px;
            padding: 20px;
            margin-top: 24px;
          }
          .security-tips h3 { margin-top: 0; color: #374151; font-size: 16px; }
          .security-tips ul { margin: 12px 0; padding-left: 20px; }
          .security-tips li { margin: 8px 0; color: #6b7280; font-size: 14px; }
          .footer { 
            background: #f9fafb;
            padding: 24px 20px;
            text-align: center; 
            color: #6b7280; 
            font-size: 14px;
            border-top: 1px solid #e5e7eb;
          }
          .footer p { margin: 8px 0; }
          .icon { font-size: 48px; margin-bottom: 16px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🔐 Goveling</div>
            <div class="header-subtitle">Recuperación de PIN - Documentos de Viaje</div>
          </div>
          <div class="content">
            <div style="text-align: center;"><div class="icon">🗝️</div></div>
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
                <li><strong>No compartas este código</strong> con nadie.</li>
                <li>Si no solicitaste este código, <strong>ignora este correo</strong>.</li>
                <li>Asegúrate de estar en la app oficial de Goveling.</li>
                <li>Considera habilitar Face ID/Touch ID después.</li>
              </ul>
            </div>
            <p style="text-align: center; margin-top: 32px; color: #9ca3af; font-size: 14px;">
              ¿Problemas? Contacta a nuestro equipo de soporte.
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
    console.log(`✅ Email sent to ${email}`);

    return new Response(
      JSON.stringify({ ok: true, emailId: data.id, message: 'Email sent' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ ok: false, error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

---

## ✅ Paso 3: Verificar Deployment

1. **Click en "Deploy"** en el Dashboard
2. Espera a que se despliegue (aprox. 30 segundos)
3. **Verifica en logs** que no hay errores

---

## 🧪 Paso 4: Testing en Modo Desarrollo

Por ahora **NO configures RESEND_API_KEY**. Esto hará que funcione en modo desarrollo:

1. Ve a la app y haz click en "¿Olvidaste tu PIN?"
2. Confirma envío de código
3. **Revisa los logs** del Edge Function:
   👉 https://supabase.com/dashboard/project/iwsuyrlrbmnbfyfkqowl/functions/send-recovery-email/logs

4. Deberías ver:
   ```
   ⚠️ Development mode - Code: 123456
   ```

5. **El código también se retorna en la respuesta** del Edge Function, por lo que el app puede mostrarlo en desarrollo

---

## 🔑 Paso 5: Configurar Resend (Opcional - Para Producción)

Solo cuando quieras enviar emails reales:

1. **Obtén API Key de Resend**:
   👉 https://resend.com/api-keys

2. **Agrega variable de entorno**:
   👉 https://supabase.com/dashboard/project/iwsuyrlrbmnbfyfkqowl/settings/functions
   
   Variable name: `RESEND_API_KEY`
   Value: `re_xxxxxxxxxxxxxxxxx`

3. **Redeploy** el Edge Function para que tome la nueva variable

---

## 🎯 Resumen de URLs Importantes

| Recurso | URL |
|---------|-----|
| SQL Editor | https://supabase.com/dashboard/project/iwsuyrlrbmnbfyfkqowl/sql/new |
| Edge Functions | https://supabase.com/dashboard/project/iwsuyrlrbmnbfyfkqowl/functions |
| Function Logs | https://supabase.com/dashboard/project/iwsuyrlrbmnbfyfkqowl/functions/send-recovery-email/logs |
| Environment Variables | https://supabase.com/dashboard/project/iwsuyrlrbmnbfyfkqowl/settings/functions |
| Resend Dashboard | https://resend.com/api-keys |

---

## 🐛 Troubleshooting

### Error: "non-2xx status code"
- ✅ Verifica que el Edge Function esté desplegado
- ✅ Revisa los logs del Edge Function
- ✅ Confirma que la tabla `recovery_codes` existe

### El código no llega
- ✅ En desarrollo: Revisa los logs del Edge Function
- ✅ En producción: Verifica RESEND_API_KEY configurado
- ✅ Verifica dominio de email verificado en Resend

### Error de CORS
- ✅ Verifica que el Edge Function incluya corsHeaders
- ✅ Redeploy el Edge Function

---

## 📱 Testing desde Expo Go

1. Recarga la app (Cmd+R)
2. Ve a: Perfil → Documentos de Viaje
3. Click en "¿Olvidaste tu PIN?"
4. Click en "Enviar Código"
5. **Revisa logs del Edge Function** para ver el código
6. **O usa el código que aparece en la respuesta** si estás en modo desarrollo

---

¡Listo! Sigue estos pasos y el sistema de recuperación de PIN estará funcionando. 🎉
