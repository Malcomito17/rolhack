'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Template {
  id: string
  name: string
  description: string | null
  layout: string
}

interface Props {
  projectId: string
  initialName: string
  initialDescription: string | null
  initialEnabled: boolean
  initialTemplateId: string | null
}

export function EditProjectForm({ projectId, initialName, initialDescription, initialEnabled, initialTemplateId }: Props) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(initialName)
  const [description, setDescription] = useState(initialDescription || '')
  const [enabled, setEnabled] = useState(initialEnabled)
  const [templateId, setTemplateId] = useState<string | null>(initialTemplateId)
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Fetch templates when modal opens
  useEffect(() => {
    if (isEditing && templates.length === 0) {
      fetch('/api/templates')
        .then(res => res.json())
        .then(data => {
          if (data.templates) {
            setTemplates(data.templates)
          }
        })
        .catch(console.error)
    }
  }, [isEditing, templates.length])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, enabled, visualTemplateId: templateId }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error actualizando proyecto')
      }

      setMessage({ type: 'success', text: 'Proyecto actualizado' })
      setIsEditing(false)
      router.refresh()
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error desconocido' })
    } finally {
      setLoading(false)
    }
  }

  if (!isEditing) {
    return (
      <button
        onClick={() => setIsEditing(true)}
        className="text-gray-500 hover:text-gray-400 text-sm"
        title="Editar proyecto"
      >
        Editar
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-cyber-dark border border-cyber-primary/30 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-white mb-4">Editar Proyecto</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Nombre *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-cyber-darker border border-gray-700 rounded px-3 py-2 text-white focus:border-cyber-primary focus:outline-none"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Descripcion
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-cyber-darker border border-gray-700 rounded px-3 py-2 text-white focus:border-cyber-primary focus:outline-none resize-none"
              disabled={loading}
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 bg-cyber-darker text-cyber-primary focus:ring-cyber-primary"
                disabled={loading}
              />
              <span className="text-sm text-gray-400">Proyecto habilitado</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Plantilla Visual
            </label>
            <select
              value={templateId || ''}
              onChange={(e) => setTemplateId(e.target.value || null)}
              className="w-full bg-cyber-darker border border-gray-700 rounded px-3 py-2 text-white focus:border-cyber-primary focus:outline-none"
              disabled={loading}
            >
              <option value="">Sin plantilla (TECH por defecto)</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.layout})
                </option>
              ))}
            </select>
            <p className="text-gray-600 text-xs mt-1">
              Cambiar la plantilla no afecta las runs existentes
            </p>
          </div>

          {message && (
            <p className={`text-sm ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
              {message.text}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setIsEditing(false)
                setName(initialName)
                setDescription(initialDescription || '')
                setEnabled(initialEnabled)
                setTemplateId(initialTemplateId)
                setMessage(null)
              }}
              className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-cyber-primary text-cyber-darker hover:bg-cyber-primary/90 rounded-lg font-medium transition-colors disabled:opacity-50"
              disabled={loading || !name.trim()}
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
