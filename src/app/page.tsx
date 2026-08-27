'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from '@/components/Toaster'

const TORNEO_ID = process.env.NEXT_PUBLIC_TORNEO_ID ?? ''

type Vista = 'login' | 'registro' | 'recuperar' | 'cambiar-clave'

export default function AuthPage() {
  const router = useRouter()
  const [vista, setVista] = useState<Vista>('login')
  const [cargando, setCargando] = useState(false)
  const [emailRecup, setEmailRecup] = useState('')
  const [logoError, setLogoError] = useState(false)

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setCargando(true)
    const fd = new FormData(e.currentTarget)
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: fd.get('email'), password: fd.get('password'), torneoId: TORNEO_ID }),
    })
    const data = await res.json()
    setCargando(false)
    if (data.exito) router.push('/app')
    else toast(data.mensaje ?? 'Credenciales incorrectas.', 'error')
  }

  async function handleRegistro(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setCargando(true)
    const fd = new FormData(e.currentTarget)
    const res = await fetch('/api/auth/registro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: fd.get('email'), password: fd.get('password'), nombreDT: fd.get('nombreDT'), torneoId: TORNEO_ID }),
    })
    const data = await res.json()
    setCargando(false)
    if (data.exito) router.push('/app')
    else toast(data.mensaje ?? 'Error al crear la cuenta.', 'error')
  }

  async function handleRecuperar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setCargando(true)
    const fd = new FormData(e.currentTarget)
    const email = fd.get('email') as string
    setEmailRecup(email)
    await fetch('/api/auth/recuperar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, torneoId: TORNEO_ID }),
    })
    setCargando(false)
    toast('Si el correo existe, recibirás un código de recuperación.', 'info')
    setVista('cambiar-clave')
  }

  async function handleCambiarClave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setCargando(true)
    const fd = new FormData(e.currentTarget)
    const res = await fetch('/api/auth/cambiar-clave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailRecup, codigo: fd.get('codigo'), nuevaPassword: fd.get('nuevaPassword'), torneoId: TORNEO_ID }),
    })
    const data = await res.json()
    setCargando(false)
    toast(data.mensaje ?? (data.exito ? 'Contraseña actualizada.' : 'Código inválido.'), data.exito ? 'success' : 'error')
    if (data.exito) setVista('login')
  }

  const inputCls = "w-full bg-[#060c18] border border-white/10 text-white rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all placeholder:text-slate-600"
  const btnCls = "w-full mt-5 py-4 rounded-xl text-white font-['Bebas_Neue'] text-2xl tracking-widest transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100"
  const linkCls = "block text-center mt-4 text-xs text-slate-500 cursor-pointer hover:text-cyan-400 transition-colors"
  const btnStyle = { background: 'linear-gradient(135deg,#1d6bf3,#0d4fd4)', boxShadow: '0 4px 20px rgba(29,107,243,0.35)' }

  const features = [
    { icon: '⚽', text: '7 titulares por equipo, sin banco de suplentes' },
    { icon: '★', text: 'Capitán con +5 puntos fijos automáticos' },
    { icon: '🔄', text: 'Pases ilimitados y gratuitos hasta el cierre' },
    { icon: '📊', text: 'Ranking por fecha y tabla general acumulada' },
  ]

  return (
    <div className="min-h-screen flex flex-col justify-center items-center sm:px-4 sm:py-8" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(29,107,243,0.08) 0%, transparent 60%), #0a0e17' }}>
      <div className="w-full sm:max-w-[1000px] bg-[#111827] sm:rounded-2xl border-0 sm:border border-white/8 shadow-[0_32px_64px_rgba(0,0,0,0.8)] overflow-hidden">

        {/* Header */}
        <div className="relative flex flex-col items-center px-6 py-8 overflow-hidden border-b border-white/8" style={{ background: 'linear-gradient(180deg,#070e1d,#0d1626)' }}>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_50%_0%,rgba(29,107,243,0.12),transparent)]" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
          {!logoError && (
            <img
              src="https://lh3.googleusercontent.com/d/14Wc0C7x__d6ZY_popX5OQH8EhhOPQSu8"
              alt="Panda"
              className="relative h-20 object-contain mb-3"
              onError={() => setLogoError(true)}
              style={{ filter: 'drop-shadow(0 0 16px rgba(0,210,255,0.5))' }}
            />
          )}
          {logoError && <div className="text-6xl mb-3">🐼</div>}
          <h1 className="relative font-['Bebas_Neue'] text-6xl tracking-[0.12em]">
            PAN<span className="text-cyan-400" style={{ textShadow: '0 0 20px rgba(0,210,255,0.5)' }}>DA</span>
          </h1>
          <p className="relative text-[11px] font-bold tracking-[0.35em] text-slate-500 uppercase mt-1">Fantasy Fútbol Amateur</p>
        </div>

        {/* Body: 2-col on md+ */}
        <div className="grid grid-cols-1 md:grid-cols-2">

          {/* Left: prizes + features */}
          <div className="flex flex-col gap-4 p-4 sm:p-6 border-b md:border-b-0 md:border-r border-white/8">
            {/* Prize cards */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="flex items-center gap-3 p-3.5 rounded-xl" style={{ background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.15)' }}>
                <span className="text-xl flex-shrink-0">🏆</span>
                <div>
                  <p className="text-[9px] font-extrabold uppercase tracking-widest text-yellow-600/60">Torneo</p>
                  <p className="font-['Bebas_Neue'] text-xl leading-tight text-yellow-400">$100.000 ARS</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3.5 rounded-xl" style={{ background: 'rgba(0,210,255,0.06)', border: '1px solid rgba(0,210,255,0.15)' }}>
                <span className="text-xl flex-shrink-0">⭐</span>
                <div>
                  <p className="text-[9px] font-extrabold uppercase tracking-widest text-cyan-600/60">Por Fecha</p>
                  <p className="font-['Bebas_Neue'] text-xl leading-tight text-cyan-400">$10.000 ARS</p>
                </div>
              </div>
            </div>

            {/* Game features */}
            <div className="flex flex-col gap-2 mt-2">
              <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-600 px-1">Mecánica del juego</p>
              {features.map(f => (
                <div key={f.text} className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <span className="text-sm flex-shrink-0 w-5 text-center">{f.icon}</span>
                  <span className="text-xs text-slate-400">{f.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: auth form */}
          <div className="flex flex-col justify-center p-4 sm:p-6">
            <div className="w-full p-7 rounded-2xl" style={{ background: '#0a1322', border: '1px solid rgba(29,107,243,0.15)', boxShadow: '0 0 40px rgba(0,0,0,0.4)' }}>
              {vista === 'login' && (
                <>
                  <h2 className="font-['Bebas_Neue'] text-cyan-400 text-3xl tracking-wide text-center mb-6">Iniciar Sesión</h2>
                  <form onSubmit={handleLogin} className="flex flex-col gap-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-1.5">Correo</label>
                      <input name="email" type="email" required autoComplete="email" className={inputCls} placeholder="tu@correo.com" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-1.5">Contraseña</label>
                      <input name="password" type="password" required autoComplete="current-password" className={inputCls} placeholder="••••••••" />
                    </div>
                    <button type="submit" disabled={cargando} className={btnCls} style={btnStyle}>
                      {cargando ? 'Ingresando...' : 'Ingresar'}
                    </button>
                  </form>
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-white/8" />
                    <span className="text-[10px] text-slate-600 font-semibold uppercase tracking-widest">o</span>
                    <div className="flex-1 h-px bg-white/8" />
                  </div>
                  <a href={`/api/auth/google?torneoId=${TORNEO_ID}`}
                    className="w-full flex items-center justify-center gap-3 py-3 rounded-xl font-semibold text-sm text-white transition-all hover:brightness-110 active:scale-[0.99]"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
                    <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/><path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/></svg>
                    Continuar con Google
                  </a>
                  <div className="mt-4 pt-4 border-t border-white/6 flex flex-col gap-1">
                    <span className={linkCls} onClick={() => setVista('registro')}>¿No tenés cuenta? <span className="text-cyan-400 font-semibold">Registrate gratis</span></span>
                    <span className={linkCls} onClick={() => setVista('recuperar')}>¿Olvidaste tu contraseña?</span>
                  </div>
                </>
              )}
              {vista === 'registro' && (
                <>
                  <h2 className="font-['Bebas_Neue'] text-cyan-400 text-3xl tracking-wide text-center mb-6">Crear Cuenta</h2>
                  <form onSubmit={handleRegistro} className="flex flex-col gap-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-1.5">Tu Apodo de DT</label>
                      <input name="nombreDT" type="text" required className={inputCls} placeholder="El Profe, Mostaza..." />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-1.5">Correo</label>
                      <input name="email" type="email" required autoComplete="email" className={inputCls} placeholder="tu@correo.com" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-1.5">Contraseña</label>
                      <input name="password" type="password" required minLength={8} autoComplete="new-password" className={inputCls} placeholder="Mínimo 8 caracteres" />
                      <p className="text-[10px] text-slate-600 mt-1">Mínimo 8 caracteres</p>
                    </div>
                    <button type="submit" disabled={cargando} className={btnCls} style={btnStyle}>
                      {cargando ? 'Creando cuenta...' : 'Crear Cuenta'}
                    </button>
                  </form>
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-white/8" />
                    <span className="text-[10px] text-slate-600 font-semibold uppercase tracking-widest">o</span>
                    <div className="flex-1 h-px bg-white/8" />
                  </div>
                  <a href={`/api/auth/google?torneoId=${TORNEO_ID}`}
                    className="w-full flex items-center justify-center gap-3 py-3 rounded-xl font-semibold text-sm text-white transition-all hover:brightness-110 active:scale-[0.99]"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
                    <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/><path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/></svg>
                    Registrarse con Google
                  </a>
                  <div className="mt-4 pt-4 border-t border-white/6">
                    <span className={linkCls} onClick={() => setVista('login')}>¿Ya tenés cuenta? <span className="text-cyan-400 font-semibold">Iniciá sesión</span></span>
                  </div>
                </>
              )}
              {vista === 'recuperar' && (
                <>
                  <h2 className="font-['Bebas_Neue'] text-cyan-400 text-3xl tracking-wide text-center mb-2">Recuperar Clave</h2>
                  <p className="text-xs text-slate-400 text-center mb-6">Te enviaremos un código a tu correo.</p>
                  <form onSubmit={handleRecuperar} className="flex flex-col gap-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-1.5">Tu Correo</label>
                      <input name="email" type="email" required className={inputCls} placeholder="tu@correo.com" />
                    </div>
                    <button type="submit" disabled={cargando} className={btnCls} style={btnStyle}>
                      {cargando ? 'Enviando...' : 'Enviar Código'}
                    </button>
                  </form>
                  <div className="mt-5 pt-4 border-t border-white/6">
                    <span className={linkCls} onClick={() => setVista('login')}>← Volver al login</span>
                  </div>
                </>
              )}
              {vista === 'cambiar-clave' && (
                <>
                  <h2 className="font-['Bebas_Neue'] text-cyan-400 text-3xl tracking-wide text-center mb-2">Nueva Contraseña</h2>
                  <p className="text-xs text-slate-400 text-center mb-6">Ingresá el código que recibiste por email.</p>
                  <form onSubmit={handleCambiarClave} className="flex flex-col gap-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-1.5">Código de verificación</label>
                      <input name="codigo" type="text" required className={inputCls} placeholder="123456" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-1.5">Nueva Contraseña</label>
                      <input name="nuevaPassword" type="password" required autoComplete="new-password" className={inputCls} placeholder="••••••••" />
                    </div>
                    <button type="submit" disabled={cargando} className={btnCls} style={btnStyle}>
                      {cargando ? 'Actualizando...' : 'Cambiar Contraseña'}
                    </button>
                  </form>
                  <div className="mt-5 pt-4 border-t border-white/6">
                    <span className={linkCls} onClick={() => setVista('login')}>← Volver al login</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
