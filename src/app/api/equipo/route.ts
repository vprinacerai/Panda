import { NextRequest } from 'next/server'
import sql from '@/lib/db'
import { getSession, requireSession } from '@/lib/auth'

// In-memory store for DEV_MODE — keyed by userId
const devStore: Record<string, { nombre_equipo: string; capitan_id: string | null; jugadores_ids: string[] }> = {}

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  const authError = requireSession(session)
  if (authError) return authError

  if (process.env.DEV_MODE === 'true') {
    return Response.json({
      fechaActual: { id: 'dev-fecha-1', nombre: 'Fecha 1', deadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString() },
      mercadoAbierto: true,
      reaperturaEn: null,
      premios: { campeon: 100000, fecha: 10000 },
      equipoGuardado: devStore[session!.userId] ?? null,
    })
  }

  const torneoId = session!.torneoId

  const [fechaActual] = await sql`
    SELECT id, nombre_fecha, numero, deadline_cierre, fecha_fin
    FROM config_fechas
    WHERE torneo_id = ${torneoId} AND publicada = false
    ORDER BY numero ASC LIMIT 1
  `

  const [torneo] = await sql`SELECT premio_campeon, premio_fecha FROM torneos WHERE id = ${torneoId}`
  const premios = { campeon: torneo?.premioCampeon ?? 0, fecha: torneo?.premioFecha ?? 0 }

  if (!fechaActual) {
    return Response.json({ fechaActual: null, mercadoAbierto: false, reaperturaEn: null, premios })
  }

  const ahora = new Date()
  let mercadoAbierto = true
  let reaperturaEn: string | null = null

  if (fechaActual.deadlineCierre) {
    mercadoAbierto = ahora < new Date(fechaActual.deadlineCierre)
  }

  if (!mercadoAbierto && fechaActual.fechaFin) {
    const reapertura = new Date(new Date(fechaActual.fechaFin).getTime() + 24 * 60 * 60 * 1000)
    reaperturaEn = reapertura.toISOString()
    if (ahora >= reapertura) mercadoAbierto = true
  }

  const [equipoGuardado] = await sql`
    SELECT nombre_equipo, capitan_id, jugadores_ids
    FROM equipos_usuarios
    WHERE usuario_id = ${session!.userId} AND fecha_config_id = ${fechaActual.id}
    LIMIT 1
  `

  return Response.json({
    fechaActual: { id: fechaActual.id, nombre: fechaActual.nombreFecha, deadline: fechaActual.deadlineCierre },
    mercadoAbierto,
    reaperturaEn,
    premios,
    equipoGuardado: equipoGuardado ?? null,
  })
}

export async function POST(req: NextRequest) {
  const session = await getSession(req)
  const authError = requireSession(session)
  if (authError) return authError

  const { nombreEquipo, jugadoresIds, capitanId, fechaConfigId } = await req.json()

  if (!nombreEquipo || !jugadoresIds || jugadoresIds.length !== 7 || !fechaConfigId) {
    return Response.json({ error: 'Alineación inválida. Se requieren exactamente 7 jugadores.' }, { status: 400 })
  }

  if (new Set(jugadoresIds).size !== jugadoresIds.length) {
    return Response.json({ error: 'Hay jugadores repetidos en la alineación.' }, { status: 400 })
  }

  if (process.env.DEV_MODE === 'true') {
    devStore[session!.userId] = { nombre_equipo: nombreEquipo, capitan_id: capitanId ?? null, jugadores_ids: jugadoresIds }
    return Response.json({ exito: true, mensaje: '✅ Alineación guardada correctamente.' })
  }

  const [fechaConfig] = await sql`
    SELECT deadline_cierre, publicada FROM config_fechas WHERE id = ${fechaConfigId} LIMIT 1
  `

  if (!fechaConfig || fechaConfig.publicada) {
    return Response.json({ error: 'Esta fecha ya está cerrada.' }, { status: 400 })
  }

  if (fechaConfig.deadlineCierre && new Date() >= new Date(fechaConfig.deadlineCierre)) {
    return Response.json({ error: '⏰ Mercado cerrado. No se permiten cambios.' }, { status: 400 })
  }

  await sql`
    INSERT INTO equipos_usuarios (torneo_id, usuario_id, fecha_config_id, nombre_equipo, capitan_id, jugadores_ids, updated_at)
    VALUES (${session!.torneoId}, ${session!.userId}, ${fechaConfigId}, ${nombreEquipo}, ${capitanId ?? null}, ${jugadoresIds}::uuid[], NOW())
    ON CONFLICT (usuario_id, fecha_config_id) DO UPDATE SET
      nombre_equipo = EXCLUDED.nombre_equipo,
      capitan_id    = EXCLUDED.capitan_id,
      jugadores_ids = EXCLUDED.jugadores_ids,
      updated_at    = EXCLUDED.updated_at
  `

  return Response.json({ exito: true, mensaje: '✅ Alineación guardada correctamente.' })
}
