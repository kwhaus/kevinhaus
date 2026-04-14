// netlify/plugins/cloudflare-purge/index.js
//
// Purges the Cloudflare cache for kevinhaus.com after every successful deploy.
//
// Required Netlify environment variables (set in Netlify dashboard → Site → Environment):
//   CF_ZONE_ID     — Cloudflare Zone ID (found in the domain's Overview page, right sidebar)
//   CF_API_TOKEN   — Cloudflare API Token with "Cache Purge" permission for this zone
//                    Create at: dash.cloudflare.com/profile/api-tokens
//                    Use template "Cache Purge" — scope to kevinhaus.com zone only.

export const onSuccess = async ({ utils }) => {
  const zoneId  = process.env.CF_ZONE_ID
  const token   = process.env.CF_API_TOKEN

  if (!zoneId || !token) {
    console.warn('[cloudflare-purge] CF_ZONE_ID or CF_API_TOKEN not set — skipping purge.')
    return
  }

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({ purge_everything: true }),
      }
    )

    const data = await res.json()

    if (data.success) {
      console.log('[cloudflare-purge] Cache purged successfully.')
    } else {
      const errors = data.errors?.map(e => e.message).join(', ') || 'unknown error'
      utils.build.failPlugin(`[cloudflare-purge] Purge failed: ${errors}`)
    }
  } catch (err) {
    utils.build.failPlugin(`[cloudflare-purge] Request failed: ${err.message}`)
  }
}
