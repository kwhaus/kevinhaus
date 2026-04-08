import videosData from '../videos.json'
import config from './site.config.js'
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

  // ── LOGIN ────────────────────────────────────────────────────────────────────
  function tryLogin() {
    if (pwInput.value === config.adminPassword) {
      adminPassword = pwInput.value
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

  // ── LOAD VIDEOS FROM BLOBS ───────────────────────────────────────────────────
  async function loadVideos() {
    try {
      listEl.innerHTML = '<div style="opacity:0.4; padding:1rem 0;">Loading...</div>'
      const res  = await fetch('/.netlify/functions/get-videos')
      const data = await res.json()
      videoList  = Array.isArray(data) && data.length > 0 ? data : videosData.map(v => ({ ...v }))
    } catch {
      // Fall back to bundled JSON
      videoList = videosData.map(v => ({ ...v }))
    }
    buildList()
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

      if (res.ok) {
        if (saveStatus) {
          saveStatus.textContent = '✓ Saved live'
          saveStatus.style.color = 'green'
          setTimeout(() => { saveStatus.textContent = '' }, 3000)
        }
      } else {
        throw new Error('Save failed')
      }
    } catch (err) {
      console.error('Save error:', err)
      if (saveStatus) {
        saveStatus.textContent = '✗ Save failed'
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
        <span class="kh-admin-title">${video.title}</span>
        <span class="kh-admin-type">${video.type}</span>
        <label class="kh-admin-toggle" title="Show in portfolio">
          <input type="checkbox" class="portfolio-toggle" data-index="${index}"
            ${video.showInPortfolio !== false ? 'checked' : ''}>
          <span class="kh-admin-toggle-label">Portfolio</span>
        </label>
        <button class="btn btn-sm btn-link p-0 ms-2 text-danger delete-btn"
          data-index="${index}"
          title="Remove from list"
          style="font-size:1rem; line-height:1; text-decoration:none;"
        >×</button>
      `

      card.querySelector('.portfolio-toggle').addEventListener('change', e => {
        const i = parseInt(e.currentTarget.dataset.index)
        videoList[i].showInPortfolio = e.currentTarget.checked
      })

      card.querySelector('.delete-btn').addEventListener('click', e => {
        e.stopPropagation()
        const i = parseInt(e.currentTarget.dataset.index)
        if (confirm(`Remove "${videoList[i].title}" from the list?`)) {
          videoList.splice(i, 1)
          buildList()
        }
      })

      listEl.appendChild(card)
    })

    initDragDrop()
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
    const coverEl     = document.getElementById('newCover')
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

    buildList()

    ;['newTitle','newAssetId','newPlaybackId','newStills','newAspect'].forEach(id => {
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

  // Load existing reels
  async function loadReels() {
    if (!reelsList) return
    try {
      const res   = await fetch('/.netlify/functions/save-reel')
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
        <span class="pick-title">${video.title}</span>
        <span class="pick-type">${video.type}</span>
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
    reelVideoList.forEach((video, index) => {
      const item = document.createElement('div')
      item.className = 'kh-reel-pick-item'
      item.draggable = true
      item.dataset.index = index
      item.innerHTML = `
        <span style="color:var(--kh-text-muted); font-size:0.7rem; flex-shrink:0;">⠿</span>
        <span class="pick-title">${video.title}</span>
        <span class="pick-type">${video.type}</span>
        <span class="pick-action reel-remove" data-index="${index}" style="cursor:pointer;">×</span>
      `
      item.querySelector('.reel-remove').addEventListener('click', e => {
        const i = parseInt(e.currentTarget.dataset.index)
        reelVideoList.splice(i, 1)
        renderReelContents()
      })

      // Drag to reorder within reel
      let dragFrom = null
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

  // Load reels when panel loads
  loadReels()
  buildReelPicker()

})
