// ── MUX LIBRARY (admin) ───────────────────────────────────────────────────────
// Fetches every asset in the Mux environment through the admin-only
// /.netlify/functions/mux, and compares it with the site's video list.
// Matching is by Mux asset ID or any playback ID (including BTS videos), so a
// video already on the list is never offered again.

let cache = null

export async function loadMuxLibrary(password, { refresh = false } = {}) {
  if (cache && !refresh) return cache
  const res = await fetch('/.netlify/functions/mux?action=list', {
    headers: { 'X-Admin-Password': password },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || `Mux request failed (${res.status})`)
  cache = body.assets
  return cache
}

// "16:9", "9:16", "4:3", "1:1", "12:5" when close; otherwise Mux's own ratio.
export function ratioFor(asset) {
  const { width: w, height: h } = asset
  if (!w || !h) return asset.aspectRatio || '16:9'
  const r = w / h
  const known = [['16:9', 16 / 9], ['9:16', 9 / 16], ['4:3', 4 / 3], ['3:4', 3 / 4], ['1:1', 1], ['12:5', 12 / 5], ['4:5', 4 / 5]]
  const hit = known.find(([, x]) => Math.abs(r - x) / x < 0.03)
  return hit ? hit[0] : (asset.aspectRatio || `${w}:${h}`)
}

// → { missing: assets not on the list (public only), notInMux: list entries
//     whose video isn't in this Mux environment, signedOnly: count skipped }
export function compareWithList(assets, videoList) {
  const knownAsset = new Set()
  const knownPlayback = new Set()
  for (const v of videoList) {
    if (v.assetId) knownAsset.add(v.assetId)
    if (v.playbackId) knownPlayback.add(v.playbackId)
    if (v.btsPlaybackId) knownPlayback.add(v.btsPlaybackId)
  }
  const onList = (a) => knownAsset.has(a.id) || (a.playbackIds || [a.publicPlaybackId]).some(id => id && knownPlayback.has(id))

  const inMuxPlayback = new Set(assets.flatMap(a => a.playbackIds || [a.publicPlaybackId]).filter(Boolean))
  const inMuxAsset = new Set(assets.map(a => a.id))

  return {
    missing: assets.filter(a => !onList(a) && a.publicPlaybackId),
    signedOnly: assets.filter(a => !onList(a) && !a.publicPlaybackId).length,
    notInMux: videoList.filter(v => v.playbackId && !inMuxPlayback.has(v.playbackId) && !(v.assetId && inMuxAsset.has(v.assetId))),
  }
}

// A list entry built from a Mux asset. Hidden from the portfolio until you
// switch Portfolio on, so importing never changes the public site by itself.
export function entryFromAsset(asset, id) {
  const title = asset.title || 'Untitled'
  const dash = title.indexOf(' - ')
  return {
    id,
    title,
    artist: dash > -1 ? title.slice(0, dash) : title,
    song: dash > -1 ? title.slice(dash + 3) : '',
    type: 'music video',
    assetId: asset.id,
    playbackId: asset.publicPlaybackId,
    coverImage: '',
    aspectRatio: ratioFor(asset),
    stills: [],
    showInPortfolio: false,
  }
}

// A reel-only video (not added to the site's list).
export function reelVideoFromAsset(asset) {
  return {
    id: `mux-${asset.id}`,
    title: asset.title || 'Untitled',
    type: 'mux',
    assetId: asset.id,
    playbackId: asset.publicPlaybackId,
    aspectRatio: ratioFor(asset),
  }
}
