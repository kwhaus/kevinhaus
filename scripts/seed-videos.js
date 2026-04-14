#!/usr/bin/env node
// scripts/seed-videos.js
//
// Pushes src/videos.json directly to Netlify Blobs.
// Run this whenever you update videos.json (new entries, reordering, etc.)
// instead of having to open the admin page and hit Save.
//
// Usage:
//   npm run seed
//
// Required env vars — add to a local .env file (never commit this):
//   NETLIFY_SITE_ID    — Settings → General → Site details → Site ID
//   NETLIFY_AUTH_TOKEN — app.netlify.com/user/applications → Personal access tokens
//
// The script uses the same @netlify/blobs package already in your devDependencies,
// calling it with explicit site credentials rather than relying on the build context.

import { getStore } from '@netlify/blobs'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── Load env from .env if present (no extra deps needed) ─────────────────────
const envPath = resolve(__dirname, '../.env')
try {
  const envFile = readFileSync(envPath, 'utf8')
  for (const line of envFile.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
    if (!process.env[key]) process.env[key] = val
  }
} catch {
  // No .env file — rely on env vars being set in the shell
}

// ── Validate credentials ──────────────────────────────────────────────────────
const siteId = process.env.NETLIFY_SITE_ID
const token  = process.env.NETLIFY_AUTH_TOKEN

if (!siteId || !token) {
  console.error(`
ERROR: Missing credentials.

Add these to a .env file in your project root (never commit it):

  NETLIFY_SITE_ID=your-site-id
  NETLIFY_AUTH_TOKEN=your-personal-access-token

  NETLIFY_SITE_ID    — Netlify dashboard → your site → Site configuration → General → Site ID
  NETLIFY_AUTH_TOKEN — app.netlify.com/user/applications → Personal access tokens → New token
`)
  process.exit(1)
}

// ── Load videos.json ──────────────────────────────────────────────────────────
const videosPath = resolve(__dirname, '../src/videos.json')
let videos
try {
  videos = JSON.parse(readFileSync(videosPath, 'utf8'))
} catch (err) {
  console.error(`ERROR: Could not read src/videos.json\n${err.message}`)
  process.exit(1)
}

if (!Array.isArray(videos) || videos.length === 0) {
  console.error('ERROR: src/videos.json is empty or not an array.')
  process.exit(1)
}

// ── Push to Blobs ─────────────────────────────────────────────────────────────
console.log(`Seeding ${videos.length} videos to Netlify Blobs...`)
console.log(`Site: ${siteId}`)

try {
  const store = getStore({
    name:      'videos',
    siteID:    siteId,
    token:     token,
  })

  await store.setJSON('list', videos)

  console.log(`\n✓ Done — ${videos.length} videos written to Blobs store "videos" under key "list".`)
  console.log('  Changes are live immediately — no deploy needed.')
} catch (err) {
  console.error(`\nERROR: Failed to write to Blobs.\n${err.message}`)
  process.exit(1)
}
