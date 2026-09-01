'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import RankingView from '@/components/RankingView'

const Cancha = dynamic(() => import('@/components/Cancha'), { ssr: false })

type Tab = 'equipo' | 'ranking' | 'reglas'

interface Jugador {
  id: string
  nombre: string
  equipo: string
  posicion: 'ARQ' | 'DEF' | 'VOL' | 'DEL'
  ptsUltimaFecha: number
}

export default function AppPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('equipo')
  const [session, setSession] = useState<{ email: string; nombreDT: string; rol: string } | null>(null)

  const [logoError, setLogoError] = useState(false)

  // Jugadores
  const [jugadores, setJugadores] = useState<Jugador[]>([])
  const [equipoData, setEquipoData] = useState<{
    fechaActual: { id: string; nombre: string; deadline: string | null } | null
    mercadoAbierto: boolean
    reaperturaEn: string | null
    premios: { campeon: number; fecha: number }
    equipoGuardado: any
  } | null>(null)

  // Ranking
  const [rankingData, setRankingData] = useState<{ fechas: string[]; rankingGeneral: any[]; rankingPorFecha: any } | null>(null)
  const [cargandoRanking, setCargandoRanking] = useState(false)

  useEffect(() => {
    // Verificar sesión leyendo el cookie via endpoint
    fetch('/api/auth/me').then(r => r.json()).then(data => {
      if (!data.usuario) { router.replace('/'); return }
      setSession(data.usuario)
    })
    cargarJugadores()
    cargarEquipo()
  }, [])

  async function cargarJugadores() {
    const res = await fetch('/api/jugadores')
    if (res.ok) setJugadores(await res.json())
  }

  async function cargarEquipo() {
    const res = await fetch('/api/equipo')
    if (res.ok) setEquipoData(await res.json())
  }

  async function cargarRanking() {
    if (rankingData) return
    setCargandoRanking(true)
    const res = await fetch('/api/ranking')
    if (res.ok) setRankingData(await res.json())
    setCargandoRanking(false)
  }

  function switchTab(t: Tab) {
    setTab(t)
    if (t === 'ranking') cargarRanking()
  }

  async function cerrarSesion() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.replace('/')
  }

  function formatPremio(n: number) {
    if (!n) return null
    return `$${n.toLocaleString('es-AR')} ARS`
  }

  const SCORING_MATRIX = [
    { evento: 'Gol convertido', pos: 'Arquero', pts: '+10' },
    { evento: 'Gol convertido', pos: 'Defensor', pts: '+8' },
    { evento: 'Gol convertido', pos: 'Mediocampista', pts: '+6' },
    { evento: 'Gol convertido', pos: 'Delantero', pts: '+4' },
    { evento: 'Valla invicta', pos: 'Arquero', pts: '+7' },
    { evento: 'Valla invicta', pos: 'Defensor', pts: '+4' },
    { evento: 'Figura del partido', pos: 'Cualquiera', pts: '+5' },
    { evento: 'Penal atajado', pos: 'Arquero', pts: '+4' },
    { evento: 'Presencia (jugó el partido)', pos: 'Cualquiera', pts: '+2' },
    { evento: 'Penal errado', pos: 'Cualquiera', pts: '-2' },
    { evento: 'Tarjeta amarilla', pos: 'Cualquiera', pts: '-2' },
    { evento: 'Tarjeta roja', pos: 'Cualquiera', pts: '-5' },
  ]

  return (
    <div className="flex justify-center items-start py-4 px-2.5 min-h-screen" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(29,107,243,0.06) 0%, transparent 60%), #0a0e17' }}>
      <div className="w-full sm:max-w-[1080px] bg-[#111827] sm:rounded-2xl border-0 sm:border border-white/8 shadow-[0_32px_64px_rgba(0,0,0,0.8)] overflow-hidden">

        {/* Header */}
        <div className="relative flex flex-col items-center px-6 py-7 border-b border-white/8 overflow-hidden" style={{ background: 'linear-gradient(180deg,#070e1d,#0d1626)' }}>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_50%_0%,rgba(29,107,243,0.12),transparent)]" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
          {!logoError && (
            <img
              src="https://lh3.googleusercontent.com/d/14Wc0C7x__d6ZY_popX5OQH8EhhOPQSu8"
              alt="Panda"
              className="relative h-16 object-contain mb-2"
              onError={() => setLogoError(true)}
              style={{ filter: 'drop-shadow(0 0 14px rgba(0,210,255,0.5))' }}
            />
          )}
          {logoError && <div className="text-5xl mb-2">🐼</div>}
          <h1 className="relative font-['Bebas_Neue'] text-5xl tracking-[0.12em]">
            PAN<span className="text-cyan-400" style={{ textShadow: '0 0 20px rgba(0,210,255,0.5)' }}>DA</span>
          </h1>
          <p className="relative text-[10px] font-bold tracking-[0.35em] text-slate-500 uppercase mt-0.5">Fantasy Fútbol Amateur</p>
        </div>

        {/* Premios — compact horizontal strip */}
        <div className="flex items-stretch divide-x divide-white/8 border-b border-white/8" style={{ background: '#06090f' }}>
          <div className="flex-1 flex items-center gap-3 px-5 py-3">
            <div className="w-9 h-9 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-lg flex-shrink-0">🏆</div>
            <div>
              <p className="text-[9px] font-extrabold uppercase tracking-widest text-yellow-600/60">Ganador del Torneo</p>
              <p className="font-['Bebas_Neue'] text-xl leading-tight text-yellow-400">{formatPremio(equipoData?.premios?.campeon ?? 0) ?? '—'}</p>
            </div>
          </div>
          <div className="flex-1 flex items-center gap-3 px-5 py-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-lg flex-shrink-0">⭐</div>
            <div>
              <p className="text-[9px] font-extrabold uppercase tracking-widest text-cyan-600/60">Premio por Fecha</p>
              <p className="font-['Bebas_Neue'] text-xl leading-tight text-cyan-400">{formatPremio(equipoData?.premios?.fecha ?? 0) ?? '—'}</p>
            </div>
          </div>
        </div>

        {/* User bar */}
        <div className="flex justify-between items-center bg-[#070c19] px-5 py-3 border-b border-white/8 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-xs">DT</span>
            <span className="font-bold text-cyan-400">{session?.nombreDT}</span>
          </div>
          <div className="flex gap-2">
            {session?.rol === 'admin' && (
              <button onClick={() => router.push('/admin')} className="bg-blue-600/15 text-blue-400 border border-blue-600/30 px-3 py-1.5 rounded-lg cursor-pointer font-bold text-xs hover:bg-blue-600 hover:text-white transition-colors">
                ⚙ Admin
              </button>
            )}
            <button onClick={cerrarSesion} className="bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1.5 rounded-lg cursor-pointer font-bold text-xs hover:bg-red-500 hover:text-white transition-colors">
              Salir
            </button>
          </div>
        </div>

        {/* Tabs — pill style */}
        <div className="flex gap-1.5 px-3 py-2.5 border-b border-white/8" style={{ background: '#06090f' }}>
          {(['equipo', 'ranking', 'reglas'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => switchTab(t)}
              className={`flex-1 py-2.5 rounded-xl font-['Bebas_Neue'] text-sm tracking-widest cursor-pointer transition-all outline-none ${
                tab === t
                  ? 'text-cyan-400'
                  : 'bg-transparent text-slate-500 hover:text-white'
              }`}
              style={tab === t ? { background: 'rgba(29,107,243,0.12)', boxShadow: 'inset 0 0 0 1px rgba(0,210,255,0.2)' } : {}}
            >
              {t === 'equipo' ? '⚽ MI EQUIPO' : t === 'ranking' ? '📊 RANKING' : '📋 REGLAS'}
            </button>
          ))}
        </div>

        <div className="p-3 sm:p-5">
          {tab === 'equipo' && (
            equipoData?.fechaActual
              ? <Cancha
                  jugadores={jugadores}
                  equipo={equipoData.equipoGuardado}
                  fechaConfigId={equipoData.fechaActual.id}
                  mercadoAbierto={equipoData.mercadoAbierto}
                  deadlineCierre={equipoData.fechaActual.deadline}
                  reaperturaEn={equipoData.reaperturaEn ?? null}
                  onGuardado={cargarEquipo}
                />
              : <div className="flex flex-col items-center py-20 text-slate-500">
                  <span className="text-5xl mb-4">📅</span>
                  <p className="text-sm">No hay fechas activas en este torneo.</p>
                  <p className="text-xs text-slate-600 mt-1">El administrador aún no configuró una fecha próxima.</p>
                </div>
          )}

          {tab === 'ranking' && (
            cargandoRanking
              ? <p className="text-center text-cyan-400 font-bold py-16">📊 Cargando rankings...</p>
              : rankingData
                ? <RankingView fechas={rankingData.fechas} rankingGeneral={rankingData.rankingGeneral} rankingPorFecha={rankingData.rankingPorFecha} premioFecha={equipoData?.premios?.fecha} premioCampeon={equipoData?.premios?.campeon} />
                : null
          )}

          {tab === 'reglas' && (
            <div className="max-w-2xl mx-auto">
              <h2 className="font-['Bebas_Neue'] text-2xl text-cyan-400 tracking-wide mb-5">📋 Reglas del Juego</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {[
                  { icon: '👥', titulo: '7 Titulares', desc: 'Armá tu equipo con exactamente 7 jugadores. Sin banco de suplentes.' },
                  { icon: '★', titulo: 'Capitán (+5 pts)', desc: 'El capitán suma 5 puntos fijos adicionales, sin importar su rendimiento.' },
                  { icon: '🔄', titulo: 'Pases libres', desc: 'Cambios ilimitados y sin costo hasta 3 hs antes del inicio de la fecha.' },
                  { icon: '🏅', titulo: 'Empate = Premio dividido', desc: 'Si hay empate en puntos, el premio se reparte en partes iguales.' },
                ].map(r => (
                  <div key={r.titulo} className="bg-[#0b111e] border border-white/8 rounded-xl p-4">
                    <p className="text-2xl mb-1">{r.icon}</p>
                    <p className="font-bold text-white text-sm mb-1">{r.titulo}</p>
                    <p className="text-xs text-slate-400">{r.desc}</p>
                  </div>
                ))}
              </div>

              <div className="bg-[#0b111e] border border-white/8 rounded-xl overflow-hidden">
                <div className="bg-[#080d1a] px-5 py-3 border-b border-white/8">
                  <span className="font-['Bebas_Neue'] text-lg tracking-wide text-cyan-400">Matriz de Puntuación</span>
                </div>
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-[#060b14]">
                      <th className="text-slate-400 font-bold text-xs uppercase px-4 py-3 text-left border-b border-white/8">Evento</th>
                      <th className="text-slate-400 font-bold text-xs uppercase px-4 py-3 text-left border-b border-white/8">Posición</th>
                      <th className="text-slate-400 font-bold text-xs uppercase px-4 py-3 text-right border-b border-white/8">Puntos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SCORING_MATRIX.map((row, i) => (
                      <tr key={i} className="border-b border-white/6 hover:bg-white/2 transition-colors">
                        <td className="px-4 py-2.5 text-slate-200">{row.evento}</td>
                        <td className="px-4 py-2.5 text-slate-400 text-xs">{row.pos}</td>
                        <td className={`px-4 py-2.5 text-right font-extrabold ${row.pts.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>{row.pts}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
