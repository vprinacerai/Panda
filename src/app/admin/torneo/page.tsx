'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from '@/components/Toaster'

export default function TorneoAdminPage() {
  const router = useRouter()
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [form, setForm] = useState({ nombre: '', organizadorEmail: '', premioCampeon: '', premioFecha: '' })

  useEffect(() => {
    fetch('/api/admin/torneo')
      .then(r => { if (r.status === 401 || r.status === 403) { router.replace('/'); return null } return r.json() })
      .then(data => {
        if (data) {
          setForm({
            nombre: data.nombre ?? '',
            organizadorEmail: data.organizadorEmail ?? '',
            premioCampeon: String(data.premioCampeon ?? ''),
            premioFecha: String(data.premioFecha ?? ''),
          })
        }
        setCargando(false)
      })
  }, [])

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setGuardando(true)
    const r = await fetch('/api/admin/torneo', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: form.nombre,
        organizadorEmail: form.organizadorEmail,
        premioCampeon: Number(form.premioCampeon) || 0,
        premioFecha: Number(form.premioFecha) || 0,
      })
    })
    const data = await r.json()
    if (r.ok) toast('Configuración guardada.', 'success')
    else toast(data.error ?? 'Error al guardar.', 'error')
    setGuardando(false)
  }

  const inputCls = "w-full bg-[#060c18] border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:border-blue-500/60 transition-all"
  const labelCls = "block text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-1.5"

  if (cargando) return <div className="text-center text-cyan-400 font-bold py-20 animate-pulse">Cargando...</div>

  return (
    <div className="max-w-xl">
      <h1 className="font-['Bebas_Neue'] text-3xl text-white tracking-wide mb-6">Configuración del Torneo</h1>

      <form onSubmit={guardar}>
        <div className="bg-[#111827] rounded-2xl border border-white/8 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex flex-col gap-5">

          <div>
            <label className={labelCls}>Nombre del Torneo</label>
            <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              className={inputCls} placeholder="Liga Amateur 2026" />
          </div>

          <div>
            <label className={labelCls}>Email del Organizador</label>
            <input type="email" value={form.organizadorEmail} onChange={e => setForm(f => ({ ...f, organizadorEmail: e.target.value }))}
              className={inputCls} placeholder="organizador@liga.com" />
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/6">
            <div>
              <label className={labelCls}>Premio Campeón (ARS)</label>
              <input type="number" min={0} value={form.premioCampeon} onChange={e => setForm(f => ({ ...f, premioCampeon: e.target.value }))}
                className={inputCls} placeholder="100000" />
              <p className="text-[9px] text-slate-600 mt-1">Ganador del torneo general</p>
            </div>
            <div>
              <label className={labelCls}>Premio por Fecha (ARS)</label>
              <input type="number" min={0} value={form.premioFecha} onChange={e => setForm(f => ({ ...f, premioFecha: e.target.value }))}
                className={inputCls} placeholder="10000" />
              <p className="text-[9px] text-slate-600 mt-1">Ganador de cada fecha</p>
            </div>
          </div>

          <div className="pt-2 border-t border-white/6 rounded-xl p-3" style={{ background: 'rgba(234,179,8,0.05)', border: '1px solid rgba(234,179,8,0.1)' }}>
            <p className="text-[10px] text-yellow-500/70 font-semibold">
              💡 Los premios son aportados y gestionados por la organización fuera de la plataforma.
            </p>
          </div>

          <button type="submit" disabled={guardando}
            className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:brightness-110 disabled:opacity-50 mt-1"
            style={{ background: 'linear-gradient(135deg,#1d6bf3,#0d4fd4)', boxShadow: '0 2px 12px rgba(29,107,243,0.35)' }}>
            {guardando ? 'Guardando...' : '✔ Guardar Configuración'}
          </button>
        </div>
      </form>
    </div>
  )
}
