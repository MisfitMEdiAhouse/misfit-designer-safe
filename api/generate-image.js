// Edge Function: AI Text-to-Image (OpenAI Images)
export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok:false, error:'Method not allowed' }), { status: 405 });
  }

  try {
    const { prompt = '', size = '1024x1024' } = await req.json();
    if (!prompt) {
      return new Response(JSON.stringify({ ok:false, error:'Missing prompt' }), { status: 400 });
    }

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ ok:false, error:'Missing OPENAI_API_KEY' }), { status: 500 });
    }

    // Call OpenAI Images API (returns URL by default)
    const resp = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt,
        size
      })
    });

    const data = await resp.json();
    if (!resp.ok) {
      const msg = data?.error?.message || data?.message || 'Image API error';
      return new Response(JSON.stringify({ ok:false, error: msg, data }), { status: 500 });
    }

    // Use the image URL returned
    const url = data?.data?.[0]?.url;
    if (!url) {
      return new Response(JSON.stringify({ ok:false, error:'No image returned' }), { status: 500 });
    }

    return new Response(JSON.stringify({ ok:true, url }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error: e.message || 'Unknown error' }), { status: 500 });
  }
}
