'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Member {
  userId: string
  email: string
  name: string | null
  role: 'OWNER' | 'USER'
  active: boolean
}

interface AvailableUser {
  id: string
  email: string
  name: string | null
  isMember: boolean
}

interface Props {
  projectId: string
  members: Member[]
  canAssignOwner: boolean
  currentUserId: string
}

export function MembersList({ projectId, members, canAssignOwner, currentUserId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [addRole, setAddRole] = useState<'USER' | 'OWNER'>('USER')
  const [adding, setAdding] = useState(false)
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)

  // Fetch available users
  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch(`/api/users?projectId=${projectId}`)
        if (res.ok) {
          const data = await res.json()
          setAvailableUsers(data.users)
        }
      } catch (err) {
        console.error('Error fetching users:', err)
      } finally {
        setLoadingUsers(false)
      }
    }
    fetchUsers()
  }, [projectId])

  // Filter out users who are already members
  const nonMemberUsers = availableUsers.filter((u) => !u.isMember)

  async function handleRoleChange(userId: string, newRole: 'OWNER' | 'USER') {
    setLoading(userId)
    setError(null)

    try {
      const res = await fetch(`/api/projects/${projectId}/members/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error')
      }

      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(null)
    }
  }

  async function handleToggleActive(userId: string, active: boolean) {
    setLoading(userId)
    setError(null)

    try {
      const res = await fetch(`/api/projects/${projectId}/members/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error')
      }

      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(null)
    }
  }

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedUserId) return

    const selectedUser = availableUsers.find((u) => u.id === selectedUserId)
    if (!selectedUser) return

    setAdding(true)
    setError(null)

    try {
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: selectedUser.email, role: addRole }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error')
      }

      setSelectedUserId('')
      // Update local state to reflect the new member
      setAvailableUsers((prev) =>
        prev.map((u) => (u.id === selectedUserId ? { ...u, isMember: true } : u))
      )
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-white mb-4">
        Miembros
      </h2>

      {/* Add member form */}
      <form onSubmit={handleAddMember} className="bg-cyber-dark/50 border border-gray-800 rounded-lg p-4 mb-6">
        <h3 className="text-sm font-medium text-gray-400 mb-3">
          Agregar miembro
        </h3>
        {loadingUsers ? (
          <p className="text-gray-500 text-sm">Cargando usuarios...</p>
        ) : nonMemberUsers.length === 0 ? (
          <p className="text-gray-500 text-sm">
            No hay usuarios disponibles para agregar. Los usuarios deben registrarse primero.
          </p>
        ) : (
          <div className="flex gap-3">
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="flex-1 bg-cyber-darker border border-gray-700 rounded px-3 py-2 text-white focus:border-cyber-primary focus:outline-none"
              disabled={adding}
            >
              <option value="">Seleccionar usuario...</option>
              {nonMemberUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name ? `${user.name} (${user.email})` : user.email}
                </option>
              ))}
            </select>
            <select
              value={addRole}
              onChange={(e) => setAddRole(e.target.value as 'USER' | 'OWNER')}
              className="bg-cyber-darker border border-gray-700 rounded px-3 py-2 text-white focus:border-cyber-primary focus:outline-none"
              disabled={adding || !canAssignOwner}
            >
              <option value="USER">USER</option>
              {canAssignOwner && <option value="OWNER">OWNER</option>}
            </select>
            <button
              type="submit"
              disabled={adding || !selectedUserId}
              className="px-4 py-2 bg-cyber-primary/20 border border-cyber-primary/30 hover:bg-cyber-primary/30 text-cyber-primary rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {adding ? '...' : 'Agregar'}
            </button>
          </div>
        )}
        {!canAssignOwner && nonMemberUsers.length > 0 && (
          <p className="text-gray-500 text-xs mt-2">
            Solo SUPERADMIN puede asignar rol OWNER
          </p>
        )}
      </form>

      {error && (
        <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-4 mb-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Members list */}
      <div className="space-y-3">
        {members.map((member) => (
          <div
            key={member.userId}
            className={`bg-cyber-dark/50 border rounded-lg p-4 ${
              member.active ? 'border-gray-800' : 'border-gray-800 opacity-50'
            }`}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">
                  {member.name || member.email}
                </p>
                {member.name && (
                  <p className="text-gray-500 text-sm truncate">
                    {member.email}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3">
                {/* Role selector */}
                <select
                  value={member.role}
                  onChange={(e) => handleRoleChange(member.userId, e.target.value as 'USER' | 'OWNER')}
                  disabled={loading === member.userId || member.userId === currentUserId || (!canAssignOwner && member.role === 'OWNER')}
                  className={`bg-cyber-darker border rounded px-2 py-1 text-sm focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                    member.role === 'OWNER'
                      ? 'border-cyber-secondary/30 text-cyber-secondary'
                      : 'border-gray-700 text-gray-300'
                  }`}
                >
                  <option value="USER">USER</option>
                  {canAssignOwner && <option value="OWNER">OWNER</option>}
                </select>

                {/* Active toggle */}
                {member.userId !== currentUserId && (
                  <button
                    onClick={() => handleToggleActive(member.userId, !member.active)}
                    disabled={loading === member.userId}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      member.active
                        ? 'bg-red-900/20 border border-red-700/30 text-red-400 hover:bg-red-900/30'
                        : 'bg-green-900/20 border border-green-700/30 text-green-400 hover:bg-green-900/30'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {member.active ? 'Desactivar' : 'Activar'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {members.length === 0 && (
        <div className="bg-cyber-dark/50 border border-gray-800 rounded-lg p-8 text-center">
          <p className="text-gray-400">No hay miembros</p>
        </div>
      )}
    </div>
  )
}
