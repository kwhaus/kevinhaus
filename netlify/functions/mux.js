import { timingSafeEqual } from 'crypto'

// ── MUX (admin only) ──────────────────────────────────────────────────────────
// Server-side bridge to the Mux API for the admin Deliver tab. The Mux token
// lives only in Netlify env vars and never reaches the browser.
//
//   GET  ?action=list            → every asset, newest first (trimmed fields)
//   GET  ?action=asset&id=ASSET  → one asset (used to poll MP4 status)
//   POST ?action=mp4  {assetId}  → create the "highest" MP4 static rendition
//
// Env vars (Netlify → Site configuration → Environment variables):
//   ADMIN_PASSWORD    same password as the rest of /admin
//   MUX_TOKEN_ID      Mux access token ID      (Mux Video: Read + Write)
//   MUX_TOKEN_SECRET  Mux access token secret

const MUX = 'https://api.mux.com/video/v1'

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })

function passwordOk(supplied, expected) {
  if (!expected) return false
  const a = Buffer.from(supplied || '')
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

async function mux(path, init = {}) {
  const id = process.env.MUX_TOKEN_ID
  const secret = process.env.MUX_TOKEN_SECRET
  if (!id || !secret) {
    const err = new Error('MUX_TOKEN_ID / MUX_TOKEN_SECRET are not set in Netlify.')
    err.status = 500
    throw err
  }
  const res = await fetch(MUX + path, {
    ...init,
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64'),
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = body?.error?.messages?.join(' ') || body?.error?.type || `Mux responded ${res.status}`
    const err = new Error(res.status === 401 ? 'Mux rejected the token (check MUX_TOKEN_ID / MUX_TOKEN_SECRET).' : msg)
    err.status = res.status === 401 ? 502 : res.status
    throw err
  }
  return body.data
}

// Only what the Deliver tab needs — keeps responses small.
function trim(a) {
  const video = (a.tracks || []).find(t => t.type === 'video') || {}
  const files = a.static_renditions?.files || []
  return {
    id: a.id,
    title: a.meta?.title || '',
    status: a.status,
    createdAt: Number(a.created_at) * 1000 || null,
    duration: a.duration || 0,
    width: video.max_width || null,
    height: video.max_height || null,
    frameRate: video.max_frame_rate || null,
    aspectRatio: a.aspect_ratio || '',
    publicPlaybackId: (a.playback_ids || []).find(p => p.policy === 'public')?.id || null,
    hasSignedOnly: (a.playback_ids || []).length > 0 && !(a.playback_ids || []).some(p => p.policy === 'public'),
    mp4: files
      .filter(f => f.ext === 'mp4')
      .map(f => ({
        name: f.name,
        status: f.status,
        resolution: f.resolution,
        width: f.width || null,
        height: f.height || null,
        bytes: Number(f.filesize) || null,
      })),
  }
}

export default async (req) => {
  if (!passwordOk(req.headers.get('X-Admin-Password'), process.env.ADMIN_PASSWORD)) {
    return json({ error: 'Unauthorized' }, 401)
  }

  const url = new URL(req.url)
  const action = url.searchParams.get('action')

  try {
    if (req.method === 'GET' && action === 'list') {
      const all = []
      for (let page = 1; page <= 10; page++) {
        const data = await mux(`/assets?limit=100&page=${page}`)
        all.push(...data)
        if (data.length < 100) break
      }
      const assets = all
        .filter(a => a.status !== 'errored')
        .map(trim)
        .sort((x, y) => (y.createdAt || 0) - (x.createdAt || 0))
      return json({ assets })
    }

    if (req.method === 'GET' && action === 'asset') {
      const id = url.searchParams.get('id')
      if (!id || !/^[A-Za-z0-9]+$/.test(id)) return json({ error: 'Bad asset id' }, 400)
      return json({ asset: trim(await mux(`/assets/${id}`)) })
    }

    if (req.method === 'POST' && action === 'mp4') {
      const { assetId } = await req.json().catch(() => ({}))
      if (!assetId || !/^[A-Za-z0-9]+$/.test(assetId)) return json({ error: 'Bad asset id' }, 400)

      // Don't create a duplicate if the MP4 already exists or is on its way.
      const current = trim(await mux(`/assets/${assetId}`))
      const existing = current.mp4.find(f => f.name === 'highest.mp4' && f.status !== 'errored')
      if (existing) return json({ asset: current, created: false })

      await mux(`/assets/${assetId}/static-renditions`, {
        method: 'POST',
        body: JSON.stringify({ resolution: 'highest' }),
      })
      return json({ asset: trim(await mux(`/assets/${assetId}`)), created: true })
    }

    return json({ error: 'Unknown action' }, 400)
  } catch (err) {
    console.error('mux function error:', err)
    return json({ error: err.message || 'Mux request failed' }, err.status && err.status >= 400 ? err.status : 500)
  }
}

export const config = { path: '/.netlify/functions/mux' }
