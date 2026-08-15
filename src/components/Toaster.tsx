'use client'

import { useState, useEffect } from 'react'

type ToastType = 'success' | 'error' | 'info'
interface ToastItem { id: number; message: string; type: ToastType }

let _listeners: Array<(items: ToastItem[]) => void> = []
let _items: ToastItem[] = []
let _nextId = 0

export function toast(message: string, type: ToastType = 'info') {
  const id = _nextId++
  _items = [..._items, { id, message, type }]
  _listeners.forEach(l => l([..._items]))
  setTimeout(() => {
    _items = _items.filter(t => t.id !== id)
    _listeners.forEach(l => l([..._items]))
  }, 4000)
}

const STYLES: Record<ToastType, { bg: string; border: string; color: string; icon: string }> = {
  success: { bg: '#052e16', border: '#166534', color: '#4ade80', icon: '✅' },
  error:   { bg: '#2d0a0a', border: '#7f1d1d', color: '#f87171', icon: '❌' },
  info:    { bg: '#0f1e3a', border: '#1e3a8a', color: '#93c5fd', icon: 'ℹ️' },
}

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([])

  useEffect(() => {
    _listeners.push(setItems)
    return () => { _listeners = _listeners.filter(l => l !== setItems) }
  }, [])

  if (items.length === 0) return null

  return (
    <div
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none"
      style={{ maxWidth: 'min(380px, calc(100vw - 2rem))', width: '100%' }}
    >
      {items.map(t => {
        const s = STYLES[t.type]
        return (
          <div
            key={t.id}
            className="px-4 py-3 rounded-xl font-semibold text-sm shadow-2xl pointer-events-auto"
            style={{
              background: s.bg,
              border: `1px solid ${s.border}`,
              color: s.color,
              animation: 'panda-toast-in 0.25s ease-out',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            {s.icon} {t.message}
          </div>
        )
      })}
    </div>
  )
}
