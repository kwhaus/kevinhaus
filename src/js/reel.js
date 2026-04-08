import config from './site.config.js'
import navHtml from '../pages/nav.html?raw'

// ── INJECT NAV ────────────────────────────────────────────────────────────────
const navMount = document.getElementById('kh-nav-mount')
if (navMount) navMount.innerHTML = navHtml

// ── ROMAN NUMERALS ────────────────────────────────────────────────────────────
const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X',
               'XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX']
function toRoman(n) { return ROMAN[n - 1] || String(n) }

// ── DOM REFS ──────────────────────────────────────────────────────────────────
const titleEl    = document.getElementById('reelViewerTitle')
const layout     = document.getElementById('reelViewerLayout')
const playerWrap = document.getElementById('reelPlayerWrap')
const player     = document.getElementById('reelPlayer')
const playlistEl = document.getElementById('reelPlaylist')
const messageEl  = document.getElementById('reelMessage')

// ── HELPERS ───────────────────────────────────────────────────────────────────
function getPoster(video) {
  if (video.coverImage) return `${config.assetsBase}/Covers/${video.coverImage}`
  return `https://image.mux.com/${video.playbackId}/thumbnail.webp?time=3&width=640`
}

function showMessage(msg) {
  messageEl.textContent = msg
  messageEl.style.display = ''
  layout.style.display = 'none'
  titleEl.style.display = 'none'
}

// ── INIT ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {

  const params = new URLSearchParams(window.location.search)
  const reelId = params.get('id')

  if (!reelId) {
    showMessage('No reel specified.')
    return
  }

  try {
    const res  = await fetch(`/.netlify/functions/get-reel?id=${reelId}`)
    if (!res.ok) { showMessage('Reel not found.'); return }
    const reel = await res.json()

    if (!reel.videos || reel.videos.length === 0) {
      showMessage('This reel has no videos.')
      return
    }

    // Show reel name above player
    titleEl.textContent = reel.clientName || reel.id
    titleEl.style.display = ''

    // Hide loading message, show layout
    messageEl.style.display = 'none'
    layout.style.display = ''

    // Load first video
    loadVideo(reel.videos, 0)

    // Build playlist
    buildPlaylist(reel.videos)

    // Fire view notification (silent — doesn't affect viewer)
    notifyView(reelId, reel.clientName)

  } catch (err) {
    console.error('Reel error:', err)
    showMessage('Failed to load reel.')
  }
})

// ── LOAD VIDEO ────────────────────────────────────────────────────────────────
function loadVideo(videos, index) {
  const video = videos[index]
  if (!video) return

  player.setAttribute('playback-id', video.playbackId)
  player.setAttribute('metadata-video-title', video.title)
  player.setAttribute('poster', getPoster(video))
  playerWrap.dataset.ratio = video.aspectRatio || '16:9'

  // Update active state in playlist
  playlistEl.querySelectorAll('.kh-reel-viewer-item').forEach((el, i) => {
    el.classList.toggle('active', i === index)
  })

  // Scroll to player on mobile
  if (window.innerWidth < 768) {
    playerWrap.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

// ── BUILD PLAYLIST ────────────────────────────────────────────────────────────
function buildPlaylist(videos) {
  playlistEl.innerHTML = ''

  videos.forEach((video, index) => {
    const item = document.createElement('div')
    item.className = `kh-reel-viewer-item${index === 0 ? ' active' : ''}`

    item.innerHTML = `
      <div class="kh-reel-viewer-thumb">
        <img src="${getPoster(video)}" alt="${video.title}" loading="lazy">
      </div>
      <div class="kh-reel-viewer-info">
        <span class="kh-reel-viewer-num">${toRoman(index + 1)}</span>
        <span class="kh-reel-viewer-name">${video.title}</span>
      </div>
    `

    item.addEventListener('click', () => loadVideo(videos, index))
    playlistEl.appendChild(item)
  })
}

// ── NOTIFY ────────────────────────────────────────────────────────────────────
async function notifyView(reelId, clientName) {
  try {
    await fetch('/.netlify/functions/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reelId,
        clientName: clientName || reelId,
        timestamp: new Date().toISOString(),
      }),
    })
  } catch { /* silent */ }
}
