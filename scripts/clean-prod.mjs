/**
 * LIMPIEZA DE PRODUCCIÓN — ejecutar UNA SOLA VEZ
 * Borra: jugadores, fechas, estadísticas, equipos guardados
 * Conserva: torneo, usuarios (admin y jugadores registrados)
 *
 * Uso:
 *   DATABASE_URL="postgresql://..." node scripts/clean-prod.mjs
 */

import postgres from 'postgres'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Cargar .env.local si existe
try {
  const env = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
  env.split('\n').forEach(line => {
    const [k, ...v] = line.split('=')
    if (k && v.length && !process.env[k.trim()]) process.env[k.trim()] = v.join('=').trim()
  })
} catch {}

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) { console.error('❌ DATABASE_URL no definida'); process.exit(1) }

const ssl = process.env.DATABASE_SSL !== 'false' ? 'prefer' : false
const sql = postgres(DATABASE_URL, { ssl })

const TORNEO_ID = process.env.NEXT_PUBLIC_TORNEO_ID ?? '442a8a67-c442-42f2-9cc4-1369f83048cb'

console.log(`\n⚠️  Limpiando datos de producción para torneo: ${TORNEO_ID}`)
console.log('   Conservando: torneos, usuarios\n')

const [{ count: equipos }] = await sql`SELECT COUNT(*) as count FROM equipos_usuarios WHERE torneo_id = ${TORNEO_ID}`
const [{ count: stats }]   = await sql`SELECT COUNT(*) as count FROM estadisticas WHERE torneo_id = ${TORNEO_ID}`
const [{ count: fechas }]  = await sql`SELECT COUNT(*) as count FROM config_fechas WHERE torneo_id = ${TORNEO_ID}`
const [{ count: jugs }]    = await sql`SELECT COUNT(*) as count FROM jugadores WHERE torneo_id = ${TORNEO_ID}`

console.log(`Registros a borrar:`)
console.log(`  equipos_usuarios : ${equipos}`)
console.log(`  estadisticas     : ${stats}`)
console.log(`  config_fechas    : ${fechas}`)
console.log(`  jugadores        : ${jugs}`)
console.log('')

// Borrar en orden por foreign keys
await sql`DELETE FROM equipos_usuarios WHERE torneo_id = ${TORNEO_ID}`
console.log('✓ equipos_usuarios eliminados')

await sql`DELETE FROM estadisticas WHERE torneo_id = ${TORNEO_ID}`
console.log('✓ estadísticas eliminadas')

await sql`DELETE FROM config_fechas WHERE torneo_id = ${TORNEO_ID}`
console.log('✓ fechas eliminadas')

await sql`DELETE FROM jugadores WHERE torneo_id = ${TORNEO_ID}`
console.log('✓ jugadores eliminados')

console.log('\n✅ Base de datos limpia. Ya podés cargar los nuevos jugadores.')
await sql.end()
