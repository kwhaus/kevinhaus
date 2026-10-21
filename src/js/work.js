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

function loadVideo(id, { push = true } = {}) {
  const video = videos.find(v => v.id === id)
  if (!video) return

  if (activeId === null) {
    applyVideo(id, video, { push: false })
    return
  }
  if (activeId === id) return

  playerSizer.classList.add('kh-player-fading')
  setTimeout(() => {
    applyVideo(id, video, { push })
    playerSizer.classList.remove('kh-player-fading')
  }, FADE_MS)
}

function applyVideo(id, video, { push = true } = {}) {
  activeId = id

  player.setAttribute('poster', getPosterUrl(video))
  player.setAttribute('playback-id', video.playbackId)
  player.setAttribute('metadata-video-title', video.title)

  window.scrollTo({ top: 0, behavior: 'smooth' })

  document.querySelectorAll('.kh-playlist-link').forEach(link => {
    link.classList.toggle('active', parseInt(link.dataset.id, 10) === id)
  })

  // The address bar shows the project's own page (/work/<slug>/), so copying
  // it or reloading lands on that project's page.
  if (push) history.pushState({ videoId: id }, '', video.url)
}

// Which video does the current address point at? /work/<slug>/ or the legacy
// ?v=<id> form (production redirects ?v= to the slug URL; this covers dev).
function idFromLocation() {
  const slug = (window.location.pathname.match(/^\/work\/([^/]+)\/?$/) || [])[1]
  const bySlug = slug && videos.find(v => v.slug === slug)
  if (bySlug) return bySlug.id
  const paramId = parseInt(new URLSearchParams(window.location.search).get('v'), 10)
  return videos.find(v => v.id === paramId) ? paramId : null
}

// ── HYDRATE ───────────────────────────────────────────────────────────────────
// The playlist items are real <a href="/work/<slug>/"> links in the HTML, so
// crawlers can follow them. For visitors we intercept the click and swap the
// player in place; middle-click / cmd-click still open the project page.
function hydratePlaylist() {
  playlist.addEventListener('click', e => {
    const link = e.target.closest('.kh-playlist-link')
    if (!link) return
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
    e.preventDefault()
    loadVideo(parseInt(link.dataset.id, 10))
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

  const startId = idFromLocation() ?? videos[0].id
  loadVideo(startId)

  // Legacy ?v=N address → tidy it to the project URL without adding history.
  if (window.location.pathname.endsWith('work.html') && window.location.search) {
    const v = videos.find(x => x.id === startId)
    if (v && idFromLocation() !== null) history.replaceState({ videoId: startId }, '', v.url)
  }
}

init()

window.addEventListener('popstate', () => {
  loadVideo(idFromLocation() ?? videos[0].id, { push: false })
})
