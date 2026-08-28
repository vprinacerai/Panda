import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import sql from '@/lib/db'
import { signToken } from '@/lib/jwt'

export async function POST(req: NextRequest) {
  const { email, codigo, nuevaPassword, torneoId } = await req.json()
  if (!email || !codigo || !nuevaPassword || !torneoId) {
    return Response.json({ exito: false, mensaje: 'Datos incompletos.' }, { status: 400 })
  }

  if (nuevaPassword.length < 8) {
    return Response.json({ exito: false, mensaje: 'La contraseña debe tener al menos 8 caracteres.' })
  }

  const emailNorm = email.trim().toLowerCase()
  const [usuario] = await sql`
    SELECT id, nombre_dt, rol, codigo_recuperacion FROM usuarios
    WHERE torneo_id = ${torneoId} AND email = ${emailNorm} LIMIT 1
  `

  if (!usuario || usuario.codigoRecuperacion !== codigo) {
    return Response.json({ exito: false, mensaje: 'Código incorrecto o expirado.' })
  }

  const hash = await bcrypt.hash(nuevaPassword, 12)
  await sql`
    UPDATE usuarios SET password_hash = ${hash}, codigo_recuperacion = NULL WHERE id = ${usuario.id}
  `

  // Re-emitir JWT para mantener la sesión activa sin necesidad de volver a loguearse
  const token = await signToken({
    userId: usuario.id, email: emailNorm,
    nombreDT: usuario.nombreDt, torneoId, rol: usuario.rol,
  })

  const res = Response.json({ exito: true, mensaje: 'Contraseña actualizada correctamente.' })
  const headers = new Headers(res.headers)
  headers.set('Set-Cookie', `panda_token=${token}; HttpOnly; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax`)
  return new Response(res.body, { status: 200, headers })
}
