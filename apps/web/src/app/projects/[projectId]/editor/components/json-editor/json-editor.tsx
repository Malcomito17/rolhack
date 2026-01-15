'use client'

import { useState, useEffect } from 'react'
import type { ProjectData } from '@/lib/engine'
import type { ValidationResult } from '@/lib/engine/validation'
import { formatErrorPath } from '@/lib/engine/validation'

interface Props {
  data: ProjectData
  validation: ValidationResult
  onDataChange: (data: ProjectData) => void
}

export function JsonEditor({ data, validation, onDataChange }: Props) {
  const [jsonText, setJsonText] = useState('')
  const [parseError, setParseError] = useState<string | null>(null)

  // Sync JSON text when data changes from outside
  useEffect(() => {
    setJsonText(JSON.stringify(data, null, 2))
    setParseError(null)
  }, [data])

  const handleTextChange = (newText: string) => {
    setJsonText(newText)

    try {
      const parsed = JSON.parse(newText)
      setParseError(null)
      onDataChange(parsed)
    } catch (e) {
      setParseError(e instanceof Error ? e.message : 'JSON inválido')
    }
  }

  const handleFormat = () => {
    try {
      const parsed = JSON.parse(jsonText)
      setJsonText(JSON.stringify(parsed, null, 2))
      setParseError(null)
    } catch {
      // Ignore format errors
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Editor JSON</h3>
        <button
          onClick={handleFormat}
          className="px-3 py-1.5 text-sm bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
        >
          Formatear
        </button>
      </div>

      {/* JSON textarea */}
      <div className="relative">
        <textarea
          value={jsonText}
          onChange={(e) => handleTextChange(e.target.value)}
          className={`
            w-full h-[500px] p-4 rounded-lg font-mono text-sm
            bg-cyber-darker border resize-none
            focus:outline-none focus:ring-1
            ${
              parseError
                ? 'border-red-500 focus:ring-red-500 text-red-300'
                : validation.valid
                  ? 'border-gray-700 focus:ring-cyber-primary text-gray-200'
                  : 'border-yellow-600 focus:ring-yellow-500 text-gray-200'
            }
          `}
          spellCheck={false}
        />
      </div>

      {/* Parse error */}
      {parseError && (
        <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-3">
          <p className="text-red-400 text-sm font-medium">Error de sintaxis JSON</p>
          <p className="text-red-400/80 text-sm mt-1">{parseError}</p>
        </div>
      )}

      {/* Validation errors */}
      {!parseError && !validation.valid && validation.errors.length > 0 && (
        <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-3">
          <p className="text-yellow-400 text-sm font-medium mb-2">
            Errores de validación ({validation.errors.length})
          </p>
          <ul className="space-y-1 max-h-40 overflow-y-auto">
            {validation.errors.map((error, index) => (
              <li key={index} className="text-sm text-yellow-400/80">
                <span className="text-yellow-500 font-mono">
                  {formatErrorPath(error.path)}
                </span>
                : {error.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Success indicator */}
      {!parseError && validation.valid && (
        <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-3">
          <p className="text-green-400 text-sm">JSON válido</p>
        </div>
      )}

      {/* Help text */}
      <div className="text-xs text-gray-500 space-y-1">
        <p><strong>Estructura requerida:</strong></p>
        <p>• <code>meta</code>: version (requerido), author, description</p>
        <p>• <code>circuits</code>: array de circuitos con nodes y links</p>
        <p>• Cada circuito debe tener al menos 1 nodo con level=0</p>
      </div>
    </div>
  )
}
