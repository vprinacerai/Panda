import { NextRequest } from 'next/server'
import sql from '@/lib/db'

export async function POST(req: NextRequest) {
  const { email, torneoId } = await req.json()
  if (!email || !torneoId) {
    return Response.json({ exito: false, mensaje: 'Datos incompletos.' }, { status: 400 })
  }

  const emailNorm = email.trim().toLowerCase()
  const [usuario] = await sql`
    SELECT id FROM usuarios WHERE torneo_id = ${torneoId} AND email = ${emailNorm} LIMIT 1
  `

  if (!usuario) {
    return Response.json({ exito: true, mensaje: 'Si el correo existe, recibirás un código.' })
  }

  const codigo = Math.floor(100000 + Math.random() * 900000).toString()
  await sql`UPDATE usuarios SET codigo_recuperacion = ${codigo} WHERE id = ${usuario.id}`

  // TODO: reemplazar por Resend/Nodemailer en producción
  console.log(`[RECUPERACIÓN] Código para ${emailNorm}: ${codigo}`)

  return Response.json({ exito: true, mensaje: `Tu código es: ${codigo} — Ingresalo en el formulario.` })
}
