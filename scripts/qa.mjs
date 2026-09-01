/**
 * QA PANDA Fantasy — Reporte de funcionamiento completo
 * Uso: node scripts/qa.mjs
 * Requiere servidor corriendo en localhost:3000
 */

const BASE = 'http://localhost:3000'
const TORNEO_ID = process.env.NEXT_PUBLIC_TORNEO_ID ?? '442a8a67-c442-42f2-9cc4-1369f83048cb'

const resultados = []
let cookieAdmin = ''
let cookieUser  = ''

function log(categoria, nombre, ok, detalle = '') {
  const simbolo = ok === true ? '✅' : ok === false ? '❌' : '⚠️'
  resultados.push({ categoria, nombre, ok, detalle })
  console.log(`  ${simbolo} ${nombre}${detalle ? ` — ${detalle}` : ''}`)
}

async function req(method, path, body, cookie = '') {
  try {
    const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' }
    if (cookie) headers['Cookie'] = cookie
    const r = await fetch(`${BASE}${path}`, {
      method, headers,
      body: body ? JSON.stringify(body) : undefined,
    })
    const setCookie = r.headers.get('set-cookie') ?? ''
    const text = await r.text()
    let data
    try { data = JSON.parse(text) } catch { data = null }
    // Si recibimos HTML en vez de JSON, el servidor está compilando
    if (data === null && text.includes('<!DOCTYPE')) {
      return { status: r.status, data: null, cookie: setCookie, html: true }
    }
    return { status: r.status, data, cookie: setCookie }
  } catch (e) {
    return { status: 0, data: null, cookie: '', error: e.message }
  }
}

console.log('\n══════════════════════════════════════════')
console.log('  PANDA Fantasy — Reporte QA completo')
console.log('══════════════════════════════════════════\n')

// ── 1. SERVIDOR ──────────────────────────────────────────────────────────────
console.log('📡 SERVIDOR')
try {
  const r = await fetch(`${BASE}/`)
  log('Servidor', 'Home page carga', r.status === 200, `HTTP ${r.status}`)  // Warm-up: pre-compilar rutas clave
  process.stdout.write('  ⏳ Calentando rutas (Turbopack)...')
  await Promise.all([
    fetch(`${BASE}/api/auth/me`),
    fetch(`${BASE}/api/jugadores`),
    fetch(`${BASE}/api/equipo`),
    fetch(`${BASE}/api/admin/fechas`),
  ])
  await new Promise(r => setTimeout(r, 1500))
  console.log(' listo')} catch {
  log('Servidor', 'Home page carga', false, 'No responde — ¿está corriendo npm run dev?')
  console.log('\n❌ El servidor no responde. Abortando.')
  process.exit(1)
}

// ── 2. AUTENTICACIÓN ─────────────────────────────────────────────────────────
console.log('\n🔐 AUTENTICACIÓN')

// Login con credenciales inválidas
const loginFail = await req('POST', '/api/auth/login', { email: 'noexiste@test.com', password: 'wrong', torneoId: TORNEO_ID })
log('Auth', 'Login credenciales inválidas → rechaza', loginFail.status === 200 && loginFail.data?.exito === false, `exito=${loginFail.data?.exito}`)

// Login admin
const loginAdmin = await req('POST', '/api/auth/login', { email: 'admin@panda.com', password: 'admin123', torneoId: TORNEO_ID })
const adminOk = loginAdmin.status === 200 && loginAdmin.data?.exito === true
log('Auth', 'Login admin válido', adminOk, loginAdmin.data?.mensaje ?? `HTTP ${loginAdmin.status}`)
if (adminOk) cookieAdmin = loginAdmin.cookie.split(';')[0]

// /api/auth/me sin cookie
const meSinCookie = await req('GET', '/api/auth/me')
log('Auth', '/me sin sesión → usuario null', meSinCookie.data?.usuario === null, `usuario=${JSON.stringify(meSinCookie.data?.usuario)}`)

// /api/auth/me con cookie admin
const meAdmin = await req('GET', '/api/auth/me', null, cookieAdmin)
log('Auth', '/me con sesión admin', meAdmin.data?.usuario?.rol === 'admin', `rol=${meAdmin.data?.usuario?.rol}`)

