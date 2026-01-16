'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Props {
  onReset?: () => void
}

export function DemoBanner({ onReset }: Props) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-green-900/90 to-cyan-900/90 border-b border-green-500/30 px-2 sm:px-4 py-2 font-mono">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-green-400 text-[10px] sm:text-xs shrink-0">[DEMO]</span>
          <span className="text-green-300/70 text-[10px] sm:text-xs hidden sm:inline truncate">
            Modo demostracion - Tu progreso no se guarda
          </span>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {onReset && (
            <button
              onClick={onReset}
              className="px-2 py-1 text-[10px] sm:text-xs border border-yellow-500/30 text-yellow-400/70 rounded hover:bg-yellow-500/10 transition-colors"
              title="Reiniciar demo"
            >
              Reset
            </button>
          )}
          <Link
            href="/auth/login"
            className="px-2 sm:px-3 py-1 bg-green-500/20 border border-green-500/50 text-green-400 rounded text-[10px] sm:text-xs hover:bg-green-500/30 transition-colors"
          >
            <span className="hidden sm:inline">Crear Cuenta</span>
            <span className="sm:hidden">Login</span>
          </Link>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 text-green-500/50 hover:text-green-400 transition-colors"
            title="Cerrar banner"
          >
            <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
