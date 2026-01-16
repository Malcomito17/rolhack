'use client'

import { useState, useMemo } from 'react'
import type { ThemeCategory } from '@/lib/theme'

interface VisualTemplate {
  id: string
  key: string
  name: string
  description: string | null
  renderer: string
  theme: string // JSON string
  effects: string // JSON string
  isSystem: boolean
}

interface ThemeSelectorProps {
  templates: VisualTemplate[]
  selectedTemplateId?: string | null
  onSelect: (templateId: string | null) => void
  disabled?: boolean
}

/**
 * Component to select a visual template for a project
 * Displays templates in a grid grouped by category
 */
export function ThemeSelector({
  templates,
  selectedTemplateId,
  onSelect,
  disabled = false,
}: ThemeSelectorProps) {
  const [expanded, setExpanded] = useState(false)

  // Parse templates and categorize them
  const categorizedTemplates = useMemo(() => {
    const categories: Record<ThemeCategory, VisualTemplate[]> = {
      cyber: [],
      medieval: [],
      horror: [],
      minimal: [],
      custom: [],
    }

    for (const template of templates) {
      const key = template.key.toLowerCase()

      if (key.includes('medieval') || key.includes('dungeon') || key.includes('castle')) {
        categories.medieval.push(template)
      } else if (key.includes('cthulhu') || key.includes('eldritch') || key.includes('horror') || key.includes('asylum') || key.includes('madness')) {
        categories.horror.push(template)
      } else if (key.includes('minimal') || key.includes('clean') || key.includes('presentation')) {
        categories.minimal.push(template)
      } else if (!template.isSystem) {
        categories.custom.push(template)
      } else {
        categories.cyber.push(template)
      }
    }

    return categories
  }, [templates])

  // Get the currently selected template
  const selectedTemplate = templates.find(t => t.id === selectedTemplateId)

  // Parse theme to get preview colors
  const getPreviewColors = (template: VisualTemplate) => {
    try {
      const theme = JSON.parse(template.theme)
      return {
        primary: theme.primaryColor || '#00ff00',
        secondary: theme.secondaryColor || '#003300',
        background: theme.background || '#000000',
      }
    } catch {
      return {
        primary: '#00ff00',
        secondary: '#003300',
        background: '#000000',
      }
    }
  }

  // Category labels and icons
  const categoryInfo: Record<ThemeCategory, { label: string; icon: string }> = {
    cyber: { label: 'Cyberpunk', icon: '💻' },
    medieval: { label: 'Medieval', icon: '⚔️' },
    horror: { label: 'Horror', icon: '👁️' },
    minimal: { label: 'Minimal', icon: '✨' },
    custom: { label: 'Custom', icon: '🎨' },
  }

  // Only show categories with templates
  const activeCategories = (Object.keys(categorizedTemplates) as ThemeCategory[])
    .filter(cat => categorizedTemplates[cat].length > 0)

  return (
    <div className="space-y-3">
      {/* Current selection / trigger button */}
      <button
        onClick={() => setExpanded(!expanded)}
        disabled={disabled}
        className="w-full flex items-center justify-between gap-3 p-3 rounded-lg border transition-all hover:border-opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          borderColor: selectedTemplate ? getPreviewColors(selectedTemplate).primary + '66' : '#333',
          backgroundColor: selectedTemplate ? getPreviewColors(selectedTemplate).background + '22' : '#1a1a1a',
        }}
      >
        <div className="flex items-center gap-3">
          {/* Color preview */}
          {selectedTemplate && (
            <div
              className="w-8 h-8 rounded-md border"
              style={{
                background: `linear-gradient(135deg, ${getPreviewColors(selectedTemplate).primary} 0%, ${getPreviewColors(selectedTemplate).secondary} 100%)`,
                borderColor: getPreviewColors(selectedTemplate).primary + '44',
              }}
            />
          )}

          <div className="text-left">
            <p className="font-medium text-sm" style={{ color: selectedTemplate ? getPreviewColors(selectedTemplate).primary : '#888' }}>
              {selectedTemplate?.name || 'Sin tema visual'}
            </p>
            <p className="text-xs opacity-60">
              {selectedTemplate?.description || 'Selecciona un tema visual para el proyecto'}
            </p>
          </div>
        </div>

        <span className="text-xs opacity-60">
          {expanded ? '▲' : '▼'}
        </span>
      </button>

      {/* Expanded template grid */}
      {expanded && (
        <div className="space-y-4 pt-2">
          {/* Option: No template */}
          <button
            onClick={() => {
              onSelect(null)
              setExpanded(false)
            }}
            disabled={disabled}
            className={`w-full p-3 rounded-lg border text-left transition-all ${
              !selectedTemplateId ? 'border-white/30 bg-white/5' : 'border-gray-700 hover:border-gray-500'
            }`}
          >
            <p className="text-sm font-medium text-gray-400">Sin tema</p>
            <p className="text-xs text-gray-600">Usar configuración por defecto</p>
          </button>

          {/* Categories */}
          {activeCategories.map(category => (
            <div key={category} className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                <span>{categoryInfo[category].icon}</span>
                <span>{categoryInfo[category].label}</span>
                <span className="text-gray-700">({categorizedTemplates[category].length})</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {categorizedTemplates[category].map(template => {
                  const colors = getPreviewColors(template)
                  const isSelected = template.id === selectedTemplateId

                  return (
                    <button
                      key={template.id}
                      onClick={() => {
                        onSelect(template.id)
                        setExpanded(false)
                      }}
                      disabled={disabled}
                      className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                        isSelected
                          ? 'ring-2 ring-offset-1 ring-offset-black'
                          : 'hover:border-opacity-80'
                      }`}
                      style={{
                        borderColor: colors.primary + (isSelected ? 'aa' : '44'),
                        backgroundColor: colors.background + '33',
                        ...(isSelected && { ringColor: colors.primary }),
                      }}
                    >
                      {/* Color preview */}
                      <div
                        className="w-10 h-10 rounded-md border flex-shrink-0"
                        style={{
                          background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                          borderColor: colors.primary + '44',
                        }}
                      />

                      <div className="min-w-0 flex-1">
                        <p
                          className="font-medium text-sm truncate"
                          style={{ color: colors.primary }}
                        >
                          {template.name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {template.renderer === 'IMMERSIVE' ? 'Inmersivo' : 'Técnico'}
                        </p>
                      </div>

                      {isSelected && (
                        <span style={{ color: colors.primary }}>✓</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
