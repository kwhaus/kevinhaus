import config from './site.config.js'
import navHtml from '../pages/nav.html?raw'

// ── INJECT NAV ────────────────────────────────────────────────────────────────
const navMount = document.getElementById('kh-nav-mount')
if (navMount && !navMount.innerHTML.trim()) navMount.innerHTML = navHtml

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

// ── READ PRERENDERED DATA ─────────────────────────────────────────────────────
// build/prerender.js bakes both of these into index.html. No fetch, so the first
// still is already painting while this module parses.
function readJson(id) {
  const el = document.getElementById(id)
  if (!el) return null
  try {
    return JSON.parse(el.textContent)
  } catch (err) {
    console.error(`Could not parse #${id}:`, err)
    return null
  }
}

// ── INIT ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

  const stillImg  = document.getElementById('stillImg')
  const stillWrap = document.getElementById('stillWrap')
  if (!stillWrap || !stillImg) return

  const stillPool = readJson('kh-stills') || []
  const hero      = readJson('kh-hero')

  if (stillPool.length === 0) {
    stillWrap.style.display = 'none'
    return
  }

  // Start from the still already in the HTML, then shuffle the remainder — so
  // there's no swap on load, but the cycle is still randomised.
  function orderedPool() {
    if (!hero) return shuffle(stillPool)
    const rest = stillPool.filter(s => s.src !== hero.src)
    return [hero, ...shuffle(rest)]
  }

  let pool           = orderedPool()
  let currentIndex   = 0
  let currentVideoId = pool[0].videoId
  let currentVideoUrl = pool[0].url
  let cycleTimer     = null

  // ── SHOW STILL ─────────────────────────────────────────────────────────────
  function showStill(index) {
    const item = pool[index % pool.length]
    currentVideoId = item.videoId
    currentVideoUrl = item.url
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

  // ── CLICK → VIDEO ──────────────────────────────────────────────────────────
  let isDragging = false

  stillWrap.addEventListener('click', () => {
    if (!isDragging && currentVideoId !== null) {
      window.location.href = currentVideoUrl || '/work.html'
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
  // Don't call showStill(0) — the hero is already in the HTML and reassigning
  // src would discard an in-flight fetch. Just warm the neighbours.
  preload(pool[1 % pool.length].src)
  preload(pool[pool.length - 1].src)
  cycleTimer = setInterval(() => goTo(1), config.stillHoldTime)

  // Signal main.js to dismiss the preloader once the still is actually visible.
  const signalReady = () => document.dispatchEvent(new CustomEvent('kh:first-still-loaded'))
  if (stillImg.complete && stillImg.naturalWidth > 0) {
    signalReady()
  } else {
    stillImg.addEventListener('load',  signalReady, { once: true })
    stillImg.addEventListener('error', signalReady, { once: true })
  }

})
