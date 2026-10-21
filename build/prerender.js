import { readFileSync, writeFileSync, mkdirSync, unlinkSync, existsSync, statSync, readdirSync } from 'fs'
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

// ── SLUGS ─────────────────────────────────────────────────────────────────────
// URL for each project: /work/<slug>/. By default the slug is made from the
// title ("Nothing - Purple Strings" → "nothing-purple-strings"), so nothing
// needs to change in videos.json or the admin. To pin a custom one, add a
// "slug" field to that video. Once a page is indexed, avoid changing its slug.
const slugify = s =>
  String(s)
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')   // strip accents
    .toLowerCase()
    .replace(/['\u2019]/g, '')                           // worlds, not world-s
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

function withSlugs(videos) {
  const used = new Set()
  return videos.map(v => {
    let slug = slugify(v.slug || v.title || `project-${v.id}`) || `project-${v.id}`
    if (used.has(slug)) slug = `${slug}-${v.id}`
    used.add(slug)
    return { ...v, slug, url: `/work/${slug}/` }
  })
}

// Where the video list comes from:
//  • Netlify build → the catalogue the admin saved to Netlify Blobs
//    (store "videos", key "catalog"; see netlify/functions/save-videos.js)
//  • otherwise, or if Blobs is empty/unreachable → src/videos.json
// Set KH_VIDEOS_SOURCE=file to force the file (e.g. to test a local change).
let remoteCatalog = null

async function fetchRemoteCatalog(warn) {
  if (process.env.KH_VIDEOS_SOURCE === 'file') return null
  try {
    const { getStore } = await import('@netlify/blobs')
    const store = getStore({ name: 'videos', consistency: 'strong' })
    const catalog = await store.get('catalog', { type: 'json' })
    if (catalog && Array.isArray(catalog.videos) && catalog.videos.length) {
      return catalog.videos
    }
    warn('Netlify Blobs has no saved catalogue yet — using src/videos.json.')
  } catch (err) {
    // Locally there is no Blobs context, which is expected. On Netlify it is
    // not, so say so loudly: admin edits will not be published.
    if (process.env.NETLIFY) {
      warn(`could not read Netlify Blobs (${err.message}) — using src/videos.json. Admin edits will NOT appear on this build.`)
    }
  }
  return null
}

function readVideos() {
  const all = remoteCatalog
    || JSON.parse(readFileSync(resolve(root, 'src/videos.json'), 'utf-8'))
  const shown = all.filter(v => v && v.showInPortfolio !== false)
  const valid = shown.filter(v => v.id != null && v.title && v.playbackId)
  if (valid.length !== shown.length) {
    console.warn(`[kh-prerender] ${shown.length - valid.length} entr(ies) skipped — missing id, title or playbackId.`)
  }
  return withSlugs(valid)
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
        url: v.url,
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
        <li class="kh-playlist-item"><a class="kh-playlist-link" href="${esc(v.url)}" data-id="${esc(v.id)}"><span class="kh-playlist-num">${toRoman(i + 1)}.</span><span class="kh-playlist-title">${esc(v.title)}</span>${type}</a></li>`
  }).join('')
}

// ── STRUCTURED DATA ───────────────────────────────────────────────────────────
// Work index: a plain list pointing at the individual project pages. The full
// VideoObject markup lives on each project page, not here.
function itemListSchema(videos) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Work by Kevin Haus',
    description: 'Music videos, commercials, and branded content directed by Kevin Haus.',
    url: `${SITE}/work.html`,
    itemListElement: videos.map((v, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: v.title,
      url: `${SITE}${v.url}`,
    })),
  }
}

// ── PROJECT PAGES ─────────────────────────────────────────────────────────────
const cap = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '')
const year = v => (v.date ? String(v.date).slice(0, 4) : '')
const list = x => (Array.isArray(x) ? x.filter(Boolean) : [])

function absolute(url) {
  return /^https?:/.test(url) ? url : `${SITE}${url}`
}

function projectDescription(v) {
  const type = (v.type || 'film').toLowerCase()
  const article = /^[aeiou]/.test(type) ? 'an' : 'a'
  let d = `${v.title}, ${article} ${type} directed by Kevin Haus`
  if (v.client && !v.title.toLowerCase().includes(v.client.toLowerCase())) d += ` for ${v.client}`
  if (v.agency) d += ` (${v.agency})`
  if (year(v)) d += `, ${year(v)}`
  d += '.'
  const award = list(v.awards)[0]
  if (award) d += ` ${award.replace(/[.\s]+$/, '')}.`
  return d
}

function projectHead(v) {
  const url = `${SITE}${v.url}`
  const title = `${v.title} — ${cap(v.type || 'film')} | Kevin Haus`
  const desc = projectDescription(v)
  const image = absolute(posterUrl(v))

  const video = {
    '@type': 'VideoObject',
    name: v.title,
    description: desc,
    thumbnailUrl: image,
    contentUrl: `https://stream.mux.com/${v.playbackId}.m3u8`,
    url,
    director: { '@type': 'Person', '@id': `${SITE}/#kevinhaus`, name: 'Kevin Haus', url: SITE },
  }
  if (v.date) video.uploadDate = v.date
  if (list(v.awards).length) video.award = list(v.awards)

  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      video,
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
          { '@type': 'ListItem', position: 2, name: 'Work', item: `${SITE}/work.html` },
          { '@type': 'ListItem', position: 3, name: v.title, item: url },
        ],
      },
    ],
  }

  return `<title>${esc(title)}</title>
  <link rel="canonical" href="${esc(url)}">
  <meta name="description" content="${esc(desc)}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:image" content="${esc(image)}">
  <meta property="og:url" content="${esc(url)}">
  <meta property="og:type" content="video.other">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="preload" as="image" href="${esc(posterUrl(v))}" fetchpriority="high">
  <script type="application/ld+json">${jsonForScript(graph)}</script>`
}

