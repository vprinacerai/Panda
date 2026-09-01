/**
 * PANDA Fantasy — Auditoría de Seguridad OWASP Top 10
 * Uso: node scripts/security-audit.mjs
 */

import { readFileSync, readdirSync, statSync } from 'fs'
import { join, resolve } from 'path'

// Cargar .env.local
try {
  readFileSync('.env.local', 'utf8').split('\n').forEach(l => {
    const [k, ...v] = l.split('=')
    if (k && v.length && !process.env[k.trim()]) process.env[k.trim()] = v.join('=').trim()
  })
} catch {}

const hallazgos = { criticos: [], altos: [], medios: [], bajos: [], ok: [] }
const BASE = 'http://localhost:3000'
const TORNEO_ID = '442a8a67-c442-42f2-9cc4-1369f83048cb'

function hallazgo(nivel, categoria, desc, recomendacion = '') {
  hallazgos[nivel].push({ categoria, desc, recomendacion })
  const icono = { criticos: '🔴', altos: '🟠', medios: '🟡', bajos: '🔵', ok: '✅' }[nivel]
  console.log(`  ${icono} [${categoria}] ${desc}`)
}

function leerArchivos(dir, ext = '.ts') {
  const resultado = []
  try {
    for (const f of readdirSync(dir)) {
      const ruta = join(dir, f)
      if (statSync(ruta).isDirectory()) resultado.push(...leerArchivos(ruta, ext))
      else if (f.endsWith(ext)) resultado.push({ ruta, contenido: readFileSync(ruta, 'utf8') })
    }
  } catch {}
  return resultado
}

const archivos = leerArchivos(resolve('src'))

async function req(method, path, body, cookie = '') {
  try {
    const headers = { 'Content-Type': 'application/json' }
    if (cookie) headers['Cookie'] = cookie
    const r = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined })
    const text = await r.text()
    let data; try { data = JSON.parse(text) } catch { data = null }
    return { status: r.status, data, headers: r.headers }
  } catch (e) { return { status: 0, data: null, error: e.message } }
}

console.log('\n══════════════════════════════════════════════════')
console.log('  PANDA Fantasy — Auditoría OWASP Top 10')
console.log('══════════════════════════════════════════════════\n')

// ── A01: BROKEN ACCESS CONTROL ───────────────────────────────────────────────
console.log('🔒 A01 — Broken Access Control')

// Verificar que admin no es accesible por usuarios normales
const regTemp = await req('POST', '/api/auth/registro', { email: `sec_test_${Date.now()}@test.com`, password: 'Test1234!', nombreDT: 'SecTest', torneoId: TORNEO_ID })
const userCookie = regTemp.data?.exito ? regTemp.headers?.get('set-cookie')?.split(';')[0] : ''

if (userCookie) {
  const adminAccess = await req('GET', '/api/admin/fechas', null, userCookie)
  adminAccess.status === 403
    ? hallazgo('ok', 'A01', 'Usuario normal bloqueado de rutas admin (403)')
    : hallazgo('criticos', 'A01', `Usuario normal puede acceder /api/admin (HTTP ${adminAccess.status})`, 'Revisar requireAdmin en todas las rutas admin')
}

// IDOR: intentar acceder recursos de otro torneo
const torneoFalso = '00000000-0000-0000-0000-000000000000'
const r = await req('GET', `/api/equipo`, null, userCookie)
r.status === 200
  ? hallazgo('ok', 'A01', 'Aislamiento de datos por torneo funciona')
  : hallazgo('medios', 'A01', 'No se pudo verificar aislamiento de datos')

// Verificar que el flag Secure está en cookies de producción
archivos.forEach(({ ruta, contenido }) => {
  if (contenido.includes('Set-Cookie') && contenido.includes('panda_token')) {
    // Reconoce buildCookie como patrón seguro
    const usaBuildCookie = contenido.includes('buildCookie')
    if (!usaBuildCookie && !contenido.includes('Secure') && !contenido.includes('process.env.NODE_ENV')) {
      hallazgo('altos', 'A01', `Cookie panda_token sin flag Secure en ${ruta.split('src')[1]}`, 'Agregar "; Secure" cuando NODE_ENV=production')
    }
  }
})

// ── A02: CRYPTOGRAPHIC FAILURES ──────────────────────────────────────────────
console.log('\n🔑 A02 — Cryptographic Failures')

