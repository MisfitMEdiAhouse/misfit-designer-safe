// Edge Function for sending proofs via Resend
export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok:false, error:'Method not allowed' }), { status: 405 });
  }

  try {
    const body = await req.json();
    const { toEmail = '', shopEmail = '', attachments = [], meta = {} } = body || {};

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ ok:false, error:'Missing RESEND_API_KEY' }), { status: 500 });
    }

    // After you verify the domain in Resend, this will work:
    // Resend → Domains: add misfitmediahouse.com and verify SPF + DKIM in GoDaddy
    const fromAddress = 'Misfit Print <orders@misfitmediahouse.com>';

    const recipients = [];
    if (shopEmail) recipients.push(shopEmail);
    if (toEmail) recipients.push(toEmail);
    if (recipients.length === 0) {
      return new Response(JSON.stringify({ ok:false, error:'No destination email provided.' }), { status: 400 });
    }

    const subject = `Misfit Proof — ${new Date().toISOString()}`;
    const mailPayload = {
      from: fromAddress,
      to: recipients,
      subject,
      html: `<div style="font-family:Inter,Arial,sans-serif">
        <h2>Misfit Designer — Proof</h2>
        <p>Metadata:</p>
        <pre>${JSON.stringify(meta, null, 2)}</pre>
        <p>Attachments included (PNG + SVG).</p>
      </div>`,
      attachments: (attachments || []).map(a => ({
        filename: a.filename,
        content: a.content,
        content_type: a.contentType || 'application/octet-stream'
      }))
    };

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(mailPayload)
    });

    const data = await resp.json();
    if (!resp.ok) {
      const msg = data?.message || 'Resend error';
      return new Response(JSON.stringify({ ok:false, error: msg, data }), { status: 500 });
    }

    return new Response(JSON.stringify({ ok:true, id: data?.id || null }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error: e.message || 'Unknown error' }), { status: 500 });
  }
}
