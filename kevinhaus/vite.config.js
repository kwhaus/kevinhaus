import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  // ── BASE URL ──────────────────────────────────────────────────────────────
  // Change to '/' when deploying to kevinhaus.com
  base: '/',

  root: resolve(__dirname, 'src'),

  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      // ── PAGES ─────────────────────────────────────────────────────────────
      // Add new pages here. Each entry becomes a standalone HTML file.
      input: {
        main:    resolve(__dirname, 'src/index.html'),
        work:    resolve(__dirname, 'src/work.html'),
        about:   resolve(__dirname, 'src/about.html'),
        contact: resolve(__dirname, 'src/contact.html'),
        reel:    resolve(__dirname, 'src/reel.html'),
        admin:   resolve(__dirname, 'src/admin.html'),
      },
    },
  },

  resolve: {
    alias: {
      '~bootstrap': resolve(__dirname, 'node_modules/bootstrap'),
    },
  },

  server: {
    port: 3000,
    open: true,
  },

  css: {
    preprocessorOptions: {
      scss: {
        // Suppress Sass deprecation warnings from Bootstrap internals
        silenceDeprecations: ['import', 'mixed-decls', 'color-functions', 'global-builtin'],
      },
    },
  },
})
