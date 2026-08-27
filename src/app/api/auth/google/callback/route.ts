import { NextRequest } from 'next/server'
import sql from '@/lib/db'
import { signToken } from '@/lib/jwt'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'

function redirect(path: string, cookie?: string) {
  const headers = new Headers({ Location: `${BASE_URL}${path}` })
  if (cookie) headers.append('Set-Cookie', cookie)
  // Borrar state cookie
  headers.append('Set-Cookie', 'g_state=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax')
  return new Response(null, { status: 302, headers })
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code  = searchParams.get('code')
  const state = searchParams.get('state')

  // Verificar CSRF state
  const cookieState = decodeURIComponent(req.cookies.get('g_state')?.value ?? '')
  if (!code || !state || state !== cookieState) {
    return redirect('/?error=oauth_state')
  }

  const [, torneoId] = state.split(':')

  // Intercambiar code por access_token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri:  `${BASE_URL}/api/auth/google/callback`,
      grant_type:    'authorization_code',
    }),
  })

  if (!tokenRes.ok) return redirect('/?error=oauth_token')

  const { access_token } = await tokenRes.json()

  // Obtener perfil del usuario
  const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${access_token}` },
  })

  if (!profileRes.ok) return redirect('/?error=oauth_profile')

  const profile: { email: string; name: string } = await profileRes.json()
  const email = profile.email.toLowerCase()
  const nombreDT = (profile.name ?? email.split('@')[0]).slice(0, 20)

  // Buscar o crear usuario en nuestra DB
  let [usuario] = await sql`
    SELECT id, nombre_dt, rol FROM usuarios
    WHERE torneo_id = ${torneoId} AND email = ${email}
    LIMIT 1
  `

  if (!usuario) {
    // Primera vez — crear cuenta automáticamente (sin contraseña)
    ;[usuario] = await sql`
      INSERT INTO usuarios (torneo_id, email, password_hash, nombre_dt, rol)
      VALUES (${torneoId}, ${email}, '', ${nombreDT}, 'jugador')
      RETURNING id, nombre_dt, rol
    `
  }

  if (!usuario) return redirect('/?error=oauth_db')

  const token = await signToken({
    userId:   usuario.id,
    email,
    nombreDT: usuario.nombreDt ?? nombreDT,
    torneoId,
    rol:      usuario.rol,
  })

  const jwtCookie = `panda_token=${token}; HttpOnly; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax`
  return redirect('/app', jwtCookie)
}
