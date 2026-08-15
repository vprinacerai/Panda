'use client'

interface Props {
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({ title, message, confirmLabel = 'Confirmar', danger = false, onConfirm, onCancel }: Props) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="w-full max-w-sm bg-[#111827] rounded-2xl border border-white/10 p-6 shadow-2xl">
        <div className="flex items-start gap-3 mb-4">
          <span className="text-2xl flex-shrink-0">{danger ? '⚠️' : 'ℹ️'}</span>
          <div>
            <h3 className="font-['Bebas_Neue'] text-xl text-white tracking-wide leading-tight">{title}</h3>
            <p className="text-sm text-slate-400 mt-1">{message}</p>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-400 transition-colors hover:text-white"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:brightness-110"
            style={danger
              ? { background: 'linear-gradient(135deg,#dc2626,#b91c1c)', boxShadow: '0 2px 12px rgba(220,38,38,0.35)' }
              : { background: 'linear-gradient(135deg,#1d6bf3,#0d4fd4)', boxShadow: '0 2px 12px rgba(29,107,243,0.35)' }
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
