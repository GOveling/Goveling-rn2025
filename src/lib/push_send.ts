import { supabase } from './supabase';

export async function sendPush(
  user_ids: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>
) {
  try {
    // Get the current session to include authorization
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const fn = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/push_send`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add authorization header if we have a session
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    console.log('🔔 sendPush: Calling function with auth:', {
      hasSession: !!session,
      hasAccessToken: !!session?.access_token,
      user_ids_count: user_ids.length,
      title,
    });

    const res = await fetch(fn, {
      method: 'POST',
      headers,
      body: JSON.stringify({ user_ids, title, body, data }),
    });

    const result = await res.json();
    console.log('🔔 sendPush: Response:', { status: res.status, result });

    return result;
  } catch (error) {
    console.error('❌ sendPush: Error:', error);
    return { error: error.message };
  }
}
