import { getStore } from '@netlify/blobs'

// ── GET VIDEOS ────────────────────────────────────────────────────────────────
// Public (this data is already on the public site). Returns the catalogue the
// admin last saved, or [] if it has never been saved — in which case the admin
// starts from the bundled src/videos.json.

export default async () => {
  try {
    const store = getStore('videos')
    const catalog = await store.get('catalog', { type: 'json' })
    const videos = catalog && Array.isArray(catalog.videos) ? catalog.videos : []

    return new Response(JSON.stringify(videos), {
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
