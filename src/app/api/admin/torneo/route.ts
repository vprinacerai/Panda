import { NextRequest } from 'next/server'
import sql from '@/lib/db'
import { getSession, requireAdmin } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  const authError = requireAdmin(session)
  if (authError) return authError

  const [torneo] = await sql`SELECT id, nombre, organizador_email, premio_campeon, premio_fecha FROM torneos WHERE id = ${session!.torneoId}`
  if (!torneo) return Response.json({ error: 'Torneo no encontrado.' }, { status: 404 })
  return Response.json(torneo)
}

export async function PUT(req: NextRequest) {
  const session = await getSession(req)
  const authError = requireAdmin(session)
  if (authError) return authError

  const { nombre, organizadorEmail, premioCampeon, premioFecha } = await req.json()

  const [t] = await sql`
    UPDATE torneos SET
      nombre            = COALESCE(${nombre ?? null}, nombre),
      organizador_email = COALESCE(${organizadorEmail ?? null}, organizador_email),
      premio_campeon    = COALESCE(${premioCampeon ?? null}, premio_campeon),
      premio_fecha      = COALESCE(${premioFecha ?? null}, premio_fecha)
    WHERE id = ${session!.torneoId}
    RETURNING id, nombre, organizador_email, premio_campeon, premio_fecha
  `
  return Response.json(t)
}
