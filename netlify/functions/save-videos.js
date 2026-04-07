import { getStore } from '@netlify/blobs'

// ── SAVE VIDEOS ───────────────────────────────────────────────────────────────
// Password-protected function — only admin page can call this.
// Writes the video list to Netlify Blobs.
// Password checked against ADMIN_PASSWORD environment variable.

export default async (req, context) => {

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Password',
      },
    })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // Check password from request header
  const password    = req.headers.get('X-Admin-Password')
  const adminPass   = process.env.ADMIN_PASSWORD

  if (!adminPass || password !== adminPass) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const body   = await req.json()
    const videos = body.videos

    if (!Array.isArray(videos)) {
      return new Response(JSON.stringify({ error: 'Invalid data — expected array' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const store = getStore('videos')
    await store.setJSON('list', videos)

    return new Response(JSON.stringify({ ok: true, count: videos.length }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (err) {
    console.error('save-videos error:', err)
    return new Response(JSON.stringify({ error: 'Failed to save videos' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export const config = { path: '/.netlify/functions/save-videos' }
