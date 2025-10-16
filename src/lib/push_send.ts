export async function sendPush(
  user_ids: string[],
  title: string,
  body: string,
  data?: Record<string, any>
) {
  const fn = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/push_send`;
  const res = await fetch(fn, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_ids, title, body, data }),
  });
  try {
    return await res.json();
  } catch {
    return null;
  }
}
