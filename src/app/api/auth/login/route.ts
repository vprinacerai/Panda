import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import sql from '@/lib/db'
import { signToken } from '@/lib/jwt'

function cookieResponse(body: object, token: string) {
  const res = Response.json(body)
  const headers = new Headers(res.headers)
  headers.set('Set-Cookie', `panda_token=${token}; HttpOnly; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax`)
  return new Response(res.body, { status: res.status, headers })
}

export async function POST(req: NextRequest) {
  const { email, password, torneoId } = await req.json()

  if (!email || !password || !torneoId) {
    return Response.json({ exito: false, mensaje: 'Datos incompletos.' }, { status: 400 })
  }

  if (process.env.DEV_MODE === 'true') {
    const token = await signToken({
      userId: 'dev-user-id',
      email,
      nombreDT: email.split('@')[0],
      torneoId,
      rol: email.includes('admin') ? 'admin' : 'jugador',
    })
    return cookieResponse({ exito: true, usuario: { email, nombreDT: email.split('@')[0], rol: 'jugador' } }, token)
  }

  const emailNorm = email.trim().toLowerCase()
  const [usuario] = await sql`
    SELECT id, email, password_hash, nombre_dt, rol
    FROM usuarios
    WHERE torneo_id = ${torneoId} AND email = ${emailNorm}
    LIMIT 1
  `

  if (!usuario) {
    return Response.json({ exito: false, mensaje: 'Correo o contraseña incorrectos.' })
  }

  const match = await bcrypt.compare(password, usuario.passwordHash)
  if (!match) {
    return Response.json({ exito: false, mensaje: 'Correo o contraseña incorrectos.' })
  }

  const token = await signToken({
    userId: usuario.id,
    email: usuario.email,
    nombreDT: usuario.nombreDt,
    torneoId,
    rol: usuario.rol,
  })

  return cookieResponse({ exito: true, usuario: { email: usuario.email, nombreDT: usuario.nombreDt, rol: usuario.rol } }, token)
}
