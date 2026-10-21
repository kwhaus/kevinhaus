import { getStore } from '@netlify/blobs'
import { timingSafeEqual } from 'crypto'

// ── SAVE VIDEOS ───────────────────────────────────────────────────────────────
// Password-protected. Stores the full video catalogue in Netlify Blobs
// (store "videos", key "catalog"), then pings a Netlify build hook so the
// public site — home, work, every /work/<slug>/ page, sitemap — rebuilds from
// it. build/prerender.js reads the same key at build time.
//
// Env vars (Netlify → Site configuration → Environment variables, non-VITE):
//   ADMIN_PASSWORD   admin password
//   BUILD_HOOK_URL   Site configuration → Build & deploy → Build hooks
//                    (optional; without it the save works but the site is not
//                    rebuilt automatically)

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  })

function passwordOk(supplied, expected) {
  if (!expected) return false
  const a = Buffer.from(supplied || '')
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

function validate(videos) {
  if (!Array.isArray(videos)) return 'Expected an array of videos.'
  if (videos.length === 0) return 'Refusing to save an empty list.'
  if (videos.length > 300) return 'Too many entries.'
  const ids = new Set()
  for (const v of videos) {
    if (!v || typeof v !== 'object') return 'Entry is not an object.'
    if (typeof v.id !== 'number') return `Entry "${v.title || '?'}" has no numeric id.`
    if (ids.has(v.id)) return `Duplicate id ${v.id}.`
    ids.add(v.id)
    if (typeof v.title !== 'string' || !v.title.trim()) return `Entry ${v.id} has no title.`
    if (typeof v.playbackId !== 'string' || !v.playbackId.trim()) {
      return `"${v.title}" has no Mux playback ID.`
    }
  }
  return null
}

export default async (req) => {
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

  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  if (!passwordOk(req.headers.get('X-Admin-Password'), process.env.ADMIN_PASSWORD)) {
    return json({ error: 'Unauthorized' }, 401)
  }

  try {
    const body = await req.json()
    const problem = validate(body.videos)
    if (problem) return json({ error: problem }, 400)

    const store = getStore('videos')
    await store.setJSON('catalog', {
      schema: 2,
      savedAt: new Date().toISOString(),
      videos: body.videos,
    })

    // Rebuild the public site. Failure here must not lose the save.
    let rebuild = false
    const hook = process.env.BUILD_HOOK_URL
    if (hook && body.publish !== false) {
      try {
        const res = await fetch(`${hook}?trigger_title=${encodeURIComponent('Admin save')}`, { method: 'POST' })
        rebuild = res.ok
        if (!res.ok) console.error('build hook responded', res.status)
      } catch (err) {
        console.error('build hook failed:', err)
      }
    }

    return json({ ok: true, count: body.videos.length, rebuild, hookConfigured: Boolean(hook) })
  } catch (err) {
    console.error('save-videos error:', err)
    return json({ error: 'Failed to save videos' }, 500)
  }
}

export const config = { path: '/.netlify/functions/save-videos' }
