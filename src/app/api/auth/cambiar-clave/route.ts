import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import sql from '@/lib/db'

export async function POST(req: NextRequest) {
  const { email, codigo, nuevaPassword, torneoId } = await req.json()
  if (!email || !codigo || !nuevaPassword || !torneoId) {
    return Response.json({ exito: false, mensaje: 'Datos incompletos.' }, { status: 400 })
  }

  const emailNorm = email.trim().toLowerCase()
  const [usuario] = await sql`
    SELECT id, codigo_recuperacion FROM usuarios
    WHERE torneo_id = ${torneoId} AND email = ${emailNorm} LIMIT 1
  `

  if (!usuario || usuario.codigoRecuperacion !== codigo) {
    return Response.json({ exito: false, mensaje: 'Código incorrecto o expirado.' })
  }

  const hash = await bcrypt.hash(nuevaPassword, 12)
  await sql`
    UPDATE usuarios SET password_hash = ${hash}, codigo_recuperacion = NULL WHERE id = ${usuario.id}
  `

  return Response.json({ exito: true, mensaje: 'Contraseña actualizada correctamente.' })
}
