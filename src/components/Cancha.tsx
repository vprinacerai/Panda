'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from './Toaster'

interface Jugador {
  id: string
  nombre: string
  equipo: string
  posicion: 'ARQ' | 'DEF' | 'VOL' | 'DEL'
  ptsUltimaFecha: number
}

interface EquipoGuardado {
  nombreEquipo: string
  capitanId: string | null
  jugadoresIds: string[]
}

interface Props {
  jugadores: Jugador[]
  equipo: EquipoGuardado | null
  fechaConfigId: string
  mercadoAbierto: boolean
  deadlineCierre: string | null
  reaperturaEn: string | null
  onGuardado: () => void
}

const TITULOS: Record<string, string> = { ARQ: 'Arquero', DEF: 'Defensor', VOL: 'Volante', DEL: 'Delantero' }
const POS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  ARQ: { bg: 'rgba(0,210,255,0.15)', text: '#00d2ff', border: 'rgba(0,210,255,0.25)' },
  DEF: { bg: 'rgba(29,107,243,0.18)', text: '#60a5fa', border: 'rgba(29,107,243,0.35)' },
  VOL: { bg: 'rgba(59,130,246,0.15)', text: '#93c5fd', border: 'rgba(59,130,246,0.3)' },
  DEL: { bg: 'rgba(226,232,240,0.08)', text: '#e2e8f0', border: 'rgba(226,232,240,0.18)' },
}
const FORMACIONES = [
  { value: '2-2-2', label: '2 - 2 - 2 (Distribución pareja)' },
  { value: '2-3-1', label: '2 - 3 - 1 (Equilibrada)' },
  { value: '3-2-1', label: '3 - 2 - 1 (Defensiva)' },
  { value: '3-1-2', label: '3 - 1 - 2 (Solidez y Doble 9)' },
  { value: '1-3-2', label: '1 - 3 - 2 (Ataque Total)' },
]

function AvatarSVG({ posicion }: { posicion: string }) {
  const colors: Record<string, { camiseta: string; short: string }> = {
    ARQ: { camiseta: '#00d2ff', short: '#0f172a' },
    DEF: { camiseta: '#1d6bf3', short: '#ffffff' },
    VOL: { camiseta: '#3b82f6', short: '#0f172a' },
    DEL: { camiseta: '#ffffff', short: '#1d6bf3' },
  }
  const { camiseta, short } = colors[posicion] ?? colors.DEL
  return (
    <svg viewBox="0 0 64 64" className="w-7 h-7 sm:w-9 sm:h-9">
      <ellipse cx="32" cy="60" rx="14" ry="3" fill="rgba(0,0,0,0.3)" />
      <circle cx="32" cy="12" r="6" fill="#f1c27d" />
      <path d="M 26 11 Q 32 5 38 11 C 38 8 26 8 26 11 Z" fill="#1e293b" />
      <path d="M 21 21 L 26 19 L 38 19 L 43 21 L 41 31 L 37 29 L 37 39 L 27 39 L 27 29 L 23 31 Z" fill={camiseta} />
      <rect x="18" y="21" width="4" height="9" rx="2" fill="#f1c27d" />
      <rect x="42" y="21" width="4" height="9" rx="2" fill="#f1c27d" />
      {posicion === 'ARQ' && <><circle cx="18" cy="28" r="3" fill="#ffffff" /><circle cx="46" cy="28" r="3" fill="#ffffff" /></>}
      <path d="M 27 39 L 37 39 L 39 48 L 33 48 L 32 42 L 31 42 L 30 48 L 25 48 Z" fill={short} />
      <rect x="27" y="48" width="4" height="8" fill="#f1c27d" />
      <rect x="33" y="48" width="4" height="8" fill="#f1c27d" />
      <path d="M 25 57 L 31 57 L 31 60 L 24 60 Z" fill="#0f172a" />
      <path d="M 33 57 L 39 57 L 40 60 L 33 60 Z" fill="#0f172a" />
    </svg>
  )
}

