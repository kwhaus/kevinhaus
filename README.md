# kevinhaus.com — Site Rebuild

Vite + Bootstrap 5.3 static site. All video data lives in one JSON file.

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or newer
- A terminal (Terminal on Mac, or any shell)

---

## First-time setup

```bash
# 1. Unzip this project folder and open a terminal inside it
cd kevinhaus

# 2. Install dependencies (only needed once)
npm install

# 3. Start the development server
npm run dev
```

Your browser will open automatically at `http://localhost:3000`.
Hot reload is on — save any file and the browser updates instantly.

---

## Project structure

```
kevinhaus/
├── src/
│   ├── index.html          ← Home page
│   ├── work.html           ← Work / portfolio page
│   ├── about.html          ← About page
│   ├── contact.html        ← Contact page
│   ├── reel.html           ← Client showcase/reel page
│   ├── admin.html          ← Admin panel (password protected)
│   ├── videos.json         ← ★ ALL VIDEO DATA LIVES HERE ★
│   ├── pages/
│   │   └── nav.html        ← Shared nav markup (injected into every page)
│   ├── js/
│   │   ├── main.js         ← Shared JS: Bootstrap, theme toggle, nav
│   │   ├── site.config.js  ← ★ GLOBAL SETTINGS (asset URL, timing, etc.) ★
│   │   ├── home.js         ← Home page: still cycling logic
│   │   ├── work.js         ← Work page: playlist + player
│   │   ├── reel.js         ← Reel page: tabs + sidebar player
│   │   └── admin.js        ← Admin panel logic
│   └── scss/
│       └── styles.scss     ← All styles (Bootstrap + site styles)
├── vite.config.js          ← Vite configuration (pages, aliases)
├── package.json
└── README.md
```

---

## The two most important files

### `src/videos.json`
This is the single source of truth for all video content.
Every page — Work, Home stills, Reel sidebar — reads from here.

**To add a new video:** add an object to the array:
```json
{
  "id": 14,
  "title": "Artist - Song Title",
  "artist": "Artist Name",
  "song": "Song Title",
  "type": "music video",
  "assetId": "YOUR_MUX_ASSET_ID",
  "playbackId": "YOUR_MUX_PLAYBACK_ID",
  "aspectRatio": "16:9",
  "stills": ["filename01.jpg", "filename02.jpg"]
}
```

**To reorder videos:** drag cards in the Admin panel, then download and replace the file.

Valid `type` values: `"music video"`, `"commercial"`, `"branded content"`, `"short film"`

Valid `aspectRatio` values: `"16:9"`, `"12:5"`, `"4:3"`

---

### `src/js/site.config.js`
All global settings in one place:

| Setting | Default | What it does |
|---|---|---|
| `assetsBase` | `https://test.kevinhaus.com/assets` | Base URL for all images/logos/font |
| `stillHoldTime` | `3500` | Milliseconds each still is shown on Home |
| `stillFadeDuration` | `600` | Fade transition duration (ms) |
| `defaultTheme` | `'light'` | Starting color mode (`'light'` or `'dark'`) |
| `adminPassword` | `'changeme'` | Admin panel password |

**When going live:** change `assetsBase` to `https://kevinhaus.com/assets`

---

## Adding a new page

1. Create `src/yourpage.html` (copy any existing page as a template)
2. Create `src/js/yourpage.js` (at minimum: `import navHtml from '../pages/nav.html?raw'; document.getElementById('kh-nav-mount').innerHTML = navHtml`)
3. Add the page to `vite.config.js` under `rollupOptions.input`:
   ```js
   yourpage: resolve(__dirname, 'src/yourpage.html'),
   ```
4. Add a link to `src/pages/nav.html`

---

## Admin panel

Visit `/admin.html` in your browser.

- **Password:** set in `src/js/site.config.js` → `adminPassword`
- **Reorder:** drag cards up/down
- **Add video:** fill in the form at the bottom
- **Delete:** click × on any card
- **Save:** click "Download videos.json", then replace `src/videos.json` with the downloaded file

After updating `videos.json`, run `npm run build` to rebuild the site.

> Note: This is simple client-side password protection — suitable for a personal tool,
> not for protecting sensitive data. The password is visible in the built JS bundle.

---

## Light / Dark mode

- The visitor can toggle with the ☾/☀ button in the nav
- Their preference is saved in `localStorage`
- To change the default: edit `defaultTheme` in `site.config.js`
- Logo images swap automatically:
  - Light mode → `MainLogo_blk.png`
  - Dark mode → `MainLogo_wht.png`

---

## Reel page

The reel page (`reel.html`) is configured in `src/js/reel.js` at the top:

```js
const reels = [
  {
    id: 'music-videos',
    label: 'Music Videos',
    videoIds: [1, 2, 3, 4, 5, 6, 8, 10, 13],  // IDs from videos.json
  },
  // Add more reels here...
]
```

To create a custom reel for a client: duplicate `reel.html` and its JS, change the `reels` array to include only the videos you want to show.

---

## Building for production

```bash
npm run build
```

Output goes to the `dist/` folder. Upload its contents to your server.

```bash
# Preview the production build locally before uploading:
npm run preview
```

**Before building for go-live:**
1. Update `assetsBase` in `site.config.js` to `https://kevinhaus.com/assets`
2. Update `base` in `vite.config.js` to `'/'` (already set)
3. Run `npm run build`
4. Upload `dist/` contents to `kevinhaus.com`

---

## Albertus font

The font is loaded from `{assetsBase}/AlbertusMT.ttf`.
Make sure `AlbertusMT.ttf` is in your assets folder on the server.
If you rename the file, update the path in `src/scss/styles.scss` → `@font-face`.

---

## Mux video notes

- Use **Playback ID** (not Asset ID) in the `playbackId` field
- Set video quality to **Plus** in your Mux dashboard before uploading
- Thumbnail images on the reel page are pulled automatically from:
  `https://image.mux.com/{PLAYBACK_ID}/thumbnail.webp`
- No Mux API key is needed for playback — Playback IDs are public
test
test2
