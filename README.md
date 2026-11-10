# kevinhaus.com

Director portfolio for Kevin Haus. Built with Vite and Bootstrap, hosted on Netlify, videos on Mux.

You can run most of the site day to day from the **admin page** at **kevinhaus.com/admin.html**, with no code involved. The rest of this file covers how to use it, how to work on the site on your Mac, and where things live.

---

## Contents

1. [Using the admin page](#1-using-the-admin-page)
2. [Working on the site on your Mac](#2-working-on-the-site-on-your-mac)
3. [How changes go live](#3-how-changes-go-live)
4. [Where things live](#4-where-things-live)
5. [Images: stills, covers, behind the scenes](#5-images-stills-covers-behind-the-scenes)
6. [Mux notes](#6-mux-notes)
7. [Settings and secrets (Netlify environment variables)](#7-settings-and-secrets-netlify-environment-variables)
8. [Updating the Netlify token](#8-updating-the-netlify-token)

---

## 1. Using the admin page

Go to **https://kevinhaus.com/admin.html** and log in with the admin password (the `ADMIN_PASSWORD` setting in Netlify). The admin page only works on the live site or a Netlify preview, not on your Mac (see [section 2](#what-works-locally-and-what-doesnt)).

It has three tabs.

### Videos tab: your portfolio

This is the list every public page is built from: the Work page, each project page at `/work/<name>/`, and the stills on the Home page.

| To… | Do this |
|---|---|
| Reorder | Drag cards up or down. |
| Edit details | Click **Edit** on a card (title, client, date, cover, stills, behind-the-scenes, and so on). |
| Hide from the portfolio | Uncheck **Portfolio** on the card. The video stays on the list and can still go in reels. |
| Remove | Click **×**. |
| Add by hand | Fill in **Add New Video** at the bottom and click **+ Add to List**. |
| **Publish** | Click **Save to Live Site**. Nothing changes publicly until you do. |

After saving, Netlify rebuilds the site, which takes about 1–2 minutes, and then the changes are live.

**From your Mux library** (below the list) compares your Mux account with this list:

- It shows only Mux videos that aren't on your list yet. Matching uses the Mux asset ID and every playback ID, including behind-the-scenes clips.
- **+ Add (hidden)** adds the video with **Portfolio off**, with the title, IDs and aspect ratio filled in. To make it public: click Edit and add a cover or stills if you want, check Portfolio, then Save to Live Site.
- It also lists any entries on your list whose video can't be found in Mux. This is only a warning; nothing is removed.
- Signed-only (private) Mux videos are counted but not offered, because the public pages can't play them.

> **Video types** decide which filter a project appears under on the Work page:
> `short film` → Narrative · `music video` → Music Video · `commercial` or `branded content` → Commercial.

### Reels tab: private client reels

A reel is a private page with a hand-picked set of videos, at `kevinhaus.com/reel.html?id=<slug>`.

1. Type the **client name**. The URL slug fills in by itself, and you can change it.
2. Click videos in the left column to add them. Drag to reorder, and click **×** to remove.
   - Videos at the bottom under **Mux library** aren't on your portfolio list. Adding them puts them in this reel only.
3. Click **Save Reel** and copy the link.

Existing reels are listed at the top, where you can open or delete them. You get an email at hello@kevinhaus.com when someone opens a reel. Repeat visits from the same person and device don't send another one.

### Deliver tab: download emails

This sends someone a branded email with buttons that download the MP4 file(s).

1. **Videos:** tick one or more videos. If a video says **Create MP4**, click it; Mux makes the downloadable file (usually a minute or two), and the page updates by itself when it's ready.
2. **Email:** check the title and greeting, and add a message if you like. Each video gets a label (for example "Horizontal 16:9" or "Vertical 9:16") and a downloaded file name, both of which you can edit.
3. **Send:** click **Copy for Gmail**, open a new Gmail message, and paste (Cmd+V). **Download .html** saves the email as a file instead.

Anyone with the email can download the files, including people it's forwarded to.

---

## 2. Working on the site on your Mac

### One-time setup

You need [Node.js](https://nodejs.org/) (version 22, the same as Netlify) and the GitHub command line tool `gh`, already logged in as `kwhaus`.

```bash
# Get the code (skip if you already have the folder)
gh repo clone kwhaus/kevinhaus
cd kevinhaus

# Install the project's tools (again whenever package.json changes)
npm install
```

### Every time you work on it

```bash
cd kevinhaus
git pull            # get the latest, including anything merged on GitHub
npm run dev         # start the local site
```

Your browser opens **http://localhost:3000**. Leave Terminal running. Edit any file in `src/` and save, and the page updates on its own. Press **Ctrl+C** in Terminal to stop.

The local site uses the **live** video list from kevinhaus.com when it can reach it, and falls back to `src/videos.json` when it can't (for example when you're offline).

### What works locally, and what doesn't

| Works with `npm run dev` | Only works on the live site or a Netlify preview |
|---|---|
| Home, Work, About, Contact | Admin page (login, saving, Mux, Deliver) |
| Project pages (`/work/<name>/`) | Reel pages (`reel.html?id=…`) |
| All styles, layout, text, images | Reel-opened email notifications |

These need Netlify Functions and your secrets, which only exist on Netlify. To test them, use a pull request's **Deploy Preview** (see below).

### Saving your changes

**Small, safe changes** (text, spacing, an image), straight to the live site:

```bash
git add -A
git commit -m "Short description of the change"
git push
```

Netlify rebuilds and publishes automatically within a couple of minutes.

**Bigger changes, or anything you want to check first,** go on a branch with a pull request:

```bash
git checkout -b my-change          # new branch
# …edit, then:
git add -A
git commit -m "What changed"
git push -u origin my-change
gh pr create --fill                # opens a pull request
```

Netlify builds a **Deploy Preview** for the pull request, a private copy of the site with your change, including a working admin page. Its link appears on the pull request in GitHub and under **Deploys** in Netlify, for example `https://deploy-preview-3--kevinhaus.netlify.app`. If it looks right, click **Merge** on GitHub to go live. Afterwards, run `git checkout main && git pull` to get back to the main version.

### All commands

| Command | What it does |
|---|---|
| `npm run dev` | Local site at localhost:3000 with live reload. |
| `npm run build` | Builds the finished site into `dist/` (what Netlify runs). Useful to check for errors before pushing. |
| `npm run preview` | Serves the `dist/` build locally, after `npm run build`. |
| `npm run sync` | Copies the video list saved in the admin into `src/videos.json`, so the backup in the code matches the live site. Commit the file afterwards. |
| `npm run seed` | **Outdated, don't rely on it.** It was meant to push `src/videos.json` up as the live list, but it saves under an old storage name (`list`) that the site no longer reads (the admin saves as `catalog`). So it has no effect on the live site. Use the admin to change the list. Needs `NETLIFY_SITE_ID` and `NETLIFY_AUTH_TOKEN` in a `.env` file. |

---

## 3. How changes go live

There are two separate paths, and both end with Netlify rebuilding the site:

- **Code** (anything in this repository): push to `main`, or merge a pull request → Netlify builds → live.
- **Video list** (the admin Videos tab): **Save to Live Site** stores the list on Netlify (Netlify Blobs) and triggers a rebuild through the `BUILD_HOOK_URL` build hook → live.

During a build, the site uses the list saved in the admin. `src/videos.json` is only a backup, used when the saved list can't be read. Run `npm run sync` now and then to keep the backup current.

Reels aren't part of the build. They're saved on Netlify and work the moment you click Save Reel.

After each deploy, a small plugin clears Cloudflare's cache (`CF_ZONE_ID` and `CF_API_TOKEN`) so visitors get the new version straight away.

---

## 4. Where things live

```
kevinhaus/
├── src/                        ← the website
│   ├── index.html              Home
│   ├── work.html               Work (all projects)
│   ├── project.html            Template for each /work/<name>/ page
│   ├── about.html, contact.html
│   ├── reel.html               Private client reels
│   ├── admin.html              Admin page
│   ├── videos.json             Backup copy of the video list (see section 3)
│   ├── pages/nav.html          Menu shared by every page
│   ├── js/
│   │   ├── site.config.js      ★ Global settings (asset URL, still timing, default theme)
│   │   ├── main.js             Shared: menu, light/dark toggle
│   │   ├── home.js, work.js, about.js, contact.js, reel.js
│   │   ├── admin.js            Admin: Videos and Reels tabs
│   │   ├── mux-library.js      Admin: comparing with Mux
│   │   ├── deliver.js          Admin: Deliver tab
│   │   └── delivery-email.js   The download email's design
│   └── scss/styles.scss        All styles
├── public/                     Copied to the site as-is
│   └── assets/                 Logos, fonts, Stills/, Covers/, BTS/
├── build/prerender.js          Builds the Work page, project pages and home stills from the video list
├── netlify/
│   ├── functions/              Server code (the only place secrets are used)
│   │   ├── admin-login.js      Checks the admin password
│   │   ├── get-videos.js / save-videos.js   Read and save the video list
│   │   ├── get-reel.js / save-reel.js       Read and save reels
│   │   ├── notify.js           Emails you when a reel is opened (Resend)
│   │   └── mux.js              Talks to Mux for the admin (list videos, make MP4s)
│   └── plugins/cloudflare-purge/   Clears Cloudflare's cache after each deploy
├── scripts/                    `npm run sync` and `npm run seed`
├── netlify.toml                Netlify build settings and redirects
└── vite.config.js              Build tool settings (pages, dev server port)
```

**Adding a new page:** copy an existing page in `src/` and its file in `src/js/`, add it to `rollupOptions.input` in `vite.config.js`, and add a link in `src/pages/nav.html`.

**Global settings** in `src/js/site.config.js`:

| Setting | What it does |
|---|---|
| `assetsBase` | Where images, logos and the font load from (`https://kevinhaus.com/assets`). If it ever changes, also change `ASSETS_BASE` in `build/prerender.js`. |
| `stillHoldTime` | How long each still shows on the Home page, in milliseconds (3500 = 3.5 s). |
| `stillFadeDuration` | Fade between stills, in milliseconds (0 = hard cut). |
| `defaultTheme` | `'light'` or `'dark'` for first-time visitors. Their own choice is remembered after that. |

---

## 5. Images: stills, covers, behind the scenes

All images go in `public/assets/` and are published with the code, so add files there, then commit and push.

| Folder | Used for | Set in the admin (Edit on a project) as |
|---|---|---|
| `public/assets/Stills/` | Project page gallery and Home page stills | **Stills** (one filename per line). **Home-page stills** picks which ones show on Home; if blank, all of them do. |
| `public/assets/Covers/` | Thumbnail on the Work page | **Cover image filename**. If blank, a frame from Mux is used; **Thumbnail frame** picks the second. |
| `public/assets/BTS/<project-name>/` | Behind-the-scenes photos | **BTS photos**. If blank, every image in that folder is used, in filename order. A **behind-the-scenes video** is a Mux playback ID. |

`<project-name>` is the part of the project's address after `/work/`, for example `nothing-purple-strings`.

**Filenames must match exactly, including capital letters.** Your Mac treats `Still01.jpg` and `still01.jpg` as the same file, but Netlify doesn't, so a mismatch works locally and breaks on the live site. The build checks this and reports missing or broken stills in the Netlify deploy log.

---

## 6. Mux notes

- **Playback ID vs asset ID:** the *playback ID* is what plays a video and goes in links (`stream.mux.com/<playback ID>/…`). The *asset ID* identifies the video in your Mux account. The admin fills in both when you add from the Mux library.
- **Playback needs no key.** Playback IDs set to *public* play anywhere, so your Mux secret is only needed for the admin's Mux features.
- **Download links** have the form `https://stream.mux.com/<playback ID>/highest.mp4?download=FILE-NAME`. They only work once the MP4 exists, which the Deliver tab handles. Each MP4 adds a little Mux storage cost.
- **Public isn't private.** Anyone with a public playback ID or download link can watch or download. For confidential work, Mux *signed* playback is the secure option. The site doesn't support it yet, so those videos are skipped in the admin.
- Upload with video quality set to **Plus** in Mux.

---

## 7. Settings and secrets (Netlify environment variables)

Secrets are never in the code. They live in **Netlify → kevinhaus project → Project configuration → Environment variables**. The **Key** is the name below, and the **Value** is the secret.

| Key | Used for |
|---|---|
| `ADMIN_PASSWORD` | Admin login (also protects the admin's Mux and reel features). |
| `MUX_TOKEN_ID`, `MUX_TOKEN_SECRET` | Admin's Mux features. Create the token in Mux → Settings → Access Tokens with **Mux Video: Read + Write**, in the same environment as your videos. |
| `BUILD_HOOK_URL` | Lets **Save to Live Site** trigger a rebuild (Netlify → Build & deploy → Build hooks). |
| `BLOBS_TOKEN` | Lets the build read the saved video list. |
| `RESEND_API_KEY` | Sends the "reel opened" emails. |
| `CF_ZONE_ID`, `CF_API_TOKEN` | Clearing Cloudflare's cache after deploys. |

Notes:

- Variables belong to **one Netlify project**. This repository also deploys a second project (kh-reels), which has its own separate list.
- A change to a variable only takes effect on the **next deploy**. Redeploy after changing one (Deploys → Trigger deploy, or Retry for a preview).
- Leave variables set for all deploy contexts, so Deploy Previews work too.
- If a secret is ever pasted somewhere public, or into a chat, revoke it and create a new one.

---

## 8. Updating the Netlify token

The `npm run seed` script uses a Netlify personal access token, and those expire. When Netlify sends an expiry warning email, rotate it. You can't edit a token in place, so you create a new one, swap it in, and delete the old one.

**Where the token lives:** in the `.env` file in the project folder, as `NETLIFY_AUTH_TOKEN`. It isn't stored in GitHub secrets, and the Mac has no Netlify CLI login. GitHub access is separate and uses the `gh` login for `kwhaus`.

1. **Create a new token.** Netlify → avatar → User settings → Applications → Personal access tokens → New access token. Name it (for example `kevinhaus-deploy`), set an expiration, and copy it straight away, since it's only shown once.
2. **Update `.env`.** Replace the old value and keep the name as it is:
   ```
   NETLIFY_AUTH_TOKEN=your_new_token_here
   ```
3. **Test it without deploying.** This only reads account info:
   ```bash
    export TOKEN="your_new_token_here"
   curl -s -H "Authorization: Bearer $TOKEN" https://api.netlify.com/api/v1/user | head -c 300
   unset TOKEN
   ```
   The space before `export` keeps the token out of your Terminal history. A valid token returns your account name and email; an invalid one returns an error.
4. **Delete the old token** in Applications, matching it by name and date.
5. **Set a reminder** a couple of weeks before the new token expires.

**Keep `.env` out of git.** It's already listed in `.gitignore`, and `git check-ignore .env` should print `.env`. If it was ever committed, treat that token as exposed and delete it.
