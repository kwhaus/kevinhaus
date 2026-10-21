import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import purgecss from 'vite-plugin-purgecss'
import prerender from './build/prerender.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  base: '/',

  root: resolve(__dirname, 'src'),
  publicDir: resolve(__dirname, 'public'),

  plugins: [
    prerender(),                                       // must come before purgecss
    purgecss({
      content: [
        resolve(__dirname, 'src/**/*.html'),
        resolve(__dirname, 'src/**/*.js'),
      ],
      safelist: {
        standard: [
          /^show$/,
          /^collaps/,
          /^offcanvas/,
          /^modal/,
          /^dropdown/,
          /^fade$/,
          /^active$/,
          /^data-bs-theme/,
          // Prerendered playlist classes — generated at build time, so the
          // static scan of src/ won't always see them.
          /^kh-playlist/,
          // Project-page markup is generated in build/prerender.js, which
          // PurgeCSS doesn't scan.
          /^kh-project/,
        ],
        deep: [
          /dragging/,
          /drag-over/,
          /fading/,
          /kh-preloader/,
        ],
      },
    }),
  ],

  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main:    resolve(__dirname, 'src/index.html'),
        work:    resolve(__dirname, 'src/work.html'),
        // Template for /work/<slug>/ — prerender.js stamps one page per project
        // from it, then removes it from dist.
        project: resolve(__dirname, 'src/project.html'),
        about:   resolve(__dirname, 'src/about.html'),
        contact: resolve(__dirname, 'src/contact.html'),
        reel:    resolve(__dirname, 'src/reel.html'),
        admin:   resolve(__dirname, 'src/admin.html'),
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/bootstrap')) return 'bootstrap'
          if (id.includes('videos.json'))            return 'videos'
        },
      },
    },
  },

  optimizeDeps: {
    exclude: ['@netlify/blobs'],
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
        silenceDeprecations: ['import', 'mixed-decls', 'color-functions', 'global-builtin'],
      },
    },
  },
})
