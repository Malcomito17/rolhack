'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  projectId: string
  projectName: string
  runCount: number
}

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

  return (
    <div className="flex items-center gap-2">
      {/* Clear runs button */}
      {runCount > 0 && (
        <button
          onClick={handleClearRuns}
          disabled={loading}
          className={`px-3 py-1.5 text-xs rounded transition-colors ${
            confirmClear
              ? 'bg-orange-600 hover:bg-orange-700 text-white'
              : 'bg-orange-900/20 border border-orange-700/30 hover:bg-orange-900/40 text-orange-400'
          } disabled:opacity-50`}
          title="Eliminar todas las runs"
        >
          {loading ? '...' : confirmClear ? 'Confirmar?' : `Limpiar runs (${runCount})`}
        </button>
      )}

      {/* Delete button */}
      <button
        onClick={handleDelete}
        disabled={loading}
        className={`px-3 py-1.5 text-xs rounded transition-colors ${
          confirmDelete
            ? 'bg-red-600 hover:bg-red-700 text-white'
            : 'bg-red-900/20 border border-red-700/30 hover:bg-red-900/40 text-red-400'
        } disabled:opacity-50`}
        title="Eliminar proyecto"
      >
        {loading ? '...' : confirmDelete ? 'Confirmar?' : 'Eliminar'}
      </button>

      {/* Cancel buttons */}
      {(confirmDelete || confirmClear) && (
        <button
          onClick={() => {
            setConfirmDelete(false)
            setConfirmClear(false)
          }}
          className="px-2 py-1.5 text-xs text-gray-400 hover:text-white"
        >
          Cancelar
        </button>
      )}
    </div>
  )
}
