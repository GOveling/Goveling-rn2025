import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  // Add CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseServiceRole = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  
  try {
    const { email, code, password, fullName } = await req.json();
    
    console.log('🔍 Starting email verification process for:', email);
    
    if (!email || !code) {
      console.error('❌ Missing required fields:', { email: !!email, code: !!code });
      throw new Error('Email and code are required');
    }

    console.log('🔍 Searching for OTP record...');

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

    if (otpError) {
      console.error('❌ OTP query error:', otpError);
      return new Response(JSON.stringify({ 
        ok: false, 
        error: 'Invalid or expired verification code',
        details: 'OTP not found or expired'
      }), { 
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    if (!otpRecord) {
      console.error('❌ No OTP record found');
      return new Response(JSON.stringify({ 
        ok: false, 
        error: 'Invalid or expired verification code',
        details: 'No matching OTP record'
      }), { 
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    console.log('✅ OTP validated successfully for email:', email);

    // Create user directly with password
    console.log('🆕 Creating user with email confirmation...');
    
    const { data: authData, error: authError } = await supabaseServiceRole.auth.admin.createUser({
      email,
      password: password || `temp_${Math.random().toString(36).slice(-8)}`, 
      email_confirm: true, // This confirms the email automatically
      user_metadata: {
        email_verified: true,
        verified_at: new Date().toISOString(),
        full_name: fullName || 'User'
      }
    });

    if (authError) {
      console.error('❌ User creation error:', authError);
      
      // If user already exists, that's ok - just return success
      if (authError.message?.includes('already been registered')) {
        console.log('👤 User already exists, proceeding...');
        
        // Find the existing user
        const { data: users } = await supabaseServiceRole.auth.admin.listUsers();
        const existingUser = users.users.find(u => u.email === email);
        
        if (existingUser) {
          // Update user to confirm email
          await supabaseServiceRole.auth.admin.updateUserById(existingUser.id, {
            email_confirm: true
          });
          
          console.log('✅ Updated existing user email confirmation');
        }
      } else {
        throw new Error(`Failed to create user: ${authError.message}`);
      }
    } else {
      console.log('✅ User created successfully:', authData.user.email);
    }

    console.log('🧹 Cleaning up OTP records...');

    // Delete used OTP
    const { error: deleteError } = await supabaseServiceRole
      .from('email_otps')
      .delete()
      .eq('id', otpRecord.id);

    if (deleteError) {
      console.error('⚠️ Failed to delete OTP record:', deleteError);
    }

    // Clean up expired OTPs for this email
    await supabaseServiceRole
      .from('email_otps')
      .delete()
      .eq('email', email)
      .lt('expires_at', new Date().toISOString());

    console.log('✅ Email verification completed successfully for:', email);

    return new Response(JSON.stringify({ 
      ok: true, 
      message: 'Email verified successfully',
      user: {
        email: email,
        verified: true
      }
    }), { 
      headers: { "Content-Type": "application/json", ...corsHeaders } 
    });

  } catch (e) {
    console.error('💥 Email verification error:', e);
    return new Response(JSON.stringify({ 
      ok: false, 
      error: e.message,
      details: 'Internal server error during verification'
    }), { 
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
});
