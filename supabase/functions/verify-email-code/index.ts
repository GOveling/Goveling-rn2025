import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supabaseServiceRole = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  
  try {
    const { email, code } = await req.json();
    
    if (!email || !code) {
      throw new Error('Email and code are required');
    }

    // Find valid OTP
    const { data: otpRecord, error: otpError } = await supabaseServiceRole
      .from('email_otps')
      .select('*')
      .eq('email', email)
      .eq('code', code)
      .eq('type', 'confirmation')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (otpError || !otpRecord) {
      return new Response(JSON.stringify({ 
        ok: false, 
        error: 'Invalid or expired verification code'
      }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Create user with confirmed email
    const { data: authData, error: authError } = await supabaseServiceRole.auth.admin.createUser({
      email,
      email_confirm: true, // This confirms the email automatically
      user_metadata: {
        email_verified: true,
        verified_at: new Date().toISOString()
      }
    });

    if (authError) {
      throw new Error(`Failed to create user: ${authError.message}`);
    }

    // Delete used OTP
    await supabaseServiceRole
      .from('email_otps')
      .delete()
      .eq('id', otpRecord.id);

    // Clean up expired OTPs for this email
    await supabaseServiceRole
      .from('email_otps')
      .delete()
      .eq('email', email)
      .lt('expires_at', new Date().toISOString());

    return new Response(JSON.stringify({ 
      ok: true, 
      message: 'Email verified successfully',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        email_confirmed_at: authData.user.email_confirmed_at
      }
    }), { 
      headers: { "Content-Type": "application/json" } 
    });

  } catch (e) {
    console.error('Email verification error:', e);
    return new Response(JSON.stringify({ 
      ok: false, 
      error: e.message 
    }), { 
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
});
