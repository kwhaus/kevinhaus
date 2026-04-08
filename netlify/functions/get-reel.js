import { getStore } from '@netlify/blobs'

// ── GET REEL ──────────────────────────────────────────────────────────────────
// Returns a single reel config by ID.
// Called by the client-facing reel page.

export default async (req, context) => {
  const url    = new URL(req.url)
  const reelId = url.searchParams.get('id')

  if (!reelId) {
    return new Response(JSON.stringify({ error: 'Missing reel ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const store = getStore('reels')
    const reel  = await store.get(reelId, { type: 'json' })

    if (!reel) {
      return new Response(JSON.stringify({ error: 'Reel not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify(reel), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (err) {
    console.error('get-reel error:', err)
    return new Response(JSON.stringify({ error: 'Failed to load reel' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export const config = { path: '/.netlify/functions/get-reel' }
