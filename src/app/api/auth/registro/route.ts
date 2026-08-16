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
  let { email, password, nombreDT, torneoId } = await req.json()
if (!torneoId || torneoId === "") {
  const [torneo] = await sql`SELECT id FROM torneos LIMIT 1`
  torneoId = torneo?.id
}
  if (!email || !password || !nombreDT) {
    return Response.json({ exito: false, mensaje: 'Todos los campos son requeridos.' }, { status: 400 })
  }

  if (process.env.DEV_MODE === 'true') {
    const token = await signToken({ userId: 'dev-user-id', email, nombreDT, torneoId, rol: 'jugador' })
    return cookieResponse({ exito: true, mensaje: '¡Cuenta creada! Ya podés ingresar.', usuario: { email, nombreDT } }, token)
  }

  const emailNorm = email.trim().toLowerCase()

  const [existing] = await sql`
    SELECT id FROM usuarios WHERE torneo_id = ${torneoId} AND email = ${emailNorm} LIMIT 1
  `
  if (existing) {
    return Response.json({ exito: false, mensaje: 'Este correo ya está registrado.' })
  }

  const hash = await bcrypt.hash(password, 12)
  const [usuario] = await sql`
    INSERT INTO usuarios (torneo_id, email, password_hash, nombre_dt)
    VALUES (${torneoId}, ${emailNorm}, ${hash}, ${nombreDT})
    RETURNING id, email, nombre_dt, rol
  `

  if (!usuario) {
    return Response.json({ exito: false, mensaje: 'Error al crear la cuenta.' }, { status: 500 })
  }

  const token = await signToken({ userId: usuario.id, email: usuario.email, nombreDT: usuario.nombreDt, torneoId, rol: usuario.rol })
  return cookieResponse({ exito: true, mensaje: '¡Cuenta creada! Ya podés ingresar.', usuario: { email: usuario.email, nombreDT: usuario.nombreDt } }, token)
}
