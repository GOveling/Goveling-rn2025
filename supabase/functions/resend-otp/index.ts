import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
  try{
    const { email } = await req.json();
    const code = (Math.floor(Math.random()*900000)+100000).toString();
    await supabase.from('email_otps').insert({ email, code });
    // In a real deployment you would call Resend here; for now we return the code for testing in dev logs.
    return new Response(JSON.stringify({ ok:true, code }), { headers: { "Content-Type": "application/json" } });
  }catch(e){
    return new Response(JSON.stringify({ ok:false, error: e.message }), { status: 400 });
  }
});
