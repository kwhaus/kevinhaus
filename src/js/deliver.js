import {
  buildDeliveryEmail, downloadName, shapeLabel, formatDuration, formatSize, mp4Url,
} from './delivery-email.js'

// ── ADMIN → DELIVER TAB ───────────────────────────────────────────────────────
// Pick Mux videos, create their MP4 downloads, and build the branded delivery
// email. All Mux calls go through /.netlify/functions/mux, which holds the
// token server-side. Call initDeliver(getPassword) once after admin login.

const POLL_MS = 5000

export function initDeliver(getPassword) {
  const root = document.getElementById('panelDeliver')
  if (!root || root.dataset.ready) return
  root.dataset.ready = '1'

  const esc = (s = '') =>
    String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

  const field = 'background:var(--kh-bg-secondary); border-color:var(--kh-border); color:var(--kh-text); font-family:inherit;'
  const label = 'font-size:0.75rem; color:var(--kh-text-muted); letter-spacing:0.08em; text-transform:uppercase; margin-bottom:0.5rem;'
  const h2 = 'font-size:0.8rem; letter-spacing:0.15em; text-transform:uppercase; margin-bottom:1rem; color:var(--kh-text-muted);'

  root.innerHTML = `
    <div class="kh-admin-header">
      <span>Deliver — pick videos, create MP4 downloads, copy the email into Gmail</span>
    </div>

    <h2 style="${h2}">1 · Videos</h2>
    <div style="display:flex; gap:0.5rem; margin-bottom:0.5rem;">
      <input type="search" id="dlvSearch" class="form-control form-control-sm" placeholder="Search Mux titles" style="${field}">
      <button id="dlvRefresh" class="btn btn-sm btn-outline-secondary" style="font-family:inherit; white-space:nowrap;">Refresh</button>
    </div>
    <div id="dlvAssets" style="max-height:340px; overflow-y:auto; border:1px solid var(--kh-border); margin-bottom:2rem;">
      <div style="opacity:0.5; padding:0.75rem; font-size:0.85rem;">Loading videos from Mux…</div>
    </div>

    <h2 style="${h2}">2 · Email</h2>
    <div class="row g-2" style="margin-bottom:0.75rem;">
      <div class="col-12 col-md-6">
        <div style="${label}">Title</div>
        <input type="text" id="dlvTitle" class="form-control form-control-sm" placeholder="Shown large in the email" style="${field}">
      </div>
      <div class="col-12 col-md-6">
        <div style="${label}">Greeting</div>
        <input type="text" id="dlvGreeting" class="form-control form-control-sm" value="Hi there," style="${field}">
      </div>
      <div class="col-12">
        <div style="${label}">Message (optional)</div>
        <textarea id="dlvMessage" rows="2" class="form-control form-control-sm" placeholder="Default: Your file(s) are ready to download." style="${field}"></textarea>
      </div>
    </div>
    <div id="dlvFiles" style="margin-bottom:2rem;"></div>

    <h2 style="${h2}">3 · Preview & send</h2>
    <div style="display:flex; gap:0.75rem; align-items:center; flex-wrap:wrap; margin-bottom:0.75rem;">
      <button id="dlvCopy" class="btn btn-outline-secondary" style="font-family:inherit; letter-spacing:0.08em;" disabled>Copy for Gmail</button>
      <button id="dlvDownload" class="btn btn-sm btn-link p-0" style="font-family:inherit; color:var(--kh-text-muted); text-decoration:none;" disabled>Download .html</button>
      <span id="dlvStatus" style="font-size:0.85rem; color:var(--kh-text-muted);"></span>
    </div>
    <iframe id="dlvPreview" title="Email preview" style="width:100%; height:720px; border:1px solid var(--kh-border); background:#e6e6e6;"></iframe>
  `

  const $ = (id) => document.getElementById(id)
  const assetsEl = $('dlvAssets'), filesEl = $('dlvFiles'), preview = $('dlvPreview')
  const titleIn = $('dlvTitle'), greetIn = $('dlvGreeting'), msgIn = $('dlvMessage')
  const copyBtn = $('dlvCopy'), dlBtn = $('dlvDownload'), statusEl = $('dlvStatus')

  let assets = []                 // trimmed Mux assets
  const selected = []             // asset ids, in the order picked
  const custom = {}               // id → { label, downloadName } edits
  let titleTouched = false
  let pollTimer = null
  let loaded = false

  // ── API ─────────────────────────────────────────────────────────────────────
  async function api(query, init = {}) {
    const res = await fetch(`/.netlify/functions/mux?${query}`, {
      ...init,
      headers: { 'X-Admin-Password': getPassword(), 'Content-Type': 'application/json', ...(init.headers || {}) },
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`)
    return body
  }

  const byId = (id) => assets.find(a => a.id === id)
  const mp4Of = (a) => a?.mp4.find(f => f.name === 'highest.mp4') || a?.mp4[0] || null
  const isReady = (a) => a && a.publicPlaybackId && mp4Of(a)?.status === 'ready'

  function upsert(asset) {
    const i = assets.findIndex(a => a.id === asset.id)
    if (i === -1) assets.unshift(asset); else assets[i] = asset
  }

  async function loadAssets() {
    assetsEl.innerHTML = '<div style="opacity:0.5; padding:0.75rem; font-size:0.85rem;">Loading videos from Mux…</div>'
    try {
      assets = (await api('action=list')).assets
      loaded = true
      renderAssets(); renderFiles(); renderEmail(); schedulePoll()
    } catch (err) {
      assetsEl.innerHTML = `<div style="padding:0.75rem; font-size:0.85rem; color:var(--kh-accent);">${esc(err.message)}</div>`
    }
  }

  async function createMp4(id) {
    const a = byId(id)
    if (a) { a._creating = true; renderAssets() }
    try {
      const { asset } = await api('action=mp4', { method: 'POST', body: JSON.stringify({ assetId: id }) })
      upsert(asset)
    } catch (err) {
      if (a) a._error = err.message
    }
    renderAssets(); renderFiles(); renderEmail(); schedulePoll()
  }

  // Re-check any video whose MP4 is still being made, until all are ready.
  function schedulePoll() {
    clearTimeout(pollTimer)
    const pending = assets.filter(a => a.mp4.some(f => f.status === 'preparing'))
    if (!pending.length) return
    pollTimer = setTimeout(async () => {
      await Promise.all(pending.map(async a => {
        try { upsert((await api(`action=asset&id=${a.id}`)).asset) } catch { /* try again next round */ }
      }))
      renderAssets(); renderFiles(); renderEmail(); schedulePoll()
    }, POLL_MS)
  }

  // ── RENDER: ASSET LIST ──────────────────────────────────────────────────────
  function statusCell(a) {
    if (a._error) return `<span style="color:var(--kh-accent);">${esc(a._error)}</span>`
    if (!a.publicPlaybackId) return `<span style="color:var(--kh-text-muted);">${a.hasSignedOnly ? 'Signed only — no public link' : 'No playback ID'}</span>`
    const f = mp4Of(a)
    if (a._creating && !f) return '<span style="color:var(--kh-text-muted);">Requesting MP4…</span>'
    if (!f) return `<button class="btn btn-sm btn-outline-secondary" data-mp4="${a.id}" style="font-family:inherit; font-size:0.75rem; padding:0.1rem 0.5rem;">Create MP4</button>`
    if (f.status === 'ready') return `<span>MP4 ready${f.bytes ? ' · ' + formatSize(f.bytes) : ''}</span>`
    if (f.status === 'preparing') return '<span style="color:var(--kh-text-muted);">Making MP4…</span>'
    return `<span style="color:var(--kh-accent);">MP4 ${esc(f.status)}</span>`
  }

  function renderAssets() {
    if (!loaded) return
    const q = $('dlvSearch').value.trim().toLowerCase()
    const list = assets.filter(a => !q || (a.title || a.id).toLowerCase().includes(q))
    if (!list.length) {
      assetsEl.innerHTML = `<div style="opacity:0.5; padding:0.75rem; font-size:0.85rem;">${assets.length ? 'No matches.' : 'No videos in this Mux environment.'}</div>`
      return
    }
    assetsEl.innerHTML = list.map(a => {
      const on = selected.includes(a.id)
      const meta = [
        a.width && a.height ? `${a.width}×${a.height}` : '',
        formatDuration(a.duration),
        a.createdAt ? new Date(a.createdAt).toLocaleDateString() : '',
      ].filter(Boolean).join(' · ')
      return `
        <div style="display:flex; align-items:center; gap:0.75rem; padding:0.55rem 0.75rem; border-bottom:1px solid var(--kh-border); ${on ? 'background:var(--kh-bg-secondary);' : ''}">
          <input type="checkbox" data-pick="${a.id}" ${on ? 'checked' : ''} ${a.publicPlaybackId ? '' : 'disabled'} style="cursor:pointer;" aria-label="Select ${esc(a.title || a.id)}">
          <div style="flex:1; min-width:0;">
            <div style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(a.title || '(untitled)')}</div>
            <div style="font-size:0.75rem; color:var(--kh-text-muted);">${esc(meta)}</div>
          </div>
          <div style="font-size:0.8rem; text-align:right; flex-shrink:0;">${statusCell(a)}</div>
        </div>`
    }).join('')
  }

  // ── RENDER: SELECTED FILES ──────────────────────────────────────────────────
  function renderFiles() {
    if (filesEl.contains(document.activeElement)) return   // don't wipe a field mid-typing
    if (!selected.length) {
      filesEl.innerHTML = '<div style="font-size:0.85rem; color:var(--kh-text-muted);">Select one or more videos above. Each becomes a download button.</div>'
      return
    }
    filesEl.innerHTML = selected.map((id, i) => {
      const a = byId(id); if (!a) return ''
      const c = custom[id] || {}
      const f = mp4Of(a)
      return `
        <div style="border-top:1px solid var(--kh-border); padding:0.75rem 0;">
          <div style="display:flex; justify-content:space-between; gap:0.5rem; font-size:0.85rem; margin-bottom:0.5rem;">
            <span>${i + 1}. ${esc(a.title || a.id)}</span>
            <span style="color:var(--kh-text-muted);">${isReady(a) ? 'ready' : f ? 'MP4 not ready yet' : 'needs MP4'}</span>
          </div>
          <div class="row g-2">
            <div class="col-12 col-md-5">
              <input type="text" data-label="${id}" class="form-control form-control-sm" value="${esc(c.label ?? shapeLabel(f?.width || a.width, f?.height || a.height))}" placeholder="Label (e.g. Vertical 9:16)" style="${field}">
            </div>
            <div class="col-12 col-md-7">
              <input type="text" data-name="${id}" class="form-control form-control-sm" value="${esc(c.downloadName ?? downloadName(a.title))}" placeholder="Downloaded file name" style="${field}">
            </div>
          </div>
        </div>`
    }).join('')
  }

  // ── RENDER: EMAIL ───────────────────────────────────────────────────────────
  let current = null

  function filesForEmail() {
    return selected.map(id => byId(id)).filter(Boolean).map(a => {
      const f = mp4Of(a) || {}
      const c = custom[a.id] || {}
      return {
        label: c.label ?? shapeLabel(f.width || a.width, f.height || a.height),
        playbackId: a.publicPlaybackId,
        downloadName: downloadName(c.downloadName ?? downloadName(a.title)),
        width: f.width || a.width,
        height: f.height || a.height,
        bytes: f.bytes,
        duration: a.duration,
      }
    })
  }

  function renderEmail() {
    if (!titleTouched) {
      const first = byId(selected[0])
      titleIn.value = first ? (first.title || '').toUpperCase() : ''
    }
    const files = filesForEmail()
    if (!files.length) {
      current = null
      preview.srcdoc = '<body style="margin:0;background:#e6e6e6;font-family:Georgia,serif;color:#6b6b6b;display:flex;align-items:center;justify-content:center;height:100vh;">Select a video to preview the email.</body>'
      copyBtn.disabled = dlBtn.disabled = true
      statusEl.textContent = ''
      return
    }
    current = buildDeliveryEmail({ title: titleIn.value, greeting: greetIn.value, message: msgIn.value, files })
    preview.srcdoc = current.html

    const waiting = selected.map(byId).filter(a => a && !isReady(a))
    copyBtn.disabled = dlBtn.disabled = waiting.length > 0
    statusEl.style.color = 'var(--kh-text-muted)'
    statusEl.textContent = waiting.length
      ? `Waiting on ${waiting.length === 1 ? 'an MP4' : waiting.length + ' MP4s'} — create ${waiting.length === 1 ? 'it' : 'them'} above; this updates automatically.`
      : ''
  }

  // ── COPY / DOWNLOAD ─────────────────────────────────────────────────────────
  async function copyForGmail() {
    if (!current) return
    const files = filesForEmail()
    const plain = [titleIn.value, '', ...files.map(f => `${f.label}: ${mp4Url(f.playbackId, f.downloadName)}`)].join('\n')
    try {
      await navigator.clipboard.write([new ClipboardItem({
        'text/html': new Blob([current.fragment], { type: 'text/html' }),
        'text/plain': new Blob([plain], { type: 'text/plain' }),
      })])
    } catch {
      // Older browsers: copy the rendered preview via a selection.
      const doc = preview.contentDocument
      const range = doc.createRange()
      range.selectNodeContents(doc.body)
      const sel = doc.getSelection()
      sel.removeAllRanges(); sel.addRange(range)
      doc.execCommand('copy')
      sel.removeAllRanges()
    }
    statusEl.style.color = 'var(--kh-text)'
    statusEl.textContent = 'Copied — paste into a new Gmail message (Cmd+V).'
  }

  function downloadHtml() {
    if (!current) return
    const blob = new Blob([current.html], { type: 'text/html' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `delivery-${downloadName(titleIn.value || 'video').toLowerCase()}.html`
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  // ── EVENTS ──────────────────────────────────────────────────────────────────
  assetsEl.addEventListener('change', e => {
    const id = e.target.dataset.pick
    if (!id) return
    const i = selected.indexOf(id)
    if (e.target.checked && i === -1) selected.push(id)
    if (!e.target.checked && i !== -1) selected.splice(i, 1)
    renderAssets(); renderFiles(); renderEmail()
  })
  assetsEl.addEventListener('click', e => {
    const id = e.target.dataset?.mp4
    if (id) createMp4(id)
  })
  filesEl.addEventListener('input', e => {
    const id = e.target.dataset.label || e.target.dataset.name
    if (!id) return
    custom[id] = custom[id] || {}
    if (e.target.dataset.label) custom[id].label = e.target.value
    else custom[id].downloadName = e.target.value
    renderEmail()
  })
  titleIn.addEventListener('input', () => { titleTouched = titleIn.value.trim() !== ''; renderEmail() })
  greetIn.addEventListener('input', renderEmail)
  msgIn.addEventListener('input', renderEmail)
  $('dlvSearch').addEventListener('input', renderAssets)
  $('dlvRefresh').addEventListener('click', loadAssets)
  copyBtn.addEventListener('click', copyForGmail)
  dlBtn.addEventListener('click', downloadHtml)

  renderFiles(); renderEmail()

  // Load from Mux the first time the tab is opened.
  const open = () => { if (!loaded) loadAssets() }
  window.addEventListener('kh-deliver-open', open)
  if (root.style.display !== 'none') open()
}
