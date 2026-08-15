import { NextRequest } from 'next/server'
import sql from '@/lib/db'
import { getSession, requireSession } from '@/lib/auth'

function mockJugadores() {
  const equipos = ['Galacticos', 'Dep Serena', 'Cracken', 'Sicarios', 'Foster', 'Campo', 'Chuchitos', 'Defe']
  const nombres = [['Mateo','Gonzalez'],['Lucas','Rodriguez'],['Santiago','Gomez'],['Benjamin','Fernandez'],['Thiago','Lopez'],['Joaquin','Diaz'],['Nicolas','Martinez'],['Agustin','Perez'],['Franco','Romero'],['Gonzalo','Sanchez']]
  const posiciones: Array<'ARQ'|'DEF'|'VOL'|'DEL'> = ['ARQ','DEF','DEF','DEF','VOL','VOL','VOL','DEL','DEL','DEL']
  return posiciones.flatMap((pos, i) =>
    equipos.map((equipo, j) => ({
      id: `${pos}-${i}-${j}`,
      nombre: `${nombres[i][0]} ${nombres[j][1]}`,
      equipo,
      posicion: pos,
      ptsUltimaFecha: (i * j) % 20,
    }))
  )
}

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  const authError = requireSession(session)
  if (authError) return authError
  if (process.env.DEV_MODE === 'true') return Response.json(mockJugadores())

  const torneoId = session!.torneoId
  const jugadores = await sql`
    SELECT id, nombre, equipo, posicion FROM jugadores
    WHERE torneo_id = ${torneoId} AND activo = true ORDER BY equipo
  `
  if (!jugadores.length) return Response.json([])

  const [uf] = await sql`
    SELECT id FROM config_fechas
    WHERE torneo_id = ${torneoId} AND publicada = true ORDER BY numero DESC LIMIT 1
  `

  const pts: Record<string, number> = {}
  if (uf) {
    const stats = await sql`SELECT jugador_id, puntos_totales FROM estadisticas WHERE fecha_config_id = ${uf.id}`
    stats.forEach(x => { pts[x.jugadorId] = x.puntosTotales })
  }

  return Response.json(jugadores.map(j => ({ id: j.id, nombre: j.nombre, equipo: j.equipo, posicion: j.posicion, ptsUltimaFecha: pts[j.id] ?? 0 })))
}