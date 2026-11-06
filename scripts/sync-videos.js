// Copies the video list you saved in the admin (live site) into src/videos.json,
// so the repo file — the fallback for builds and the source for local dev — matches
// what's live. Run:  npm run sync
// Then commit src/videos.json. Set KH_LIVE_URL to sync from somewhere other than
// https://kevinhaus.com.

import { writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const base = (process.env.KH_LIVE_URL || 'https://kevinhaus.com').replace(/\/$/, '')
const url = `${base}/.netlify/functions/get-videos`

const res = await fetch(url, { headers: { 'Cache-Control': 'no-cache' } })
if (!res.ok) {
  console.error(`Could not fetch ${url} (HTTP ${res.status}). videos.json left unchanged.`)
  process.exit(1)
}

const videos = await res.json()
const bad = !Array.isArray(videos) || videos.length === 0 ||
  videos.some(v => !v || typeof v.id !== 'number' || !v.title || !v.playbackId)
if (bad) {
  console.error('The live list is empty or malformed (has the admin been saved yet?). videos.json left unchanged.')
  process.exit(1)
}

writeFileSync(resolve(root, 'src/videos.json'), JSON.stringify(videos, null, 2) + '\n')
console.log(`src/videos.json updated: ${videos.length} entries from ${base}`)
