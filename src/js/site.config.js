// ── SITE CONFIGURATION ────────────────────────────────────────────────────────
// Edit this file to change global settings without touching page code.

const config = {

  // Relative path — works on any domain automatically, no changes needed
  // when moving between test, live, or any future domain.
  assetsBase: 'https://kevinhaus.com/assets',

  // How long (in milliseconds) each still image is displayed on the home page.
  // 1000 = 1 second. Default: 3500 (3.5 seconds)
  stillHoldTime: 1500,

  // Fade transition duration for still images (ms). 0 = instant cut.
  stillFadeDuration: 0,

  // Default color mode: 'light' or 'dark'
  defaultTheme: 'light',

  // Admin page password (simple client-side protection — not for sensitive data)
  adminPassword: import.meta.env.VITE_ADMIN_PASSWORD || 'changeme',

}

export default config
