import { NextRequest } from 'next/server'
import sql from '@/lib/db'
import { getSession, requireSession } from '@/lib/auth'
import { calcularPuntosEquipo, StatsJugador } from '@/lib/scoring'

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  const authError = requireSession(session)
  if (authError) return authError

  if (process.env.DEV_MODE === 'true') {
    return Response.json({ fechas: [], rankingGeneral: [], rankingPorFecha: {} })
  }

  const torneoId = session!.torneoId

  const fechas = await sql`
    SELECT id, nombre_fecha, numero FROM config_fechas
    WHERE torneo_id = ${torneoId} AND publicada = true ORDER BY numero ASC
  `
  if (!fechas.length) {
    return Response.json({ fechas: [], rankingGeneral: [], rankingPorFecha: {} })
  }

  const fechaIds = fechas.map(f => f.id)

  const equipos = await sql`
    SELECT usuario_id, nombre_equipo, capitan_id, jugadores_ids, fecha_config_id
    FROM equipos_usuarios WHERE torneo_id = ${torneoId} AND fecha_config_id = ANY(${fechaIds}::uuid[])
  `

  const stats = await sql`
    SELECT e.jugador_id, e.fecha_config_id, e.puntos_totales,
           e.goles, e.valla_invicta, e.amarillas, e.roja,
           e.penales_atajados, e.penales_errados, e.es_figura, e.jugo,
           j.posicion
    FROM estadisticas e JOIN jugadores j ON j.id = e.jugador_id
    WHERE e.torneo_id = ${torneoId} AND e.fecha_config_id = ANY(${fechaIds}::uuid[])
  `

  const usuarios = await sql`SELECT id, nombre_dt FROM usuarios WHERE torneo_id = ${torneoId}`

  const nombresDT: Record<string, string> = {}
  usuarios.forEach(u => { nombresDT[u.id] = u.nombreDt })

  const statsMap: Record<string, StatsJugador> = {}
  stats.forEach(s => {
    statsMap[`${s.jugadorId}_${s.fechaConfigId}`] = {
      posicion: s.posicion,
      goles: s.goles,
      valla_invicta: s.vallaInvicta,
      amarillas: s.amarillas,
      roja: s.roja,
      penales_atajados: s.penalesAtajados,
      penales_errados: s.penalesErrados,
      es_figura: s.esFigura,
      jugo: s.jugo,
    }
  })

  const historial: Record<string, { nombreEquipo: string; alineaciones: Record<string, { ids: string[]; capitanId: string | null }> }> = {}
  equipos.forEach(eq => {
    if (!historial[eq.usuarioId]) historial[eq.usuarioId] = { nombreEquipo: eq.nombreEquipo, alineaciones: {} }
    historial[eq.usuarioId].nombreEquipo = eq.nombreEquipo
    historial[eq.usuarioId].alineaciones[eq.fechaConfigId] = { ids: eq.jugadoresIds, capitanId: eq.capitanId }
  })

  const rankingGeneral: { usuario: string; equipo: string; puntos: number }[] = []
  const rankingPorFecha: Record<string, { usuario: string; equipo: string; puntos: number }[]> = {}
  fechas.forEach(f => { rankingPorFecha[f.nombreFecha] = [] })

  Object.entries(historial).forEach(([usuarioId, datos]) => {
    let totalPuntos = 0
    let ultimaAlineacion: { ids: string[]; capitanId: string | null } | null = null

    fechas.forEach(f => {
      if (datos.alineaciones[f.id]) ultimaAlineacion = datos.alineaciones[f.id]
      if (!ultimaAlineacion) return

      const statsParaFecha: Record<string, StatsJugador> = {}
      ultimaAlineacion.ids.forEach(jId => {
        const s = statsMap[`${jId}_${f.id}`]
        if (s) statsParaFecha[jId] = s
      })

      const puntosEnFecha = calcularPuntosEquipo(ultimaAlineacion.ids, ultimaAlineacion.capitanId, statsParaFecha)
      totalPuntos += puntosEnFecha
      rankingPorFecha[f.nombreFecha].push({ usuario: nombresDT[usuarioId] ?? usuarioId, equipo: datos.nombreEquipo, puntos: puntosEnFecha })
    })

    rankingGeneral.push({ usuario: nombresDT[usuarioId] ?? usuarioId, equipo: datos.nombreEquipo, puntos: totalPuntos })
  })

  rankingGeneral.sort((a, b) => b.puntos - a.puntos)
  Object.values(rankingPorFecha).forEach(arr => arr.sort((a, b) => b.puntos - a.puntos))

  return Response.json({
    fechas: fechas.map(f => f.nombreFecha),
    rankingGeneral,
    rankingPorFecha,
  })
}
