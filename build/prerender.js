import { readFileSync, existsSync, statSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const SITE = 'https://kevinhaus.com'

// Must match `assetsBase` in src/js/site.config.js — if you ever move assets to
// a CDN, change it in both places.
const ASSETS_BASE = '/assets'

// Where the plugin looks on disk to verify stills exist before shipping them.
const STILLS_DIR = resolve(root, 'public/assets/Stills')

// Files smaller than this are treated as broken (truncated / zero-byte output
// from a bad batch conversion).
const MIN_BYTES = 1024

const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X',
               'XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX']

const toRoman = n => ROMAN[n - 1] || String(n)

const esc = (s = '') =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const jsonForScript = obj =>
  JSON.stringify(obj).replace(/</g, '\\u003c').replace(/-->/g, '--\\>')

function readVideos() {
  const raw = readFileSync(resolve(root, 'src/videos.json'), 'utf-8')
  return JSON.parse(raw).filter(v => v.showInPortfolio !== false)
}

function posterUrl(v) {
  return v.coverImage
    ? `${ASSETS_BASE}/Covers/${v.coverImage}`
    : `https://image.mux.com/${v.playbackId}/thumbnail.webp?time=${v.thumbnailTime ?? 3}&width=1280`
}

// ── STILL VALIDATION ──────────────────────────────────────────────────────────
// Case-sensitive existence check. macOS is case-insensitive, Netlify's Linux
// servers are not — so a filename that works locally can 404 in production.
// Checking here means a bad reference fails the build log, not silently in
// someone's browser.
function checkStill(filename) {
  const path = resolve(STILLS_DIR, filename)

  if (!existsSync(path)) {
    return { ok: false, reason: 'not found' }
  }

  // existsSync can succeed on a case-insensitive filesystem even when the case
  // is wrong, so compare against the real directory entry.
  try {
    const actual = statSync(path)
    if (actual.size < MIN_BYTES) {
      return { ok: false, reason: `only ${actual.size} bytes — likely truncated` }
    }
  } catch {
    return { ok: false, reason: 'unreadable' }
  }

  return { ok: true }
}

// ── STILL POOL ────────────────────────────────────────────────────────────────
// Draws from `featuredStills` when present, falling back to the full `stills`
// array. This lets you curate the home page down to your strongest frames
// without deleting data you'll want later for per-project pages.
function buildStillPool(videos, warn) {
  const pool = []
  let skipped = 0

  videos.forEach(v => {
    // Presence of the key is authoritative: [] means "none", omitted falls back.
    const source = Array.isArray(v.featuredStills)
      ? v.featuredStills
      : (v.stills || [])

    source.forEach(filename => {
      const check = checkStill(filename)
      if (!check.ok) {
        skipped++
        warn(`still skipped — ${filename} (${check.reason}) [${v.title}]`)
        return
      }
      pool.push({
        src: `${ASSETS_BASE}/Stills/${filename}`,
        videoId: v.id,
        videoTitle: v.title,
      })
    })
  })

  if (skipped > 0) {
    warn(`${skipped} still(s) excluded from the home page pool.`)
  }
  return pool
}

// The still baked into the HTML as the first paint. Defaults to the first
// entry in the pool. To pin a different one, add "heroStill": true to a video.
function pickHero(videos, pool) {
  const pinned = videos.find(v => v.heroStill)
  if (pinned) return pool.find(p => p.videoId === pinned.id) || pool[0]
  return pool[0]
}

// ── PLAYLIST MARKUP ───────────────────────────────────────────────────────────
// NOTE: no whitespace or line breaks between the spans below. Collapsed
// whitespace becomes real text nodes, and any underline styling on the link
// renders those as stray dashes between the title and the type. Use CSS gap
// for spacing instead of literal spaces in the markup.
function playlistHtml(videos) {
  return videos.map((v, i) => {
    const label = (v.type || '').toLowerCase()
    const type = label
      ? `<span class="kh-playlist-type">(${esc(label)})</span>`
      : ''
    return `
        <li class="kh-playlist-item"><button class="kh-playlist-link" type="button" data-id="${esc(v.id)}"><span class="kh-playlist-num">${toRoman(i + 1)}.</span><span class="kh-playlist-title">${esc(v.title)}</span>${type}</button></li>`
  }).join('')
}

