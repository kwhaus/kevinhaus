import { timingSafeEqual } from 'crypto'

// Checks a password against ADMIN_PASSWORD. The password never leaves the server.
export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const supplied = req.headers.get('X-Admin-Password') || ''
  const expected = process.env.ADMIN_PASSWORD || ''

  const a = Buffer.from(supplied)
  const b = Buffer.from(expected)
  const ok = expected.length > 0 && a.length === b.length && timingSafeEqual(a, b)

  return new Response(JSON.stringify({ ok }), {
    status: ok ? 200 : 401,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const config = { path: '/.netlify/functions/admin-login' }