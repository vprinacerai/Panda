import { NextRequest } from 'next/server'
import sql from '@/lib/db'
import { signToken } from '@/lib/jwt'
import { buildCookie } from '@/lib/cookies'

function makeRedirect(origin: string, path: string, cookie?: string) {
  const headers = new Headers({ Location: `${origin}${path}` })
  if (cookie) headers.append('Set-Cookie', cookie)
    headers.append('Set-Cookie', buildCookie('g_state', '', 0))
  return new Response(null, { status: 302, headers })
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code  = searchParams.get('code')
  const state = searchParams.get('state')
  const cookieState = decodeURIComponent(req.cookies.get('g_state')?.value ?? '')

  if (!code || !state || state !== cookieState) {
    return makeRedirect(req.nextUrl.origin, '/?error=oauth_state')
  }

  // state = randomHex:torneoId:https://origin.com
  const firstColon  = state.indexOf(':')
  const secondColon = state.indexOf(':', firstColon + 1)
  const torneoId = state.slice(firstColon + 1, secondColon)
  const origin   = state.slice(secondColon + 1) || req.nextUrl.origin

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri:  `${origin}/api/auth/google/callback`,
      grant_type:    'authorization_code',
    }),
  })

  if (!tokenRes.ok) return makeRedirect(origin, '/?error=oauth_token')

  const { access_token } = await tokenRes.json()

  const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${access_token}` },
  })

  if (!profileRes.ok) return makeRedirect(origin, '/?error=oauth_profile')

  const profile: { email: string; name: string } = await profileRes.json()
  const email    = profile.email.toLowerCase()
  const nombreDT = (profile.name ?? email.split('@')[0]).slice(0, 15)

  let [usuario] = await sql`
    SELECT id, nombre_dt, rol FROM usuarios
    WHERE torneo_id = ${torneoId} AND email = ${email} LIMIT 1
  `

  if (!usuario) {
    ;[usuario] = await sql`
      INSERT INTO usuarios (torneo_id, email, password_hash, nombre_dt, rol)
      VALUES (${torneoId}, ${email}, '', ${nombreDT}, 'jugador')
      RETURNING id, nombre_dt, rol
    `
  }

  if (!usuario) return makeRedirect(origin, '/?error=oauth_db')

  const token = await signToken({
    userId:   usuario.id,
    email,
    nombreDT: usuario.nombreDt ?? nombreDT,
    torneoId,
    rol:      usuario.rol,
  })

  const jwtCookie = buildCookie('panda_token', token, 60 * 60 * 24 * 7)
  return makeRedirect(origin, '/app', jwtCookie)
}

