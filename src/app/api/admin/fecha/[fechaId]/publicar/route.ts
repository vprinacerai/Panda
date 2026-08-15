import { NextRequest } from 'next/server'
import sql from '@/lib/db'
import { getSession, requireAdmin } from '@/lib/auth'

export async function POST(req: NextRequest, { params }: { params: Promise<{ fechaId: string }> }) {
  const { fechaId } = await params
  const session = await getSession(req)
  const authError = requireAdmin(session)
  if (authError) return authError

  if (process.env.DEV_MODE === 'true') {
    return Response.json({ exito: true, mensaje: '✅ Fecha publicada.' })
  }

  await sql`
    UPDATE config_fechas SET publicada = true
    WHERE id = ${fechaId} AND torneo_id = ${session!.torneoId}
  `

  return Response.json({ exito: true, mensaje: '✅ Fecha publicada. El ranking está actualizado.' })
}
