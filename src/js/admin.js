import videosData from '../videos.json'
import navHtml from '../pages/nav.html?raw'

document.addEventListener('DOMContentLoaded', async () => {

  // ── INJECT NAV ──────────────────────────────────────────────────────────────
  const navMount = document.getElementById('kh-nav-mount')
  if (navMount) navMount.innerHTML = navHtml

  // ── DOM REFS ─────────────────────────────────────────────────────────────────
  const loginDiv    = document.getElementById('adminLogin')
  const panelDiv    = document.getElementById('adminPanel')
  const pwInput     = document.getElementById('adminPw')
  const loginBtn    = document.getElementById('adminLoginBtn')
  const loginErr    = document.getElementById('adminLoginErr')
  const listEl      = document.getElementById('adminList')
  const saveBtn     = document.getElementById('downloadJson')
  const addBtn      = document.getElementById('addVideoBtn')
  const saveStatus  = document.getElementById('saveStatus')

  // ── STATE ────────────────────────────────────────────────────────────────────
  let videoList = []
  let adminPassword = ''
  let dirty = false          // unsaved changes in the list
  let editingId = null       // id of the entry whose edit panel is open

  const esc = (str = '') =>
    String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

  function markDirty() {
    dirty = true
    if (saveStatus) {
      saveStatus.textContent = 'Unsaved changes'
      saveStatus.style.color = 'var(--kh-text-muted)'
    }
  }
  window.addEventListener('beforeunload', e => {
    if (dirty) { e.preventDefault(); e.returnValue = '' }
  })

  // ── SERVER-SIDE PASSWORD CHECK ──────────────────────────────────────────────
  // The password is only ever compared on the server (admin-login function).
  async function verify(password) {
    try {
      const res = await fetch('/.netlify/functions/admin-login', {
        method: 'POST',
        headers: { 'X-Admin-Password': password },
      })
      return res.ok
    } catch {
      return false
    }
  }

  // ── AUTO-LOGIN FROM SESSION ─────────────────────────────────────────────────
  async function checkSession() {
    try {
      const session = sessionStorage.getItem('kh-admin-session')
      if (!session) return false
      const { password, expiry } = JSON.parse(session)
      if (Date.now() > expiry) {
        sessionStorage.removeItem('kh-admin-session')
        return false
      }
      if (await verify(password)) {
        adminPassword = password
        return true
      }
    } catch { /* fall through */ }
    sessionStorage.removeItem('kh-admin-session')
    return false
  }

  if (await checkSession()) {
    loginDiv.style.display = 'none'
    panelDiv.style.display = 'block'
    loadVideos()
  }

  // ── LOGIN ────────────────────────────────────────────────────────────────────
  async function tryLogin() {
    const attempt = pwInput.value
    if (await verify(attempt)) {
      adminPassword = attempt
      const expiry = Date.now() + (4 * 60 * 60 * 1000)
      sessionStorage.setItem('kh-admin-session', JSON.stringify({ password: attempt, expiry }))
      loginDiv.style.display = 'none'
      panelDiv.style.display = 'block'
      loadVideos()
    } else {
      loginErr.style.display = 'block'
      pwInput.value = ''
      pwInput.focus()
    }
  }

  loginBtn.addEventListener('click', tryLogin)
  pwInput.addEventListener('keydown', e => { if (e.key === 'Enter') tryLogin() })

  // ── LOAD VIDEOS ──────────────────────────────────────────────────────────────
  // The catalogue saved from this page (Netlify Blobs) is the source of truth
  // and is what the site rebuilds from. Until the first save from here, start
  // from the bundled src/videos.json, which is what the live site is built from.
  async function loadVideos() {
    try {
      listEl.innerHTML = '<div style="opacity:0.4; padding:1rem 0;">Loading...</div>'
      const res  = await fetch('/.netlify/functions/get-videos')
      const data = await res.json()
      videoList = Array.isArray(data) && data.length > 0
        ? data
        : videosData.map(v => ({ ...v }))
    } catch {
      videoList = videosData.map(v => ({ ...v }))
    }
    dirty = false
    buildList()
    buildReelPicker()
    loadReels()
  }

  // ── SAVE VIDEOS TO BLOBS ─────────────────────────────────────────────────────
  async function saveVideos() {
    if (saveStatus) {
      saveStatus.textContent = 'Saving...'
      saveStatus.style.color = 'var(--kh-text-muted)'
    }

    try {
      const res = await fetch('/.netlify/functions/save-videos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': adminPassword,
        },
        body: JSON.stringify({ videos: videoList }),
      })
      const result = await res.json().catch(() => ({}))

      if (res.ok) {
        dirty = false
        if (saveStatus) {
          if (result.rebuild) {
            saveStatus.textContent = '✓ Saved — site is rebuilding (about a minute)'
            saveStatus.style.color = 'green'
          } else if (result.hookConfigured === false) {
            saveStatus.textContent = '✓ Saved, but BUILD_HOOK_URL is not set — site not rebuilt'
            saveStatus.style.color = 'orange'
          } else {
            saveStatus.textContent = '✓ Saved, but the rebuild request failed — trigger a deploy in Netlify'
            saveStatus.style.color = 'orange'
          }
        }
      } else {
        throw new Error(result.error || 'Save failed')
      }
    } catch (err) {
      console.error('Save error:', err)
      if (saveStatus) {
        saveStatus.textContent = `✗ Save failed — ${err.message}`
        saveStatus.style.color = 'red'
      }
    }
  }

  // ── BUILD LIST ───────────────────────────────────────────────────────────────
  function buildList() {
    listEl.innerHTML = ''

    videoList.forEach((video, index) => {
      const card = document.createElement('div')
      card.className = 'kh-admin-card'
      card.draggable = true
      card.dataset.index = index

      card.innerHTML = `
        <span class="kh-admin-drag-handle" title="Drag to reorder">⠿</span>
        <span class="kh-admin-num">${String(index + 1).padStart(2, '0')}</span>
        <span class="kh-admin-title">${esc(video.title)}</span>
        <span class="kh-admin-type">${esc(video.type)}</span>
        <label class="kh-admin-toggle" title="Show in portfolio">
          <input type="checkbox" class="portfolio-toggle" data-index="${index}"
            ${video.showInPortfolio !== false ? 'checked' : ''}>
          <span class="kh-admin-toggle-label">Portfolio</span>
        </label>
        <button class="btn btn-sm btn-link p-0 ms-2 edit-btn" data-index="${index}"
          style="font-size:0.75rem; letter-spacing:0.06em; color:var(--kh-text-muted); text-decoration:none;"
        >${editingId === video.id ? 'Close' : 'Edit'}</button>
        <button class="btn btn-sm btn-link p-0 ms-2 text-danger delete-btn"
          data-index="${index}"
          title="Remove from list"
          style="font-size:1rem; line-height:1; text-decoration:none;"
        >×</button>
      `

      card.querySelector('.portfolio-toggle').addEventListener('change', e => {
        const i = parseInt(e.currentTarget.dataset.index)
        videoList[i].showInPortfolio = e.currentTarget.checked
        markDirty()
      })

      card.querySelector('.edit-btn').addEventListener('click', e => {
        e.stopPropagation()
        const id = videoList[parseInt(e.currentTarget.dataset.index)].id
        editingId = editingId === id ? null : id
        buildList()
      })

      card.querySelector('.delete-btn').addEventListener('click', e => {
        e.stopPropagation()
        const i = parseInt(e.currentTarget.dataset.index)
        if (confirm(`Remove "${videoList[i].title}" from the list?`)) {
          videoList.splice(i, 1)
          markDirty()
          buildList()
          buildReelPicker()
        }
      })

      listEl.appendChild(card)
      if (editingId === video.id) listEl.appendChild(buildEditPanel(video))
    })

    initDragDrop()
  }

  // ── EDIT PANEL ───────────────────────────────────────────────────────────────
  // One field per property in videos.json. List fields take one item per line.
  // Leaving a field blank removes it from the entry.
  const TYPES = ['music video', 'commercial', 'branded content', 'short film', 'reel']
  const FIELDS = [
    { key: 'title',        label: 'Title',                       half: true },
    { key: 'type',         label: 'Type',                        half: true, select: TYPES },
    { key: 'client',       label: 'Client',                      half: true },
    { key: 'agency',       label: 'Agency',                      half: true },
    { key: 'project',      label: 'Project / song',              half: true },
    { key: 'date',         label: 'Date (YYYY or YYYY-MM-DD)',   half: true },
    { key: 'aspectRatio',  label: 'Aspect ratio (e.g. 16:9)',    half: true },
    { key: 'slug',         label: 'URL slug (blank = from title; changing it changes the page URL)', half: true },
    { key: 'playbackId',   label: 'Mux playback ID',             half: true, required: true },
    { key: 'assetId',      label: 'Mux asset ID',                half: true },
    { key: 'coverImage',   label: 'Cover image filename (assets/Covers/)', half: true },
    { key: 'thumbnailTime', label: 'Thumbnail frame, seconds (used when there is no cover image)', half: true, number: true },
    { key: 'stills',       label: 'Stills — filenames, one per line (project page gallery)', list: true },
    { key: 'featuredStills', label: 'Home-page stills — one per line (blank = use all stills)', list: true },
    { key: 'festivals',    label: 'Festivals / premieres — one per line', list: true },
    { key: 'awards',       label: 'Awards — one per line',       list: true },
    { key: 'note',         label: 'Press quote / note',          area: true },
    { key: 'btsPlaybackId', label: 'Behind-the-scenes video — Mux playback ID', half: true },
    { key: 'btsCoverImage', label: 'BTS video cover image filename (assets/Covers/)', half: true },
    { key: 'btsThumbnailTime', label: 'BTS video thumbnail frame, seconds (if no cover image)', half: true, number: true },
    { key: 'btsPhotos',    label: 'BTS photos — filenames in assets/BTS/<slug>/, one per line (blank = use every image in that folder)', list: true },
  ]

  const inputStyle = 'background:var(--kh-bg-secondary); border-color:var(--kh-border); color:var(--kh-text); font-family:inherit;'

  function buildEditPanel(video) {
    const panel = document.createElement('div')
    panel.className = 'kh-admin-edit'
    panel.style.cssText = 'border:1px solid var(--kh-border); border-top:none; padding:1rem; margin:-0.25rem 0 0.75rem;'

    const row = document.createElement('div')
    row.className = 'row g-2'

    FIELDS.forEach(f => {
      const col = document.createElement('div')
      col.className = f.half ? 'col-12 col-md-6' : 'col-12'
      const label = document.createElement('label')
      label.textContent = f.label
      label.style.cssText = 'display:block; font-size:0.7rem; letter-spacing:0.05em; color:var(--kh-text-muted); margin-bottom:0.2rem;'

      let input
      if (f.select) {
        input = document.createElement('select')
        input.className = 'form-select form-select-sm'
        const opts = f.select.includes(video[f.key]) || !video[f.key] ? f.select : [...f.select, video[f.key]]
        opts.forEach(o => {
          const opt = document.createElement('option')
          opt.value = o; opt.textContent = o
          input.appendChild(opt)
        })
        input.value = video[f.key] || f.select[0]
      } else if (f.list || f.area) {
        input = document.createElement('textarea')
        input.className = 'form-control form-control-sm'
        input.rows = f.list ? Math.min(8, Math.max(3, (video[f.key] || []).length + 1)) : 2
        input.value = f.list ? (Array.isArray(video[f.key]) ? video[f.key].join('\n') : '') : (video[f.key] || '')
      } else {
        input = document.createElement('input')
        input.type = 'text'
        input.className = 'form-control form-control-sm'
        input.value = video[f.key] ?? ''
      }
      input.style.cssText = inputStyle
      input.dataset.field = f.key
      col.append(label, input)
      row.appendChild(col)
    })

    const actions = document.createElement('div')
    actions.className = 'col-12'
    actions.style.cssText = 'display:flex; gap:0.75rem; align-items:center;'
    const apply = document.createElement('button')
    apply.className = 'btn btn-sm btn-outline-secondary'
    apply.style.cssText = 'font-family:inherit; letter-spacing:0.06em;'
    apply.textContent = 'Apply changes'
    const msg = document.createElement('span')
    msg.style.cssText = 'font-size:0.75rem; color:var(--kh-text-muted);'
    msg.textContent = 'Applies to the list below — then press Save to Live Site.'
    actions.append(apply, msg)
    row.appendChild(actions)
    panel.appendChild(row)

    apply.addEventListener('click', () => {
      const next = { ...video }
      for (const f of FIELDS) {
        const raw = panel.querySelector(`[data-field="${f.key}"]`).value
        if (f.list) {
          const items = raw.split(/[\n,]+/).map(x => x.trim()).filter(Boolean)
          if (items.length) next[f.key] = items; else delete next[f.key]
        } else {
          const val = raw.trim()
          if (val && f.number) {
            const n = Number(val)
            if (Number.isFinite(n) && n >= 0) next[f.key] = n; else delete next[f.key]
          } else if (val) next[f.key] = val
          else if (f.required || f.key === 'title') next[f.key] = ''
          else delete next[f.key]
        }
      }
      if (next.slug) next.slug = next.slug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      if (!next.title || !next.playbackId) {
        msg.textContent = 'Title and Mux playback ID are required.'
        msg.style.color = 'red'
        return
      }
      if (next.slug && videoList.some(v => v.id !== video.id && v.slug === next.slug)) {
        msg.textContent = 'Another entry already uses that slug.'
        msg.style.color = 'red'
        return
      }
      const i = videoList.findIndex(v => v.id === video.id)
      videoList[i] = next
      editingId = null
      markDirty()
      buildList()
      buildReelPicker()
    })

    return panel
  }

  // ── DRAG AND DROP ────────────────────────────────────────────────────────────
  let dragSrcIndex = null

  function initDragDrop() {
    const cards = listEl.querySelectorAll('.kh-admin-card')

    cards.forEach(card => {
      card.addEventListener('dragstart', e => {
        dragSrcIndex = parseInt(card.dataset.index)
        card.classList.add('dragging')
        e.dataTransfer.effectAllowed = 'move'
      })

      card.addEventListener('dragend', () => {
        card.classList.remove('dragging')
        listEl.querySelectorAll('.kh-admin-card').forEach(c => c.classList.remove('drag-over'))
      })

      card.addEventListener('dragover', e => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        listEl.querySelectorAll('.kh-admin-card').forEach(c => c.classList.remove('drag-over'))
        card.classList.add('drag-over')
      })

      card.addEventListener('drop', e => {
        e.preventDefault()
        const targetIndex = parseInt(card.dataset.index)
        if (dragSrcIndex === null || dragSrcIndex === targetIndex) return
        const moved = videoList.splice(dragSrcIndex, 1)[0]
        videoList.splice(targetIndex, 0, moved)
        dragSrcIndex = null
        markDirty()
        buildList()
      })
    })
  }

  // ── ADD VIDEO ────────────────────────────────────────────────────────────────
  addBtn.addEventListener('click', () => {
    const title       = document.getElementById('newTitle').value.trim()
    const type        = document.getElementById('newType').value
    const aspectRatio = document.getElementById('newAspect').value.trim() || '16:9'
    const assetId     = document.getElementById('newAssetId').value.trim()
    const playbackId  = document.getElementById('newPlaybackId').value.trim()
    const stillsRaw   = document.getElementById('newStills').value.trim()
    const coverEl     = document.getElementById('newCoverImage')
    const coverImage  = coverEl ? coverEl.value.trim() : ''
    const portfolioEl = document.getElementById('newPortfolio')
    const showInPortfolio = portfolioEl ? portfolioEl.checked : true

    if (!title || !playbackId) {
      alert('Title and Playback ID are required.')
      return
    }

    const dashIdx = title.indexOf(' - ')
    const artist  = dashIdx > -1 ? title.slice(0, dashIdx) : title
    const song    = dashIdx > -1 ? title.slice(dashIdx + 3) : ''
    const stills  = stillsRaw ? stillsRaw.split(',').map(s => s.trim()).filter(Boolean) : []
    const maxId   = videoList.reduce((max, v) => Math.max(max, v.id), 0)

    videoList.push({
      id: maxId + 1,
      title, artist, song, type,
      assetId, playbackId, coverImage,
      aspectRatio, stills,
      showInPortfolio,
    })

    markDirty()
    buildList()
    buildReelPicker()

    ;['newTitle','newAssetId','newPlaybackId','newCoverImage','newStills','newAspect'].forEach(id => {
      const el = document.getElementById(id)
      if (el) el.value = ''
    })

    listEl.lastElementChild?.scrollIntoView({ behavior: 'smooth' })
  })

  // ── SAVE BUTTON ──────────────────────────────────────────────────────────────
  if (saveBtn) {
    saveBtn.textContent = 'Save to Live Site'
    saveBtn.addEventListener('click', saveVideos)
  }

  // ── RELOAD FROM videos.json ──────────────────────────────────────────────────
  // Replaces the list on screen with the file bundled in the site. Nothing is
  // saved until you press Save to Live Site.
  const resetBtn = document.getElementById('resetFromFile')
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (!confirm('Replace the list on screen with the videos.json that ships with the site? Unsaved edits are lost; nothing is published until you press Save.')) return
      videoList = videosData.map(v => ({ ...v }))
      editingId = null
      markDirty()
      buildList()
      buildReelPicker()
    })
  }

  // ── REELS TAB ─────────────────────────────────────────────────────────────────
  const reelsList       = document.getElementById('reelsList')
  const reelAvailable   = document.getElementById('reelAvailable')
  const reelContents    = document.getElementById('reelContents')
  const reelClientInput = document.getElementById('reelClientName')
  const reelIdInput     = document.getElementById('reelId')
  const reelIdPreview   = document.getElementById('reelIdPreview')
  const saveReelBtn     = document.getElementById('saveReelBtn')
  const reelSaveStatus  = document.getElementById('reelSaveStatus')
  const reelUrlWrap     = document.getElementById('reelUrlWrap')
  const reelUrlLink     = document.getElementById('reelUrlLink')
  const reelUrlCopy     = document.getElementById('reelUrlCopy')

  let reelVideoList = [] // videos currently added to the reel being built

  // Auto-generate slug from client name
  if (reelClientInput && reelIdInput) {
    reelClientInput.addEventListener('input', () => {
      const slug = reelClientInput.value
        .toLowerCase().trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
      reelIdInput.value = slug
      if (reelIdPreview) reelIdPreview.textContent = slug || '...'
    })

    reelIdInput.addEventListener('input', () => {
      if (reelIdPreview) reelIdPreview.textContent = reelIdInput.value || '...'
    })
  }

  // Load existing reels (password required — the list is private)
  async function loadReels() {
    if (!reelsList) return
    try {
      const res = await fetch('/.netlify/functions/save-reel', {
        headers: { 'X-Admin-Password': adminPassword },
      })
      if (!res.ok) throw new Error('Unauthorized')
      const reels = await res.json()

      if (!reels.length) {
        reelsList.innerHTML = '<div style="opacity:0.4; font-size:0.85rem; padding:0.5rem 0;">No reels yet.</div>'
        return
      }

      reelsList.innerHTML = ''
      reels.forEach(reel => {
        const url  = `https://kevinhaus.com/reel.html?id=${reel.id}`
        const row  = document.createElement('div')
        row.style.cssText = 'display:flex; align-items:center; gap:1rem; padding:0.5rem 0; border-bottom:1px solid var(--kh-border); font-size:0.85rem;'
        row.innerHTML = `
          <span style="flex:1;"><strong>${reel.clientName || reel.id}</strong></span>
          <span style="color:var(--kh-text-muted); font-size:0.75rem;">${reel.videos?.length || 0} videos</span>
          <a href="${url}" target="_blank" style="color:var(--kh-accent); font-size:0.75rem;">${url}</a>
          <button class="btn btn-sm btn-link p-0 text-danger reel-delete-btn" data-id="${reel.id}"
            style="font-size:0.9rem; text-decoration:none;">×</button>
        `
        row.querySelector('.reel-delete-btn').addEventListener('click', async e => {
          const id = e.currentTarget.dataset.id
          if (!confirm(`Delete reel "${id}"?`)) return
          await fetch(`/.netlify/functions/save-reel?id=${id}`, {
            method: 'DELETE',
            headers: { 'X-Admin-Password': adminPassword },
          })
          loadReels()
        })
        reelsList.appendChild(row)
      })
    } catch {
      reelsList.innerHTML = '<div style="color:var(--kh-accent); font-size:0.85rem;">Failed to load reels.</div>'
    }
  }

  // Build available videos picker
  function buildReelPicker() {
    if (!reelAvailable) return
    reelAvailable.innerHTML = ''
    videoList.forEach(video => {
      const item = document.createElement('div')
      item.className = 'kh-reel-pick-item'
      item.innerHTML = `
        <span class="pick-title">${esc(video.title)}</span>
        <span class="pick-type">${esc(video.type)}</span>
        <span class="pick-action">+</span>
      `
      item.addEventListener('click', () => addToReel(video))
      reelAvailable.appendChild(item)
    })
  }

  // Add video to reel contents
  function addToReel(video) {
    if (reelVideoList.find(v => v.id === video.id)) return // already added
    reelVideoList.push(video)
    renderReelContents()
  }

  // Render reel contents list
  function renderReelContents() {
    if (!reelContents) return
    reelContents.innerHTML = ''

    // dragFrom must be outside the loop so all items share the same reference —
    // dragstart sets it on the dragged item, drop reads it on the target item.
    let dragFrom = null

    reelVideoList.forEach((video, index) => {
      const item = document.createElement('div')
      item.className = 'kh-reel-pick-item'
      item.draggable = true
      item.dataset.index = index
      item.innerHTML = `
        <span style="color:var(--kh-text-muted); font-size:0.7rem; flex-shrink:0;">⠿</span>
        <span class="pick-title">${esc(video.title)}</span>
        <span class="pick-type">${esc(video.type)}</span>
        <span class="pick-action reel-remove" data-index="${index}" style="cursor:pointer;">×</span>
      `
      item.querySelector('.reel-remove').addEventListener('click', e => {
        const i = parseInt(e.currentTarget.dataset.index)
        reelVideoList.splice(i, 1)
        renderReelContents()
      })

      item.addEventListener('dragstart', () => { dragFrom = index })
      item.addEventListener('dragover',  e => e.preventDefault())
      item.addEventListener('drop', () => {
        if (dragFrom === null || dragFrom === index) return
        const moved = reelVideoList.splice(dragFrom, 1)[0]
        reelVideoList.splice(index, 0, moved)
        dragFrom = null
        renderReelContents()
      })

      reelContents.appendChild(item)
    })
  }

  // Save reel
  if (saveReelBtn) {
    saveReelBtn.addEventListener('click', async () => {
      const id         = reelIdInput?.value.trim()
      const clientName = reelClientInput?.value.trim()

      if (!id) { alert('Please enter a URL slug.'); return }
      if (!reelVideoList.length) { alert('Please add at least one video.'); return }

      if (reelSaveStatus) {
        reelSaveStatus.textContent = 'Saving...'
        reelSaveStatus.style.color = 'var(--kh-text-muted)'
      }

      try {
        const res = await fetch('/.netlify/functions/save-reel', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Password': adminPassword,
          },
          body: JSON.stringify({ id, clientName, videos: reelVideoList }),
        })

        const data = await res.json()

        if (res.ok) {
          const url = `https://kevinhaus.com/reel.html?id=${data.id}`
          if (reelSaveStatus) {
            reelSaveStatus.textContent = '✓ Saved'
            reelSaveStatus.style.color = 'green'
          }
          if (reelUrlWrap) reelUrlWrap.style.display = ''
          if (reelUrlLink) { reelUrlLink.href = url; reelUrlLink.textContent = url }
          loadReels()
        } else {
          throw new Error(data.error || 'Save failed')
        }
      } catch (err) {
        if (reelSaveStatus) {
          reelSaveStatus.textContent = '✗ Failed'
          reelSaveStatus.style.color = 'red'
        }
      }
    })
  }

  // Copy URL button
  if (reelUrlCopy) {
    reelUrlCopy.addEventListener('click', () => {
      if (reelUrlLink) navigator.clipboard.writeText(reelUrlLink.href)
      reelUrlCopy.textContent = 'Copied!'
      setTimeout(() => { reelUrlCopy.textContent = 'Copy' }, 2000)
    })
  }

  // NOTE: loadReels() is called from loadVideos() after login, not here —
  // the reel list requires the admin password.

})
