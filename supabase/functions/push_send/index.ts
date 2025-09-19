import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const FCM_KEY = Deno.env.get('FCM_SERVER_KEY')!;

async function json(d:any, s=200){ return new Response(JSON.stringify(d), { status:s, headers:{ "Content-Type":"application/json" }}); }

serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try{
    const { user_ids, title, body, data } = await req.json();
    if (!Array.isArray(user_ids) || !title || !body) return json({ error: 'Missing fields' }, 400);

    // Insert inbox rows (mirror)
    const rows = user_ids.map(uid => ({ user_id: uid, title, body, data: data||null }));
    await supabase.from('notifications_inbox').insert(rows);

    // Get device tokens
    const { data: tokens } = await supabase.from('device_tokens').select('token').in('user_id', user_ids);
    const tokenList = (tokens||[]).map((t:any)=>t.token).filter(Boolean);
    if (!tokenList.length) return json({ ok:true, sent:0 });

    const payload = {
      registration_ids: tokenList,
      notification: { title, body },
      data: data || {}
    };

    const r = await fetch('https://fcm.googleapis.com/fcm/send', {
      method:'POST',
      headers: { 'Content-Type':'application/json', 'Authorization': `key=${FCM_KEY}` },
      body: JSON.stringify(payload)
    });

    const jr = await r.json();
    return json({ ok:true, fcm: jr });
  }catch(e){
    return json({ error: String(e) }, 500);
  }
});
