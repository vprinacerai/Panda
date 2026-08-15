/**
 * Motor de puntuación — port directo de Codigo.gs
 * Aplica la matriz oficial de PANDA + bonus capitán (+5 pts)
 */

export interface StatsJugador {
  posicion: 'ARQ' | 'DEF' | 'VOL' | 'DEL'
  goles: number
  valla_invicta: boolean
  amarillas: number
  roja: boolean
  penales_atajados: number
  penales_errados: number
  es_figura: boolean
  jugo: boolean
  es_capitan?: boolean
}

export function calcularPuntos(stats: StatsJugador): number {
  if (!stats.jugo) return 0

  let pts = 2 // presencia

  const ptsPorGol: Record<string, number> = { ARQ: 10, DEF: 8, VOL: 6, DEL: 4 }
  pts += stats.goles * (ptsPorGol[stats.posicion] ?? 0)

  if (stats.valla_invicta) {
    if (stats.posicion === 'ARQ') pts += 7
    else if (stats.posicion === 'DEF') pts += 4
  }

  if (stats.es_figura) pts += 5
  if (stats.posicion === 'ARQ') pts += stats.penales_atajados * 4

  pts -= stats.amarillas * 2
  if (stats.roja) pts -= 5
  pts -= stats.penales_errados * 2

  if (stats.es_capitan) pts += 5

  return pts
}

export interface JugadorConStats {
  jugador_id: string
  posicion: string
  stats: StatsJugador | null
  puntos: number
}

export function calcularPuntosEquipo(
  jugadoresIds: string[],
  capitanId: string | null,
  statsMap: Record<string, StatsJugador>
): number {
  return jugadoresIds.reduce((total, id) => {
    const stats = statsMap[id]
    if (!stats) return total
    return total + calcularPuntos({ ...stats, es_capitan: id === capitanId })
  }, 0)
}
