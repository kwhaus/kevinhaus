// Work index filter. The grid is fully rendered in the HTML at build time; this
// only hides and shows items. Filters are linkable (/work.html#narrative).
const bar   = document.querySelector('.kh-index-filters')
const items = document.querySelectorAll('.kh-index-item')

if (bar) {
  const buttons = bar.querySelectorAll('.kh-index-filter')
  const valid = new Set([...buttons].map(b => b.dataset.filter))

  const apply = key => {
    if (!valid.has(key)) key = 'all'
    items.forEach(li => { li.hidden = key !== 'all' && li.dataset.cat !== key })
    buttons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.filter === key)))
  }

  bar.hidden = false
  apply(window.location.hash.slice(1))

  bar.addEventListener('click', e => {
    const btn = e.target.closest('.kh-index-filter')
    if (!btn) return
    const key = btn.dataset.filter
    apply(key)
    history.replaceState(null, '', key === 'all' ? window.location.pathname : `#${key}`)
  })

  window.addEventListener('hashchange', () => apply(window.location.hash.slice(1)))
}
