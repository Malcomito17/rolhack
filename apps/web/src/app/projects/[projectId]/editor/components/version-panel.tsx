'use client'

import type { VersionInfo } from '../editor-container'

interface Props {
  versions: VersionInfo[]
  activeVersionId: string | null
  onActivateVersion: (versionId: string) => void
  isLoading: boolean
}

export function VersionPanel({
  versions,
  activeVersionId,
  onActivateVersion,
  isLoading,
}: Props) {
  return (
    <div className="bg-cyber-dark/50 border border-gray-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-cyber-secondary mb-4">
        Versiones
      </h3>

      {versions.length === 0 ? (
        <p className="text-sm text-gray-500">
          No hay versiones guardadas. Guarda tu primera version.
        </p>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {versions.map((version) => (
            <div
              key={version.id}
              className={`
                p-3 rounded-lg border transition-colors
                ${
                  version.isActive
                    ? 'bg-cyber-primary/10 border-cyber-primary/30'
                    : 'bg-cyber-darker/50 border-gray-800 hover:border-gray-700'
                }
              `}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-white">
                  v{version.version}
                </span>
                {version.isActive && (
                  <span className="px-2 py-0.5 text-xs bg-cyber-primary/20 text-cyber-primary rounded">
                    Activa
                  </span>
                )}
              </div>

              <div className="text-xs text-gray-500 space-y-1">
                <p>
                  {new Date(version.createdAt).toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
                {version.runsCount > 0 && (
                  <p className="text-gray-400">
                    {version.runsCount} run{version.runsCount > 1 ? 's' : ''}
                  </p>
                )}
              </div>

              {!version.isActive && (
                <button
                  onClick={() => onActivateVersion(version.id)}
                  disabled={isLoading}
                  className="
                    mt-2 w-full py-1.5 text-xs rounded
                    bg-gray-700 text-gray-300 hover:bg-gray-600
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-colors
                  "
                >
                  Activar
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
