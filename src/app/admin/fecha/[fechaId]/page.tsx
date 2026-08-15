'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from '@/components/Toaster'
import { ConfirmModal } from '@/components/ConfirmModal'

interface JugadorStats {
  id: string
  nombre: string
  equipo: string
  posicion: string
  stats: {
    goles: number
    valla_invicta: boolean
    amarillas: number
    roja: boolean
    penales_atajados: number
    penales_errados: number
    es_figura: boolean
    jugo: boolean
  }
}

const POS_COLOR: Record<string, string> = {
  ARQ: 'bg-cyan-400/15 text-cyan-400', DEF: 'bg-blue-500/15 text-blue-400',
  VOL: 'bg-violet-500/15 text-violet-400', DEL: 'bg-slate-400/12 text-slate-300',
}

function NumInput({ value, onChange, max = 20, disabled }: { value: number; onChange: (v: number) => void; max?: number; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-center gap-1">
      <button type="button" onClick={() => onChange(Math.max(0, value - 1))} disabled={disabled || value === 0}
        className="w-5 h-5 rounded flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 text-xs font-bold">−</button>
      <span className={`w-5 text-center text-sm font-bold tabular-nums ${value > 0 ? 'text-white' : 'text-slate-600'}`}>{value}</span>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={disabled || value >= max}
        className="w-5 h-5 rounded flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 text-xs font-bold">+</button>
    </div>
  )
}

