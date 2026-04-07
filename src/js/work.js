import videos from '../videos.json'
import config from './site.config.js'
import navHtml from '../pages/nav.html?raw'

// ── INJECT NAV ────────────────────────────────────────────────────────────────
document.getElementById('kh-nav-mount').innerHTML = navHtml

// ── STRUCTURED DATA — VideoObject ItemList ────────────────────────────────────
// Injected into <head> so search engines can index each video.
// Updates automatically whenever videos.json changes — no manual maintenance.
;(function injectVideoSchema() {
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
        },
        "productionCompany": {
          "@type": "Organization",
          "name": "Kevin Haus"
        }
      }
    }))
  }
  const script = document.createElement('script')
  script.type = 'application/ld+json'
  script.textContent = JSON.stringify(schema)
  document.head.appendChild(script)
})()

// ── ROMAN NUMERALS ────────────────────────────────────────────────────────────
const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X',
               'XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX']

function toRoman(n) {
  return ROMAN[n - 1] || String(n)
}

// ── POSTER URL ────────────────────────────────────────────────────────────────
// Builds the poster/cover URL for a video.
// Uses the custom cover image from assets/Covers/ if present in videos.json.
// Falls back to Mux's auto-generated thumbnail if no coverImage is set.
// thumbnailTime can be overridden per-video in videos.json e.g. "thumbnailTime": 8
function getPosterUrl(video) {
  if (video.coverImage) {
    return `${config.assetsBase}/Covers/${video.coverImage}`
  }
  const time = video.thumbnailTime ?? 3
  return `https://image.mux.com/${video.playbackId}/thumbnail.webp?time=${time}&width=1280`
}

// ── PRELOAD ALL COVERS ────────────────────────────────────────────────────────
// Fires immediately on page load, fetching all cover images into the browser
// cache in the background. By the time a user clicks any playlist item,
// its cover is already cached and appears instantly.
function preloadAllCovers() {
  videos.forEach(video => {
    const img = new Image()
    img.src = getPosterUrl(video)
  })
}

// ── DOM REFS ──────────────────────────────────────────────────────────────────
const player     = document.getElementById('mainPlayer')
const playerWrap = document.getElementById('playerWrap')
const playlist   = document.getElementById('playlist')

// ── STATE ─────────────────────────────────────────────────────────────────────
let activeId = null

// ── LOAD VIDEO ────────────────────────────────────────────────────────────────
function loadVideo(id) {
  const video = videos.find(v => v.id === id)
  if (!video) return

  activeId = id

  // Set poster first so it shows immediately while player initialises
  const posterUrl = getPosterUrl(video)
  player.setAttribute('poster', posterUrl)
  player.setAttribute('playback-id', video.playbackId)
  player.setAttribute('metadata-video-title', video.title)

  // Update aspect ratio wrapper
  playerWrap.dataset.ratio = video.aspectRatio

  // Scroll player to top on every selection
  playerWrap.scrollIntoView({ behavior: 'smooth', block: 'start' })

  // Update active link styling
  document.querySelectorAll('.kh-playlist-link').forEach(btn => {
    const isActive = parseInt(btn.dataset.id) === id
    btn.classList.toggle('active', isActive)
  })

  // Update URL without page reload so back button works
  const url = new URL(window.location)
  url.searchParams.set('v', id)
  history.pushState({ videoId: id }, '', url)
}

// ── BUILD PLAYLIST ────────────────────────────────────────────────────────────
function buildPlaylist() {
  playlist.innerHTML = ''

  videos.forEach((video, index) => {
    const li = document.createElement('li')
    li.className = 'kh-playlist-item'

    const btn = document.createElement('button')
    btn.className = 'kh-playlist-link'
    btn.dataset.id = video.id
    btn.type = 'button'
    btn.innerHTML = `${toRoman(index + 1)}.&nbsp;&nbsp;${video.title}`

    btn.addEventListener('click', () => loadVideo(video.id))

    li.appendChild(btn)
    playlist.appendChild(li)
  })
}

// ── INIT ──────────────────────────────────────────────────────────────────────
buildPlaylist()

// Kick off background preload of all cover images immediately
preloadAllCovers()

// Check for ?v= URL param (from home page still click or direct link)
const params = new URLSearchParams(window.location.search)
const paramId = parseInt(params.get('v'))

if (paramId && videos.find(v => v.id === paramId)) {
  loadVideo(paramId)
} else {
  loadVideo(videos[0].id)
}

// Handle browser back/forward
window.addEventListener('popstate', (e) => {
  if (e.state && e.state.videoId) {
    loadVideo(e.state.videoId)
  }
})

