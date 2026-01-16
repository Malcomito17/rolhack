'use client'

import { useState } from 'react'
import type { TimelineEvent, RunState, ProjectData, StateSnapshot } from '@/lib/engine'

// =============================================================================
// Timeline Component - Visual representation of RUN progression
// =============================================================================
// IMPORTANT: This is a UI-only feature for observation and replay.
// It does NOT modify data or allow logic rollback.
// The domain does not know about "replay" - it's purely visual.

interface TimelineProps {
  timeline: TimelineEvent[]
  projectData: ProjectData
  currentState: RunState
  // Callback when entering replay mode with a specific snapshot
  onEnterReplay: (snapshot: StateSnapshot, eventIndex: number) => void
  // Callback when exiting replay mode
  onExitReplay: () => void
  // Whether currently in replay mode
  isReplayMode: boolean
  // Current replay index (if in replay mode)
  replayIndex: number | null
  // Visual style variant
  variant: 'TECH' | 'IMMERSIVE'
  // Theme colors (for IMMERSIVE mode)
  theme?: {
    primaryColor: string
    secondaryColor: string
    textColor: string
    bgColor: string
  }
}

// Event type icons and labels
const EVENT_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  RUN_START: { icon: '▶', label: 'INICIO', color: 'text-cyber-secondary' },
  CIRCUIT_SELECTED: { icon: '◉', label: 'CIRCUITO', color: 'text-cyber-accent' },
  NODE_HACKED: { icon: '✓', label: 'HACK', color: 'text-cyber-primary' },
  NODE_BLOCKED: { icon: '✗', label: 'BLOQUEO', color: 'text-red-500' },
  LINKS_DISCOVERED: { icon: '◎', label: 'SCAN', color: 'text-cyan-400' },
  CIRCUIT_CHANGED: { icon: '⇄', label: 'CAMBIO', color: 'text-yellow-400' },
  CIRCUIT_COMPLETED: { icon: '★', label: 'COMPLETADO', color: 'text-green-400' },
  RUN_COMPLETED: { icon: '◆', label: 'FIN', color: 'text-purple-400' },
}

