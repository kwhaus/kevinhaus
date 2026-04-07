import videos from '../videos.json'
import config from './site.config.js'
import navHtml from '../pages/nav.html?raw'

// ── INJECT NAV ────────────────────────────────────────────────────────────────
document.getElementById('kh-nav-mount').innerHTML = navHtml

// ── REEL DEFINITIONS ──────────────────────────────────────────────────────────
// Edit this array to configure reels for different clients.
// Each reel contains an array of video IDs from videos.json.
// Order of IDs = order shown in sidebar.
const reels = [
  {
    id: 'music-videos',
    label: 'Music Videos',
    videoIds: [1, 2, 3, 4, 5, 6, 8, 10, 13],
  },
  {
    id: 'commercials',
    label: 'Commercials',
    videoIds: [7, 9, 12],
  },
  {
    id: 'all-work',
    label: 'All Work',
    videoIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
  },
]

// ── STATE ─────────────────────────────────────────────────────────────────────
let activeReelId = reels[0].id
let activeVideoId = null
let playerEl = null

// ── DOM REFS ──────────────────────────────────────────────────────────────────
const tabsEl      = document.getElementById('reelTabs')
const listEl      = document.getElementById('reelList')
const playerArea  = document.getElementById('reelPlayerArea')
const emptyEl     = document.getElementById('reelEmpty')
const metaEl      = document.getElementById('reelMeta')
const metaTitleEl = document.getElementById('reelMetaTitle')
const metaTypeEl  = document.getElementById('reelMetaType')

// ── HELPERS ───────────────────────────────────────────────────────────────────
function getReelVideos(reelId) {
  const reel = reels.find(r => r.id === reelId)
  if (!reel) return []
  return reel.videoIds
    .map(id => videos.find(v => v.id === id))
    .filter(Boolean)
}

// ── BUILD TABS ────────────────────────────────────────────────────────────────
function buildTabs() {
  tabsEl.innerHTML = ''
  reels.forEach(reel => {
    const btn = document.createElement('button')
    btn.className = 'kh-reel-tab' + (reel.id === activeReelId ? ' active' : '')
    btn.textContent = reel.label
    btn.addEventListener('click', () => switchReel(reel.id))
    tabsEl.appendChild(btn)
  })
}

// ── BUILD SIDEBAR ─────────────────────────────────────────────────────────────
function buildSidebar() {
  const reelVideos = getReelVideos(activeReelId)
  listEl.innerHTML = ''

  reelVideos.forEach(video => {
    const item = document.createElement('div')
    item.className = 'kh-reel-item' + (video.id === activeVideoId ? ' active' : '')
    item.dataset.id = video.id

    // Thumbnail from Mux image API
    const thumbSrc = `https://image.mux.com/${video.playbackId}/thumbnail.webp?width=200&time=3`

    // Fallback: first still from assets if it exists
    const fallbackSrc = video.stills.length > 0
      ? `${config.assetsBase}/Stills/${video.stills[0]}`
      : ''

    item.innerHTML = `
      <div class="kh-reel-thumb">
        <img
          src="${thumbSrc}"
          alt="${video.title}"
          loading="lazy"
          onerror="if(this.src!=='${fallbackSrc}')this.src='${fallbackSrc}'"
        >
      </div>
      <div class="kh-reel-info">
        <span class="info-artist">${video.artist}</span>
        ${video.song ? `<span class="info-song">${video.song}</span>` : ''}
        <span class="info-type">${video.type}</span>
      </div>
    `
    item.addEventListener('click', () => playVideo(video.id))
    listEl.appendChild(item)
  })
}

// ── SWITCH REEL ───────────────────────────────────────────────────────────────
function switchReel(reelId) {
  activeReelId = reelId
  activeVideoId = null

  // Update tab states
  tabsEl.querySelectorAll('.kh-reel-tab').forEach(btn => {
    btn.classList.toggle('active', btn.textContent === reels.find(r => r.id === reelId).label)
  })

  clearPlayer()
  buildSidebar()
}

// ── PLAY VIDEO ────────────────────────────────────────────────────────────────
function playVideo(id) {
  const video = videos.find(v => v.id === id)
  if (!video) return

  activeVideoId = id

  // Update sidebar active state
  listEl.querySelectorAll('.kh-reel-item').forEach(el => {
    el.classList.toggle('active', parseInt(el.dataset.id) === id)
  })

  // Remove old player
  if (playerEl) playerEl.remove()
  emptyEl.style.display = 'none'

  // Create mux-player
  playerEl = document.createElement('mux-player')
  playerEl.setAttribute('playback-id', video.playbackId)
  playerEl.setAttribute('metadata-video-title', video.title)
  playerEl.setAttribute('playsinline', '')
  playerEl.setAttribute('autoplay', '')
  playerEl.style.cssText = 'position:absolute; inset:0; width:100%; height:100%;'
  playerArea.appendChild(playerEl)

  // Update meta bar
  metaTitleEl.textContent = video.title
  metaTypeEl.textContent = video.type
  metaEl.style.display = 'flex'
}

// ── CLEAR PLAYER ─────────────────────────────────────────────────────────────
function clearPlayer() {
  if (playerEl) { playerEl.remove(); playerEl = null }
  emptyEl.style.display = 'flex'
  metaEl.style.display = 'none'
}

// ── INIT ──────────────────────────────────────────────────────────────────────
buildTabs()
buildSidebar()
