'use client'

interface Props {
  isDirty: boolean
  isValid: boolean
  isSaving: boolean
  message: { type: 'success' | 'error'; text: string } | null
  onSave: () => void
  onDismissMessage: () => void
}

export function SaveControls({
  isDirty,
  isValid,
  isSaving,
  message,
  onSave,
  onDismissMessage,
}: Props) {
  return (
    <div className="flex items-center gap-3">
      {/* Status indicators */}
      <div className="flex items-center gap-2 text-sm">
        {isDirty && (
          <span className="px-2 py-0.5 bg-yellow-900/30 text-yellow-400 rounded text-xs">
            Sin guardar
          </span>
        )}
        {!isValid && (
          <span className="px-2 py-0.5 bg-red-900/30 text-red-400 rounded text-xs">
            Errores
          </span>
        )}
      </div>

      {/* Save message */}
      {message && (
        <div
          className={`flex items-center gap-2 text-sm ${
            message.type === 'success' ? 'text-green-400' : 'text-red-400'
          }`}
        >
          <span>{message.text}</span>
          <button
            onClick={onDismissMessage}
            className="text-gray-500 hover:text-gray-400"
          >
            &times;
          </button>
        </div>
      )}

      {/* Save button */}
      <button
        onClick={onSave}
        disabled={!isDirty || !isValid || isSaving}
        className={`
          px-4 py-2 rounded-lg font-medium text-sm transition-colors
          ${
            isDirty && isValid
              ? 'bg-cyber-primary text-cyber-darker hover:bg-cyber-primary/90'
              : 'bg-gray-700 text-gray-400 cursor-not-allowed'
          }
          disabled:opacity-50
        `}
      >
        {isSaving ? 'Guardando...' : 'Guardar'}
      </button>
    </div>
  )
}
