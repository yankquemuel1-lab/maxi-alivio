// Vercel Serverless Function — Meta Conversions API
// Recebe eventos do browser e reenvia para a Meta pelo servidor
// Isso bypassa bloqueadores de ads e restrições de browser (iOS/Safari)

const PIXEL_ID    = '26905366805730496';
const ACCESS_TOKEN = 'EAAVEopQ401EBQ1ZCrfWIosXcfPf9zfl74syBx5MaMpUtyLWwtlVOkMxWOsuWVwRA12rF45WAEhGY0EEPiitWkAYI4qA38gZA0eyc6qFtnNjAm8PYVQ0LZBPRo5ZCQeySJuBEAF053OGVs1XVpIpKe1P3yGVtOgkCRfohw7WlTNmEZAIIMciPZC36OES7IsccqZBtwZDZD';
const API_VERSION  = 'v19.0';
const META_URL     = `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events`;

export default async function handler(req, res) {
  // Allow CORS from the same site
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { event_name, event_source_url, client_ip_address, client_user_agent, fbc, fbp } = req.body;

    if (!event_name) {
      return res.status(400).json({ error: 'event_name is required' });
    }

    // Build the event payload for Meta
    const eventData = {
      event_name,
      event_time: Math.floor(Date.now() / 1000),
      event_source_url: event_source_url || 'https://maximumalivio.vercel.app',
      action_source: 'website',
      user_data: {
        client_ip_address: client_ip_address || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '',
        client_user_agent: client_user_agent || req.headers['user-agent'] || '',
        ...(fbc  && { fbc }),
        ...(fbp  && { fbp }),
      },
    };

    const body = {
      data: [eventData],
      test_event_code: process.env.META_TEST_EVENT_CODE || undefined,
    };

    const response = await fetch(`${META_URL}?access_token=${ACCESS_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Meta API error:', result);
      return res.status(502).json({ error: 'Meta API error', details: result });
    }

    return res.status(200).json({ success: true, events_received: result.events_received });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
