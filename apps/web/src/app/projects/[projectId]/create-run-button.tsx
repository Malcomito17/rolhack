'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  projectId: string
  hasActiveRun: boolean
}

export function CreateRunButton({ projectId, hasActiveRun }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

      router.push(`/runs/${data.runId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setLoading(false)
    }
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
