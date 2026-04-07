import config from './site.config.js'
import navHtml from '../pages/nav.html?raw'

// ── INJECT NAV ────────────────────────────────────────────────────────────────
document.getElementById('kh-nav-mount').innerHTML = navHtml

// ── ROMAN NUMERALS ────────────────────────────────────────────────────────────
const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X',
               'XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX']

function toRoman(n) {
  return ROMAN[n - 1] || String(n)
}

// ── POSTER URL ────────────────────────────────────────────────────────────────
function getPosterUrl(video) {
  if (video.coverImage) {
    return `${config.assetsBase}/Covers/${video.coverImage}`
  }
  const time = video.thumbnailTime ?? 3
  return `https://image.mux.com/${video.playbackId}/thumbnail.webp?time=${time}&width=1280`
}

// ── PRELOAD ALL COVERS ────────────────────────────────────────────────────────
function preloadAllCovers(videos) {
  videos.forEach(video => {
    const img = new Image()
    img.src = getPosterUrl(video)
  })
}

// ── STRUCTURED DATA ───────────────────────────────────────────────────────────
function injectVideoSchema(videos) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Work by Kevin Haus",
    "description": "Music videos, commercials, and branded content directed by Kevin Haus.",
    "url": "https://kevinhaus.com/work.html",
    "itemListElement": videos.map((video, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "item": {
        "@type": "VideoObject",
        "name": video.title,
        "description": `${video.title} — ${video.type} directed by Kevin Haus.`,
        "thumbnailUrl": `https://image.mux.com/${video.playbackId}/thumbnail.webp?time=3&width=640`,
        "uploadDate": "2024-01-01",
        "director": {
          "@type": "Person",
          "name": "Kevin Haus",
          "url": "https://kevinhaus.com"
        }
      }
    }))
  }
  const script = document.createElement('script')
  script.type = 'application/ld+json'
  script.textContent = JSON.stringify(schema)
  document.head.appendChild(script)
}

// ── DOM REFS ──────────────────────────────────────────────────────────────────
const player     = document.getElementById('mainPlayer')
const playerWrap = document.getElementById('playerWrap')
const playlist   = document.getElementById('playlist')

// ── STATE ─────────────────────────────────────────────────────────────────────
let activeId = null
let videos   = []

// ── LOAD VIDEO ────────────────────────────────────────────────────────────────
function loadVideo(id) {
  const video = videos.find(v => v.id === id)
  if (!video) return

  activeId = id

  const posterUrl = getPosterUrl(video)
  player.setAttribute('poster', posterUrl)
  player.setAttribute('playback-id', video.playbackId)
  player.setAttribute('metadata-video-title', video.title)

  playerWrap.dataset.ratio = video.aspectRatio
  playerWrap.scrollIntoView({ behavior: 'smooth', block: 'start' })

  document.querySelectorAll('.kh-playlist-link').forEach(btn => {
    const isActive = parseInt(btn.dataset.id) === id
    btn.classList.toggle('active', isActive)
  })

  const url = new URL(window.location)
  url.searchParams.set('v', id)
  history.pushState({ videoId: id }, '', url)
}

// ── BUILD PLAYLIST ────────────────────────────────────────────────────────────
function buildPlaylist() {
  playlist.innerHTML = ''

  videos.forEach((video, index) => {
    const li  = document.createElement('li')
    li.className = 'kh-playlist-item'

    const btn = document.createElement('button')
    btn.className   = 'kh-playlist-link'
    btn.dataset.id  = video.id
    btn.type        = 'button'
    btn.innerHTML   = `${toRoman(index + 1)}.&nbsp;&nbsp;${video.title}`
    btn.addEventListener('click', () => loadVideo(video.id))

    li.appendChild(btn)
    playlist.appendChild(li)
  })
}

// ── INIT ──────────────────────────────────────────────────────────────────────
async function init() {
  try {
    // Show loading state in playlist
    playlist.innerHTML = '<li style="opacity:0.4; padding: 0.5rem 0;">Loading...</li>'

    const res  = await fetch('/.netlify/functions/get-videos')
    const data = await res.json()
    videos = Array.isArray(data) ? data : []

    // If Blobs is empty on first run, fall back to bundled JSON
    if (videos.length === 0) {
      const fallback = await import('../videos.json')
      videos = fallback.default || []
    }

    buildPlaylist()
    preloadAllCovers(videos)
    injectVideoSchema(videos)

    const params  = new URLSearchParams(window.location.search)
    const paramId = parseInt(params.get('v'))

    if (paramId && videos.find(v => v.id === paramId)) {
      loadVideo(paramId)
    } else {
      loadVideo(videos[0].id)
    }

  } catch (err) {
    console.error('work.js init error:', err)
    // Fall back to bundled JSON on any error
    try {
      const fallback = await import('../videos.json')
      videos = fallback.default || []
      buildPlaylist()
      preloadAllCovers(videos)
      if (videos.length > 0) loadVideo(videos[0].id)
    } catch (e) {
      playlist.innerHTML = '<li style="color:red;">Failed to load videos</li>'
    }
  }
}

init()

// Handle browser back/forward
window.addEventListener('popstate', (e) => {
  if (e.state && e.state.videoId) loadVideo(e.state.videoId)
})
