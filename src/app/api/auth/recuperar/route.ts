import { NextRequest } from 'next/server'
import { Resend } from 'resend'
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

  // Respuesta genérica para no revelar si el email existe
  if (!usuario) {
    return Response.json({ exito: true, mensaje: 'Si el correo existe, recibirás el código en tu bandeja.' })
  }

  const codigo = Math.floor(100000 + Math.random() * 900000).toString()
  await sql`UPDATE usuarios SET codigo_recuperacion = ${codigo} WHERE id = ${usuario.id}`

  const [torneo] = await sql`SELECT nombre FROM torneos WHERE id = ${torneoId} LIMIT 1`
  const torneoNombre = torneo?.nombre ?? 'PANDA Fantasy'

  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM ?? 'PANDA Fantasy <noreply@pandafut.com>',
      to: emailNorm,
      subject: `Tu código de recuperación — ${torneoNombre}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0a0e17;color:#fff;border-radius:16px;">
          <h1 style="font-size:32px;letter-spacing:4px;margin:0 0 8px;color:#00d2ff;">PANDA</h1>
          <p style="color:#94a3b8;margin:0 0 24px;font-size:13px;">FANTASY FÚTBOL</p>
          <h2 style="font-size:18px;margin:0 0 16px;">Recuperación de contraseña</h2>
          <p style="color:#94a3b8;margin:0 0 24px;">Ingresá este código en la aplicación para cambiar tu contraseña:</p>
          <div style="background:#111827;border:1px solid rgba(0,210,255,0.3);border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
            <span style="font-size:36px;font-weight:900;letter-spacing:8px;color:#00d2ff;">${codigo}</span>
          </div>
          <p style="color:#64748b;font-size:12px;">Si no solicitaste este código, ignorá este correo. El código es válido para un solo uso.</p>
        </div>
      `,
    })
    if (error) {
      console.error('[RESEND ERROR]', JSON.stringify(error))
      // Mostrar código en respuesta como fallback si Resend falla
      return Response.json({ exito: true, mensaje: `Código: ${codigo} (el email falló, usá este código directamente)` })
    }
    console.log('[RESEND OK]', data?.id)
    return Response.json({ exito: true, mensaje: 'Te enviamos el código a tu correo. Revisá también el spam.' })
  }

  // Fallback si no hay RESEND_API_KEY configurado
  console.log(`[RECUPERACIÓN] Código para ${emailNorm}: ${codigo}`)
  return Response.json({ exito: true, mensaje: `Código enviado. (Dev: ${codigo})` })
}