// ── BEHIND THE SCENES ─────────────────────────────────────────────────────────
// Set in the admin (Edit on a project): "btsPlaybackId" for a Mux video and
// "btsPhotos" for a list of filenames. If btsPhotos is blank, every image in
// public/assets/BTS/<slug>/ is used, in filename order.
const BTS_DIR = resolve(root, 'public/assets/BTS')

function btsFor(v) {
  let photos = Array.isArray(v.btsPhotos) ? v.btsPhotos.filter(Boolean) : []
  if (!photos.length) {
    const dir = resolve(BTS_DIR, v.slug)
    if (existsSync(dir)) {
      photos = readdirSync(dir)
        .filter(f => /\.(webp|jpe?g|png|avif)$/i.test(f))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    }
  }
  return { photos, playbackId: v.btsPlaybackId || '' }
}

function btsHtml(v) {
  const { photos, playbackId } = btsFor(v)
  if (!photos.length && !playbackId) return ''
  const player = playbackId
    ? `<div class="kh-player-wrap"><div class="kh-player-sizer"><mux-player playback-id="${esc(playbackId)}" metadata-video-title="${esc(v.title)} — behind the scenes" playsinline></mux-player></div></div>`
    : ''
  const grid = photos.length
    ? `<div class="kh-project-stills">${photos.map((f, i) =>
        `<img src="${ASSETS_BASE}/BTS/${esc(v.slug)}/${esc(f)}" alt="${esc(v.title)} — behind the scenes photo ${i + 1}" loading="lazy" decoding="async">`
      ).join('')}</div>`
    : ''
  return `<section class="kh-project-bts" aria-label="Behind the scenes"><h2 class="kh-project-subhead">Behind the scenes</h2>${player}${grid}</section>`
}

// PLACEHOLDER LAYOUT — structure only. Every field comes from videos.json and
// each block is skipped when its data is missing. Restyle freely in
// styles.scss (look for "PROJECT PAGE").
function projectBody(v, prev, next, warn) {
  const meta = [v.client, v.agency && `via ${v.agency}`, (v.type || '').toLowerCase(), year(v)]
    .filter(Boolean).map(esc).join('<span class="kh-project-sep"> · </span>')

  const rows = []
  const row = (label, value) => rows.push(`<div class="kh-project-row"><dt>${label}</dt><dd>${value}</dd></div>`)
  if (v.client) row('Client', esc(v.client))
  if (v.agency) row('Agency', esc(v.agency))
  if (v.type)   row('Format', esc(cap(v.type)))
  if (v.date)   row('Year', esc(year(v)))
  const ul = items => `<ul>${items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`
  if (list(v.festivals).length) row('Festivals', ul(list(v.festivals)))
  if (list(v.awards).length)    row('Awards', ul(list(v.awards)))

  const stills = list(v.stills).filter(f => {
    const c = checkStill(f)
    if (!c.ok) warn(`gallery still skipped — ${f} (${c.reason}) [${v.title}]`)
    return c.ok
  })
  const gallery = stills.length
    ? `<section class="kh-project-stills" aria-label="Stills">${stills.map((f, i) =>
        `<img src="${ASSETS_BASE}/Stills/${esc(f)}" alt="${esc(v.title)} — still ${i + 1}" loading="lazy" decoding="async">`
      ).join('')}</section>`
    : ''

  return `<div class="kh-work kh-project">
      <div class="kh-player-wrap">
        <div class="kh-player-sizer">
          <mux-player
            playback-id="${esc(v.playbackId)}"
            poster="${esc(posterUrl(v))}"
            metadata-video-title="${esc(v.title)}"
            playsinline
          ></mux-player>
        </div>
      </div>

      <header class="kh-project-head">
        <h1 class="kh-project-title">${esc(v.title)}</h1>
        <p class="kh-project-meta">${meta}</p>
      </header>

      ${rows.length ? `<dl class="kh-project-credits">${rows.join('')}</dl>` : ''}
      ${v.note ? `<p class="kh-project-note">${esc(v.note)}</p>` : ''}
      ${gallery}
      ${btsHtml(v)}

      <nav class="kh-project-pager" aria-label="More work">
        <a class="kh-project-prev" rel="prev" href="${esc(prev.url)}">← ${esc(prev.title)}</a>
        <a class="kh-project-all" href="/work.html">All work</a>
        <a class="kh-project-next" rel="next" href="${esc(next.url)}">${esc(next.title)} →</a>
      </nav>
    </div>`
}

