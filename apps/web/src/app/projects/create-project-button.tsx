'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Template {
  id: string
  key: string
  name: string
  description: string | null
  renderer: string
}

export function CreateProjectButton() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [templateId, setTemplateId] = useState<string | null>(null)
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch templates when modal opens
  useEffect(() => {
    if (isOpen && templates.length === 0) {
      fetch('/api/templates')
        .then(res => res.json())
        .then(data => {
          if (data.templates) {
            setTemplates(data.templates)
            // Set default template
            const defaultTpl = data.templates.find((t: Template) => t.key === 'default-tech')
            if (defaultTpl) {
              setTemplateId(defaultTpl.id)
            }
          }
        })
        .catch(console.error)
    }
  }, [isOpen, templates.length])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, visualTemplateId: templateId }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error creando proyecto')
      }

      setIsOpen(false)
      setName('')
      setDescription('')
      setTemplateId(null)
      router.push(`/projects/${data.id}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-cyber-primary text-cyber-darker hover:bg-cyber-primary/90 rounded-lg font-medium transition-colors"
      >
        + Crear Proyecto
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-cyber-dark border border-cyber-primary/30 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-white mb-4">Crear Proyecto</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Nombre *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Mi Proyecto"
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
              placeholder="Descripcion del proyecto..."
              rows={3}
              className="w-full bg-cyber-darker border border-gray-700 rounded px-3 py-2 text-white focus:border-cyber-primary focus:outline-none resize-none"
              disabled={loading}
            />
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
              <option value="">Sin plantilla</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.renderer})
                </option>
              ))}
            </select>
            {templateId && templates.find(t => t.id === templateId)?.description && (
              <p className="text-gray-500 text-xs mt-1">
                {templates.find(t => t.id === templateId)?.description}
              </p>
            )}
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false)
                setName('')
                setDescription('')
                setTemplateId(null)
                setError(null)
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
              {loading ? 'Creando...' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
