import { buildCookie } from '@/lib/cookies'

export async function POST() {
  const res = Response.json({ exito: true })
  const headers = new Headers(res.headers)
  headers.set('Set-Cookie', buildCookie('panda_token', '', 0))
  return new Response(res.body, { status: 200, headers })
}
