import navHtml from '../pages/nav.html?raw'

// ── INJECT NAV ────────────────────────────────────────────────────────────────
const navMount = document.getElementById('kh-nav-mount')
if (navMount && !navMount.innerHTML.trim()) navMount.innerHTML = navHtml