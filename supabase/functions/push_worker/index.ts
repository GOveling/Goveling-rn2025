import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const FCM_SERVER_KEY = Deno.env.get('FCM_SERVER_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function sendFCM(token: string, title: string, body?: string, data?: any) {
  const res = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `key=${FCM_SERVER_KEY}`,
    },
    body: JSON.stringify({
      to: token,
      notification: { title, body },
      data: data || {},
      priority: 'high',
    }),
  });
  return await res.json();
}

serve(async (_req) => {
  // Fetch small batch
  const { data: queue, error } = await supabase
    .from('push_queue')
    .select('*')
    .is('sent_at', null)
    .order('created_at', { ascending: true })
    .limit(50);
  if (error)
    return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500 });

  for (const q of queue || []) {
    // tokens for user
    const { data: tokens } = await supabase
      .from('device_tokens')
      .select('*')
      .eq('user_id', q.user_id);
    if (tokens && tokens.length) {
      for (const t of tokens) {
        try {
          await sendFCM(t.token, q.title, q.body || undefined, q.data || undefined);
        } catch (_e) {}
      }
    }
    await supabase.from('push_queue').update({ sent_at: new Date().toISOString() }).eq('id', q.id);
  }

  return new Response(JSON.stringify({ ok: true, processed: (queue || []).length }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
