import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!);
  const supabaseServiceRole = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const { email, code, newPassword } = await req.json();

    if (!email || !code || !newPassword) {
      throw new Error('Email, código y nueva contraseña son requeridos');
    }

    console.log('🔍 Verifying password reset code for:', email);

    // Verify reset code
    const { data: otpData, error: otpError } = await supabase
      .from('email_otps')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('code', code)
      .eq('type', 'password_reset')
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (otpError || !otpData) {
      console.log('❌ Invalid or expired reset code:', email);
      throw new Error('Código de restablecimiento inválido o expirado');
    }

    console.log('✅ Valid reset code, updating password');

    // Find user by email
    const { data: users, error: listError } = await supabaseServiceRole.auth.admin.listUsers();

    if (listError) {
      console.error('❌ Error listing users:', listError);
      throw new Error('Error verificando usuario');
    }

    const user = users.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

    if (!user) {
      console.log('❌ User not found:', email);
      throw new Error('Usuario no encontrado');
    }

    // Update user password using Service Role
    const { error: updateError } = await supabaseServiceRole.auth.admin.updateUserById(user.id, {
      password: newPassword,
    });

    if (updateError) {
      console.error('❌ Error updating password:', updateError);
      throw new Error('Error al actualizar la contraseña');
    }

    // Delete used reset code
    await supabase
      .from('email_otps')
      .delete()
      .eq('email', email.toLowerCase())
      .eq('code', code)
      .eq('type', 'password_reset');

    console.log('✅ Password updated successfully for:', email);

    return new Response(
      JSON.stringify({
        ok: true,
        message: 'Contraseña actualizada exitosamente',
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
    console.error('Reset password verification error:', e);
    return new Response(
      JSON.stringify({
        ok: false,
        error: e.message,
      }),
      {
        status: 200, // Return 200 to avoid Edge Function errors
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      }
    );
  }
});