// Registro con password corta
const regCorta = await req('POST', '/api/auth/registro', { email: 'test@test.com', password: '123', nombreDT: 'Test', torneoId: TORNEO_ID })
log('Auth', 'Registro contraseña < 8 chars → rechaza', regCorta.data?.exito === false, regCorta.data?.mensaje)

// Registro email duplicado
const regDup = await req('POST', '/api/auth/registro', { email: 'admin@panda.com', password: 'password123', nombreDT: 'Dup', torneoId: TORNEO_ID })
log('Auth', 'Registro email duplicado → rechaza', regDup.data?.exito === false, regDup.data?.mensaje)

// Crear usuario de prueba temporal
const tempEmail = `qa_test_${Date.now()}@test.com`
const regNew = await req('POST', '/api/auth/registro', { email: tempEmail, password: 'password123', nombreDT: 'QA Tester', torneoId: TORNEO_ID })
const userOk = regNew.status === 200 && regNew.data?.exito === true
log('Auth', 'Registro nuevo usuario', userOk, regNew.data?.mensaje)
if (userOk) cookieUser = regNew.cookie.split(';')[0]

// Recuperar contraseña
const recup = await req('POST', '/api/auth/recuperar', { email: tempEmail, torneoId: TORNEO_ID })
log('Auth', 'Recuperar contraseña → responde', recup.data?.exito === true, recup.data?.mensaje?.slice(0, 60))

// ── 3. PROTECCIÓN DE RUTAS ───────────────────────────────────────────────────
console.log('\n🛡️  PROTECCIÓN DE RUTAS')

const rutasProtegidas = [
  ['/api/jugadores', 'GET'],
  ['/api/equipo', 'GET'],
  ['/api/ranking', 'GET'],
]
for (const [path, method] of rutasProtegidas) {
  const r = await req(method, path)
  log('Protección', `${method} ${path} sin auth → 401`, r.status === 401, `HTTP ${r.status}`)
}

const rutasAdmin = [
  ['/api/admin/fechas', 'GET'],
  ['/api/admin/jugadores', 'GET'],
  ['/api/admin/torneo', 'GET'],
]
for (const [path, method] of rutasAdmin) {
  const r = await req(method, path)
  log('Protección', `Admin ${path} sin auth → 401/403`, [401, 403].includes(r.status), `HTTP ${r.status}`)
}

// Usuario normal no puede acceder admin
if (cookieUser) {
  const rUser = await req('GET', '/api/admin/fechas', null, cookieUser)
  log('Protección', 'Usuario normal bloqueado de /admin', [401, 403].includes(rUser.status), `HTTP ${rUser.status}`)
}

// ── 4. JUGADORES Y FECHAS (autenticado) ──────────────────────────────────────
console.log('\n⚽ JUGADORES Y FECHAS')

if (cookieAdmin) {
  const jugs = await req('GET', '/api/admin/jugadores', null, cookieAdmin)
  const totalJugs = jugs.data?.length ?? 0
  log('Jugadores', `GET /admin/jugadores → lista`, jugs.status === 200, `${totalJugs} jugadores`)
  if (totalJugs === 0) log('Jugadores', 'Plantel vacío', null, 'No hay jugadores — importar antes de cargar stats')

  const fechas = await req('GET', '/api/admin/fechas', null, cookieAdmin)
  const totalFechas = fechas.data?.length ?? 0
  log('Fechas', `GET /admin/fechas → lista`, fechas.status === 200, `${totalFechas} fechas`)
  if (totalFechas === 0) log('Fechas', 'Sin fechas activas', null, 'Crear una fecha para habilitar el juego')

  // Crear fecha de prueba
  const nuevaFecha = await req('POST', '/api/admin/fechas', { nombreFecha: 'QA Test', numero: 99, deadlineCierre: null, fechaFin: null }, cookieAdmin)
  log('Fechas', 'Crear fecha nueva', nuevaFecha.status === 201, nuevaFecha.data?.error ?? `id=${nuevaFecha.data?.id?.slice(0,8)}`)
  const fechaTestId = nuevaFecha.data?.id

  if (fechaTestId) {
    // Cargar stats de fecha vacía
    const statsVacias = await req('GET', `/api/admin/fecha/${fechaTestId}`, null, cookieAdmin)
    log('Stats', 'GET stats fecha vacía', statsVacias.status === 200, `${statsVacias.data?.jugadores?.length ?? 0} jugadores`)

    // Publicar fecha vacía
    const publicar = await req('POST', `/api/admin/fecha/${fechaTestId}/publicar`, null, cookieAdmin)
    log('Fechas', 'Publicar fecha vacía', publicar.data?.exito === true, publicar.data?.mensaje)

    // Borrar fecha de prueba
    const borrar = await req('DELETE', `/api/admin/fechas/${fechaTestId}`, null, cookieAdmin)
    log('Fechas', 'Borrar fecha de prueba', borrar.data?.exito === true, '')
  }
}

