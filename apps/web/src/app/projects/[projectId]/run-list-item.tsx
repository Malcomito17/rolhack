'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { SharePanel } from '@/components/share-panel'

interface Run {
  id: string
  name: string | null
  status: string
  createdAt: string
  updatedAt: string
}

interface Props {
  run: Run
  projectName: string
  canManage?: boolean
  ownerName?: string
}

export function RunListItem({ run, projectName, canManage = false, ownerName }: Props) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(run.name || '')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const displayName = run.name || `Run ${run.id.slice(0, 8)}`

  const handleRename = async () => {
    if (!editName.trim()) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/runs/${run.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() }),
      })
      if (res.ok) {
        setIsEditing(false)
        router.refresh()
      }
    } catch (error) {
      console.error('Error renaming run:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/runs/${run.id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setShowDeleteConfirm(false)
        router.refresh()
      }
    } catch (error) {
      console.error('Error deleting run:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-cyber-dark/50 border border-gray-800 hover:border-gray-700 rounded-lg p-4 transition-colors">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="bg-cyber-darker border border-gray-700 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-cyber-primary"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename()
                    if (e.key === 'Escape') {
                      setIsEditing(false)
                      setEditName(run.name || '')
                    }
                  }}
                  disabled={isLoading}
                />
                <button
                  onClick={handleRename}
                  disabled={isLoading}
                  className="text-cyber-primary hover:text-cyber-primary/80 text-sm disabled:opacity-50"
                >
                  ✓
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false)
                    setEditName(run.name || '')
                  }}
                  disabled={isLoading}
                  className="text-gray-500 hover:text-gray-400 text-sm disabled:opacity-50"
                >
                  ✗
                </button>
              </div>
            ) : (
              <span className="text-white font-medium truncate">
                {displayName}
              </span>
            )}
            <span className={`text-xs px-2 py-0.5 rounded ${
              run.status === 'ACTIVE'
                ? 'bg-cyber-primary/20 text-cyber-primary'
                : 'bg-gray-700 text-gray-400'
            }`}>
              {run.status}
            </span>
          </div>
          <div className="flex items-center gap-3 text-gray-500 text-xs">
            {ownerName && (
              <span className="text-cyber-accent">
                {ownerName}
              </span>
            )}
            <span>
              Actualizado: {new Date(run.updatedAt).toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Management actions for OWNER/SUPERADMIN */}
          {canManage && !isEditing && (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 text-gray-500 hover:text-cyber-secondary hover:bg-cyber-secondary/10 rounded transition-colors"
                title="Renombrar"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                title="Eliminar"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </button>
            </>
          )}
          {/* Share actions (compact) */}
          <SharePanel
            runId={run.id}
            runName={run.name}
            projectName={projectName}
            variant="COMPACT"
          />
          {/* Play button */}
          <Link
            href={`/runs/${run.id}`}
            className="px-4 py-2 bg-cyber-secondary/10 border border-cyber-secondary/30 hover:bg-cyber-secondary/20 text-cyber-secondary rounded-lg text-sm font-medium transition-colors"
          >
            Jugar
          </Link>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-cyber-darker border border-gray-700 rounded-lg p-6 max-w-sm mx-4">
            <h3 className="text-white font-semibold mb-2">Eliminar run</h3>
            <p className="text-gray-400 text-sm mb-4">
              ¿Seguro que quieres eliminar &quot;{displayName}&quot;? Esta accion no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isLoading}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={isLoading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
