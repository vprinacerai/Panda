import { NextRequest } from 'next/server'
import crypto from 'crypto'

// Inicia el flujo OAuth: genera state CSRF y redirige a Google
export async function GET(req: NextRequest) {
  const torneoId = req.nextUrl.searchParams.get('torneoId') ?? process.env.NEXT_PUBLIC_TORNEO_ID ?? ''
  // Usar el origen real para que funcione en pandafut.com y en vercel.app
  const origin = req.nextUrl.origin
  const state = `${crypto.randomBytes(16).toString('hex')}:${torneoId}:${origin}`

  const params = new URLSearchParams({
    client_id:     process.env.GOOGLE_CLIENT_ID!,
    redirect_uri:  `${origin}/api/auth/google/callback`,
    response_type: 'code',
    scope:         'openid email profile',
    state,
    access_type:   'online',
    prompt:        'select_account',
  })

  const res = Response.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
  const headers = new Headers(res.headers)
  // State en cookie corta para verificación CSRF
  headers.set('Set-Cookie', `g_state=${encodeURIComponent(state)}; HttpOnly; Path=/; Max-Age=300; SameSite=Lax`)
  return new Response(null, { status: 302, headers })
}
