import { NextRequest } from 'next/server'
import sql from '@/lib/db'
import { getSession, requireAdmin } from '@/lib/auth'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ fechaId: string }> }) {
  const session = await getSession(req)
  const authError = requireAdmin(session)
  if (authError) return authError

  const { fechaId } = await params
  const { nombreFecha, numero, deadlineCierre, fechaFin } = await req.json()

  const [f] = await sql`
    UPDATE config_fechas SET
      nombre_fecha    = COALESCE(${nombreFecha?.trim() ?? null}, nombre_fecha),
      numero          = COALESCE(${numero ?? null}, numero),
      deadline_cierre = COALESCE(${deadlineCierre ?? null}, deadline_cierre),
      fecha_fin       = COALESCE(${fechaFin ?? null}, fecha_fin)
    WHERE id = ${fechaId} AND torneo_id = ${session!.torneoId} AND publicada = false
    RETURNING id, nombre_fecha, numero, deadline_cierre, fecha_fin, publicada
  `
  if (!f) return Response.json({ error: 'Fecha no encontrada o ya publicada.' }, { status: 404 })
  return Response.json(f)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ fechaId: string }> }) {
  const session = await getSession(req)
  const authError = requireAdmin(session)
  if (authError) return authError

  const { fechaId } = await params
  const [f] = await sql`
    DELETE FROM config_fechas WHERE id = ${fechaId} AND torneo_id = ${session!.torneoId} AND publicada = false
    RETURNING id
  `
  if (!f) return Response.json({ error: 'No se puede eliminar una fecha ya publicada.' }, { status: 400 })
  return Response.json({ exito: true })
}