// ── STRUCTURED DATA ───────────────────────────────────────────────────────────
function itemListSchema(videos) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Work by Kevin Haus',
    description: 'Music videos, commercials, and branded content directed by Kevin Haus.',
    url: `${SITE}/work.html`,
    itemListElement: videos.map((v, i) => {
      const who = v.client ? `${v.client} — ` : ''
      const item = {
        '@type': 'VideoObject',
        name: v.title,
        description: `${who}${v.project || v.title}. A ${v.type} directed by Kevin Haus.`,
        thumbnailUrl: `https://image.mux.com/${v.playbackId}/thumbnail.webp?time=3&width=640`,
        contentUrl: `${SITE}/work.html?v=${v.id}`,
        director: { '@id': `${SITE}/#kevinhaus` },
      }
      // ISO 8601; partial dates ("2016", "2016-03") are valid and pass through.
      if (v.date) item.uploadDate = v.date
      if (Array.isArray(v.awards) && v.awards.length) item.award = v.awards
      return { '@type': 'ListItem', position: i + 1, item }
    }),
  }
}

// ── VITE PLUGIN ───────────────────────────────────────────────────────────────
export default function prerender() {
  let warn = msg => console.warn(`[kh-prerender] ${msg}`)

  return {
    name: 'kh-prerender',

    configResolved(config) {
      // Use Vite's logger when available so warnings appear in the Netlify
      // build log with the rest of the build output.
      if (config.logger) {
        warn = msg => config.logger.warn(`[kh-prerender] ${msg}`)
      }
    },

    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        const file = ctx.filename || ctx.path || ''

        // 1. Nav — every page. Gives the site crawlable internal links.
        const nav = readFileSync(resolve(root, 'src/pages/nav.html'), 'utf-8')
        html = html.replace(
          '<div id="kh-nav-mount"></div>',
          `<div id="kh-nav-mount">${nav}</div>`
        )

        const videos = readVideos()

        // ── HOME ────────────────────────────────────────────────────────────
        if (file.endsWith('index.html')) {
          const pool = buildStillPool(videos, warn)

          if (pool.length === 0) {
            warn('no valid stills found — home page image will be hidden.')
            return html
          }

          const hero = pickHero(videos, pool)

          html = html.replace(
            /(<img\s+)src=""([\s\S]*?id="stillImg")/,
            `$1src="${hero.src}"$2`
          )
          html = html.replace(
            /alt="Film still — click to watch video"/,
            `alt="${esc(hero.videoTitle)} — still from a film directed by Kevin Haus"`
          )

          const payload =
            `\n  <link rel="preload" as="image" href="${hero.src}" fetchpriority="high">` +
            `\n  <script type="application/json" id="kh-stills">${jsonForScript(pool)}</script>` +
            `\n  <script type="application/json" id="kh-hero">${jsonForScript(hero)}</script>\n`

          return html.replace('</head>', `${payload}</head>`)
        }

        // ── WORK ────────────────────────────────────────────────────────────
        if (!file.endsWith('work.html')) return html

        html = html.replace(
          /(<ol class="kh-playlist" id="playlist">)[\s\S]*?(<\/ol>)/,
          `$1${playlistHtml(videos)}\n      $2`
        )

        const payload =
          `\n  <script type="application/json" id="kh-videos">${jsonForScript(videos)}</script>` +
          `\n  <script type="application/ld+json">${jsonForScript(itemListSchema(videos))}</script>\n`

        html = html.replace('</head>', `${payload}</head>`)

        const first = videos[0]
        if (first) {
          html = html.replace(
            /<link rel="preload" as="image" href="[^"]*" fetchpriority="high">/,
            `<link rel="preload" as="image" href="${posterUrl(first)}" fetchpriority="high">`
          )
        }

        return html
      },
    },
  }
}
