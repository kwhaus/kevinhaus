import videos from '../videos.json'
import navHtml from '../pages/nav.html?raw'

// ── INJECT NAV ────────────────────────────────────────────────────────────────
document.getElementById('kh-nav-mount').innerHTML = navHtml

// ── ROMAN NUMERALS ────────────────────────────────────────────────────────────
const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X',
               'XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX']

function toRoman(n) {
  return ROMAN[n - 1] || String(n)
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

  // Update player
  player.setAttribute('playback-id', video.playbackId)
  player.setAttribute('metadata-video-title', video.title)

  // Update aspect ratio wrapper
  playerWrap.dataset.ratio = video.aspectRatio

  // Scroll player into view on mobile
  if (window.innerWidth < 768) {
    playerWrap.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

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

// Check for ?v= URL param (from home page still click or direct link)
const params = new URLSearchParams(window.location.search)
const paramId = parseInt(params.get('v'))

if (paramId && videos.find(v => v.id === paramId)) {
  loadVideo(paramId)
} else {
  // Default to first video
  loadVideo(videos[0].id)
}

// Handle browser back/forward
window.addEventListener('popstate', (e) => {
  if (e.state && e.state.videoId) {
    loadVideo(e.state.videoId)
  }
})
