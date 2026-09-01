import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import sql from '@/lib/db'
import { signToken } from '@/lib/jwt'
import { buildCookie } from '@/lib/cookies'
import { parseBody, LoginSchema } from '@/lib/schemas'

function cookieResponse(body: object, token: string) {
  const res = Response.json(body)
  const headers = new Headers(res.headers)
  headers.set('Set-Cookie', buildCookie('panda_token', token, 60 * 60 * 24 * 7))
  return new Response(res.body, { status: res.status, headers })
}

const MAX_INTENTOS = 5
const BLOQUEO_MINUTOS = 15

export async function POST(req: NextRequest) {
  const parsed = await parseBody(req, LoginSchema)
  if (parsed instanceof Response) return parsed
  const { email, password, torneoId } = parsed.data

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

  let usuario: any
  let tieneRateLimit = true

  try {
    ;[usuario] = await sql`
      SELECT id, email, password_hash, nombre_dt, rol, login_attempts, lockout_until
      FROM usuarios WHERE torneo_id = ${torneoId} AND email = ${emailNorm} LIMIT 1
    `
  } catch {
    // Columnas de rate limiting no existen aún — fallback sin rate limiting
    tieneRateLimit = false
    ;[usuario] = await sql`
      SELECT id, email, password_hash, nombre_dt, rol
      FROM usuarios WHERE torneo_id = ${torneoId} AND email = ${emailNorm} LIMIT 1
    `
  }

  if (!usuario) {
    // Respuesta genérica para no revelar si el email existe
    return Response.json({ exito: false, mensaje: 'Correo o contraseña incorrectos.' })
  }

  // Verificar bloqueo activo
  if (tieneRateLimit && usuario.lockoutUntil && new Date() < new Date(usuario.lockoutUntil)) {
    const minutosRestantes = Math.ceil((new Date(usuario.lockoutUntil).getTime() - Date.now()) / 60000)
    return Response.json({ exito: false, mensaje: `Cuenta bloqueada temporalmente. Intentá en ${minutosRestantes} min.` }, { status: 429 })
  }

  const match = await bcrypt.compare(password, usuario.passwordHash)
  if (!match) {
    if (tieneRateLimit) {
      const nuevosIntentos = (usuario.loginAttempts ?? 0) + 1
      if (nuevosIntentos >= MAX_INTENTOS) {
        const lockout = new Date(Date.now() + BLOQUEO_MINUTOS * 60 * 1000)
        await sql`UPDATE usuarios SET login_attempts = ${nuevosIntentos}, lockout_until = ${lockout} WHERE id = ${usuario.id}`
        return Response.json({ exito: false, mensaje: `Demasiados intentos fallidos. Cuenta bloqueada por ${BLOQUEO_MINUTOS} minutos.` }, { status: 429 })
      }
      await sql`UPDATE usuarios SET login_attempts = ${nuevosIntentos} WHERE id = ${usuario.id}`
      return Response.json({ exito: false, mensaje: `Correo o contraseña incorrectos. (${MAX_INTENTOS - nuevosIntentos} intentos restantes)` })
    }
    return Response.json({ exito: false, mensaje: 'Correo o contraseña incorrectos.' })
  }

  // Login exitoso: resetear contador si existe
  if (tieneRateLimit) {
    await sql`UPDATE usuarios SET login_attempts = 0, lockout_until = NULL WHERE id = ${usuario.id}`
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
