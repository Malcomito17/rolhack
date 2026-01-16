'use client'

import Link from 'next/link'

interface Props {
  onContinueDemo: () => void
  onReset: () => void
}

export function CompletionModal({ onContinueDemo, onReset }: Props) {
  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 font-mono">
      <div className="bg-cyber-dark border border-green-500/50 rounded-lg p-6 sm:p-8 max-w-md w-full text-center shadow-lg shadow-green-500/20">
        {/* Success icon */}
        <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/50 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        {/* Title */}
        <h2 className="text-xl sm:text-2xl font-bold text-green-400 mb-2">
          Tutorial Completado!
        </h2>

        {/* Subtitle */}
        <p className="text-gray-400 text-sm sm:text-base mb-6">
          Ahora conoces las mecanicas basicas de RolHack.
        </p>

        {/* Benefits list */}
        <div className="text-left bg-black/30 rounded-lg p-4 mb-6">
          <p className="text-green-400/80 text-xs mb-3">Crea una cuenta para:</p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2 text-gray-300">
              <span className="text-green-400">+</span>
              Guardar tu progreso
            </li>
            <li className="flex items-center gap-2 text-gray-300">
              <span className="text-green-400">+</span>
              Acceder a proyectos completos
            </li>
            <li className="flex items-center gap-2 text-gray-300">
              <span className="text-green-400">+</span>
              Crear tus propios escenarios
            </li>
            <li className="flex items-center gap-2 text-gray-300">
              <span className="text-green-400">+</span>
              Compartir runs con otros jugadores
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onContinueDemo}
            className="flex-1 px-4 py-2.5 border border-gray-700 text-gray-400 rounded hover:border-gray-600 hover:text-gray-300 transition-colors text-sm"
          >
            Seguir explorando
          </button>
          <Link
            href="/auth/login"
            className="flex-1 px-4 py-2.5 bg-green-500/20 border border-green-500/50 text-green-400 rounded hover:bg-green-500/30 transition-colors text-sm text-center"
          >
            Crear Cuenta
          </Link>
        </div>

        {/* Reset option */}
        <button
          onClick={onReset}
          className="mt-4 text-xs text-gray-600 hover:text-gray-500 transition-colors"
        >
          Reiniciar tutorial
        </button>
      </div>
    </div>
  )
}
