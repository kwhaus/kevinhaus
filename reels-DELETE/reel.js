// ── REEL PAGE ─────────────────────────────────────────────────────────────────
// Loads reel config from Netlify Blobs via get-reel function.
// Fires a view notification via the notify function.
// URL format: reels.kevinhaus.com/?id=client-name-2025

const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X',
               'XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX']
function toRoman(n) { return ROMAN[n - 1] || String(n) }

const root   = document.getElementById('reelRoot')
const params = new URLSearchParams(window.location.search)
const reelId = params.get('id')

// ── MAIN ──────────────────────────────────────────────────────────────────────
async function init() {
  if (!reelId) {
    showMessage('No reel specified.')
    return
  }

  try {
    // Fetch reel config
    const res  = await fetch(`https://kevinhaus.com/.netlify/functions/get-reel?id=${reelId}`)
    if (!res.ok) { showMessage('Reel not found.'); return }
    const reel = await res.json()

    if (!reel || !reel.videos || reel.videos.length === 0) {
      showMessage('This reel has no videos.')
      return
    }

    buildLayout(reel)

    // Fire view notification (fire and forget)
    notify(reelId, reel.clientName)

  } catch (err) {
    console.error('Reel load error:', err)
    showMessage('Failed to load reel.')
  }
}

// ── BUILD LAYOUT ──────────────────────────────────────────────────────────────
function buildLayout(reel) {
  const videos   = reel.videos
  let activeIndex = 0

  root.innerHTML = `
    <div class="reel-layout">
      <div class="reel-player-col">
        <div class="reel-player-wrap" id="playerWrap" data-ratio="${videos[0].aspectRatio || '16:9'}">
          <mux-player
            id="reelPlayer"
            playback-id="${videos[0].playbackId}"
            metadata-video-title="${videos[0].title}"
            poster="${getPoster(videos[0])}"
            stream-type="on-demand"
            controls
            style="width:100%;height:100%;"
          ></mux-player>
        </div>
        <p class="reel-video-title" id="videoTitle">${videos[0].title}</p>
      </div>
      <div class="reel-playlist-col" id="playlist"></div>
    </div>
  `

  const player     = document.getElementById('reelPlayer')
  const playerWrap = document.getElementById('playerWrap')
  const titleEl    = document.getElementById('videoTitle')
  const playlist   = document.getElementById('playlist')

  // Build playlist
  videos.forEach((video, i) => {
    const item = document.createElement('div')
    item.className = `reel-playlist-item${i === 0 ? ' active' : ''}`
    item.dataset.index = i
    item.innerHTML = `
      <div class="reel-playlist-thumb">
        <img src="${getPoster(video)}" alt="${video.title}" loading="lazy">
      </div>
      <div class="reel-playlist-info">
        <div class="reel-playlist-num">${toRoman(i + 1)}</div>
        <div class="reel-playlist-name">${video.title}</div>
      </div>
    `
    item.addEventListener('click', () => loadVideo(i))
    playlist.appendChild(item)
  })

  function loadVideo(index) {
    const video = videos[index]
    activeIndex = index

    player.setAttribute('playback-id', video.playbackId)
    player.setAttribute('metadata-video-title', video.title)
    player.setAttribute('poster', getPoster(video))
    playerWrap.dataset.ratio = video.aspectRatio || '16:9'
    titleEl.textContent = video.title

    // Update active state
    playlist.querySelectorAll('.reel-playlist-item').forEach((el, i) => {
      el.classList.toggle('active', i === index)
    })

    // Scroll to top on mobile
    if (window.innerWidth < 768) {
      playerWrap.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function getPoster(video) {
  if (video.coverImage) {
    return `https://kevinhaus.com/assets/Covers/${video.coverImage}`
  }
  return `https://image.mux.com/${video.playbackId}/thumbnail.webp?time=3&width=640`
}

function showMessage(msg) {
  root.innerHTML = `<div class="reel-message">${msg}</div>`
}

async function notify(reelId, clientName) {
  try {
    await fetch('https://kevinhaus.com/.netlify/functions/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reelId,
        clientName: clientName || reelId,
        timestamp: new Date().toISOString(),
      }),
    })
  } catch (err) {
    // Notification failure is silent — don't affect the viewer's experience
    console.warn('Notification failed:', err)
  }
}

init()
