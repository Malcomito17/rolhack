'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SharePanel } from '@/components/share-panel'

interface Props {
  projectId: string
  projectName: string
  hasActiveRun: boolean
}

export function CreateRunButton({ projectId, projectName, hasActiveRun }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdRun, setCreatedRun] = useState<{ id: string; name: string | null } | null>(null)

  async function handleCreate() {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/projects/${projectId}/runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al crear run')
      }

      // Show share modal instead of immediate redirect
      setCreatedRun({ id: data.runId, name: data.runName || null })
      setLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setLoading(false)
    }
  }

  function handleGoToRun() {
    if (createdRun) {
      router.push(`/runs/${createdRun.id}`)
    }
  }

  // Show share modal after run creation
  if (createdRun) {
    return (
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-cyber-dark border border-cyber-primary/30 rounded-xl p-6 max-w-md w-full shadow-2xl">
          {/* Success header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-cyber-primary/20 border border-cyber-primary/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-cyber-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Run creada</h3>
              <p className="text-sm text-gray-400">{createdRun.name || `Run ${createdRun.id.slice(0, 8)}`}</p>
            </div>
          </div>

          {/* Share panel */}
          <div className="mb-4">
            <SharePanel
              runId={createdRun.id}
              runName={createdRun.name}
              projectName={projectName}
              variant="TECH"
              expanded
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                setCreatedRun(null)
                router.refresh()
              }}
              className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
            >
              Cerrar
            </button>
            <button
              onClick={handleGoToRun}
              className="flex-1 px-4 py-2 bg-cyber-primary text-cyber-darker hover:bg-cyber-primary/90 rounded-lg font-medium transition-colors"
            >
              Jugar ahora
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={hasActiveRun ? '' : 'flex-1'}>
      <button
        onClick={handleCreate}
        disabled={loading}
        className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
          hasActiveRun
            ? 'bg-cyber-dark border border-cyber-primary/30 hover:border-cyber-primary/50 text-cyber-primary'
            : 'bg-cyber-primary text-cyber-darker hover:bg-cyber-primary/90'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {loading ? 'Creando...' : 'Nueva run'}
      </button>
      {error && (
        <p className="text-red-400 text-sm mt-2">{error}</p>
      )}
    </div>
  )
}
