'use client'

import { useState } from 'react'

interface Entrada { usuario: string; equipo: string; puntos: number }

interface Props {
  fechas: string[]
  rankingGeneral: Entrada[]
  rankingPorFecha: Record<string, Entrada[]>
  premioFecha?: number
  premioCampeon?: number
}

function formatPremio(n?: number) {
  if (!n) return null
  return `$${n.toLocaleString('es-AR')} ARS`
}

function Tabla({ datos, titulo, gold, premio }: { datos: Entrada[]; titulo: string; gold?: boolean; premio?: number }) {
  const maxPts = datos[0]?.puntos
  const hayEmpate = maxPts !== undefined && datos.filter(d => d.puntos === maxPts).length > 1

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: '#0b1120', border: '1px solid rgba(255,255,255,0.07)' }}>
      {/* Table header */}
      <div className={`flex justify-between items-center px-5 py-3.5 border-b border-white/6`}
        style={{ background: gold ? 'rgba(234,179,8,0.06)' : 'rgba(29,107,243,0.06)' }}>
        <span className={`font-['Bebas_Neue'] text-base tracking-widest ${gold ? 'text-yellow-400' : 'text-cyan-400'}`}>{titulo}</span>
        {premio && (
          <span className={`text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full ${gold ? 'text-yellow-300' : 'text-cyan-300'}`}
            style={{ background: gold ? 'rgba(234,179,8,0.1)' : 'rgba(0,210,255,0.08)', border: `1px solid ${gold ? 'rgba(234,179,8,0.2)' : 'rgba(0,210,255,0.15)'}` }}>
            Premio: {formatPremio(premio)}
          </span>
        )}
      </div>

      {hayEmpate && (
        <div className="flex items-center gap-2 px-4 py-2 text-xs text-blue-300 border-b border-white/5"
          style={{ background: 'rgba(29,107,243,0.06)' }}>
          <span>⚖️</span>
          <span>Empate: el premio se <strong>divide en partes iguales</strong>.</span>
        </div>
      )}

      <table className="w-full border-collapse">
        <thead>
          <tr style={{ background: '#06090f' }}>
            <th className="text-[9px] font-extrabold uppercase tracking-widest text-slate-600 px-4 py-3 text-left border-b border-white/6 w-10">#</th>
            <th className="text-[9px] font-extrabold uppercase tracking-widest text-slate-600 px-4 py-3 text-left border-b border-white/6">DT / Equipo</th>
            <th className="text-[9px] font-extrabold uppercase tracking-widest text-slate-600 px-4 py-3 text-right border-b border-white/6">Pts</th>
          </tr>
        </thead>
        <tbody>
          {datos.length === 0 && (
            <tr><td colSpan={3} className="text-center text-slate-600 py-10 text-sm italic">Sin datos aún</td></tr>
          )}
          {datos.map((item, i) => {
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null
            const isTied = item.puntos === maxPts && hayEmpate
            return (
              <tr key={i} className="border-b border-white/5 transition-colors hover:bg-white/2"
                style={isTied ? { background: 'rgba(29,107,243,0.05)' } : {}}>
                <td className="px-4 py-3 text-center">
                  {medal ? <span className="text-base leading-none">{medal}</span> : <span className="text-xs font-bold text-slate-600">{i + 1}</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="font-semibold text-sm text-white">{item.usuario}</div>
                  {item.equipo && <div className="text-[11px] text-slate-600 mt-0.5">{item.equipo}</div>}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="font-['Bebas_Neue'] text-lg" style={{ color: i === 0 ? (gold ? '#fbbf24' : '#22d3ee') : '#64748b' }}>
                    {item.puntos}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default function RankingView({ fechas, rankingGeneral, rankingPorFecha, premioFecha, premioCampeon }: Props) {
  const [fechaSeleccionada, setFechaSeleccionada] = useState(fechas[fechas.length - 1] ?? '')

  if (fechas.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-slate-600">
        <span className="text-4xl mb-3">📊</span>
        <p className="text-sm">No hay fechas publicadas aún.</p>
        <p className="text-xs text-slate-700 mt-1">Los resultados se publican el día siguiente a cada fecha.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between px-4 py-3 rounded-xl mb-5"
        style={{ background: '#06090f', border: '1px solid rgba(255,255,255,0.06)' }}>
        <span className="font-['Bebas_Neue'] text-base tracking-widest text-slate-400">📅 Puntos por Fecha</span>
        <select
          value={fechaSeleccionada}
          onChange={e => setFechaSeleccionada(e.target.value)}
          className="text-white rounded-lg px-3 py-1.5 text-sm font-semibold cursor-pointer outline-none transition-colors focus:border-blue-500/60"
          style={{ background: '#111827', border: '1px solid rgba(29,107,243,0.3)' }}
        >
          {fechas.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Tabla datos={rankingPorFecha[fechaSeleccionada] ?? []} titulo={`📅 ${fechaSeleccionada}`} premio={premioFecha} />
        <Tabla datos={rankingGeneral} titulo="🏆 Ranking General (Acumulado)" gold premio={premioCampeon} />
      </div>
    </div>
  )
}