export default function Cancha({ jugadores, equipo, fechaConfigId, mercadoAbierto, deadlineCierre, reaperturaEn, onGuardado }: Props) {
  const [formacion, setFormacion] = useState('2-2-2')
  const [nombreEquipo, setNombreEquipo] = useState('')
  const [selecciones, setSelecciones] = useState<Record<string, string>>({})
  const [capitanId, setCapitanId] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [countdown, setCountdown] = useState('')
  const [modo, setModo] = useState<'ver' | 'editar'>(equipo ? 'ver' : 'editar')
  const [slotActivo, setSlotActivo] = useState<{ key: string; pos: string } | null>(null)
  const [busquedaSlot, setBusquedaSlot] = useState('')

  // Cargar equipo guardado y entrar en modo ver
  useEffect(() => {
    if (equipo) {
      setNombreEquipo(equipo.nombreEquipo)
      setCapitanId(equipo.capitanId)
      setModo('ver')

      const byPos: Record<string, string[]> = { ARQ: [], DEF: [], VOL: [], DEL: [] }
      ;(equipo.jugadoresIds ?? []).forEach(id => {
        const j = jugadores.find(x => x.id === id)
        if (j) byPos[j.posicion].push(id)
      })

      const fmt = formacion.split('-').map(Number)
      const nuevas: Record<string, string> = {}
      ;(['ARQ', 'DEF', 'VOL', 'DEL'] as const).forEach((pos, pi) => {
        const cant = pos === 'ARQ' ? 1 : fmt[pi - 1]
        for (let i = 0; i < cant; i++) {
          nuevas[`${pos}_${i}`] = byPos[pos][i] ?? ''
        }
      })
      setSelecciones(nuevas)
    }
  }, [equipo])

  useEffect(() => {
    if (!deadlineCierre || !mercadoAbierto) return
    const interval = setInterval(() => {
      const diff = new Date(deadlineCierre).getTime() - Date.now()
      if (diff <= 0) { setCountdown(''); clearInterval(interval); return }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setCountdown(d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m ${s}s`)
    }, 1000)
    return () => clearInterval(interval)
  }, [deadlineCierre, mercadoAbierto])

  const fmt = formacion.split('-').map(Number)
  const esquema: { pos: 'ARQ' | 'DEF' | 'VOL' | 'DEL'; cant: number }[] = [
    { pos: 'ARQ', cant: 1 },
    { pos: 'DEF', cant: fmt[0] },
    { pos: 'VOL', cant: fmt[1] },
    { pos: 'DEL', cant: fmt[2] },
  ]

  const jugadoresPorPos = useCallback((pos: string) => jugadores.filter(j => j.posicion === pos), [jugadores])

  function formatFecha(iso: string) {
    return new Date(iso).toLocaleString('es-AR', {
      weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
    })
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (!nombreEquipo.trim()) { toast('Ingresá un nombre para tu equipo.', 'error'); return }
    if (nombreEquipo.trim().length > 15) { toast('El nombre no puede superar 15 caracteres.', 'error'); return }
    // Contar solo los slots de la formación actual
    const ids = esquema.flatMap(l => Array.from({ length: l.cant }, (_, i) => selecciones[`${l.pos}_${i}`] ?? '')).filter(Boolean)
    if (ids.length !== 7) { toast('Completá todos los cupos de la formación antes de guardar.', 'error'); return }
    if (new Set(ids).size !== ids.length) { toast('Hay jugadores repetidos en la alineación.', 'error'); return }
    if (!capitanId) { toast('Designá un Capitán para tu equipo.', 'error'); return }
    // Máximo 3 jugadores del mismo club
    const clubCount: Record<string, number> = {}
    for (const id of ids) {
      const club = jugadores.find(j => j.id === id)?.equipo ?? ''
      clubCount[club] = (clubCount[club] ?? 0) + 1
      if (clubCount[club] > 3) { toast(`Máximo 3 jugadores del mismo club (${club}).`, 'error'); return }
    }

    setGuardando(true)
    const res = await fetch('/api/equipo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombreEquipo, jugadoresIds: ids, capitanId, fechaConfigId }),
    })
    const data = await res.json()
    if (data.exito) {
      toast(data.mensaje ?? 'Alineación guardada correctamente.', 'success')
      setModo('ver')
      onGuardado()
    } else {
      toast(data.error ?? 'Error al guardar la alineación.', 'error')
    }
    setGuardando(false)
  }

  // ── VIEW MODE ────────────────────────────────────────────────────────────
  if (modo === 'ver') {
    const tieneJugadores = Object.values(selecciones).some(Boolean)
    return (
      <div>
        {/* Market banner */}
        {mercadoAbierto ? (
          deadlineCierre && countdown && (
            <div className="flex items-center justify-between rounded-xl mb-4 px-4 py-2.5"
              style={{ background: 'rgba(5,46,22,0.6)', border: '1px solid rgba(34,197,94,0.18)' }}>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" style={{ boxShadow: '0 0 8px rgba(74,222,128,0.9)' }} />
                <span className="font-bold text-green-400 text-sm">Mercado Abierto</span>
              </div>
              <span className="text-xs text-slate-500">Cierra en: <span className="font-bold text-green-300 tabular-nums">{countdown}</span></span>
            </div>
          )
        ) : (
          <div className="rounded-xl mb-4 px-4 py-3"
            style={{ background: 'rgba(26,10,10,0.7)', border: '1px solid rgba(239,68,68,0.18)' }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-red-400 text-base">🔒</span>
              <span className="text-red-400 font-bold text-sm">Mercado Cerrado</span>
            </div>
            {reaperturaEn ? (
              <p className="text-xs text-slate-500 pl-6">Reapertura: <span className="text-slate-300 font-semibold">{formatFecha(reaperturaEn)}</span></p>
            ) : (
              <p className="text-xs text-slate-600 pl-6">El mercado abrirá 24 hs después de finalizada la fecha.</p>
            )}
          </div>
        )}

        {/* Team header */}
        <div className="flex items-center justify-between mb-4 px-1">
          <div>
            <h3 className="font-['Bebas_Neue'] text-xl sm:text-2xl tracking-wide text-white leading-none truncate max-w-[180px] sm:max-w-[260px]">{nombreEquipo || '—'}</h3>
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-widest mt-0.5">Formación {formacion}</p>
          </div>
          {mercadoAbierto && (
            <button
              type="button"
              onClick={() => setModo('editar')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all hover:brightness-110"
              style={{ background: 'linear-gradient(135deg,#1d6bf3,#0d4fd4)', boxShadow: '0 2px 12px rgba(29,107,243,0.35)' }}
            >
              ✎ Modificar Equipo
            </button>
          )}
        </div>

        {/* Captain chip */}
        {capitanId && (
          <div className="flex items-center gap-2.5 text-xs font-semibold px-4 py-2 rounded-xl mb-3"
            style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)', color: '#fbbf24' }}>
            <span>★</span>
            <span>Capitán: <strong>{jugadores.find(j => j.id === capitanId)?.nombre ?? '—'}</strong> — <span className="text-yellow-300/70">+5 pts fijos automáticos</span></span>
          </div>
        )}

        {/* Field preview */}
        <div className="rounded-2xl border border-white/8 overflow-x-auto sm:overflow-hidden" style={{ boxShadow: 'inset 0 0 60px rgba(0,0,0,0.7)' }}>
          <div
            className="relative flex flex-col-reverse sm:flex-row sm:justify-between items-stretch sm:items-center gap-0 sm:gap-3 px-3 sm:px-6 py-2 sm:py-4 sm:min-w-[840px] sm:h-[490px]"
            style={{ background: 'linear-gradient(180deg,#0d3017,#11361b)', backgroundImage: 'repeating-linear-gradient(0deg,rgba(255,255,255,0.025) 0px,rgba(255,255,255,0.025) 1px,transparent 1px,transparent 60px),repeating-linear-gradient(90deg,rgba(255,255,255,0.015) 0px,rgba(255,255,255,0.015) 1px,transparent 1px,transparent 80px)' }}
          >
            <div className="hidden sm:block absolute inset-y-0 left-1/2 w-px bg-white/15" />
            <div className="hidden sm:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full border border-white/15" />
            <div className="hidden sm:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white/20" />
            <div className="hidden sm:block absolute top-[28%] bottom-[28%] left-0 w-5 border border-white/20 border-l-0 rounded-r-sm" />
            <div className="hidden sm:block absolute top-[28%] bottom-[28%] right-0 w-5 border border-white/20 border-r-0 rounded-l-sm" />

            {esquema.map(linea => {
              const pc = POS_COLORS[linea.pos]
              return (
                <div key={linea.pos} className="relative z-10 sm:flex-1 sm:h-full border-t sm:border-t-0 border-white/5 first:border-t-0 py-2 sm:py-0">
                  <p className="sm:hidden text-center text-[8px] font-extrabold uppercase tracking-widest mb-1.5"
                    style={{ color: pc.text, opacity: 0.7 }}>{TITULOS[linea.pos]}</p>
                  <div className="flex flex-row sm:flex-col sm:justify-around sm:items-center sm:h-full justify-around gap-1.5 sm:gap-0">
                  {Array.from({ length: linea.cant }, (_, i) => {
                    const slotKey = `${linea.pos}_${i}`
                    const selectedId = selecciones[slotKey] ?? ''
                    const player = jugadores.find(j => j.id === selectedId)
                    const esCap = Boolean(selectedId && selectedId === capitanId)

                    return (
                      <div
                        key={slotKey}
                        className="flex-1 sm:flex-none sm:w-full sm:max-w-[160px] rounded-xl p-1.5 sm:p-2.5 text-center sm:mt-3"
                        style={{
                          background: player ? '#0c1528' : 'rgba(10,16,32,0.5)',
                          border: player ? `1px solid ${pc.border}` : '1px dashed rgba(255,255,255,0.08)',
                          boxShadow: esCap ? '0 0 16px rgba(245,158,11,0.25)' : player ? '0 4px 20px rgba(0,0,0,0.5)' : 'none',
                        }}
                      >
                        <div className="flex items-center justify-between mb-1 sm:mb-1.5">
                          <span className="text-[7px] sm:text-[8px] font-extrabold uppercase tracking-wider px-1 sm:px-1.5 py-0.5 rounded-md"
                            style={{ background: pc.bg, color: pc.text }}>{linea.pos}</span>
                          {esCap && <span className="text-[8px] font-extrabold px-0.5 sm:px-1 py-0.5 rounded-md" style={{ background: '#f59e0b', color: '#000' }}>★</span>}
                        </div>

                        <div className="flex justify-center mb-1 sm:mb-1.5"><AvatarSVG posicion={linea.pos} /></div>

                        {player ? (
                          <>
                            <p className="text-[9px] sm:text-[11px] font-bold text-white truncate leading-snug">{player.nombre}</p>
                            <p className="hidden sm:block text-[9px] text-slate-500 mt-0.5">{player.equipo}</p>
                            {player.ptsUltimaFecha > 0 && (
                              <p className="text-[8px] sm:text-[10px] font-bold text-cyan-400 mt-0.5 sm:mt-1">{player.ptsUltimaFecha} pts</p>
                            )}
                          </>
                        ) : (
                          <p className="text-[8px] sm:text-[9px] text-slate-700 italic mt-1">—</p>
                        )}
                      </div>
                    )
                  })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {!tieneJugadores && (
          <p className="text-center text-slate-600 text-sm mt-4 italic">Todavía no armaste tu equipo. Hacé clic en "Modificar Equipo" para empezar.</p>
        )}
      </div>
    )
  }
  // ── EDIT MODE (form) ──────────────────────────────────────────────────────

  return (
    <form onSubmit={enviar} noValidate>
      {/* Modal buscador de jugadores */}
      {slotActivo && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-3 sm:p-4" style={{ background: 'rgba(0,0,0,0.85)' }}
          onClick={() => setSlotActivo(null)}>
          <div className="w-full max-w-md bg-[#111827] rounded-2xl border border-white/10 shadow-2xl flex flex-col"
            style={{ maxHeight: '80vh' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
              <span className="font-['Bebas_Neue'] text-lg tracking-wide" style={{ color: POS_COLORS[slotActivo.pos].text }}>
                {TITULOS[slotActivo.pos]}
              </span>
              <button type="button" onClick={() => setSlotActivo(null)} className="text-slate-500 hover:text-white text-lg leading-none">✕</button>
            </div>
            <div className="px-4 pt-3 pb-2">
              <input
                autoFocus
                value={busquedaSlot}
                onChange={e => setBusquedaSlot(e.target.value)}
                placeholder="Buscar jugador o equipo..."
                className="w-full bg-[#060c18] border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500/60"
              />
            </div>
            <div className="overflow-y-auto flex-1 px-2 pb-3">
              <button type="button"
                onClick={() => { setSelecciones(prev => ({ ...prev, [slotActivo.key]: '' })); if (capitanId === selecciones[slotActivo.key]) setCapitanId(null); setSlotActivo(null) }}
                className="w-full text-left px-4 py-2 text-xs text-slate-600 hover:bg-white/5 rounded-lg mb-1 italic">
                — Sin jugador
              </button>
              {jugadoresPorPos(slotActivo.pos)
                .filter(j => !busquedaSlot || j.nombre.toLowerCase().includes(busquedaSlot.toLowerCase()) || j.equipo.toLowerCase().includes(busquedaSlot.toLowerCase()))
                .map(j => {
                  const yaElegido = Object.entries(selecciones).some(([k, v]) => v === j.id && k !== slotActivo.key)
                  const clubEnUso = Object.entries(selecciones).filter(([k, v]) => v && k !== slotActivo.key && jugadores.find(x => x.id === v)?.equipo === j.equipo).length
                  const clubLimitado = !yaElegido && clubEnUso >= 3
                  return (
                    <button type="button" key={j.id}
                      onClick={() => { if (!yaElegido && !clubLimitado) { setSelecciones(prev => ({ ...prev, [slotActivo.key]: j.id })); setSlotActivo(null); setBusquedaSlot('') } }}
                      disabled={yaElegido || clubLimitado}
                      className={`w-full text-left px-4 py-2.5 rounded-xl transition-colors flex items-center justify-between gap-3 ${yaElegido || clubLimitado ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/5 cursor-pointer'}`}>
                      <div>
                        <span className="text-sm font-semibold text-white block">{j.nombre}</span>
                        <span className="text-[11px] text-slate-500">{j.equipo}</span>
                      </div>
                      {yaElegido && <span className="text-[9px] font-bold text-slate-600 uppercase tracking-wider shrink-0">ya elegido</span>}
                      {!yaElegido && clubLimitado && <span className="text-[9px] font-bold text-orange-600 uppercase tracking-wider shrink-0">límite club</span>}
                    </button>
                  )
                })
              }
            </div>
          </div>
        </div>
      )}
      {/* Market status banner */}
      {mercadoAbierto ? (
        deadlineCierre && countdown && (
          <div className="flex items-center justify-between rounded-xl mb-4 px-4 py-2.5"
            style={{ background: 'rgba(5,46,22,0.6)', border: '1px solid rgba(34,197,94,0.18)' }}>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" style={{ boxShadow: '0 0 8px rgba(74,222,128,0.9)' }} />
              <span className="font-bold text-green-400 text-sm">Mercado Abierto</span>
            </div>
            <span className="text-xs text-slate-500">Cierra en: <span className="font-bold text-green-300 tabular-nums">{countdown}</span></span>
          </div>
        )
      ) : (
        <div className="rounded-xl mb-4 px-4 py-3"
          style={{ background: 'rgba(26,10,10,0.7)', border: '1px solid rgba(239,68,68,0.18)' }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-red-400 text-base">🔒</span>
            <span className="text-red-400 font-bold text-sm">Mercado Cerrado</span>
          </div>
          {reaperturaEn ? (
            <p className="text-xs text-slate-500 pl-6">Reapertura: <span className="text-slate-300 font-semibold">{formatFecha(reaperturaEn)}</span></p>
          ) : (
            <p className="text-xs text-slate-600 pl-6">El mercado abrirá 24 hs después de finalizada la fecha.</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-1.5">🛡️ Nombre del Equipo</label>          <input
            value={nombreEquipo}
            onChange={e => setNombreEquipo(e.target.value)}
            maxLength={15}
            className="w-full bg-[#060c18] border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20 transition-all placeholder:text-slate-700"
            placeholder="Ej: Panda FC"
            disabled={!mercadoAbierto}
          />
        </div>
        <div>
          <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-1.5">⚙️ Formación</label>
          <select
            value={formacion}
            onChange={e => setFormacion(e.target.value)}
            className="w-full bg-[#060c18] border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm font-semibold outline-none cursor-pointer focus:border-blue-500/60 transition-all"
            disabled={!mercadoAbierto}
          >
            {FORMACIONES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>
      </div>

      {/* Captain info pill */}
      {capitanId && (
        <div className="flex items-center gap-2.5 text-xs font-semibold px-4 py-2 rounded-xl mb-3"
          style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)', color: '#fbbf24' }}>
          <span>★</span>
          <span>Capitán: <strong>{jugadores.find(j => j.id === capitanId)?.nombre ?? '—'}</strong> — <span className="text-yellow-300/70">+5 pts fijos automáticos</span></span>
        </div>
      )}

      {/* Cancha */}
      <div className="rounded-2xl border border-white/8 mb-4 overflow-x-auto sm:overflow-hidden" style={{ boxShadow: 'inset 0 0 60px rgba(0,0,0,0.7)' }}>
        <div
          className="relative flex flex-col-reverse sm:flex-row sm:justify-between items-stretch sm:items-center gap-0 sm:gap-3 px-3 sm:px-6 py-2 sm:py-4 sm:min-w-[840px] sm:h-[490px]"
          style={{ background: 'linear-gradient(180deg,#0d3017,#11361b)', backgroundImage: 'repeating-linear-gradient(0deg,rgba(255,255,255,0.025) 0px,rgba(255,255,255,0.025) 1px,transparent 1px,transparent 60px),repeating-linear-gradient(90deg,rgba(255,255,255,0.015) 0px,rgba(255,255,255,0.015) 1px,transparent 1px,transparent 80px)' }}
        >
          <div className="hidden sm:block absolute inset-y-0 left-1/2 w-px bg-white/15" />
          <div className="hidden sm:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full border border-white/15" />
          <div className="hidden sm:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white/20" />
          <div className="hidden sm:block absolute top-[28%] bottom-[28%] left-0 w-5 border border-white/20 border-l-0 rounded-r-sm" />
          <div className="hidden sm:block absolute top-[28%] bottom-[28%] right-0 w-5 border border-white/20 border-r-0 rounded-l-sm" />

          {esquema.map(linea => (
            <div key={linea.pos} className="relative z-10 sm:flex-1 sm:h-full border-t sm:border-t-0 border-white/5 first:border-t-0 py-2 sm:py-0">
              <p className="sm:hidden text-center text-[8px] font-extrabold uppercase tracking-widest mb-1.5"
                style={{ color: POS_COLORS[linea.pos].text, opacity: 0.7 }}>{TITULOS[linea.pos]}</p>
              <div className="flex flex-row sm:flex-col sm:justify-around sm:items-center sm:h-full justify-around gap-1.5 sm:gap-0">
              {Array.from({ length: linea.cant }, (_, i) => {
                const slotKey = `${linea.pos}_${i}`
                const selectedId = selecciones[slotKey] ?? ''
                const selectedPlayer = jugadores.find(j => j.id === selectedId)
                const esCap = Boolean(selectedId && selectedId === capitanId)
                const pc = POS_COLORS[linea.pos]

                return (
                  <div
                    key={slotKey}
                    className="flex-1 sm:flex-none sm:w-full sm:max-w-[170px] rounded-xl p-1.5 sm:p-2.5 text-center transition-all sm:mt-3"
                    style={{
                      background: selectedId ? '#0c1528' : 'rgba(10,16,32,0.65)',
                      border: selectedId ? `1px solid ${pc.border}` : '1px dashed rgba(255,255,255,0.1)',
                      boxShadow: selectedId ? '0 4px 24px rgba(0,0,0,0.5)' : 'none',
                    }}
                  >
                    <div className="flex items-center justify-between mb-1 sm:mb-1.5">
                      <span className="text-[7px] sm:text-[8px] font-extrabold uppercase tracking-wider px-1 sm:px-1.5 py-0.5 rounded-md"
                        style={{ background: pc.bg, color: pc.text }}>{linea.pos}</span>
                      <div className="flex items-center gap-0.5">
                        {selectedPlayer && selectedPlayer.ptsUltimaFecha > 0 && (
                          <span className="text-[7px] sm:text-[9px] font-bold text-slate-500">{selectedPlayer.ptsUltimaFecha}p</span>
                        )}
                        {esCap && (
                          <span className="text-[8px] font-extrabold px-0.5 sm:px-1 py-0.5 rounded-md leading-none" style={{ background: '#f59e0b', color: '#000' }}>★</span>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-center mb-1 sm:mb-1.5"><AvatarSVG posicion={linea.pos} /></div>

                    {selectedPlayer ? (
                      <p className="text-[8px] sm:text-[10px] font-bold text-white truncate mb-1 sm:mb-1.5 leading-snug">{selectedPlayer.nombre}</p>
                    ) : (
                      <p className="text-[7px] sm:text-[9px] text-slate-700 italic mb-1 sm:mb-1.5">—</p>
                    )}

                    <button
                      type="button"
                      onClick={() => { if (mercadoAbierto) { setSlotActivo({ key: slotKey, pos: linea.pos }); setBusquedaSlot('') } }}
                      className="w-full rounded-lg px-1.5 sm:px-2 py-1 sm:py-1.5 text-[8px] sm:text-[10px] font-semibold transition-colors text-left"
                      style={{ background: '#0a1020', border: `1px solid ${selectedId ? pc.border : 'rgba(255,255,255,0.08)'}`, color: selectedId ? '#fff' : '#475569', cursor: mercadoAbierto ? 'pointer' : 'default' }}
                      disabled={!mercadoAbierto}
                    >
                      {selectedPlayer ? selectedPlayer.nombre : '+ Elegir'}
                    </button>

                    {selectedId && mercadoAbierto && (
                      <button
                        type="button"
                        onClick={() => setCapitanId(prev => prev === selectedId ? null : selectedId)}
                        className="mt-1 w-full text-[7px] sm:text-[9px] font-bold py-0.5 sm:py-1 rounded-lg transition-all"
                        style={esCap
                          ? { background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.4)', color: '#fbbf24' }
                          : { background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: '#64748b' }
                        }
                      >
                        {esCap ? '★ CAP' : '★'}
                      </button>
                    )}
                  </div>
                )
              })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={!mercadoAbierto || guardando}
        className="w-full py-4 rounded-xl text-white font-['Bebas_Neue'] text-2xl tracking-widest transition-all disabled:cursor-not-allowed"
        style={mercadoAbierto
          ? { background: 'linear-gradient(135deg,#1d6bf3,#0d4fd4)', boxShadow: '0 4px 24px rgba(29,107,243,0.4)' }
          : { background: '#0f1729', color: '#334155', border: '1px solid rgba(255,255,255,0.06)' }
        }
      >
        {guardando ? '⏳ Guardando...' : mercadoAbierto ? '✔ GUARDAR ALINEACIÓN' : '🔒 MERCADO CERRADO'}
      </button>

      {Object.values(selecciones).some(Boolean) && (
        <button
          type="button"
          onClick={() => setModo('ver')}
          className="w-full mt-2 py-2.5 rounded-xl text-slate-400 text-sm font-semibold transition-colors hover:text-white"
          style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          ← Ver mi equipo actual
        </button>
      )}
    </form>
  )
}
