import { NextRequest } from 'next/server'
import sql from '@/lib/db'
import { getSession, requireAdmin } from '@/lib/auth'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ jugadorId: string }> }) {
  const session = await getSession(req)
  const authError = requireAdmin(session)
  if (authError) return authError

  const { jugadorId } = await params
  const { nombre, equipo, posicion, activo } = await req.json()

  const [j] = await sql`
    UPDATE jugadores SET
      nombre   = COALESCE(${nombre?.trim() ?? null}, nombre),
      equipo   = COALESCE(${equipo?.trim() ?? null}, equipo),
      posicion = COALESCE(${posicion ?? null}, posicion),
      activo   = COALESCE(${activo ?? null}, activo)
    WHERE id = ${jugadorId} AND torneo_id = ${session!.torneoId}
    RETURNING id, nombre, equipo, posicion, activo
  `
  if (!j) return Response.json({ error: 'Jugador no encontrado.' }, { status: 404 })
  return Response.json(j)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ jugadorId: string }> }) {
  const session = await getSession(req)
  const authError = requireAdmin(session)
  if (authError) return authError

  const { jugadorId } = await params
  await sql`UPDATE jugadores SET activo = false WHERE id = ${jugadorId} AND torneo_id = ${session!.torneoId}`
  return Response.json({ exito: true })
}
