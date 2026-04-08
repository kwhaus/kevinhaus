import config from './site.config.js'
import navHtml from '../pages/nav.html?raw'

// ── INJECT NAV ────────────────────────────────────────────────────────────────
const navMount = document.getElementById('kh-nav-mount')
if (navMount) navMount.innerHTML = navHtml

// ── SHUFFLE ───────────────────────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function preload(src) {
  const img = new Image()
  img.src = src
}

// ── INIT ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {

  const stillImg  = document.getElementById('stillImg')
  const stillWrap = document.getElementById('stillWrap')
  if (!stillWrap || !stillImg) return

  // ── FETCH VIDEOS ───────────────────────────────────────────────────────────
  let videoData = []
  try {
    const res = await fetch('/.netlify/functions/get-videos')
    const data = await res.json()
    videoData = Array.isArray(data) ? data : []

    // Fall back to bundled JSON if Blobs is empty
    if (videoData.length === 0) {
      const fallback = await import('../videos.json')
      videoData = fallback.default || []
    }
  } catch {
    // Fall back to bundled JSON on any network error
    try {
      const fallback = await import('../videos.json')
      videoData = fallback.default || []
    } catch { videoData = [] }
  }

  // ── BUILD STILL POOL ───────────────────────────────────────────────────────
  // Only use stills from portfolio videos on the home page
  const portfolioVideos = videoData.filter(v => v.showInPortfolio !== false)
  const stillPool = []
  portfolioVideos.forEach(video => {
    if (video.stills && video.stills.length > 0) {
      video.stills.forEach(filename => {
        stillPool.push({
          src: `${config.assetsBase}/Stills/${filename}`,
          videoId: video.id,
          videoTitle: video.title,
        })
      })
    }
  })

  if (stillPool.length === 0) {
    stillWrap.style.display = 'none'
    return
  }

  let pool           = shuffle(stillPool)
  let currentIndex   = 0
  let currentVideoId = null
  let cycleTimer     = null

  // ── SHOW STILL ─────────────────────────────────────────────────────────────
  function showStill(index) {
    const item = pool[index % pool.length]
    currentVideoId = item.videoId
    stillImg.src = item.src
    stillImg.alt = item.videoTitle
    preload(pool[(index + 1) % pool.length].src)
    preload(pool[(index - 1 + pool.length) % pool.length].src)
  }

  // ── NAVIGATION ─────────────────────────────────────────────────────────────
  function goTo(direction) {
    currentIndex = (currentIndex + direction + pool.length) % pool.length
    if (direction === 1 && currentIndex === 0) pool = shuffle(stillPool)
    showStill(currentIndex)
  }

  function resetCycle() {
    clearInterval(cycleTimer)
    cycleTimer = setInterval(() => goTo(1), config.stillHoldTime)
  }

  function startCycle() {
    showStill(currentIndex)
    cycleTimer = setInterval(() => goTo(1), config.stillHoldTime)
  }

  // ── CLICK → VIDEO ──────────────────────────────────────────────────────────
  let isDragging = false

  stillWrap.addEventListener('click', () => {
    if (!isDragging && currentVideoId !== null) {
      window.location.href = `/work.html?v=${currentVideoId}`
    }
  })

  // ── TOUCH SWIPE ────────────────────────────────────────────────────────────
  const SWIPE_THRESHOLD = 40
  let touchStartX = null
  let touchStartY = null

  stillWrap.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX
    touchStartY = e.touches[0].clientY
  }, { passive: true })

  stillWrap.addEventListener('touchend', e => {
    if (touchStartX === null) return
    const dx = e.changedTouches[0].clientX - touchStartX
    const dy = e.changedTouches[0].clientY - touchStartY
    if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
      goTo(dx < 0 ? 1 : -1)
      resetCycle()
    }
    touchStartX = null
    touchStartY = null
  })

  // ── MOUSE DRAG ─────────────────────────────────────────────────────────────
  let mouseStartX = null

  stillWrap.addEventListener('mousedown', e => {
    if (e.target.closest('button, a')) return
    mouseStartX = e.clientX
    isDragging  = false
  })

  window.addEventListener('mousemove', e => {
    if (mouseStartX !== null && Math.abs(e.clientX - mouseStartX) > 8) {
      isDragging = true
      stillWrap.style.cursor = 'grabbing'
    }
  })

  window.addEventListener('mouseup', e => {
    if (mouseStartX === null) return
    const dx = e.clientX - mouseStartX
    stillWrap.style.cursor = 'pointer'
    if (Math.abs(dx) > SWIPE_THRESHOLD) {
      goTo(dx < 0 ? 1 : -1)
      resetCycle()
    }
    mouseStartX = null
    setTimeout(() => { isDragging = false }, 10)
  })

  stillWrap.addEventListener('mouseleave', () => {
    if (mouseStartX !== null) {
      mouseStartX = null
      stillWrap.style.cursor = 'pointer'
    }
  })

  // ── ARROW KEYS ─────────────────────────────────────────────────────────────
  document.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { goTo(1);  resetCycle() }
    if (e.key === 'ArrowLeft')  { goTo(-1); resetCycle() }
  })

  // ── START ──────────────────────────────────────────────────────────────────
  startCycle()

})