function renderProject(template, videos, i, warn) {
  const v = videos[i]
  const prev = videos[(i - 1 + videos.length) % videos.length]
  const next = videos[(i + 1) % videos.length]
  return template
    .replace(/<!-- TEMPLATE[\s\S]*?-->\s*/, '')
    .replace('<!--KH:HEAD-->', () => projectHead(v))
    .replace('<!--KH:BODY-->', () => projectBody(v, prev, next, warn))
}

// ── SITEMAP + REDIRECTS ───────────────────────────────────────────────────────
function sitemapXml(videos) {
  const today = new Date().toISOString().slice(0, 10)
  const urls = [
    `${SITE}/`, `${SITE}/work.html`, `${SITE}/about.html`, `${SITE}/contact.html`,
    ...videos.map(v => `${SITE}${v.url}`),
  ]
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map(u => `  <url><loc>${u}</loc><lastmod>${today}</lastmod></url>`).join('\n') +
    `\n</urlset>\n`
}

// Old /work.html?v=N links (shared URLs, Google's index, the old home-page
// click) send people to the new project page. Netlify reads _redirects from
// the publish directory in addition to netlify.toml.
function redirectsFile(videos) {
  return [
    '# Generated by build/prerender.js — do not edit.',
    ...videos.map(v => `/work.html  v=${v.id}  ${v.url}  301!`),
    '/work  /work.html  301',
    '',
  ].join('\n')
}

// ── VITE PLUGIN ───────────────────────────────────────────────────────────────
export default function prerender() {
  let warn = msg => console.warn(`[kh-prerender] ${msg}`)
  let isBuild = false
  let outDir = ''

  return {
    name: 'kh-prerender',

    // Dev only: serve /work/<slug>/ from the same template the build uses.
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const m = /^\/work\/([^/?#]+)\/?(?:[?#].*)?$/.exec(req.url || '')
        if (!m) return next()
        try {
          const videos = readVideos()
          const i = videos.findIndex(v => v.slug === m[1])
          if (i < 0) return next()
          const template = readFileSync(resolve(root, 'src/project.html'), 'utf-8')
          const html = await server.transformIndexHtml(req.url, renderProject(template, videos, i, warn))
          res.statusCode = 200
          res.setHeader('Content-Type', 'text/html')
          res.end(html)
        } catch (err) {
          next(err)
        }
      })
    },

    // Build only: stamp one page per project out of the built template, then
    // write sitemap.xml and _redirects.
    closeBundle() {
      if (!isBuild) return
      const tplPath = resolve(outDir, 'project.html')
      if (!existsSync(tplPath)) {
        warn('project.html template not found in output — no project pages written.')
        return
      }
      const template = readFileSync(tplPath, 'utf-8')
      const videos = readVideos()

      videos.forEach((v, i) => {
        const dir = resolve(outDir, 'work', v.slug)
        mkdirSync(dir, { recursive: true })
        writeFileSync(resolve(dir, 'index.html'), renderProject(template, videos, i, warn))
      })
      unlinkSync(tplPath)

      writeFileSync(resolve(outDir, 'sitemap.xml'), sitemapXml(videos))
      writeFileSync(resolve(outDir, '_redirects'), redirectsFile(videos))
      console.log(`[kh-prerender] wrote ${videos.length} project pages, sitemap.xml, _redirects`)
    },

    async buildStart() {
      if (!isBuild) return
      remoteCatalog = await fetchRemoteCatalog(warn)
      console.log(`[kh-prerender] video list source: ${remoteCatalog ? `Netlify Blobs (${remoteCatalog.length} entries)` : 'src/videos.json'}`)
    },

    configResolved(config) {
      isBuild = config.command === 'build'
      outDir = resolve(config.root, config.build.outDir)
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

        // The menu's "Work" link opens the first project; the full list is
        // still at /work.html ("All work" link on each project page).
        if (videos[0]) {
          html = html.replace(
            /<a href="\/work\.html" class="kh-nav-link">/,
            `<a href="${videos[0].url}" class="kh-nav-link" data-section="work">`
          )
        }

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
