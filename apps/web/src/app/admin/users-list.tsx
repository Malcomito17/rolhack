'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  email: string
  name: string | null
  image: string | null
  roleGlobal: string
  createdAt: string
  projectCount: number
  runCount: number
}

interface Props {
  users: User[]
  currentUserId: string
}

export function UsersList({ users, currentUserId }: Props) {
  const router = useRouter()
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  async function handleDelete(userId: string) {
    setDeleting(userId)
    setError(null)

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error')
      }

      setConfirmDelete(null)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-white mb-4">
        Usuarios ({users.length})
      </h2>

      {error && (
        <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-4 mb-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {users.length === 0 ? (
        <div className="bg-cyber-dark/50 border border-gray-800 rounded-lg p-8 text-center">
          <p className="text-gray-400">No hay usuarios</p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <div
              key={user.id}
              className="bg-cyber-dark/50 border border-gray-800 hover:border-gray-700 rounded-lg p-4 transition-colors"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {user.image ? (
                    <img
                      src={user.image}
                      alt=""
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-gray-400 text-sm">
                      {user.email[0].toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-medium truncate">
                        {user.name || user.email}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          user.roleGlobal === 'SUPERADMIN'
                            ? 'bg-cyber-accent/20 text-cyber-accent'
                            : 'bg-gray-700 text-gray-400'
                        }`}
                      >
                        {user.roleGlobal}
                      </span>
                    </div>
                    <p className="text-gray-500 text-sm truncate">
                      {user.email}
                    </p>
                    <p className="text-gray-600 text-xs mt-1">
                      {user.projectCount} proyectos &middot; {user.runCount} runs
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {user.id !== currentUserId && user.roleGlobal !== 'SUPERADMIN' && (
                    <>
                      {confirmDelete === user.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-red-400 text-xs">Confirmar?</span>
                          <button
                            onClick={() => handleDelete(user.id)}
                            disabled={deleting === user.id}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded font-medium disabled:opacity-50 transition-colors"
                          >
                            {deleting === user.id ? '...' : 'Si'}
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            disabled={deleting === user.id}
                            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded font-medium disabled:opacity-50 transition-colors"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDelete(user.id)}
                          className="px-3 py-1 bg-red-900/20 border border-red-700/30 hover:bg-red-900/30 text-red-400 text-xs rounded font-medium transition-colors"
                        >
                          Eliminar
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
