// ── DELIVERY EMAIL TEMPLATE ───────────────────────────────────────────────────
// Builds the branded, Gmail-safe download email used by the admin Deliver tab.
// Table layout + inline styles only: Gmail strips <style>, <svg> and scripts.
//
// buildDeliveryEmail({ title, greeting, message, files }) → { html, fragment }
//   html      complete document (for "Download .html")
//   fragment  just the email table (what "Copy for Gmail" puts on the clipboard)
//
// files: [{ label, playbackId, downloadName, width, height, bytes, duration }]

const SITE = 'https://kevinhaus.com'
const FONT = "Albertus,'Palatino Linotype','Book Antiqua',Palatino,Georgia,serif"
const C = { bg: '#e6e6e6', text: '#0a0a0a', muted: '#6b6b6b', faint: '#8a8a8a', rule: '#c8c8c8' }

const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function formatDuration(sec) {
  const s = Math.round(sec || 0)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${r}` : `${m}:${r}`
}

export function formatSize(bytes) {
  if (!bytes) return ''
  const mb = bytes / 1e6
  return mb >= 1000 ? `${(mb / 1000).toFixed(1)} GB` : `${Math.max(1, Math.round(mb))} MB`
}

// File-name-safe version of a title for ?download= (keeps it readable).
export function downloadName(title) {
  return String(title || 'video')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .toUpperCase() || 'VIDEO'
}

// "Horizontal 16:9" / "Vertical 9:16" / "Square 1:1" from pixel dimensions.
export function shapeLabel(w, h) {
  if (!w || !h) return 'Video'
  const r = w / h
  const near = (x) => Math.abs(r - x) / x < 0.03
  if (near(1)) return 'Square 1:1'
  if (r > 1) {
    if (near(16 / 9)) return 'Horizontal 16:9'
    if (near(4 / 3)) return 'Horizontal 4:3'
    if (near(2.39) || near(2.4)) return 'Widescreen 2.39:1'
    if (near(1.85)) return 'Widescreen 1.85:1'
    return 'Horizontal'
  }
  if (near(9 / 16)) return 'Vertical 9:16'
  if (near(4 / 5)) return 'Vertical 4:5'
  if (near(3 / 4)) return 'Vertical 3:4'
  return 'Vertical'
}

export const mp4Url = (playbackId, name) =>
  `https://stream.mux.com/${playbackId}/highest.mp4?download=${encodeURIComponent(name || 'VIDEO')}`

const shortUrl = (playbackId) => `stream.mux.com/${playbackId}/highest.mp4`

function button(href, text) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td bgcolor="${C.text}" style="background:${C.text};">
                    <a href="${esc(href)}"
                       style="display:inline-block;padding:15px 36px;font-family:${FONT};font-size:13px;letter-spacing:3px;text-transform:uppercase;color:${C.bg};text-decoration:none;">
                      ${esc(text)}
                    </a>
                  </td>
                </tr>
              </table>`
}

export function buildDeliveryEmail({ title = '', greeting = 'Hi there,', message = '', files = [] }) {
  const multi = files.length > 1
  const durations = files.map(f => Math.round(f.duration || 0))
  const sameLength = durations.every(d => Math.abs(d - durations[0]) <= 1)
  const intro = message || (multi ? 'Your files are ready to download.' : 'Your file is ready to download.')

  let subtitle
  let body
  if (!multi && files.length === 1) {
    const f = files[0]
    subtitle = ['mp4', f.width && f.height ? `${f.width}×${f.height}` : '', formatDuration(f.duration), formatSize(f.bytes)]
      .filter(Boolean).join(' · ')
    body = `
        <tr>
          <td style="padding-bottom:40px;">
              ${button(mp4Url(f.playbackId, f.downloadName), 'Download')}
          </td>
        </tr>`
  } else {
    subtitle = [`${files.length} files`, 'mp4', sameLength && files.length ? formatDuration(files[0].duration) : '']
      .filter(Boolean).join(' · ')
    body = files.map((f, i) => {
      const last = i === files.length - 1
      const specs = [f.width && f.height ? `${f.width}×${f.height}` : '', sameLength ? '' : formatDuration(f.duration), formatSize(f.bytes)]
        .filter(Boolean).join(' · ')
      const shortLabel = (f.label || '').match(/\d+(?:\.\d+)?:\d+/)?.[0] || ''
      return `
        <tr>
          <td style="border-top:1px solid ${C.rule};${last ? `border-bottom:1px solid ${C.rule};` : ''}padding:22px 0 24px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-family:${FONT};font-size:16px;line-height:24px;color:${C.text};padding-bottom:2px;">${esc(f.label || `File ${i + 1}`)}</td>
              </tr>
              <tr>
                <td style="font-family:${FONT};font-size:13px;line-height:20px;color:${C.muted};padding-bottom:16px;">${esc(specs)}</td>
              </tr>
              <tr>
                <td>
              ${button(mp4Url(f.playbackId, f.downloadName), shortLabel ? `Download ${shortLabel}` : 'Download')}
                </td>
              </tr>
            </table>
          </td>
        </tr>`
    }).join('')
  }

  const fallback = multi
    ? `If a button doesn’t work, copy its link into your browser:<br><br>` +
      files.map(f => {
        const tag = (f.label || '').match(/\d+(?:\.\d+)?:\d+/)?.[0] || f.label || ''
        return `${esc(tag)}${tag ? ' — ' : ''}<a href="${esc(mp4Url(f.playbackId, f.downloadName))}" style="color:${C.faint};word-break:break-all;">${shortUrl(f.playbackId)}</a>`
      }).join('<br><br>')
    : files[0]
      ? `If the button doesn’t work, copy this link into your browser:<br><a href="${esc(mp4Url(files[0].playbackId, files[0].downloadName))}" style="color:${C.faint};word-break:break-all;">${shortUrl(files[0].playbackId)}</a>`
      : ''

  const greetingHtml = esc(greeting).replace(/\n/g, '<br>')
  const introHtml = esc(intro).replace(/\n/g, '<br>')

  const fragment = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.bg}" style="background:${C.bg};">

  <!-- HEADER -->
  <tr>
    <td style="border-bottom:1px solid ${C.rule};padding:12px 20px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;margin:0 auto;">
        <tr>
          <td>
            <a href="${SITE}/" style="text-decoration:none;">
              <img src="${SITE}/assets/Logo_small_blk.png" width="65" height="48" alt="Kevin Haus" style="display:block;border:0;width:65px;height:48px;">
            </a>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- CONTENT -->
  <tr>
    <td align="center" style="padding:56px 20px 64px 20px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
        <tr>
          <td style="font-family:${FONT};font-size:16px;line-height:26px;color:${C.text};padding-bottom:32px;">
            ${greetingHtml}${greetingHtml ? '<br>' : ''}
            ${introHtml}
          </td>
        </tr>
        <tr>
          <td style="font-family:${FONT};font-size:26px;line-height:32px;font-weight:bold;color:${C.text};padding-bottom:6px;">
            ${esc(title)}
          </td>
        </tr>
        <tr>
          <td style="font-family:${FONT};font-size:13px;line-height:20px;color:${C.muted};padding-bottom:36px;">
            ${esc(subtitle)}
          </td>
        </tr>
${body}
        <tr>
          <td style="padding-top:28px;font-family:${FONT};font-size:12px;line-height:18px;color:${C.faint};">
            ${fallback}
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- FOOTER -->
  <tr>
    <td align="center" style="border-top:1px solid ${C.rule};padding:36px 20px 40px 20px;">
      <a href="${SITE}/" style="text-decoration:none;">
        <img src="${SITE}/assets/KH_Square.png" width="51" height="36" alt="KH" style="display:block;border:0;width:51px;height:36px;margin:0 auto 12px auto;">
      </a>
      <a href="mailto:hello@kevinhaus.com" style="font-family:${FONT};font-size:16px;letter-spacing:0.64px;color:${C.text};text-decoration:none;">hello@kevinhaus.com</a>
    </td>
  </tr>

</table>`

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<title>${esc(title)} — Kevin Haus</title>
</head>
<body style="margin:0;padding:0;background:${C.bg};">
${fragment}
</body>
</html>
`
  return { html, fragment }
}
