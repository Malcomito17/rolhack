'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  projectId: string
  projectName: string
  runCount: number
}

// SVG Icons for admin actions
const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
)

const ClearIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
)

const WarningIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
)

export function AdminProjectActions({ projectId, projectName, runCount }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/admin/projects/${projectId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error')
      }

      router.refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar')
    } finally {
      setLoading(false)
      setConfirmDelete(false)
    }
  }

  async function handleClearRuns() {
    if (!confirmClear) {
      setConfirmClear(true)
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/admin/projects/${projectId}/clear-runs`, {
        method: 'POST',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error')
      }

      router.refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al limpiar')
    } finally {
      setLoading(false)
      setConfirmClear(false)
    }
  }

  // Confirmation dialog state
  const showConfirmation = confirmDelete || confirmClear

  if (showConfirmation) {
    return (
      <div className="flex items-center gap-2 p-2 bg-red-950/50 border border-red-500/50 rounded-lg animate-pulse">
        <WarningIcon />
        <span className="text-red-300 text-xs font-medium">
          {confirmDelete ? `Eliminar "${projectName}"?` : `Limpiar ${runCount} runs?`}
        </span>
        <button
          onClick={confirmDelete ? handleDelete : handleClearRuns}
          disabled={loading}
          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded transition-colors disabled:opacity-50"
        >
          {loading ? '...' : 'SI, CONFIRMAR'}
        </button>
        <button
          onClick={() => {
            setConfirmDelete(false)
            setConfirmClear(false)
          }}
          className="px-2 py-1 text-xs text-gray-400 hover:text-white transition-colors"
        >
          Cancelar
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {/* SUPERADMIN badge */}
      <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-900/30 text-purple-400 border border-purple-700/30 rounded">
        ADMIN
      </span>

      {/* Clear runs button */}
      {runCount > 0 && (
        <button
          onClick={handleClearRuns}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded transition-all bg-orange-900/20 border border-orange-700/30 hover:bg-orange-900/40 hover:border-orange-500/50 text-orange-400 disabled:opacity-50"
          title={`Eliminar todas las ${runCount} runs de este proyecto`}
        >
          <ClearIcon />
          <span>Limpiar ({runCount})</span>
        </button>
      )}

      {/* Delete button */}
      <button
        onClick={handleDelete}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded transition-all bg-red-900/20 border border-red-700/30 hover:bg-red-900/40 hover:border-red-500/50 text-red-400 disabled:opacity-50"
        title="Eliminar proyecto permanentemente"
      >
        <TrashIcon />
        <span>Eliminar</span>
      </button>
    </div>
  )
}
