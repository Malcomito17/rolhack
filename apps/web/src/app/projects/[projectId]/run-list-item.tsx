'use client'

import Link from 'next/link'
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
}

export function RunListItem({ run, projectName }: Props) {
  return (
    <div className="bg-cyber-dark/50 border border-gray-800 hover:border-gray-700 rounded-lg p-4 transition-colors">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-white font-medium truncate">
              {run.name || `Run ${run.id.slice(0, 8)}`}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded ${
              run.status === 'ACTIVE'
                ? 'bg-cyber-primary/20 text-cyber-primary'
                : 'bg-gray-700 text-gray-400'
            }`}>
              {run.status}
            </span>
          </div>
          <p className="text-gray-500 text-xs">
            Actualizado: {new Date(run.updatedAt).toLocaleDateString('es-ES', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
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
    </div>
  )
}
