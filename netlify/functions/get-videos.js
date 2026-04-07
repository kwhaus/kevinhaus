import { getStore } from '@netlify/blobs'

// ── GET VIDEOS ────────────────────────────────────────────────────────────────
// Public function — no auth required.
// Returns the video list from Netlify Blobs.
// On first run (nothing in Blobs yet), returns empty array.
// The admin save-videos function populates Blobs on first save.

export default async (req, context) => {
  try {
    const store = getStore('videos')
    const data  = await store.get('list', { type: 'json' })

    return new Response(JSON.stringify(data || []), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (err) {
    console.error('get-videos error:', err)
    return new Response(JSON.stringify({ error: 'Failed to load videos' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export const config = { path: '/.netlify/functions/get-videos' }
