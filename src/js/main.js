// ── IMPORTS ───────────────────────────────────────────────────────────────────
import '../scss/styles.scss'
import * as bootstrap from 'bootstrap'
import config from './site.config.js'

// ── THEME ─────────────────────────────────────────────────────────────────────
function getTheme() {
  return localStorage.getItem('kh-theme') || config.defaultTheme
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-bs-theme', theme)
  localStorage.setItem('kh-theme', theme)

  // Swap logo images: light mode → black logo, dark mode → white logo
  document.querySelectorAll('[data-logo-light]').forEach(img => {
    img.src = theme === 'dark'
      ? img.dataset.logoDark
      : img.dataset.logoLight
  })
}

function toggleTheme() {
  const current = getTheme()
  applyTheme(current === 'dark' ? 'light' : 'dark')
}

// ── NAV ACTIVE STATE ──────────────────────────────────────────────────────────
function setActiveNav() {
  const path = window.location.pathname
  document.querySelectorAll('.kh-nav-link').forEach(link => {
    const href = link.getAttribute('href') || ''
    const isHome = (href === '/index.html' || href === '/') && (path === '/' || path.endsWith('index.html'))
    const isMatch = !isHome && href !== '/' && href !== '/index.html' && path.includes(href.replace('.html', ''))
    link.classList.toggle('active', isHome || isMatch)
  })
}

// ── INIT ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Apply saved or default theme immediately
  applyTheme(getTheme())

  // Dismiss preloader once page is ready
  const preloader = document.getElementById('khPreloader')
  if (preloader) {
    // Small delay so the first paint is complete before fading out
    setTimeout(() => {
      preloader.classList.add('kh-preloader--hidden')
      // Remove from DOM after fade completes so it doesn't block interaction
      preloader.addEventListener('transitionend', () => preloader.remove(), { once: true })
    }, 300)
  }

  // Theme toggle button
  document.querySelectorAll('.kh-theme-toggle').forEach(btn => {
    btn.addEventListener('click', toggleTheme)
  })

  // Active nav
  setActiveNav()

  // Bootstrap offcanvas — close on nav link click
  document.querySelectorAll('.kh-nav-link').forEach(link => {
    link.addEventListener('click', () => {
      const offcanvasEl = document.getElementById('khOffcanvas')
      if (offcanvasEl) {
        const instance = bootstrap.Offcanvas.getInstance(offcanvasEl)
        if (instance) instance.hide()
      }
    })
  })
})

// ── EXPORTS ───────────────────────────────────────────────────────────────────
export { applyTheme, getTheme, toggleTheme }
