'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Stats { fechas: number; fechasPublicadas: number; jugadores: number; usuarios: number; torneoNombre: string }

export default function AdminPage() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [fechas, setFechas] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/fechas').then(r => { if (!r.ok) return []; return r.json() }),
      fetch('/api/admin/jugadores').then(r => { if (!r.ok) return []; return r.json() }),
      fetch('/api/admin/torneo').then(r => { if (!r.ok) return null; return r.json() }),
    ]).then(([fs, js, torneo]) => {
      setFechas(fs)
      setStats({
        fechas: fs.length,
        fechasPublicadas: fs.filter((f: any) => f.publicada).length,
        jugadores: js.filter((j: any) => j.activo).length,
        usuarios: 0,
        torneoNombre: torneo?.nombre ?? '—',
      })
      setCargando(false)
    }).catch(() => {
      router.replace('/')
    })
  }, [])

  if (cargando) return (
    <div className="flex flex-col items-center justify-center py-24 text-slate-500">
      <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin mb-3" />
      <p className="text-sm font-semibold">Cargando panel...</p>
    </div>
  )

  const pendientes = fechas.filter((f: any) => !f.publicada)

  // Workflow steps to guide the admin
  const pasos = [
    { hecho: (stats?.jugadores ?? 0) > 0, label: 'Jugadores cargados', desc: `${stats?.jugadores ?? 0} jugadores activos`, href: '/admin/jugadores', accion: 'Agregar jugadores' },
    { hecho: (stats?.fechas ?? 0) > 0, label: 'Fechas configuradas', desc: `${stats?.fechas ?? 0} fecha${(stats?.fechas ?? 0) !== 1 ? 's' : ''} creada${(stats?.fechas ?? 0) !== 1 ? 's' : ''}`, href: '/admin/fechas', accion: 'Crear primera fecha' },
    { hecho: pendientes.length === 0 && (stats?.fechas ?? 0) > 0, label: 'Stats actualizadas', desc: pendientes.length > 0 ? `${pendientes.length} fecha${pendientes.length > 1 ? 's' : ''} pendiente${pendientes.length > 1 ? 's' : ''}` : 'Todo al día', href: pendientes[0] ? `/admin/fecha/${pendientes[0].id}` : '/admin/fechas', accion: 'Cargar estadísticas' },
  ]

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="font-['Bebas_Neue'] text-4xl text-white tracking-wide leading-none">{stats?.torneoNombre}</h1>
          <p className="text-sm text-slate-500 mt-1.5">Panel de administración</p>
        </div>
        <button onClick={() => router.push('/app')}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-white/6">
          ← Ver como jugador
        </button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { label: 'Jugadores', value: stats?.jugadores ?? 0, sub: 'activos', color: '#60a5fa', href: '/admin/jugadores' },
          { label: 'Fechas', value: stats?.fechas ?? 0, sub: 'creadas', color: '#a78bfa', href: '/admin/fechas' },
          { label: 'Publicadas', value: stats?.fechasPublicadas ?? 0, sub: 'fechas', color: '#4ade80', href: '/admin/fechas' },
        ].map(c => (
          <button key={c.label} onClick={() => router.push(c.href)}
            className="flex flex-col gap-1 p-4 rounded-2xl text-left transition-all hover:brightness-110"
            style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
            <span className="font-['Bebas_Neue'] text-4xl leading-none" style={{ color: c.color }}>{c.value}</span>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">{c.label}</span>
          </button>
        ))}
      </div>

      {/* Workflow guide */}
      <div className="mb-8">
        <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-600 mb-3">Flujo de trabajo</h2>
        <div className="flex flex-col gap-2">
          {pasos.map((paso, idx) => (
            <div key={paso.label}
              className="flex items-center gap-4 px-4 py-3 rounded-xl transition-all"
              style={{ background: paso.hecho ? 'rgba(74,222,128,0.04)' : 'rgba(255,255,255,0.03)', border: `1px solid ${paso.hecho ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.06)'}` }}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-extrabold flex-shrink-0 ${paso.hecho ? 'bg-green-500/20 text-green-400' : 'bg-white/6 text-slate-500'}`}>
                {paso.hecho ? '✓' : idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${paso.hecho ? 'text-slate-400 line-through' : 'text-white'}`}>{paso.label}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{paso.desc}</p>
              </div>
              {!paso.hecho && (
                <button onClick={() => router.push(paso.href)}
                  className="text-[11px] font-bold text-cyan-400 hover:text-white px-3 py-1.5 rounded-lg transition-colors hover:bg-cyan-500/15 whitespace-nowrap flex-shrink-0">
                  {paso.accion} →
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Fechas pendientes */}
      {pendientes.length > 0 && (
        <div className="mb-8">
          <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-600 mb-3">Requieren atención</h2>
          <div className="bg-[#111827] rounded-2xl border border-yellow-500/15 overflow-hidden">
            {pendientes.map((f: any, idx: number) => (
              <div key={f.id} className={`flex items-center justify-between px-5 py-4 flex-wrap gap-2 ${idx < pendientes.length - 1 ? 'border-b border-white/5' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-xs font-extrabold text-yellow-400">{f.numero}</div>
                  <div>
                    <p className="font-semibold text-white text-sm">{f.nombreFecha}</p>
                    {f.deadlineCierre && (
                      <p className="text-[10px] text-slate-500">Cierre: {new Date(f.deadlineCierre).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                    )}
                  </div>
                </div>
                <button onClick={() => router.push(`/admin/fecha/${f.id}`)}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold text-white transition-all hover:brightness-110"
                  style={{ background: 'linear-gradient(135deg,#1d6bf3,#0d4fd4)' }}>
                  Cargar Stats →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div>
        <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-600 mb-3">Acciones rápidas</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: 'Nueva Fecha', sub: 'Crear y configurar una jornada', href: '/admin/fechas' },
            { label: 'Agregar Jugador', sub: 'Incorporar al plantel del torneo', href: '/admin/jugadores' },
            { label: 'Config. Torneo', sub: 'Premios y datos del organizador', href: '/admin/torneo' },
          ].map(a => (
            <button key={a.label} onClick={() => router.push(a.href)}
              className="flex flex-col gap-1 p-4 rounded-xl text-left transition-all hover:bg-white/5"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <span className="text-sm font-bold text-white">{a.label}</span>
              <span className="text-[11px] text-slate-500">{a.sub}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