export default function AdminFechaPage() {
  const { fechaId } = useParams<{ fechaId: string }>()
  const router = useRouter()
  const [jugadores, setJugadores] = useState<JugadorStats[]>([])
  const [fechaInfo, setFechaInfo] = useState<{ nombreFecha: string; numero: number } | null>(null)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [equiposCollapsed, setEquiposCollapsed] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetch(`/api/admin/fecha/${fechaId}`)
      .then(r => { if (r.status === 401 || r.status === 403) { router.replace('/'); return null } return r.json() })
      .then(data => { if (data) { setJugadores(data.jugadores ?? data); setFechaInfo(data.fecha ?? null); setCargando(false) } })
  }, [fechaId])

  function updateStat(id: string, field: string, value: boolean | number) {
    setJugadores(prev => prev.map(j => j.id === id ? { ...j, stats: { ...j.stats, [field]: value } } : j))
  }

  function marcarEquipo(equipo: string, jugo: boolean) {
    setJugadores(prev => prev.map(j => j.equipo === equipo ? { ...j, stats: { ...j.stats, jugo } } : j))
    toast(`${equipo}: ${jugo ? 'todos marcados como jugaron' : 'todos desmarcados'}.`, 'info')
  }

  async function guardar() {
    setGuardando(true)
    const payload = jugadores.map(j => ({ jugador_id: j.id, ...j.stats }))
    const res = await fetch(`/api/admin/fecha/${fechaId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const data = await res.json()
    if (data.exito) toast('Stats guardadas correctamente.', 'success')
    else toast(data.error ?? 'Error al guardar.', 'error')
    setGuardando(false)
  }

  async function publicar() {
    const res = await fetch(`/api/admin/fecha/${fechaId}/publicar`, { method: 'POST' })
    const data = await res.json()
    if (data.exito) { toast('¡Fecha publicada! El ranking está actualizado.', 'success'); router.push('/admin/fechas') }
    else toast(data.error ?? 'Error al publicar.', 'error')
    setConfirm(false)
  }

  const equipos = useMemo(() => Array.from(new Set(jugadores.map(j => j.equipo))).sort(), [jugadores])
  const jugaron = jugadores.filter(j => j.stats.jugo).length
  const figuras = jugadores.filter(j => j.stats.es_figura).length

  if (cargando) return (
    <div className="flex flex-col items-center justify-center py-24 text-slate-500">
      <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin mb-3" />
      <p className="text-sm font-semibold">Cargando jugadores...</p>
    </div>
  )

  return (
    <>
      {confirm && (
        <ConfirmModal
          title="Publicar Fecha"
          message="El ranking se actualizará para todos los usuarios. Esta acción no se puede deshacer."
          confirmLabel="Publicar ahora"
          onConfirm={publicar}
          onCancel={() => setConfirm(false)}
        />
      )}

      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button onClick={() => router.push('/admin/fechas')}
              className="text-[10px] font-bold text-slate-500 hover:text-cyan-400 transition-colors uppercase tracking-wider">
              ← Fechas
            </button>
            {fechaInfo && <><span className="text-slate-700">/</span><span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{fechaInfo.nombreFecha}</span></>}
          </div>
          <h1 className="font-['Bebas_Neue'] text-3xl text-white tracking-wide">Carga de Estadísticas</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{jugaron}/{jugadores.length} jugaron</span>
            {figuras > 0 && <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-500">{figuras} figura{figuras > 1 ? 's' : ''}</span>}
          </div>
        </div>
        <div className="flex gap-2.5">
          <button onClick={guardar} disabled={guardando}
            className="px-5 py-2.5 rounded-xl font-bold text-sm text-white transition-all hover:brightness-110 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#1d6bf3,#0d4fd4)', boxShadow: '0 2px 12px rgba(29,107,243,0.35)' }}>
            {guardando ? '⏳ Guardando...' : '💾 Guardar'}
          </button>
          <button onClick={() => setConfirm(true)}
            className="px-5 py-2.5 rounded-xl font-bold text-sm text-white transition-all hover:brightness-110"
            style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)', boxShadow: '0 2px 12px rgba(22,163,74,0.3)' }}>
            ✅ Publicar Fecha
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {equipos.map(equipo => {
          const js = jugadores.filter(j => j.equipo === equipo)
          const collapsed = equiposCollapsed[equipo]
          const jugaron = js.filter(j => j.stats.jugo).length
          return (
            <div key={equipo} className="bg-[#111827] rounded-2xl border border-white/8 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 cursor-pointer select-none border-b border-white/6"
                style={{ background: '#06090f' }}
                onClick={() => setEquiposCollapsed(p => ({ ...p, [equipo]: !p[equipo] }))}>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-slate-500 transition-transform" style={{ display: 'inline-block', transform: collapsed ? 'rotate(0deg)' : 'rotate(90deg)' }}>▶</span>
                  <span className="font-['Bebas_Neue'] text-base tracking-wide text-white">{equipo}</span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${jugaron === js.length ? 'text-green-400' : jugaron > 0 ? 'text-yellow-400' : 'text-slate-600'}`}>
                    {jugaron}/{js.length} jugaron
                  </span>
                </div>
                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                  <button onClick={() => marcarEquipo(equipo, true)}
                    className="text-[10px] font-bold text-green-400 hover:text-white px-2.5 py-1 rounded-lg transition-colors hover:bg-green-500/20">
                    ✓ Todos jugaron
                  </button>
                  <button onClick={() => marcarEquipo(equipo, false)}
                    className="text-[10px] font-bold text-slate-500 hover:text-white px-2.5 py-1 rounded-lg transition-colors hover:bg-white/8">
                    Limpiar
                  </button>
                </div>
              </div>

              {!collapsed && (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm" style={{ minWidth: 780 }}>
                    <thead>
                      <tr style={{ background: '#0a0f1a' }}>
                        {['Jugador','Pos','Jugó','Goles','V.Invicta','Amarillas','Roja','Pen.Ataj','Pen.Err','Figura'].map(h => (
                          <th key={h} className="text-[9px] font-extrabold uppercase tracking-widest text-slate-600 px-3 py-2 text-center border-b border-white/5 whitespace-nowrap first:text-left">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {js.map(j => {
                        const active = j.stats.jugo
                        return (
                          <tr key={j.id} className="border-b border-white/4 transition-all"
                            style={{ background: active ? 'rgba(29,107,243,0.04)' : 'transparent', opacity: active ? 1 : 0.45 }}>
                            <td className="px-3 py-2.5 font-semibold text-sm text-white whitespace-nowrap">{j.nombre}</td>
                            <td className="px-3 py-2.5 text-center">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${POS_COLOR[j.posicion]}`}>{j.posicion}</span>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <input type="checkbox" checked={j.stats.jugo} onChange={e => updateStat(j.id, 'jugo', e.target.checked)}
                                className="w-4 h-4 accent-cyan-400 cursor-pointer" />
                            </td>
                            <td className="px-3 py-2.5"><NumInput value={j.stats.goles} onChange={v => updateStat(j.id, 'goles', v)} disabled={!active} /></td>
                            <td className="px-3 py-2.5 text-center">
                              {(j.posicion === 'ARQ' || j.posicion === 'DEF')
                                ? <input type="checkbox" checked={j.stats.valla_invicta} onChange={e => updateStat(j.id, 'valla_invicta', e.target.checked)} className="w-4 h-4 accent-cyan-400 cursor-pointer" disabled={!active} />
                                : <span className="text-slate-700 text-xs">—</span>}
                            </td>
                            <td className="px-3 py-2.5"><NumInput value={j.stats.amarillas} onChange={v => updateStat(j.id, 'amarillas', v)} max={2} disabled={!active} /></td>
                            <td className="px-3 py-2.5 text-center">
                              <input type="checkbox" checked={j.stats.roja} onChange={e => updateStat(j.id, 'roja', e.target.checked)}
                                className="w-4 h-4 cursor-pointer" style={{ accentColor: '#f87171' }} disabled={!active} />
                            </td>
                            <td className="px-3 py-2.5">
                              {j.posicion === 'ARQ'
                                ? <NumInput value={j.stats.penales_atajados} onChange={v => updateStat(j.id, 'penales_atajados', v)} max={5} disabled={!active} />
                                : <span className="text-slate-700 text-xs text-center block">—</span>}
                            </td>
                            <td className="px-3 py-2.5"><NumInput value={j.stats.penales_errados} onChange={v => updateStat(j.id, 'penales_errados', v)} max={5} disabled={!active} /></td>
                            <td className="px-3 py-2.5 text-center">
                              <input type="checkbox" checked={j.stats.es_figura} onChange={e => updateStat(j.id, 'es_figura', e.target.checked)}
                                className="w-4 h-4 cursor-pointer" style={{ accentColor: '#fbbf24' }} disabled={!active} />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="sticky bottom-4 mt-6 flex justify-end">
        <button onClick={guardar} disabled={guardando}
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white shadow-2xl transition-all hover:brightness-110 disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg,#1d6bf3,#0d4fd4)', boxShadow: '0 4px 24px rgba(29,107,243,0.5)' }}>
          {guardando ? '⏳ Guardando...' : '💾 Guardar estadísticas'}
        </button>
      </div>
    </>
  )
}

