import { getStore } from '@netlify/blobs'

// ── SAVE REEL ─────────────────────────────────────────────────────────────────
// Password-protected. Saves a reel config to Netlify Blobs.
// Also handles listing all reels (GET) and deleting a reel (DELETE).

export default async (req, context) => {

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Password',
      },
    })
  }

  // Auth check for all methods except GET
  if (req.method !== 'GET') {
    const password  = req.headers.get('X-Admin-Password')
    const adminPass = process.env.ADMIN_PASSWORD
    if (!adminPass || password !== adminPass) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  const store = getStore('reels')
  const url   = new URL(req.url)

  try {
    // ── GET — list all reels ────────────────────────────────────────────────
    if (req.method === 'GET') {
      const { blobs } = await store.list()
      const reels = await Promise.all(
        blobs.map(async blob => {
          const data = await store.get(blob.key, { type: 'json' })
          return { id: blob.key, ...data }
        })
      )
      return new Response(JSON.stringify(reels), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    // ── POST — save a reel ──────────────────────────────────────────────────
    if (req.method === 'POST') {
      const body = await req.json()
      const { id, clientName, videos } = body

      if (!id || !videos || !Array.isArray(videos)) {
        return new Response(JSON.stringify({ error: 'Invalid reel data' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      // Clean ID — lowercase, hyphens only
      const cleanId = id.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-')

      await store.setJSON(cleanId, {
        id: cleanId,
        clientName: clientName || cleanId,
        videos,
        createdAt: body.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      return new Response(JSON.stringify({ ok: true, id: cleanId }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    // ── DELETE — remove a reel ──────────────────────────────────────────────
    if (req.method === 'DELETE') {
      const reelId = url.searchParams.get('id')
      if (!reelId) {
        return new Response(JSON.stringify({ error: 'Missing ID' }), { status: 400 })
      }
      await store.delete(reelId)
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    return new Response('Method not allowed', { status: 405 })

  } catch (err) {
    console.error('save-reel error:', err)
    return new Response(JSON.stringify({ error: 'Operation failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export const config = { path: '/.netlify/functions/save-reel' }