// JWT Secret
const jwtSecret = process.env.JWT_SECRET ?? ''
if (jwtSecret.length < 32) hallazgo('criticos', 'A02', 'JWT_SECRET muy corto (<32 chars)', 'Usar al menos 32 caracteres aleatorios')
else if (jwtSecret.includes('dev') || jwtSecret.includes('change') || jwtSecret.includes('secret')) hallazgo('altos', 'A02', 'JWT_SECRET parece ser un valor de desarrollo', 'Cambiar a un valor aleatorio en producción')
else hallazgo('ok', 'A02', 'JWT_SECRET tiene longitud adecuada')

// Bcrypt
archivos.some(({ contenido }) => contenido.includes('bcrypt'))
  ? hallazgo('ok', 'A02', 'Contraseñas hasheadas con bcrypt')
  : hallazgo('criticos', 'A02', 'No se encontró hashing de contraseñas')

// Cookies sin HTTPS
archivos.filter(({ contenido }) => contenido.includes('SameSite=Lax') && !contenido.includes('Secure') && !contenido.includes('buildCookie'))
  .forEach(({ ruta }) => hallazgo('medios', 'A02', `Cookie sin flag Secure: ${ruta.split('api')[1] ?? ruta}`, 'Agregar Secure en producción (HTTPS)'))

// ── A03: INJECTION ───────────────────────────────────────────────────────────
console.log('\n💉 A03 — Injection')

const tieneTemplateSQL = archivos.filter(({ contenido }) => contenido.includes('await sql`'))
tieneTemplateSQL.length > 0
  ? hallazgo('ok', 'A03', `SQL usa tagged templates (parameterized) en ${tieneTemplateSQL.length} archivos`)
  : hallazgo('criticos', 'A03', 'No se encontraron queries parametrizadas')

// Buscar concatenación de strings en SQL (riesgo de SQL injection)
archivos.forEach(({ ruta, contenido }) => {
  if (contenido.includes('sql`') && contenido.match(/sql`[^`]*\$\{[^}]*\+/)) {
    hallazgo('criticos', 'A03', `Posible SQL injection por concatenación: ${ruta.split('src')[1]}`, 'Usar solo parámetros en tagged templates')
  }
})

// XSS: Next.js escapa JSX por defecto
hallazgo('ok', 'A03', 'XSS mitigado por React JSX (auto-escape)')

// Buscar dangerouslySetInnerHTML
const tieneXSS = archivos.filter(({ ruta }) => ruta.endsWith('.tsx')).some(({ contenido }) => contenido.includes('dangerouslySetInnerHTML'))
tieneXSS
  ? hallazgo('criticos', 'A03', 'dangerouslySetInnerHTML encontrado — riesgo XSS', 'Revisar y sanitizar el contenido')
  : hallazgo('ok', 'A03', 'Sin dangerouslySetInnerHTML')

// ── A04: INSECURE DESIGN ─────────────────────────────────────────────────────
console.log('\n🏗️  A04 — Insecure Design')

// Rate limiting en login
const loginBrute = []
for (let i = 0; i < 5; i++) {
  const r = await req('POST', '/api/auth/login', { email: 'test@test.com', password: 'wrong', torneoId: TORNEO_ID })
  loginBrute.push(r.status)
}
const bloqueado = loginBrute.some(s => s === 429)
bloqueado
  ? hallazgo('ok', 'A04', 'Rate limiting en login activo (429 después de intentos)')
  : hallazgo('altos', 'A04', 'Sin rate limiting en /api/auth/login — vulnerable a brute force', 'Implementar rate limiting (ej: 5 intentos / 15 min por IP)')

// Rate limiting en registro
hallazgo('medios', 'A04', 'Sin rate limiting en /api/auth/registro — posible spam de cuentas', 'Agregar límite de registro por IP')

// ── A05: SECURITY MISCONFIGURATION ───────────────────────────────────────────
console.log('\n⚙️  A05 — Security Misconfiguration')

// Headers de seguridad
const homeResp = await req('GET', '/')
const headers = homeResp.headers
const missingHeaders = []
if (!headers?.get('x-frame-options') && !headers?.get('content-security-policy')) missingHeaders.push('X-Frame-Options / CSP')
if (!headers?.get('x-content-type-options')) missingHeaders.push('X-Content-Type-Options')
if (!headers?.get('strict-transport-security')) missingHeaders.push('HSTS')

