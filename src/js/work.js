import config from './site.config.js'
import navHtml from '../pages/nav.html?raw'

// ── NAV ───────────────────────────────────────────────────────────────────────
// The build prerenders the nav into every page. This only fires in dev, or if
// the prerender ever fails — it prevents a double-injected nav in production.
// Apply this same guard in home.js / about.js / contact.js / reel.js.
const navMount = document.getElementById('kh-nav-mount')
if (navMount && !navMount.innerHTML.trim()) navMount.innerHTML = navHtml

// ── VIDEO DATA ────────────────────────────────────────────────────────────────
// Baked into the HTML at build time by build/prerender.js. No fetch, no flash of
// empty playlist, and the markup is in the source for crawlers.
function readVideos() {
  const el = document.getElementById('kh-videos')
  if (!el) return []
  try {
    return JSON.parse(el.textContent)
  } catch (err) {
    console.error('Could not parse embedded video data:', err)
    return []
  }
}

// ── POSTER URL ────────────────────────────────────────────────────────────────
function getPosterUrl(video) {
  if (video.coverImage) {
    return `${config.assetsBase}/Covers/${video.coverImage}`
  }
  const time = video.thumbnailTime ?? 3
  return `https://image.mux.com/${video.playbackId}/thumbnail.webp?time=${time}&width=1280`
}

function preloadAllCovers(videos) {
  videos.forEach(video => {
    const img = new Image()
    img.src = getPosterUrl(video)
  })
}

// ── DOM REFS ──────────────────────────────────────────────────────────────────
const player      = document.getElementById('mainPlayer')
const playerSizer = document.getElementById('playerSizer')
const playlist    = document.getElementById('playlist')

// ── STATE ─────────────────────────────────────────────────────────────────────
let activeId = null
const videos = readVideos()

// ── LOAD VIDEO ────────────────────────────────────────────────────────────────
const FADE_MS = 250

function loadVideo(id) {
  const video = videos.find(v => v.id === id)
  if (!video) return

  if (activeId === null) {
    applyVideo(id, video)
    return
  }
  if (activeId === id) return

  playerSizer.classList.add('kh-player-fading')
  setTimeout(() => {
    applyVideo(id, video)
    playerSizer.classList.remove('kh-player-fading')
  }, FADE_MS)
}

function applyVideo(id, video) {
  activeId = id

  player.setAttribute('poster', getPosterUrl(video))
  player.setAttribute('playback-id', video.playbackId)
  player.setAttribute('metadata-video-title', video.title)

  window.scrollTo({ top: 0, behavior: 'smooth' })

  document.querySelectorAll('.kh-playlist-link').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.id, 10) === id)
  })

  const url = new URL(window.location)
  url.searchParams.set('v', id)
  history.pushState({ videoId: id }, '', url)
}

// ── HYDRATE ───────────────────────────────────────────────────────────────────
// The <li> elements already exist in the HTML. Attach behaviour, don't rebuild.
function hydratePlaylist() {
  playlist.addEventListener('click', e => {
    const btn = e.target.closest('.kh-playlist-link')
    if (!btn) return
    loadVideo(parseInt(btn.dataset.id, 10))
  })
}

// ── INIT ──────────────────────────────────────────────────────────────────────
function init() {
  if (videos.length === 0) {
    console.error('No video data found in page.')
    return
  }

  hydratePlaylist()
  preloadAllCovers(videos)

  const paramId = parseInt(new URLSearchParams(window.location.search).get('v'), 10)
  loadVideo(videos.find(v => v.id === paramId) ? paramId : videos[0].id)
}

init()

window.addEventListener('popstate', e => {
  if (e.state && e.state.videoId) loadVideo(e.state.videoId)
})
