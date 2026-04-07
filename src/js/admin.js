import videosData from '../videos.json'
import config from './site.config.js'
import navHtml from '../pages/nav.html?raw'

document.addEventListener('DOMContentLoaded', () => {

  // ── INJECT NAV ────────────────────────────────────────────────────────────
  const navMount = document.getElementById('kh-nav-mount')
  if (navMount) navMount.innerHTML = navHtml

  // ── STATE ──────────────────────────────────────────────────────────────────
  let videoList = videosData.map(v => ({ ...v }))

  // ── DOM REFS ───────────────────────────────────────────────────────────────
  const loginDiv    = document.getElementById('adminLogin')
  const panelDiv    = document.getElementById('adminPanel')
  const pwInput     = document.getElementById('adminPw')
  const loginBtn    = document.getElementById('adminLoginBtn')
  const loginErr    = document.getElementById('adminLoginErr')
  const listEl      = document.getElementById('adminList')
  const downloadBtn = document.getElementById('downloadJson')
  const addBtn      = document.getElementById('addVideoBtn')

  // ── LOGIN ──────────────────────────────────────────────────────────────────
  function tryLogin() {
    if (pwInput.value === config.adminPassword) {
      loginDiv.style.display = 'none'
      panelDiv.style.display = 'block'
      buildList()
    } else {
      loginErr.style.display = 'block'
      pwInput.value = ''
      pwInput.focus()
    }
  }

  loginBtn.addEventListener('click', tryLogin)
  pwInput.addEventListener('keydown', e => { if (e.key === 'Enter') tryLogin() })

  // ── BUILD LIST ─────────────────────────────────────────────────────────────
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
        <button class="btn btn-sm btn-link p-0 ms-2 text-danger delete-btn"
          data-index="${index}"
          title="Remove from list"
          style="font-size:1rem; line-height:1; text-decoration:none;"
        >×</button>
      `

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

  // ── DRAG AND DROP ──────────────────────────────────────────────────────────
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

  // ── ADD VIDEO ──────────────────────────────────────────────────────────────
  addBtn.addEventListener('click', () => {
    const title       = document.getElementById('newTitle').value.trim()
    const type        = document.getElementById('newType').value
    const aspectRatio = document.getElementById('newAspect').value.trim() || '16:9'
    const assetId     = document.getElementById('newAssetId').value.trim()
    const playbackId  = document.getElementById('newPlaybackId').value.trim()
    const stillsRaw   = document.getElementById('newStills').value.trim()
    const coverEl     = document.getElementById('newCover')
    const coverImage  = coverEl ? coverEl.value.trim() : ''

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
    })

    buildList()

    ;['newTitle','newAssetId','newPlaybackId','newStills','newAspect'].forEach(id => {
      document.getElementById(id).value = ''
    })

    listEl.lastElementChild?.scrollIntoView({ behavior: 'smooth' })
  })

  // ── DOWNLOAD JSON ──────────────────────────────────────────────────────────
  downloadBtn.addEventListener('click', () => {
    const output = videoList.map((v, i) => ({ ...v, id: i + 1 }))
    const json   = JSON.stringify(output, null, 2)
    const blob   = new Blob([json], { type: 'application/json' })
    const url    = URL.createObjectURL(blob)
    const a      = document.createElement('a')
    a.href       = url
    a.download   = 'videos.json'
    a.click()
    URL.revokeObjectURL(url)
  })

})
