import { NextRequest } from 'next/server'
import * as XLSX from 'xlsx'
import sql from '@/lib/db'
import { getSession, requireAdmin } from '@/lib/auth'

// GET /api/admin/jugadores/export — descarga Excel con todos los jugadores
export async function GET(req: NextRequest) {
  const session = await getSession(req)
  const authError = requireAdmin(session)
  if (authError) return authError

  const jugadores = await sql`
    SELECT nombre, equipo, posicion, activo
    FROM jugadores
    WHERE torneo_id = ${session!.torneoId}
    ORDER BY equipo, posicion, nombre
  `

  const POS_LABEL: Record<string, string> = { ARQ: 'Arquero', DEF: 'Defensor', VOL: 'Volante', DEL: 'Delantero' }

  // Separar nombre en Nombre + Apellido (primera palabra vs el resto)
  const rows = jugadores.map(j => {
    const partes = j.nombre.trim().split(' ')
    const nombre   = partes[0] ?? ''
    const apellido = partes.slice(1).join(' ')
    return {
      Nombre:   nombre,
      Apellido: apellido,
      Equipo:   j.equipo,
      Posicion: j.posicion,   // ARQ / DEF / VOL / DEL
      Rol:      POS_LABEL[j.posicion] ?? j.posicion,
      Estado:   j.activo ? 'Activo' : 'Baja',
    }
  })

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows)
  ws['!cols'] = [{ wch: 18 }, { wch: 18 }, { wch: 25 }, { wch: 8 }, { wch: 14 }, { wch: 8 }]
  XLSX.utils.book_append_sheet(wb, ws, 'Jugadores')

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  return new Response(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="jugadores-panda.xlsx"',
    },
  })
}

// POST /api/admin/jugadores/export — importar jugadores desde Excel
// Columnas: Nombre + Apellido (o solo Nombre con nombre completo), Equipo, Posicion
export async function POST(req: NextRequest) {
  const session = await getSession(req)
  const authError = requireAdmin(session)
  if (authError) return authError

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return Response.json({ error: 'No se recibió ningún archivo.' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const wb = XLSX.read(buffer, { type: 'buffer' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' })

  if (!rows.length) return Response.json({ error: 'El archivo está vacío.' }, { status: 400 })

  const POSICIONES_VALIDAS = ['ARQ', 'DEF', 'VOL', 'DEL']
  const torneoId = session!.torneoId

  let insertados = 0, actualizados = 0, sinPosicion = 0

  for (const row of rows) {
    const nombre1   = String(row['Nombre'] ?? row['NOMBRE'] ?? row['nombre'] ?? '').trim()
    const apellido  = String(row['Apellido'] ?? row['APELLIDO'] ?? row['apellido'] ?? '').trim()
    // Combinar nombre + apellido si vienen separados
    const nombreCompleto = apellido ? `${nombre1} ${apellido}`.trim() : nombre1
    const equipo = String(
      row['Equipo'] ?? row['EQUIPO'] ?? row['equipo'] ?? row['Club'] ?? row['CLUB'] ?? ''
    ).trim()
    let posicion = String(
      row['Posicion'] ?? row['POSICION'] ?? row['Posición'] ?? row['POSICIÓN'] ?? ''
    ).trim().toUpperCase()

    if (!nombreCompleto || !equipo) continue
    if (!POSICIONES_VALIDAS.includes(posicion)) { posicion = 'DEL'; sinPosicion++ }

    const [existing] = await sql`
      SELECT id FROM jugadores WHERE torneo_id = ${torneoId} AND nombre = ${nombreCompleto} AND equipo = ${equipo} LIMIT 1
    `
    if (existing) {
      await sql`UPDATE jugadores SET posicion = ${posicion}, activo = true WHERE id = ${existing.id}`
      actualizados++
    } else {
      await sql`INSERT INTO jugadores (torneo_id, nombre, equipo, posicion, activo) VALUES (${torneoId}, ${nombreCompleto}, ${equipo}, ${posicion}, true)`
      insertados++
    }
  }

  const advertencia = sinPosicion > 0 ? ` (${sinPosicion} sin posición → DEL por defecto, editá desde el panel)` : ''
  return Response.json({
    exito: true,
    insertados,
    actualizados,
    mensaje: `${insertados + actualizados} jugadores procesados: ${insertados} nuevos, ${actualizados} actualizados${advertencia}.`,
  })
}