// ── 5. EQUIPO DE USUARIO ─────────────────────────────────────────────────────
console.log('\n🏟️  EQUIPO DE USUARIO')

if (cookieUser) {
  const equipo = await req('GET', '/api/equipo', null, cookieUser)
  log('Equipo', 'GET /equipo → responde', equipo.status === 200, `fechaActual=${equipo.data?.fechaActual?.id ? 'sí' : 'no'}, mercado=${equipo.data?.mercadoAbierto}`)

  // Intentar guardar equipo inválido (menos de 7 jugadores)
  const guardarMal = await req('POST', '/api/equipo', { nombreEquipo: 'Test', jugadoresIds: ['a', 'b'], capitanId: 'a', fechaConfigId: 'fake' }, cookieUser)
  log('Equipo', 'Guardar equipo incompleto → rechaza', guardarMal.status === 400, guardarMal.data?.error?.slice(0, 50))

  // Nombre de equipo muy largo
  const nombreLargo = await req('POST', '/api/equipo', { nombreEquipo: 'A'.repeat(25), jugadoresIds: new Array(7).fill('a'), capitanId: 'a', fechaConfigId: 'fake' }, cookieUser)
  log('Equipo', 'Nombre equipo >15 chars → rechaza', guardarMal.status === 400, '')
}

// ── 6. RANKING ───────────────────────────────────────────────────────────────
console.log('\n📊 RANKING')

if (cookieUser) {
  const ranking = await req('GET', '/api/ranking', null, cookieUser)
  log('Ranking', 'GET /ranking → responde', ranking.status === 200, `fechas=${ranking.data?.fechas?.length ?? 0}, usuarios=${ranking.data?.rankingGeneral?.length ?? 0}`)
}

// ── 7. CONSISTENCIA DE DATOS ─────────────────────────────────────────────────
console.log('\n🔍 CONSISTENCIA DE DATOS')

if (cookieAdmin) {
  const torneo = await req('GET', '/api/admin/torneo', null, cookieAdmin)
  log('Torneo', 'Config torneo existe', torneo.status === 200 && torneo.data?.id, `nombre="${torneo.data?.nombre}"`)
  log('Torneo', 'Premio campeón configurado', (torneo.data?.premioCampeon ?? 0) > 0, `$${torneo.data?.premioCampeon ?? 0}`)
  log('Torneo', 'Premio fecha configurado', (torneo.data?.premioFecha ?? 0) > 0, `$${torneo.data?.premioFecha ?? 0}`)
}

// Limpiar usuario de prueba
if (userOk) {
  // Soft delete via baja (no tenemos endpoint de DELETE usuario, es suficiente)
}

// ── RESUMEN ──────────────────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════')
console.log('  RESUMEN DEL REPORTE')
console.log('══════════════════════════════════════════')

const exitosos  = resultados.filter(r => r.ok === true).length
const fallidos  = resultados.filter(r => r.ok === false).length
const advertencias = resultados.filter(r => r.ok === null).length
const total = resultados.length

console.log(`\n  Total pruebas : ${total}`)
console.log(`  ✅ Exitosas   : ${exitosos}`)
console.log(`  ❌ Fallidas   : ${fallidos}`)
console.log(`  ⚠️  Advertencias: ${advertencias}`)
console.log(`\n  Salud del sistema: ${Math.round((exitosos / (total - advertencias)) * 100)}%`)

if (fallidos > 0) {
  console.log('\n❌ PROBLEMAS ENCONTRADOS:')
  resultados.filter(r => r.ok === false).forEach(r => console.log(`   • [${r.categoria}] ${r.nombre}: ${r.detalle}`))
}
if (advertencias > 0) {
  console.log('\n⚠️  ADVERTENCIAS:')
  resultados.filter(r => r.ok === null).forEach(r => console.log(`   • [${r.categoria}] ${r.nombre}: ${r.detalle}`))
}

console.log('\n══════════════════════════════════════════\n')
