import { NextRequest } from 'next/server'
import sql from '@/lib/db'
import { getSession, requireAdmin } from '@/lib/auth'
import { calcularPuntos } from '@/lib/scoring'

export async function GET(req: NextRequest, { params }: { params: Promise<{ fechaId: string }> }) {
  const session = await getSession(req)
  const authError = requireAdmin(session)
  if (authError) return authError

  const { fechaId } = await params

  if (process.env.DEV_MODE === 'true') {
    const equipos = ['Galacticos', 'Dep Serena', 'Cracken', 'Sicarios', 'Foster', 'Campo', 'Chuchitos', 'Defe']
    const posiciones = ['ARQ', 'DEF', 'DEF', 'DEF', 'VOL', 'VOL', 'VOL', 'DEL', 'DEL', 'DEL'] as const
    const names = ['Mateo G.', 'Lucas R.', 'Santiago G.', 'Benjamin F.', 'Thiago L.', 'Joaquin D.', 'Nicolas M.', 'Agustin P.', 'Franco R.', 'Gonzalo S.']
    const mock = posiciones.flatMap((pos, i) =>
      equipos.map((equipo, j) => ({
        id: `${pos}-${i}-${j}`, nombre: `${names[i].split(' ')[0]} ${equipo.slice(0, 3)}.`, equipo, posicion: pos,
        stats: { goles: 0, valla_invicta: false, amarillas: 0, roja: false, penales_atajados: 0, penales_errados: 0, es_figura: false, jugo: false },
      }))
    )
    return Response.json({ jugadores: mock, fecha: { nombreFecha: 'Fecha Demo', numero: 1 } })
  }

  const jugadores = await sql`
    SELECT id, nombre, equipo, posicion FROM jugadores
    WHERE torneo_id = ${session!.torneoId} AND activo = true ORDER BY equipo
  `

  const statsExistentes = await sql`
    SELECT * FROM estadisticas
    WHERE fecha_config_id = ${fechaId} AND torneo_id = ${session!.torneoId}
  `

  const statsMap: Record<string, object> = {}
  statsExistentes.forEach((s: any) => {
    statsMap[s.jugadorId] = {
      goles: s.goles ?? 0,
      valla_invicta: s.vallaInvicta ?? false,
      amarillas: s.amarillas ?? 0,
      roja: s.roja ?? false,
      penales_atajados: s.penalesAtajados ?? 0,
      penales_errados: s.penalesErrados ?? 0,
      es_figura: s.esFigura ?? false,
      jugo: s.jugo ?? false,
    }
  })

  const resultado = jugadores.map(j => ({
    id: j.id, nombre: j.nombre, equipo: j.equipo, posicion: j.posicion,
    stats: statsMap[j.id] ?? { goles: 0, valla_invicta: false, amarillas: 0, roja: false, penales_atajados: 0, penales_errados: 0, es_figura: false, jugo: false },
  }))

  const [fechaInfo] = await sql`SELECT nombre_fecha, numero FROM config_fechas WHERE id = ${fechaId}`
  return Response.json({ jugadores: resultado, fecha: { nombreFecha: fechaInfo?.nombreFecha ?? '', numero: fechaInfo?.numero ?? 0 } })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ fechaId: string }> }) {
  const session = await getSession(req)
  const authError = requireAdmin(session)
  if (authError) return authError

  const { fechaId } = await params

  if (process.env.DEV_MODE === 'true') {
    return Response.json({ exito: true, mensaje: 'Stats guardadas.' })
  }

  const statsArray: Array<{
    jugador_id: string; goles: number; valla_invicta: boolean; amarillas: number
    roja: boolean; penales_atajados: number; penales_errados: number; es_figura: boolean; jugo: boolean
  }> = await req.json()

  const torneoId = session!.torneoId

  // Fetch posiciones para calcular puntos
  const jugadores = await sql`SELECT id, posicion FROM jugadores WHERE torneo_id = ${torneoId}`
  const posMap: Record<string, string> = {}
  jugadores.forEach(j => { posMap[j.id] = j.posicion })

  for (const s of statsArray) {
    const posicion = (posMap[s.jugador_id] ?? 'DEL') as 'ARQ' | 'DEF' | 'VOL' | 'DEL'
    const puntos = calcularPuntos({ posicion, goles: s.goles ?? 0, valla_invicta: s.valla_invicta ?? false,
      amarillas: s.amarillas ?? 0, roja: s.roja ?? false, penales_atajados: s.penales_atajados ?? 0,
      penales_errados: s.penales_errados ?? 0, es_figura: s.es_figura ?? false, jugo: s.jugo ?? false })

    await sql`
      INSERT INTO estadisticas
        (torneo_id, jugador_id, fecha_config_id, goles, valla_invicta, amarillas, roja,
         penales_atajados, penales_errados, es_figura, jugo, puntos_totales)
      VALUES
        (${torneoId}, ${s.jugador_id}, ${fechaId}, ${s.goles ?? 0}, ${s.valla_invicta ?? false},
         ${s.amarillas ?? 0}, ${s.roja ?? false}, ${s.penales_atajados ?? 0},
         ${s.penales_errados ?? 0}, ${s.es_figura ?? false}, ${s.jugo ?? false}, ${puntos})
      ON CONFLICT (jugador_id, fecha_config_id) DO UPDATE SET
        goles = EXCLUDED.goles, valla_invicta = EXCLUDED.valla_invicta,
        amarillas = EXCLUDED.amarillas, roja = EXCLUDED.roja,
        penales_atajados = EXCLUDED.penales_atajados, penales_errados = EXCLUDED.penales_errados,
        es_figura = EXCLUDED.es_figura, jugo = EXCLUDED.jugo, puntos_totales = EXCLUDED.puntos_totales
    `
  }

  return Response.json({ exito: true, mensaje: `✅ Stats guardadas para ${statsArray.length} jugadores.` })
}
