'use client'

import { usePathname, useRouter } from 'next/navigation'

const NAV = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/jugadores', label: 'Jugadores' },
  { href: '/admin/fechas', label: 'Fechas' },
  { href: '/admin/torneo', label: 'Config.' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <div className="min-h-screen" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(29,107,243,0.06) 0%, transparent 60%), #0a0e17' }}>
      <nav className="sticky top-0 z-40 border-b border-white/8" style={{ background: 'rgba(6,9,15,0.96)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-6xl mx-auto px-4 flex items-center h-12">
          <button onClick={() => router.push('/app')}
            className="flex items-center gap-2 pr-4 mr-3 border-r border-white/8 shrink-0">
            <span className="font-['Bebas_Neue'] text-base tracking-widest text-cyan-400">PANDA</span>
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-600 hidden sm:block">Admin</span>
          </button>
          <div className="flex items-center gap-0.5">
            {NAV.map(n => {
              const active = n.href === '/admin' ? pathname === '/admin' : pathname.startsWith(n.href)
              return (
                <button key={n.href} onClick={() => router.push(n.href)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${active ? 'text-white' : 'text-slate-500 hover:text-slate-200'}`}
                  style={active ? { background: 'rgba(255,255,255,0.08)' } : {}}>
                  {n.label}
                </button>
              )
            })}
          </div>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