export function Timeline({
  timeline,
  projectData,
  currentState,
  onEnterReplay,
  onExitReplay,
  isReplayMode,
  replayIndex,
  variant,
  theme,
}: TimelineProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Format timestamp for display
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  // Get circuit name from ID
  const getCircuitName = (circuitId: string) => {
    return projectData.circuits.find(c => c.id === circuitId)?.name || circuitId.slice(0, 8)
  }

  // Navigate to a specific checkpoint
  const navigateToCheckpoint = (event: TimelineEvent, index: number) => {
    onEnterReplay(event.snapshot, index)
  }

  // Navigate forward/backward in replay mode
  const navigateReplay = (direction: 'prev' | 'next') => {
    if (replayIndex === null) return

    const newIndex = direction === 'prev' ? replayIndex - 1 : replayIndex + 1
    if (newIndex >= 0 && newIndex < timeline.length) {
      onEnterReplay(timeline[newIndex].snapshot, newIndex)
    }
  }

  // If no timeline events, don't render
  if (timeline.length === 0) return null

  // TECH variant styling
  if (variant === 'TECH') {
    return (
      <div className="bg-cyber-dark/50 border border-gray-800 rounded-lg overflow-hidden">
        {/* Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-cyber-dark/70 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-gray-500 font-mono text-xs">
              {isExpanded ? '▼' : '▶'}
            </span>
            <h3 className="text-sm font-mono font-medium text-gray-400">
              TIMELINE
            </h3>
            <span className="text-xs px-2 py-0.5 bg-gray-800 rounded text-gray-500 font-mono">
              {timeline.length} eventos
            </span>
          </div>
          {isReplayMode && (
            <span className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded font-mono animate-pulse">
              MODO REVISIÓN
            </span>
          )}
        </button>

        {/* Expanded content */}
        {isExpanded && (
          <div className="border-t border-gray-800">
            {/* Replay controls */}
            {isReplayMode && (
              <div className="px-4 py-3 bg-yellow-500/10 border-b border-yellow-500/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-yellow-400 text-xs font-mono">
                    OBSERVANDO ESTADO HISTÓRICO
                  </span>
                  <span className="text-gray-500 text-xs font-mono">
                    [{(replayIndex ?? 0) + 1}/{timeline.length}]
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigateReplay('prev')}
                    disabled={replayIndex === 0}
                    className="px-2 py-1 text-xs font-mono bg-gray-800 rounded disabled:opacity-30 hover:bg-gray-700 text-gray-400"
                  >
                    ◀ PREV
                  </button>
                  <button
                    onClick={() => navigateReplay('next')}
                    disabled={replayIndex === timeline.length - 1}
                    className="px-2 py-1 text-xs font-mono bg-gray-800 rounded disabled:opacity-30 hover:bg-gray-700 text-gray-400"
                  >
                    NEXT ▶
                  </button>
                  <button
                    onClick={onExitReplay}
                    className="px-3 py-1 text-xs font-mono bg-cyber-primary/20 text-cyber-primary rounded hover:bg-cyber-primary/30"
                  >
                    VOLVER A ACTUAL
                  </button>
                </div>
              </div>
            )}

            {/* Timeline events */}
            <div className="max-h-64 overflow-y-auto">
              {timeline.map((event, index) => {
                const config = EVENT_CONFIG[event.type] || { icon: '•', label: event.type, color: 'text-gray-400' }
                const isCurrentReplay = isReplayMode && replayIndex === index
                const isLatest = index === timeline.length - 1 && !isReplayMode

                return (
                  <button
                    key={event.id}
                    onClick={() => navigateToCheckpoint(event, index)}
                    className={`w-full px-4 py-2 flex items-center gap-3 text-left transition-colors ${
                      isCurrentReplay
                        ? 'bg-yellow-500/20 border-l-2 border-yellow-400'
                        : isLatest
                        ? 'bg-cyber-primary/10 border-l-2 border-cyber-primary'
                        : 'hover:bg-gray-800/50 border-l-2 border-transparent'
                    }`}
                  >
                    {/* Timeline connector */}
                    <div className="relative flex flex-col items-center">
                      <span className={`text-lg ${config.color}`}>{config.icon}</span>
                      {index < timeline.length - 1 && (
                        <div className="absolute top-6 w-px h-4 bg-gray-700" />
                      )}
                    </div>

                    {/* Event info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-mono font-bold ${config.color}`}>
                          {config.label}
                        </span>
                        <span className="text-xs text-gray-600 font-mono">
                          {formatTime(event.timestamp)}
                        </span>
                        {isLatest && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-cyber-primary/20 text-cyber-primary rounded font-mono">
                            ACTUAL
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        {event.description}
                      </p>
                    </div>

                    {/* Circuit badge */}
                    <span className="text-[10px] px-2 py-0.5 bg-gray-800 text-gray-500 rounded font-mono shrink-0">
                      {getCircuitName(event.circuitId)}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Footer info */}
            <div className="px-4 py-2 border-t border-gray-800 bg-gray-900/50">
              <p className="text-[10px] text-gray-600 font-mono">
                Selecciona un evento para observar el estado en ese momento.
                No se pueden modificar decisiones pasadas.
              </p>
            </div>
          </div>
        )}
      </div>
    )
  }

  // IMMERSIVE variant styling
  const primaryColor = theme?.primaryColor || '#00ff00'
  const textColor = theme?.textColor || '#00ff00'
  const bgColor = theme?.bgColor || '#000000'

  return (
    <div
      className="rounded overflow-hidden"
      style={{ border: `1px solid ${primaryColor}33`, backgroundColor: `${bgColor}ee` }}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2 flex items-center justify-between text-left transition-opacity hover:opacity-80"
        style={{ color: primaryColor }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs opacity-60">{isExpanded ? '[−]' : '[+]'}</span>
          <span className="text-xs font-mono">EVENT_LOG</span>
          <span className="text-[10px] opacity-60">[{timeline.length}]</span>
        </div>
        {isReplayMode && (
          <span
            className="text-[10px] px-2 py-0.5 rounded animate-pulse"
            style={{ backgroundColor: `${primaryColor}33`, color: '#ffaa00' }}
          >
            &gt; REPLAY MODE
          </span>
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div style={{ borderTop: `1px solid ${primaryColor}22` }}>
          {/* Replay controls */}
          {isReplayMode && (
            <div
              className="px-4 py-2 flex items-center justify-between"
              style={{ backgroundColor: `${primaryColor}11`, borderBottom: `1px solid ${primaryColor}22` }}
            >
              <span className="text-[10px] font-mono" style={{ color: '#ffaa00' }}>
                &gt; OBSERVING HISTORICAL STATE [{(replayIndex ?? 0) + 1}/{timeline.length}]
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigateReplay('prev')}
                  disabled={replayIndex === 0}
                  className="px-2 py-0.5 text-[10px] font-mono rounded disabled:opacity-30"
                  style={{ border: `1px solid ${primaryColor}44`, color: primaryColor }}
                >
                  [&lt;]
                </button>
                <button
                  onClick={() => navigateReplay('next')}
                  disabled={replayIndex === timeline.length - 1}
                  className="px-2 py-0.5 text-[10px] font-mono rounded disabled:opacity-30"
                  style={{ border: `1px solid ${primaryColor}44`, color: primaryColor }}
                >
                  [&gt;]
                </button>
                <button
                  onClick={onExitReplay}
                  className="px-2 py-0.5 text-[10px] font-mono rounded"
                  style={{ backgroundColor: `${primaryColor}33`, color: primaryColor }}
                >
                  [EXIT]
                </button>
              </div>
            </div>
          )}

          {/* Timeline events */}
          <div className="max-h-48 overflow-y-auto font-mono text-[11px]">
            {timeline.map((event, index) => {
              const config = EVENT_CONFIG[event.type] || { icon: '•', label: event.type, color: '' }
              const isCurrentReplay = isReplayMode && replayIndex === index
              const isLatest = index === timeline.length - 1 && !isReplayMode

              return (
                <button
                  key={event.id}
                  onClick={() => navigateToCheckpoint(event, index)}
                  className="w-full px-4 py-1.5 flex items-center gap-2 text-left transition-colors"
                  style={{
                    backgroundColor: isCurrentReplay
                      ? `${primaryColor}22`
                      : isLatest
                      ? `${primaryColor}11`
                      : 'transparent',
                    borderLeft: isCurrentReplay || isLatest
                      ? `2px solid ${isCurrentReplay ? '#ffaa00' : primaryColor}`
                      : '2px solid transparent',
                    color: textColor,
                  }}
                >
                  <span style={{ opacity: 0.5 }}>{formatTime(event.timestamp)}</span>
                  <span style={{ color: isCurrentReplay ? '#ffaa00' : primaryColor }}>
                    {config.icon}
                  </span>
                  <span className="truncate flex-1" style={{ opacity: 0.8 }}>
                    {event.description}
                  </span>
                  {isLatest && (
                    <span style={{ color: primaryColor, opacity: 0.6 }}>[NOW]</span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Footer */}
          <div
            className="px-4 py-1.5"
            style={{ borderTop: `1px solid ${primaryColor}22`, opacity: 0.4 }}
          >
            <p className="text-[9px] font-mono" style={{ color: textColor }}>
              &gt; SELECT EVENT TO OBSERVE. READ-ONLY MODE.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Replay Indicator - Shows when viewing historical state
// =============================================================================

interface ReplayIndicatorProps {
  isReplayMode: boolean
  replayIndex: number | null
  totalEvents: number
  currentEvent?: TimelineEvent
  onExitReplay: () => void
  variant: 'TECH' | 'IMMERSIVE'
  theme?: {
    primaryColor: string
  }
}

export function ReplayIndicator({
  isReplayMode,
  replayIndex,
  totalEvents,
  currentEvent,
  onExitReplay,
  variant,
  theme,
}: ReplayIndicatorProps) {
  if (!isReplayMode || !currentEvent) return null

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  if (variant === 'TECH') {
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 duration-300">
        <div className="bg-yellow-500/20 backdrop-blur-sm border border-yellow-500/50 rounded-lg px-6 py-3 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-yellow-400 text-lg animate-pulse">◉</span>
              <span className="text-yellow-400 font-mono text-sm font-bold">
                MODO REVISIÓN
              </span>
            </div>
            <div className="h-4 w-px bg-yellow-500/30" />
            <div className="text-yellow-400/70 font-mono text-xs">
              <span>{formatTime(currentEvent.timestamp)}</span>
              <span className="mx-2">•</span>
              <span>{currentEvent.description.slice(0, 30)}...</span>
            </div>
            <div className="h-4 w-px bg-yellow-500/30" />
            <span className="text-yellow-400/50 font-mono text-xs">
              [{(replayIndex ?? 0) + 1}/{totalEvents}]
            </span>
            <button
              onClick={onExitReplay}
              className="px-3 py-1 bg-yellow-500/30 hover:bg-yellow-500/50 text-yellow-400 rounded font-mono text-xs transition-colors"
            >
              VOLVER A ACTUAL
            </button>
          </div>
          <p className="text-yellow-400/50 text-[10px] font-mono mt-2 text-center">
            Estado de solo lectura - Las acciones están deshabilitadas
          </p>
        </div>
      </div>
    )
  }

  // IMMERSIVE variant
  const primaryColor = theme?.primaryColor || '#00ff00'

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 duration-300">
      <div
        className="backdrop-blur-sm rounded px-4 py-2 font-mono"
        style={{
          backgroundColor: '#000000ee',
          border: `1px solid #ffaa00`,
          boxShadow: `0 0 20px #ffaa0033`
        }}
      >
        <div className="flex items-center gap-3">
          <span className="text-yellow-500 animate-pulse">[◉]</span>
          <span className="text-yellow-500 text-xs">&gt; REPLAY_MODE</span>
          <span className="text-yellow-500/60 text-[10px]">
            {formatTime(currentEvent.timestamp)}
          </span>
          <span className="text-yellow-500/50 text-[10px]">
            [{(replayIndex ?? 0) + 1}/{totalEvents}]
          </span>
          <button
            onClick={onExitReplay}
            className="px-2 py-0.5 text-[10px] rounded"
            style={{ backgroundColor: `${primaryColor}44`, color: primaryColor }}
          >
            [ESC] EXIT
          </button>
        </div>
      </div>
    </div>
  )
}
