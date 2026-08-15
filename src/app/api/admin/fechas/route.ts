import { NextRequest } from 'next/server'
import sql from '@/lib/db'
import { getSession, requireAdmin } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  const authError = requireAdmin(session)
  if (authError) return authError

  if (process.env.DEV_MODE === 'true') {
    return Response.json([
      { id: 'dev-fecha-1', nombre_fecha: 'Fecha 1', numero: 1, deadline_cierre: new Date(Date.now() + 48 * 3600000).toISOString(), fecha_fin: null, publicada: false },
      { id: 'dev-fecha-2', nombre_fecha: 'Fecha 2', numero: 2, deadline_cierre: null, fecha_fin: null, publicada: false },
    ])
  }

  const fechas = await sql`
    SELECT id, nombre_fecha, numero, deadline_cierre, fecha_fin, publicada
    FROM config_fechas WHERE torneo_id = ${session!.torneoId} ORDER BY numero ASC
  `
  return Response.json(fechas)
}

export async function POST(req: NextRequest) {
  const session = await getSession(req)
  const authError = requireAdmin(session)
  if (authError) return authError

  const { nombreFecha, numero, deadlineCierre, fechaFin } = await req.json()
  if (!nombreFecha?.trim() || !numero) {
    return Response.json({ error: 'Nombre y número de fecha son requeridos.' }, { status: 400 })
  }

  if (process.env.DEV_MODE === 'true') {
    return Response.json({ id: 'dev-new', nombre_fecha: nombreFecha, numero, publicada: false }, { status: 201 })
  }

  const [fecha] = await sql`
    INSERT INTO config_fechas (torneo_id, nombre_fecha, numero, deadline_cierre, fecha_fin)
    VALUES (${session!.torneoId}, ${nombreFecha.trim()}, ${numero},
            ${deadlineCierre ?? null}, ${fechaFin ?? null})
    RETURNING id, nombre_fecha, numero, deadline_cierre, fecha_fin, publicada
  `
  return Response.json(fecha, { status: 201 })
}
