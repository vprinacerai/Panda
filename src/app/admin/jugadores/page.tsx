'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from '@/components/Toaster'
import { ConfirmModal } from '@/components/ConfirmModal'

interface Jugador { id: string; nombre: string; equipo: string; posicion: string; activo: boolean }

const POSICIONES = ['ARQ', 'DEF', 'VOL', 'DEL']
const POS_LABEL: Record<string, string> = { ARQ: 'Arquero', DEF: 'Defensor', VOL: 'Volante', DEL: 'Delantero' }
const POS_COLOR: Record<string, string> = { ARQ: '#00d2ff', DEF: '#60a5fa', VOL: '#93c5fd', DEL: '#e2e8f0' }

const emptyForm = { nombre: '', equipo: '', posicion: 'DEL' }

export default function JugadoresPage() {
  const router = useRouter()
  const [jugadores, setJugadores] = useState<Jugador[]>([])
  const [cargando, setCargando] = useState(true)
  const [filtroEquipo, setFiltroEquipo] = useState('Todos')
  const [filtroPos, setFiltroPos] = useState('Todos')
  const [soloActivos, setSoloActivos] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [modal, setModal] = useState<'crear' | 'editar' | null>(null)
  const [editando, setEditando] = useState<Jugador | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [guardando, setGuardando] = useState(false)
  const [confirmBaja, setConfirmBaja] = useState<Jugador | null>(null)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    const r = await fetch('/api/admin/jugadores')
    if (r.status === 401 || r.status === 403) { router.replace('/'); return }
    if (r.ok) setJugadores(await r.json())
    setCargando(false)
  }

  function abrirCrear() { setForm(emptyForm); setEditando(null); setModal('crear') }
  function abrirEditar(j: Jugador) { setForm({ nombre: j.nombre, equipo: j.equipo, posicion: j.posicion }); setEditando(j); setModal('editar') }
  function cerrarModal() { setModal(null); setEditando(null); setForm(emptyForm) }

  async function guardar() {
    if (!form.nombre.trim() || !form.equipo.trim()) { toast('Nombre y equipo son requeridos.', 'error'); return }
    setGuardando(true)
    const url = modal === 'editar' ? `/api/admin/jugadores/${editando!.id}` : '/api/admin/jugadores'
    const method = modal === 'editar' ? 'PUT' : 'POST'
    const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const data = await r.json()
    if (r.ok) {
      toast(modal === 'crear' ? 'Jugador creado.' : 'Jugador actualizado.', 'success')
      await cargar(); cerrarModal()
    } else {
      toast(data.error ?? 'Error al guardar.', 'error')
    }
    setGuardando(false)
  }

  async function toggleActivo(j: Jugador) {
    const r = await fetch(`/api/admin/jugadores/${j.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: !j.activo })
    })
    if (r.ok) {
      toast(j.activo ? `${j.nombre} dado de baja.` : `${j.nombre} reactivado.`, 'success')
      await cargar()
    } else toast('Error al actualizar.', 'error')
    setConfirmBaja(null)
  }

  const equipos = ['Todos', ...Array.from(new Set(jugadores.map(j => j.equipo))).sort()]
  const filtrados = jugadores.filter(j =>
    (filtroEquipo === 'Todos' || j.equipo === filtroEquipo) &&
    (filtroPos === 'Todos' || j.posicion === filtroPos) &&
    (!soloActivos || j.activo) &&
    (!busqueda || j.nombre.toLowerCase().includes(busqueda.toLowerCase()) || j.equipo.toLowerCase().includes(busqueda.toLowerCase()))
  )

  const inputCls = "w-full bg-[#060c18] border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:border-blue-500/60 transition-all"

  if (cargando) return <div className="text-center text-cyan-400 font-bold py-20 animate-pulse">Cargando jugadores...</div>

  return (
    <div>
      {confirmBaja && (
        <ConfirmModal
          title={confirmBaja.activo ? 'Dar de baja' : 'Reactivar jugador'}
          message={`${confirmBaja.activo ? '¿Dar de baja a' : '¿Reactivar a'} ${confirmBaja.nombre} (${confirmBaja.equipo})?`}
          confirmLabel={confirmBaja.activo ? 'Dar de baja' : 'Reactivar'}
          danger={confirmBaja.activo}
          onConfirm={() => toggleActivo(confirmBaja)}
          onCancel={() => setConfirmBaja(null)}
        />
      )}
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-['Bebas_Neue'] text-3xl text-white tracking-wide">Jugadores</h1>
          <p className="text-sm text-slate-500 mt-0.5">{jugadores.filter(j => j.activo).length} activos · {jugadores.length} total</p>
        </div>
        <button
          onClick={abrirCrear}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:brightness-110"
          style={{ background: 'linear-gradient(135deg,#1d6bf3,#0d4fd4)', boxShadow: '0 2px 12px rgba(29,107,243,0.35)' }}
        >
          + Agregar Jugador
        </button>
      </div>

      {/* Search + filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        <input
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar jugador o equipo..."
          className="bg-[#111827] border border-white/10 text-white rounded-lg px-3 py-2 text-sm font-medium outline-none focus:border-blue-500/60 transition-colors flex-1 min-w-[160px]"
        />
        <select value={filtroEquipo} onChange={e => setFiltroEquipo(e.target.value)}
          className="bg-[#111827] border border-white/10 text-white rounded-lg px-3 py-2 text-xs font-semibold outline-none cursor-pointer">
          {equipos.map(eq => <option key={eq}>{eq}</option>)}
        </select>
        <select value={filtroPos} onChange={e => setFiltroPos(e.target.value)}
          className="bg-[#111827] border border-white/10 text-white rounded-lg px-3 py-2 text-xs font-semibold outline-none cursor-pointer">
          <option value="Todos">Todas las posiciones</option>
          {POSICIONES.map(p => <option key={p} value={p}>{POS_LABEL[p]}</option>)}
        </select>
        <button
          onClick={() => setSoloActivos(v => !v)}
          className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors ${soloActivos ? 'bg-green-500/15 text-green-400' : 'bg-white/6 text-slate-400'}`}
        >
          {soloActivos ? '● Activos' : '○ Todos'}
        </button>
      </div>

      {/* Table */}
      <div className="bg-[#111827] rounded-2xl border border-white/8 overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ background: '#06090f' }}>
                <th className="text-[9px] font-extrabold uppercase tracking-widest text-slate-600 px-4 py-3 text-left border-b border-white/6">Jugador</th>
                <th className="text-[9px] font-extrabold uppercase tracking-widest text-slate-600 px-4 py-3 text-left border-b border-white/6 hidden sm:table-cell">Equipo</th>
                <th className="text-[9px] font-extrabold uppercase tracking-widest text-slate-600 px-4 py-3 text-left border-b border-white/6">Posición</th>
                <th className="text-[9px] font-extrabold uppercase tracking-widest text-slate-600 px-4 py-3 text-left border-b border-white/6 hidden sm:table-cell">Estado</th>
                <th className="text-[9px] font-extrabold uppercase tracking-widest text-slate-600 px-4 py-3 text-left border-b border-white/6">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 && (
                <tr><td colSpan={5} className="text-center text-slate-600 py-12 text-sm italic">Sin jugadores con los filtros actuales</td></tr>
              )}
              {filtrados.map(j => (
                <tr key={j.id} className={`border-b border-white/5 transition-colors hover:bg-white/2 ${!j.activo ? 'opacity-40' : ''}`}>
                  <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold flex-shrink-0"
                      style={{ background: 'rgba(29,107,243,0.15)', border: '1px solid rgba(29,107,243,0.3)', color: '#60a5fa' }}>
                      {j.nombre.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <span className="font-semibold text-sm text-white">{j.nombre}</span>
                      <p className="text-[10px] text-slate-500 sm:hidden">{j.equipo}</p>
                    </div>
                  </div>
                </td>
                  <td className="px-4 py-3 text-sm text-slate-400 hidden sm:table-cell">{j.equipo}</td>
                  <td className="px-4 py-3">
                    <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-1 rounded-md"
                      style={{ background: `${POS_COLOR[j.posicion]}22`, color: POS_COLOR[j.posicion] }}>
                      {POS_LABEL[j.posicion]}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-1 rounded-full ${j.activo ? 'bg-green-500/10 text-green-400' : 'bg-slate-500/10 text-slate-500'}`}>
                      {j.activo ? 'Activo' : 'Baja'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => abrirEditar(j)}
                        className="text-xs font-bold text-blue-400 hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-blue-500/20">
                        Editar
                      </button>
                      <button onClick={() => setConfirmBaja(j)}
                        className={`text-xs font-bold transition-colors px-2 py-1 rounded-lg ${j.activo ? 'text-red-400 hover:text-white hover:bg-red-500/20' : 'text-green-400 hover:text-white hover:bg-green-500/20'}`}>
                        {j.activo ? 'Dar de baja' : 'Reactivar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-md bg-[#111827] rounded-2xl border border-white/10 p-6 shadow-2xl">
            <h2 className="font-['Bebas_Neue'] text-2xl text-cyan-400 tracking-wide mb-5">
              {modal === 'crear' ? 'Agregar Jugador' : 'Editar Jugador'}
            </h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-1.5">Nombre</label>
                <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  className={inputCls} placeholder="Juan Pérez" />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-1.5">Equipo</label>
                <input value={form.equipo} onChange={e => setForm(f => ({ ...f, equipo: e.target.value }))}
                  className={inputCls} placeholder="Galácticos FC" list="equipos-list" />
                <datalist id="equipos-list">
                  {Array.from(new Set(jugadores.map(j => j.equipo))).sort().map(eq => <option key={eq} value={eq} />)}
                </datalist>
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-1.5">Posición</label>
                <select value={form.posicion} onChange={e => setForm(f => ({ ...f, posicion: e.target.value }))}
                  className={inputCls + ' cursor-pointer'}>
                  {POSICIONES.map(p => <option key={p} value={p}>{POS_LABEL[p]}</option>)}
                </select>
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
                {guardando ? 'Guardando...' : modal === 'crear' ? 'Agregar' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
