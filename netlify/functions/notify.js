// ── NOTIFY ────────────────────────────────────────────────────────────────────
// Called when a client opens a reel URL.
// Sends an email to hello@kevinhaus.com via Resend.
// Only sends email on FIRST view per unique session.
// Expects POST body: { reelId, clientName, timestamp }

import { getStore } from '@netlify/blobs'

export default async (req, context) => {

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const { reelId, clientName, timestamp } = await req.json()

    // Generate a session fingerprint from IP and User-Agent
    const ip = req.headers.get('x-forwarded-for') || 
               req.headers.get('x-real-ip') || 
               'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'
    const sessionId = `${ip}_${userAgent.substring(0, 50)}` // Truncate UA to avoid huge keys
    const viewKey = `view_${reelId}_${sessionId}`

    // Check if this session has already viewed this reel
    const viewsStore = getStore('reel-views')
    const alreadyViewed = await viewsStore.get(viewKey)

    if (alreadyViewed) {
      // Session already viewed this reel, don't send email
      return new Response(JSON.stringify({ ok: true, alreadyNotified: true }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    // Mark this session as having viewed this reel
    // Store view with 30-day expiration
    await viewsStore.setJSON(viewKey, {
      reelId,
      clientName,
      timestamp,
      ip,
    }, {
      metadata: { expires: Date.now() + (30 * 24 * 60 * 60 * 1000) }
    })

    // Send email notification for first-time view
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Resend API key not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const viewTime = timestamp
      ? new Date(timestamp).toLocaleString('en-US', {
          timeZone: 'America/New_York',
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      : 'Unknown time'

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: 'Kevin Haus <hello@kevinhaus.com>',
        to: 'hello@kevinhaus.com',
        subject: `Reel viewed: ${clientName || reelId}`,
        html: `
          <p style="font-family: sans-serif; font-size: 16px;">
            Your reel was viewed for the first time by this viewer.
          </p>
          <table style="font-family: sans-serif; font-size: 14px; border-collapse: collapse;">
            <tr>
              <td style="padding: 4px 12px 4px 0; color: #666;">Client</td>
              <td style="padding: 4px 0;"><strong>${clientName || '—'}</strong></td>
            </tr>
            <tr>
              <td style="padding: 4px 12px 4px 0; color: #666;">Reel ID</td>
              <td style="padding: 4px 0;">${reelId}</td>
            </tr>
            <tr>
              <td style="padding: 4px 12px 4px 0; color: #666;">Time</td>
              <td style="padding: 4px 0;">${viewTime} ET</td>
            </tr>
            <tr>
              <td style="padding: 4px 12px 4px 0; color: #666;">URL</td>
              <td style="padding: 4px 0;">
                <a href="https://kevinhaus.com/reel.html?id=${reelId}">
                  kevinhaus.com/reel.html?id=${reelId}
                </a>
              </td>
            </tr>
          </table>
          <p style="font-family: sans-serif; font-size: 12px; color: #999; margin-top: 16px;">
            Note: You'll only receive one email per unique viewer for this reel.
          </p>
        `,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('Resend error:', err)
      return new Response(JSON.stringify({ error: 'Email failed to send' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ ok: true, notified: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (err) {
    console.error('notify error:', err)
    return new Response(JSON.stringify({ error: 'Notification failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export const config = { path: '/.netlify/functions/notify' }
