import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

serve(async (req) => {
  try {
    const { email, role, inviterName, tripName, inviteLink } = await req.json();

    if (!email) {
      throw new Error('Email is required');
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.log('⚠️ RESEND_API_KEY not configured, skipping actual send.');
      return new Response(JSON.stringify({ ok: true, skipped: true }), { headers: { 'Content-Type': 'application/json' } });
    }

    const subject = `Invitación a colaborar${tripName ? ` en "${tripName}"` : ''}`;
    const html = `
      <!doctype html>
      <html><head><meta charset="utf-8"><title>${subject}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color:#111827; }
        .box { max-width:600px;margin:0 auto;padding:24px; }
        .cta { display:inline-block;background:#3B82F6;color:#fff;padding:12px 16px;border-radius:8px;text-decoration:none;font-weight:700 }
        .pill{ display:inline-block;background:#E5E7EB;color:#111827;padding:4px 8px;border-radius:9999px;font-weight:600 }
      </style></head>
      <body><div class="box">
        <h2>Has sido invitado a colaborar en Goveling</h2>
        <p>${inviterName ? `${inviterName} te invitó` : 'Te invitaron'} a colaborar${tripName ? ` en <strong>${tripName}</strong>` : ''}.</p>
        <p>Rol sugerido: <span class="pill">${role || 'viewer'}</span></p>
        ${inviteLink ? `<p><a class="cta" href="${inviteLink}">Aceptar invitación</a></p>` : ''}
        <p>Si no esperabas este correo, puedes ignorarlo.</p>
        <p style="color:#6B7280">© ${new Date().getFullYear()} Goveling</p>
      </div></body></html>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Goveling <noreply@team.goveling.com>',
        to: [email],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Resend error: ${txt}`);
    }
    const data = await res.json();
    return new Response(JSON.stringify({ ok: true, emailId: data.id }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('send-invite-email error', e);
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
});
