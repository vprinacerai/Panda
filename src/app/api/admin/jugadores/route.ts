import { NextRequest } from 'next/server'
import sql from '@/lib/db'
import { getSession, requireAdmin } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  const authError = requireAdmin(session)
  if (authError) return authError

  const jugadores = await sql`
    SELECT id, nombre, equipo, posicion, activo
    FROM jugadores WHERE torneo_id = ${session!.torneoId}
    ORDER BY equipo, posicion, nombre
  `
  return Response.json(jugadores)
}

export async function POST(req: NextRequest) {
  const session = await getSession(req)
  const authError = requireAdmin(session)
  if (authError) return authError

  const { nombre, equipo, posicion } = await req.json()
  if (!nombre?.trim() || !equipo?.trim() || !['ARQ','DEF','VOL','DEL'].includes(posicion)) {
    return Response.json({ error: 'Datos inválidos.' }, { status: 400 })
  }

  const [j] = await sql`
    INSERT INTO jugadores (torneo_id, nombre, equipo, posicion)
    VALUES (${session!.torneoId}, ${nombre.trim()}, ${equipo.trim()}, ${posicion})
    RETURNING id, nombre, equipo, posicion, activo
  `
  return Response.json(j, { status: 201 })
}