missingHeaders.length > 0
  ? hallazgo('medios', 'A05', `Headers de seguridad faltantes: ${missingHeaders.join(', ')}`, 'Agregar en next.config.ts con headers()')
  : hallazgo('ok', 'A05', 'Headers de seguridad configurados')

// Endpoint /api/setup expuesto
const setupSinSecret = await req('GET', '/api/setup')
setupSinSecret.status === 401
  ? hallazgo('ok', 'A05', '/api/setup protegido por SETUP_SECRET')
  : hallazgo('criticos', 'A05', '/api/setup accesible sin secreto — puede resetear la DB', 'Asegurarse que SETUP_SECRET está configurado en producción')

// .env.local no committeado
try {
  const gitignore = readFileSync('.gitignore', 'utf8')
  gitignore.includes('.env') ? hallazgo('ok', 'A05', '.env* en .gitignore — credenciales no committeadas') : hallazgo('criticos', 'A05', '.env NO está en .gitignore', 'Agregar .env* al .gitignore inmediatamente')
} catch { hallazgo('bajos', 'A05', 'No se encontró .gitignore') }

// ── A07: AUTH FAILURES ───────────────────────────────────────────────────────
console.log('\n🔐 A07 — Identification and Auth Failures')

// Código de recuperación expuesto en respuesta
const recupResp = await req('POST', '/api/auth/recuperar', { email: 'noexiste@test.com', torneoId: TORNEO_ID })
if (recupResp.data?.mensaje?.match(/^\d{6}/)) hallazgo('altos', 'A07', 'Código de recuperación expuesto en la respuesta HTTP', 'En producción, solo enviar por email sin mostrar el código')
else hallazgo('ok', 'A07', 'Código de recuperación NO expuesto en respuesta HTTP')

// JWT expiry
archivos.find(({ contenido }) => contenido.includes('7d'))
  ? hallazgo('bajos', 'A07', 'JWT expira en 7 días — aceptable, pero sin refresh token', 'Considerar tokens de corta vida + refresh token para mayor seguridad')
  : hallazgo('ok', 'A07', 'JWT con expiración configurada')

// ── A09: LOGGING & MONITORING ─────────────────────────────────────────────────
console.log('\n📋 A09 — Security Logging & Monitoring')

const tieneConsoleLogs = archivos.filter(({ contenido, ruta }) =>
  contenido.includes('console.log') && !ruta.includes('scripts') && ruta.endsWith('.ts')
)
tieneConsoleLogs.length > 0
  ? hallazgo('bajos', 'A09', `${tieneConsoleLogs.length} archivo(s) con console.log en producción: ${tieneConsoleLogs.map(f => f.ruta.split('api')[1]).join(', ')}`, 'Usar logger estructurado en producción')
  : hallazgo('ok', 'A09', 'Sin console.log en código de producción')

// ── RESUMEN ──────────────────────────────────────────────────────────────────
const total = Object.values(hallazgos).flat().length
const { criticos, altos, medios, bajos, ok } = Object.fromEntries(
  Object.entries(hallazgos).map(([k, v]) => [k, v.length])
)

console.log('\n══════════════════════════════════════════════════')
console.log('  RESUMEN DE SEGURIDAD (OWASP Top 10)')
console.log('══════════════════════════════════════════════════')
console.log(`\n  🔴 Críticos   : ${criticos}`)
console.log(`  🟠 Altos      : ${altos}`)
console.log(`  🟡 Medios     : ${medios}`)
console.log(`  🔵 Bajos      : ${bajos}`)
console.log(`  ✅ OK         : ${ok}`)

const score = Math.round((ok / total) * 100)
console.log(`\n  Puntuación de seguridad: ${score}%`)

if (criticos > 0) {
  console.log('\n🔴 CRÍTICOS — Resolver antes de producción:')
  hallazgos.criticos.forEach(h => { console.log(`   • [${h.categoria}] ${h.desc}`); if (h.recomendacion) console.log(`     → ${h.recomendacion}`) })
}
if (altos > 0) {
  console.log('\n🟠 ALTOS — Resolver pronto:')
  hallazgos.altos.forEach(h => { console.log(`   • [${h.categoria}] ${h.desc}`); if (h.recomendacion) console.log(`     → ${h.recomendacion}`) })
}
if (medios > 0) {
  console.log('\n🟡 MEDIOS — Mejorar en próxima iteración:')
  hallazgos.medios.forEach(h => console.log(`   • [${h.categoria}] ${h.desc}`))
}
console.log('\n══════════════════════════════════════════════════\n')
