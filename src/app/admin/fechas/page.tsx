'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from '@/components/Toaster'
import { ConfirmModal } from '@/components/ConfirmModal'

interface Fecha { id: string; nombreFecha: string; numero: number; deadlineCierre: string | null; fechaFin: string | null; publicada: boolean }

const emptyForm = { nombreFecha: '', numero: '', deadlineCierre: '', fechaFin: '' }

function toLocalInput(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toISOString().slice(0, 16)
}

export default function FechasAdminPage() {
  const router = useRouter()
  const [fechas, setFechas] = useState<Fecha[]>([])
  const [cargando, setCargando] = useState(true)
  const [modal, setModal] = useState<'crear' | 'editar' | null>(null)
  const [editando, setEditando] = useState<Fecha | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [guardando, setGuardando] = useState(false)
  const [confirmEliminar, setConfirmEliminar] = useState<Fecha | null>(null)
  const [confirmPublicar, setConfirmPublicar] = useState<Fecha | null>(null)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    const r = await fetch('/api/admin/fechas')
    if (r.status === 401 || r.status === 403) { router.replace('/'); return }
    if (r.ok) setFechas(await r.json())
    setCargando(false)
  }

  function abrirCrear() {
    setForm({ ...emptyForm, numero: String((fechas.length + 1)) })
    setEditando(null); setModal('crear')
  }

  function abrirEditar(f: Fecha) {
    setForm({ nombreFecha: f.nombreFecha, numero: String(f.numero), deadlineCierre: toLocalInput(f.deadlineCierre), fechaFin: toLocalInput(f.fechaFin) })
    setEditando(f); setModal('editar')
  }

  function cerrarModal() { setModal(null); setEditando(null); setForm(emptyForm) }

  async function guardar() {
    if (!form.nombreFecha.trim() || !form.numero) { toast('Nombre y número son requeridos.', 'error'); return }
    setGuardando(true)
    const body = {
      nombreFecha: form.nombreFecha.trim(),
      numero: Number(form.numero),
      deadlineCierre: form.deadlineCierre ? new Date(form.deadlineCierre).toISOString() : null,
      fechaFin: form.fechaFin ? new Date(form.fechaFin).toISOString() : null,
    }
    const url = modal === 'editar' ? `/api/admin/fechas/${editando!.id}` : '/api/admin/fechas'
    const method = modal === 'editar' ? 'PUT' : 'POST'
    const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await r.json()
    if (r.ok) {
      toast(modal === 'crear' ? 'Fecha creada.' : 'Fecha actualizada.', 'success')
      await cargar(); cerrarModal()
    } else {
      toast(data.error ?? 'Error al guardar.', 'error')
    }
    setGuardando(false)
  }

  async function eliminar(f: Fecha) {
    const r = await fetch(`/api/admin/fechas/${f.id}`, { method: 'DELETE' })
    const data = await r.json()
    if (r.ok) { toast(`"${f.nombreFecha}" eliminada.`, 'success'); await cargar() }
    else toast(data.error ?? 'Error al eliminar.', 'error')
    setConfirmEliminar(null)
  }

  async function publicar(f: Fecha) {
    const r = await fetch(`/api/admin/fecha/${f.id}/publicar`, { method: 'POST' })
    const data = await r.json()
    if (data.exito) { toast(`"${f.nombreFecha}" publicada. El ranking está actualizado.`, 'success'); await cargar() }
    else toast(data.error ?? 'Error al publicar.', 'error')
    setConfirmPublicar(null)
  }

  const inputCls = "w-full bg-[#060c18] border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:border-blue-500/60 transition-all"

  if (cargando) return <div className="text-center text-cyan-400 font-bold py-20 animate-pulse">Cargando fechas...</div>

  return (
    <div>
      {confirmEliminar && (
        <ConfirmModal
          title="Eliminar Fecha"
          message={`¿Eliminar "${confirmEliminar.nombreFecha}"? Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          danger
          onConfirm={() => eliminar(confirmEliminar)}
          onCancel={() => setConfirmEliminar(null)}
        />
      )}
      {confirmPublicar && (
        <ConfirmModal
          title="Publicar Fecha"
          message={`El ranking de "${confirmPublicar.nombreFecha}" se actualizará para todos los usuarios.`}
          confirmLabel="Publicar"
          onConfirm={() => publicar(confirmPublicar)}
          onCancel={() => setConfirmPublicar(null)}
        />
      )}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-['Bebas_Neue'] text-3xl text-white tracking-wide">Fechas del Torneo</h1>
          <p className="text-sm text-slate-500 mt-0.5">{fechas.length} fechas · {fechas.filter(f => f.publicada).length} publicadas</p>
        </div>
        <button onClick={abrirCrear}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:brightness-110"
          style={{ background: 'linear-gradient(135deg,#1d6bf3,#0d4fd4)', boxShadow: '0 2px 12px rgba(29,107,243,0.35)' }}>
          + Crear Fecha
        </button>
      </div>

      <div className="bg-[#111827] rounded-2xl border border-white/8 overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
        {fechas.length === 0 && (
          <div className="flex flex-col items-center py-16 text-slate-600">
            <span className="text-4xl mb-3">📅</span>
            <p className="text-sm">No hay fechas creadas aún.</p>
          </div>
        )}
        {fechas.map((f, idx) => (
          <div key={f.id} className={`flex items-center justify-between px-5 py-4 transition-colors hover:bg-white/2 flex-wrap gap-3 ${idx < fechas.length - 1 ? 'border-b border-white/5' : ''}`}>
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-xs font-extrabold text-blue-400">
                {f.numero}
              </div>
              <div>
                <p className="font-bold text-white text-sm">{f.nombreFecha}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  {f.deadlineCierre && (
                    <p className="text-[10px] text-slate-500">
                      Cierre: <span className="text-slate-400">{new Date(f.deadlineCierre).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                    </p>
                  )}
                  {f.fechaFin && (
                    <p className="text-[10px] text-slate-500">
                      Fin: <span className="text-slate-400">{new Date(f.fechaFin).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[9px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full ${f.publicada ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}
                style={{ border: `1px solid ${f.publicada ? 'rgba(34,197,94,0.2)' : 'rgba(234,179,8,0.2)'}` }}>
                {f.publicada ? '✓ Publicada' : '⏳ Pendiente'}
              </span>
              {!f.publicada && (
                <>
                  <button onClick={() => router.push(`/admin/fecha/${f.id}`)}
                    className="text-xs font-bold text-cyan-400 hover:text-white px-2.5 py-1.5 rounded-lg transition-colors hover:bg-cyan-500/20">
                    Cargar Stats
                  </button>
                  <button onClick={() => setConfirmPublicar(f)}
                    className="text-xs font-bold text-green-400 hover:text-white px-2.5 py-1.5 rounded-lg transition-colors hover:bg-green-500/20">
                    Publicar
                  </button>
                  <button onClick={() => abrirEditar(f)}
                    className="text-xs font-bold text-blue-400 hover:text-white px-2.5 py-1.5 rounded-lg transition-colors hover:bg-blue-500/20">
                    Editar
                  </button>
                  <button onClick={() => setConfirmEliminar(f)}
                    className="text-xs font-bold text-red-400 hover:text-white px-2.5 py-1.5 rounded-lg transition-colors hover:bg-red-500/20">
                    Eliminar
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-md bg-[#111827] rounded-2xl border border-white/10 p-6 shadow-2xl">
            <h2 className="font-['Bebas_Neue'] text-2xl text-cyan-400 tracking-wide mb-5">
              {modal === 'crear' ? 'Crear Fecha' : 'Editar Fecha'}
            </h2>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-1.5">Nombre</label>
                  <input value={form.nombreFecha} onChange={e => setForm(f => ({ ...f, nombreFecha: e.target.value }))}
                    className={inputCls} placeholder="Fecha 1" />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-1.5">Número</label>
                  <input type="number" min={1} value={form.numero} onChange={e => setForm(f => ({ ...f, numero: e.target.value }))}
                    className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-1.5">Cierre de mercado</label>
                <input type="datetime-local" value={form.deadlineCierre} onChange={e => setForm(f => ({ ...f, deadlineCierre: e.target.value }))}
                  className={inputCls + ' cursor-pointer'} />
                <p className="text-[9px] text-slate-600 mt-1">3 horas antes del inicio de los partidos</p>
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-1.5">Fin de la fecha</label>
                <input type="datetime-local" value={form.fechaFin} onChange={e => setForm(f => ({ ...f, fechaFin: e.target.value }))}
                  className={inputCls + ' cursor-pointer'} />
                <p className="text-[9px] text-slate-600 mt-1">Cuando terminan todos los partidos (el mercado reabre 24hs después)</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={cerrarModal}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-400 transition-colors hover:text-white"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                Cancelar
              </button>
              <button onClick={guardar} disabled={guardando}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:brightness-110 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#1d6bf3,#0d4fd4)' }}>
                {guardando ? 'Guardando...' : modal === 'crear' ? 'Crear' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
