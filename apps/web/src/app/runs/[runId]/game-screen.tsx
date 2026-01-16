'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import type { ProjectData, RunState, Warning, NodeDefinition, CircuitDefinition, StateSnapshot } from '@/lib/engine'
import { ImmersiveView } from './immersive-view'
import { Timeline, ReplayIndicator } from './timeline'
import { AuditView } from './audit-view'
import { SharePanel } from '@/components/share-panel'

interface VisualTemplate {
  renderer: 'TECH' | 'IMMERSIVE'
  theme: Record<string, string>
  components: {
    showNodeMap: boolean
    showSidePanel: boolean
    showCentralTerminal: boolean
  }
  effects: {
    scanlines: boolean
    glitch: boolean
    flicker: boolean
    neonGlow?: boolean
    matrixRain?: boolean
    crtCurve?: boolean
    warningPulse?: boolean
    radarSweep?: boolean
  }
}

interface Props {
  runId: string
  projectId: string
  projectName: string
  runName: string | null
  initialState: RunState
  projectData: ProjectData
  visualTemplate: VisualTemplate
  createdAt: string
  // Permission flags for audit/export features
  canExport?: boolean
  isSuperAdmin?: boolean
}

export function GameScreen({
  runId,
  projectId,
  projectName,
  runName,
  initialState,
  projectData,
  visualTemplate,
  createdAt,
  canExport = false,
  isSuperAdmin = false,
}: Props) {
  // =============================================================================
  // ALL HOOKS MUST BE AT THE TOP - React rules of hooks
  // =============================================================================
  const [state, setState] = useState<RunState>(initialState)
  const [viewModeOverride, setViewModeOverride] = useState<'TECH' | 'IMMERSIVE' | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)
  const [hackInput, setHackInput] = useState('')
  const [showCircuitSelector, setShowCircuitSelector] = useState(false)
  const [isReplayMode, setIsReplayMode] = useState(false)
  const [replayIndex, setReplayIndex] = useState<number | null>(null)
  const [replaySnapshot, setReplaySnapshot] = useState<StateSnapshot | null>(null)
  const [showAuditView, setShowAuditView] = useState(false)

  // Determine active view mode (override or default from template)
  const activeViewMode = viewModeOverride ?? visualTemplate.renderer

  // Toggle view mode
  const toggleViewMode = () => {
    setViewModeOverride(activeViewMode === 'TECH' ? 'IMMERSIVE' : 'TECH')
  }

  // Default IMMERSIVE theme/effects (used when switching from TECH template)
  const defaultImmersiveTheme = {
    primaryColor: '#00ff00',
    secondaryColor: '#003300',
    accentColor: '#00ff00',
    textColor: '#00ff00',
    background: '#000000',
  }

  const defaultImmersiveEffects = {
    scanlines: true,
    glitch: false,
    flicker: false,
    neonGlow: false,
    matrixRain: false,
    crtCurve: false,
    warningPulse: false,
    radarSweep: false,
  }

  // =============================================================================
  // ALL REMAINING HOOKS AND COMPUTED VALUES (MUST BE BEFORE CONDITIONAL RETURN)
  // =============================================================================

  // Enter replay mode with a specific snapshot
  const enterReplayMode = useCallback((snapshot: StateSnapshot, eventIndex: number) => {
    setReplaySnapshot(snapshot)
    setReplayIndex(eventIndex)
    setIsReplayMode(true)
    setSelectedNodeId(null)
  }, [])

  // Exit replay mode - return to current actual state
  const exitReplayMode = useCallback(() => {
    setReplaySnapshot(null)
    setReplayIndex(null)
    setIsReplayMode(false)
  }, [])

  // Get the state to display (actual or replay snapshot)
  // IMPORTANT: This is for UI display only - actual state is never modified by replay
  const displayState = isReplayMode && replaySnapshot
    ? { ...state, position: replaySnapshot.position, nodes: replaySnapshot.nodes, links: replaySnapshot.links }
    : state

  // Get current circuit (used by both views)
  const currentCircuit = projectData.circuits.find(c => c.id === displayState.position.circuitId)
  const currentNode = currentCircuit?.nodes.find(n => n.id === displayState.position.nodeId)
  const currentNodeState = displayState.nodes[displayState.position.nodeId]

  // Check if hidden links available (uses displayState for UI)
  const hasHiddenLinks = useCallback(() => {
    if (!currentCircuit) return false
    const nodeId = displayState.position.nodeId

    return currentCircuit.links.some(link => {
      const isFromNode = link.from === nodeId || (link.bidirectional !== false && link.to === nodeId)
      if (!isFromNode) return false
      const linkState = displayState.links[link.id]
      return link.hidden && linkState && !linkState.descubierto
    })
  }, [currentCircuit, displayState])

  // Get available moves (uses displayState for UI representation)
  const getAvailableMoveIds = useCallback((): { fastTravel: string[]; advance: string[]; all: string[] } => {
    if (!currentCircuit) return { fastTravel: [], advance: [], all: [] }

    const currentNodeId = displayState.position.nodeId
    const fastTravel: string[] = []
    const advance: string[] = []

    const currentNodeStateLocal = displayState.nodes[currentNodeId]
    const currentIsHacked = currentNodeStateLocal?.hackeado === true

    // Collect all hacked nodes (fast-travel targets)
    for (const node of currentCircuit.nodes) {
      if (node.id === currentNodeId) continue
      const nodeState = displayState.nodes[node.id]
      if (!nodeState) continue
      if (nodeState.inaccesible || nodeState.bloqueado) continue

      if (nodeState.hackeado) {
        fastTravel.push(node.id)
      }
    }

    // If current node is hacked, collect linked non-hacked nodes (advance targets)
    if (currentIsHacked) {
      for (const link of currentCircuit.links) {
        const linkState = displayState.links[link.id]
        if (!linkState?.descubierto || linkState.inaccesible) continue

        let targetId: string | null = null
        if (link.from === currentNodeId) {
          targetId = link.to
        } else if (link.bidirectional !== false && link.to === currentNodeId) {
          targetId = link.from
        }

        if (targetId) {
          const targetState = displayState.nodes[targetId]
          if (
            targetState &&
            targetState.descubierto &&
            !targetState.inaccesible &&
            !targetState.bloqueado &&
            !targetState.hackeado &&
            !advance.includes(targetId)
          ) {
            advance.push(targetId)
          }
        }
      }
    }

    return { fastTravel, advance, all: [...fastTravel, ...advance] }
  }, [currentCircuit, displayState])

  // Merge template with defaults for IMMERSIVE view
  const immersiveTheme = { ...defaultImmersiveTheme, ...visualTemplate.theme }
  const immersiveEffects = { ...defaultImmersiveEffects, ...visualTemplate.effects }

  // =============================================================================
  // CONDITIONAL RETURN FOR IMMERSIVE VIEW (AFTER ALL HOOKS)
  // =============================================================================
  if (activeViewMode === 'IMMERSIVE') {
    return (
      <ImmersiveView
        runId={runId}
        projectId={projectId}
        projectName={projectName}
        runName={runName}
        state={state}
        projectData={projectData}
        theme={immersiveTheme}
        effects={immersiveEffects}
        onStateChange={setState}
        onToggleView={toggleViewMode}
        createdAt={createdAt}
        canExport={canExport}
        isSuperAdmin={isSuperAdmin}
      />
    )
  }

  // =============================================================================
  // TECH VIEW CONTINUES BELOW (NON-HOOK CODE)
  // =============================================================================

  // Check if there are multiple circuits
  const hasMultipleCircuits = projectData.circuits.length > 1

  // Circuit status type
  type CircuitStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'ADVANCED' | 'COMPLETED' | 'BLOCKED'

  // Get circuit summary for selector with detailed status
  const getCircuitSummary = () => {
    return projectData.circuits.map((circuit) => {
      let hackedCount = 0
      let blockedCount = 0
      let discoveredCount = 0

      for (const node of circuit.nodes) {
        const nodeState = state.nodes[node.id]
        if (nodeState) {
          if (nodeState.hackeado) hackedCount++
          if (nodeState.bloqueado) blockedCount++
          if (nodeState.descubierto) discoveredCount++
        }
      }

      const totalNodes = circuit.nodes.length
      const progress = totalNodes > 0 ? Math.round((hackedCount / totalNodes) * 100) : 0
      const hasAnyActivity = hackedCount > 0 || blockedCount > 0

      // Determine circuit status
      let status: CircuitStatus = 'NOT_STARTED'
      if (hackedCount === totalNodes) {
        status = 'COMPLETED'
      } else if (blockedCount > 0 && hackedCount === 0) {
        status = 'BLOCKED'
      } else if (hackedCount > totalNodes * 0.5) {
        status = 'ADVANCED'
      } else if (hasAnyActivity) {
        status = 'IN_PROGRESS'
      }

      return {
        id: circuit.id,
        name: circuit.name,
        description: circuit.description,
        isActive: circuit.id === state.position.circuitId,
        nodeCount: totalNodes,
        hackedCount,
        blockedCount,
        discoveredCount,
        progress,
        status,
        hasProgress: hasAnyActivity,
      }
    })
  }

  // Get contextual hint for circuit
  const getCircuitHint = (circuitSummary: ReturnType<typeof getCircuitSummary>[0]) => {
    if (circuitSummary.isActive) return null

    if (circuitSummary.status === 'COMPLETED') {
      return { type: 'info' as const, text: 'Circuito completado' }
    }
    if (circuitSummary.status === 'BLOCKED') {
      return { type: 'warning' as const, text: 'Nodos bloqueados detectados' }
    }
    if (circuitSummary.status === 'ADVANCED') {
      return { type: 'info' as const, text: 'Progreso significativo' }
    }
    if (circuitSummary.status === 'IN_PROGRESS') {
      return { type: 'info' as const, text: 'Exploración parcial' }
    }
    return null
  }

  // Get status badge config
  const getStatusBadge = (status: CircuitStatus) => {
    switch (status) {
      case 'COMPLETED':
        return { label: 'COMPLETE', color: 'bg-green-500/20 text-green-400 border-green-500/30' }
      case 'ADVANCED':
        return { label: 'ADVANCED', color: 'bg-cyber-primary/20 text-cyber-primary border-cyber-primary/30' }
      case 'IN_PROGRESS':
        return { label: 'IN PROGRESS', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' }
      case 'BLOCKED':
        return { label: 'BLOCKED', color: 'bg-red-500/20 text-red-400 border-red-500/30' }
      default:
        return { label: 'NEW', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' }
    }
  }

  // Switch circuit handler
  async function doSwitchCircuit(targetCircuitId: string) {
    if (targetCircuitId === state.position.circuitId) {
      setShowCircuitSelector(false)
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const res = await fetch(`/api/runs/${runId}/switch-circuit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetCircuitId }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error')
      }

      await refreshState()
      setSelectedNodeId(null)
      setShowCircuitSelector(false)

      setMessage({
        type: data.success ? 'success' : 'error',
        text: data.message,
      })
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error desconocido',
      })
    } finally {
      setLoading(false)
    }
  }

  const availableMoves = getAvailableMoveIds()
  const accessibleNodes = availableMoves.all

  // API calls
  async function doHack() {
    if (!hackInput) return
    setLoading(true)
    setMessage(null)

    try {
      // PROMPT 7: No longer send nodeId - hack always applies to current position
      const res = await fetch(`/api/runs/${runId}/hack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputValue: parseInt(hackInput, 10),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error')
      }

      // Refetch run state
      await refreshState()

      setMessage({
        type: data.success ? 'success' : 'error',
        text: data.message,
      })
      setHackInput('')
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error desconocido',
      })
    } finally {
      setLoading(false)
    }
  }

  async function doDiscover() {
    setLoading(true)
    setMessage(null)

    try {
      const res = await fetch(`/api/runs/${runId}/discover`, {
        method: 'POST',
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error')
      }

      await refreshState()

      setMessage({
        type: data.discoveredLinks.length > 0 ? 'success' : 'info',
        text: data.message,
      })
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error desconocido',
      })
    } finally {
      setLoading(false)
    }
  }

  async function doMove(targetNodeId: string) {
    setLoading(true)
    setMessage(null)

    try {
      const res = await fetch(`/api/runs/${runId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetNodeId }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error')
      }

      await refreshState()
      setSelectedNodeId(null)

      setMessage({
        type: data.success ? 'success' : 'error',
        text: data.message,
      })
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error desconocido',
      })
    } finally {
      setLoading(false)
    }
  }

  async function refreshState() {
    const res = await fetch(`/api/runs/${runId}`)
    const data = await res.json()
    if (res.ok && data.state) {
      setState(data.state)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Replay Mode Indicator - fixed at top when in replay mode */}
      <ReplayIndicator
        isReplayMode={isReplayMode}
        replayIndex={replayIndex}
        totalEvents={state.timeline?.length || 0}
        currentEvent={replayIndex !== null ? state.timeline?.[replayIndex] : undefined}
        onExitReplay={exitReplayMode}
        variant="TECH"
      />

      {/* Header */}
      <header className="bg-cyber-dark border-b border-cyber-primary/20 p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <Link
              href={`/projects/${projectId}`}
              className="text-gray-500 hover:text-gray-400 text-xs mb-1 inline-block"
            >
              &larr; Volver al proyecto
            </Link>
            <h1 className="text-lg font-bold text-cyber-primary">
              {projectName}
            </h1>
            <p className="text-gray-500 text-sm">
              {runName || `Run ${runId.slice(0, 8)}`}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Share panel (compact) */}
            <SharePanel
              runId={runId}
              runName={runName}
              projectName={projectName}
              variant="COMPACT"
            />
            {/* Audit view button */}
            <button
              onClick={() => setShowAuditView(true)}
              className="px-3 py-1.5 text-xs font-mono bg-cyber-dark border border-cyber-accent/30 hover:border-cyber-accent/60 text-cyber-accent rounded transition-colors"
              title="Ver auditoría del run"
            >
              AUDIT
            </button>
            {/* View mode toggle */}
            <button
              onClick={toggleViewMode}
              className="px-3 py-1.5 text-xs font-mono bg-cyber-dark border border-cyber-secondary/30 hover:border-cyber-secondary/60 text-cyber-secondary rounded transition-colors"
              title="Cambiar modo de vista"
            >
              {activeViewMode === 'TECH' ? '[ ] IMMERSIVE' : '[x] IMMERSIVE'}
            </button>
            {/* Circuit selector button */}
            {hasMultipleCircuits ? (
              <button
                onClick={() => setShowCircuitSelector(!showCircuitSelector)}
                className={`text-right px-3 py-1.5 rounded border transition-colors ${
                  showCircuitSelector
                    ? 'bg-cyber-accent/20 border-cyber-accent/50 text-cyber-accent'
                    : 'bg-cyber-dark border-gray-700 hover:border-cyber-accent/50'
                }`}
                title="Seleccionar circuito"
              >
                <p className="text-gray-400 text-xs">Circuito ({projectData.circuits.length})</p>
                <p className="text-cyber-secondary font-medium text-sm">
                  {currentCircuit?.name || 'Desconocido'} {showCircuitSelector ? '▲' : '▼'}
                </p>
              </button>
            ) : (
              <div className="text-right">
                <p className="text-gray-400 text-xs">Circuito</p>
                <p className="text-cyber-secondary font-medium">
                  {currentCircuit?.name || 'Desconocido'}
                </p>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Circuit selector panel */}
      {showCircuitSelector && hasMultipleCircuits && (
        <div className="bg-cyber-dark border-b border-cyber-accent/30 px-4 py-4 animate-in slide-in-from-top-2 duration-200">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-cyber-accent/20 border border-cyber-accent/30 flex items-center justify-center">
                  <svg className="w-4 h-4 text-cyber-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-mono font-medium text-cyber-accent">SELECT CIRCUIT</h3>
                  <p className="text-xs text-gray-500">El progreso de cada circuito se mantiene independiente</p>
                </div>
              </div>
              <button
                onClick={() => setShowCircuitSelector(false)}
                className="p-2 text-gray-500 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Circuit cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {getCircuitSummary().map((circuit) => {
                const statusBadge = getStatusBadge(circuit.status)
                const hint = getCircuitHint(circuit)

                return (
                  <button
                    key={circuit.id}
                    onClick={() => doSwitchCircuit(circuit.id)}
                    disabled={loading}
                    className={`group relative p-4 rounded-xl border text-left transition-all duration-200 ${
                      circuit.isActive
                        ? 'bg-cyber-accent/10 border-cyber-accent shadow-lg shadow-cyber-accent/20 scale-[1.02]'
                        : 'bg-cyber-darker border-gray-700/50 hover:border-cyber-accent/50 hover:bg-cyber-dark/50'
                    } disabled:opacity-50 disabled:cursor-wait`}
                  >
                    {/* Active indicator line */}
                    {circuit.isActive && (
                      <div className="absolute left-0 top-4 bottom-4 w-1 bg-cyber-accent rounded-r" />
                    )}

                    {/* Header row */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-medium text-sm truncate ${circuit.isActive ? 'text-cyber-accent' : 'text-white group-hover:text-cyber-accent'}`}>
                          {circuit.name}
                        </h4>
                        {circuit.description && (
                          <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{circuit.description}</p>
                        )}
                      </div>
                      <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded border font-mono ${
                        circuit.isActive ? 'bg-cyber-accent/30 text-cyber-accent border-cyber-accent/50' : statusBadge.color
                      }`}>
                        {circuit.isActive ? 'LINKED' : statusBadge.label}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-[10px] mb-1">
                        <span className="text-gray-500 font-mono">{circuit.hackedCount}/{circuit.nodeCount} NODES</span>
                        <span className={`font-mono ${circuit.progress === 100 ? 'text-green-400' : 'text-gray-500'}`}>
                          {circuit.progress}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            circuit.progress === 100
                              ? 'bg-green-500'
                              : circuit.blockedCount > 0
                              ? 'bg-gradient-to-r from-cyber-primary to-red-500'
                              : 'bg-cyber-primary'
                          }`}
                          style={{ width: `${circuit.progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center gap-3 text-xs font-mono">
                      {circuit.hackedCount > 0 && (
                        <span className="flex items-center gap-1 text-cyber-primary">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          {circuit.hackedCount}
                        </span>
                      )}
                      {circuit.blockedCount > 0 && (
                        <span className="flex items-center gap-1 text-red-400">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                          {circuit.blockedCount}
                        </span>
                      )}
                      {circuit.discoveredCount > 0 && circuit.discoveredCount !== circuit.nodeCount && (
                        <span className="flex items-center gap-1 text-gray-500">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                          </svg>
                          {circuit.discoveredCount}
                        </span>
                      )}
                    </div>

                    {/* Contextual hint (non-blocking) */}
                    {hint && (
                      <div className={`mt-3 pt-3 border-t border-gray-700/50 text-[10px] ${
                        hint.type === 'warning' ? 'text-yellow-500' : 'text-gray-500'
                      }`}>
                        {hint.type === 'warning' && (
                          <svg className="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        )}
                        {hint.text}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Warnings bar */}
      {displayState.warnings.length > 0 && (
        <div className="bg-cyber-dark/80 border-b border-red-900/30 px-4 py-2">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-4 overflow-x-auto">
              {displayState.warnings.slice(-3).map((warning, i) => (
                <WarningBadge key={i} warning={warning} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 p-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map area */}
          <div className="lg:col-span-2">
            <div className="bg-cyber-dark/50 border border-gray-800 rounded-lg p-4">
              <h2 className="text-sm font-mono font-medium text-gray-400 mb-4">
                NETWORK MAP // {currentCircuit?.name?.toUpperCase() || 'UNKNOWN'}
              </h2>
              {currentCircuit && (
                <CircuitMap
                  circuit={currentCircuit}
                  state={displayState}
                  selectedNodeId={selectedNodeId}
                  availableMoves={availableMoves}
                  onSelectNode={isReplayMode ? () => {} : setSelectedNodeId}
                />
              )}
            </div>
          </div>

          {/* Actions panel */}
          <div className="space-y-4">
            {/* Timeline component */}
            {state.timeline && state.timeline.length > 0 && (
              <Timeline
                timeline={state.timeline}
                projectData={projectData}
                currentState={state}
                onEnterReplay={enterReplayMode}
                onExitReplay={exitReplayMode}
                isReplayMode={isReplayMode}
                replayIndex={replayIndex}
                variant="TECH"
              />
            )}

            {/* Current node info */}
            <div className={`bg-cyber-dark/50 border rounded-lg p-4 ${isReplayMode ? 'border-yellow-500/30' : 'border-cyber-primary/20'}`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-400">
                  {isReplayMode ? 'ESTADO HISTÓRICO' : 'TERMINAL ACTIVO'}
                </h3>
                <span className="text-xs font-mono text-gray-600">
                  {displayState.position.nodeId.slice(0, 8).toUpperCase()}
                </span>
              </div>
              {currentNode && currentNodeState && (
                <div>
                  <p className="text-xl font-bold text-white mb-2 font-mono">
                    {currentNode.name}
                  </p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {currentNodeState.hackeado && (
                      <span className="text-xs px-2 py-0.5 rounded bg-cyber-primary/20 text-cyber-primary font-mono">
                        COMPROMISED
                      </span>
                    )}
                    {currentNodeState.bloqueado && (
                      <span className="text-xs px-2 py-0.5 rounded bg-red-900/30 text-red-400 font-mono animate-pulse">
                        LOCKDOWN
                      </span>
                    )}
                    {!currentNodeState.hackeado && !currentNodeState.bloqueado && (
                      <span className="text-xs px-2 py-0.5 rounded bg-yellow-900/30 text-yellow-400 font-mono">
                        SECURED
                      </span>
                    )}
                  </div>
                  {currentNode.description && (
                    <p className="text-gray-500 text-sm italic">
                      {currentNode.description}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Hack action - disabled in replay mode */}
            {currentNode && currentNodeState && !currentNodeState.hackeado && !currentNodeState.bloqueado && !isReplayMode && (
              <div className="bg-cyber-dark/50 border border-cyber-primary/30 rounded-lg p-4">
                <h3 className="text-sm font-mono font-medium text-cyber-primary mb-3">
                  INITIATE BREACH
                </h3>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={hackInput}
                    onChange={(e) => setHackInput(e.target.value)}
                    placeholder="INPUT"
                    className="flex-1 bg-cyber-darker border border-gray-700 rounded px-3 py-2 text-white font-mono focus:border-cyber-primary focus:outline-none text-center"
                    disabled={loading}
                  />
                  <button
                    onClick={doHack}
                    disabled={loading || !hackInput}
                    className="px-6 py-2 bg-cyber-primary/20 border border-cyber-primary/30 hover:bg-cyber-primary/30 text-cyber-primary rounded font-mono font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? '...' : 'EXEC'}
                  </button>
                </div>
                <p className="text-gray-600 text-xs mt-2 font-mono">
                  &gt; AWAITING SECURITY HANDSHAKE...
                </p>
              </div>
            )}

            {/* Discover action - disabled in replay mode */}
            {!isReplayMode && (
              <div className="bg-cyber-dark/50 border border-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-mono font-medium text-gray-400">
                    SCAN NETWORK
                  </h3>
                  <span className={`text-lg font-mono font-bold ${
                    hasHiddenLinks()
                      ? 'text-cyber-accent animate-pulse'
                      : 'text-gray-700'
                  }`}>
                    [A]
                  </span>
                </div>
                <button
                  onClick={doDiscover}
                  disabled={loading || !hasHiddenLinks()}
                  className="w-full px-4 py-2 bg-cyber-accent/20 border border-cyber-accent/30 hover:bg-cyber-accent/30 text-cyber-accent rounded font-mono font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'SCANNING...' : 'SCAN'}
                </button>
                <p className="text-gray-600 text-xs mt-2 font-mono">
                  {hasHiddenLinks()
                    ? '> HIDDEN PATHWAYS DETECTED'
                    : '> NO HIDDEN ROUTES FROM THIS NODE'}
                </p>
              </div>
            )}

            {/* Move action - disabled in replay mode */}
            {selectedNodeId && accessibleNodes.includes(selectedNodeId) && !isReplayMode && (
              <div className={`bg-cyber-dark/50 rounded-lg p-4 ${
                availableMoves.fastTravel.includes(selectedNodeId)
                  ? 'border border-cyber-primary/20'
                  : 'border border-cyber-secondary/20'
              }`}>
                <h3 className="text-sm font-mono font-medium text-gray-400 mb-3">
                  {availableMoves.fastTravel.includes(selectedNodeId) ? 'JUMP TO NODE' : 'TRAVERSE LINK'}
                </h3>
                <button
                  onClick={() => doMove(selectedNodeId)}
                  disabled={loading}
                  className={`w-full px-4 py-2 rounded font-mono font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                    availableMoves.fastTravel.includes(selectedNodeId)
                      ? 'bg-cyber-primary/20 border border-cyber-primary/30 hover:bg-cyber-primary/30 text-cyber-primary'
                      : 'bg-cyber-secondary/20 border border-cyber-secondary/30 hover:bg-cyber-secondary/30 text-cyber-secondary'
                  }`}
                >
                  {loading ? 'CONNECTING...' : `${
                    availableMoves.fastTravel.includes(selectedNodeId) ? '» ' : '> '
                  }${currentCircuit?.nodes.find(n => n.id === selectedNodeId)?.name || selectedNodeId}`}
                </button>
              </div>
            )}

            {/* Message */}
            {message && (
              <div className={`rounded-lg p-4 border ${
                message.type === 'success'
                  ? 'bg-green-900/20 border-green-700/30'
                  : message.type === 'error'
                  ? 'bg-red-900/20 border-red-700/30'
                  : 'bg-blue-900/20 border-blue-700/30'
              }`}>
                <p className={`text-sm font-mono ${
                  message.type === 'success'
                    ? 'text-green-400'
                    : message.type === 'error'
                    ? 'text-red-400'
                    : 'text-blue-400'
                }`}>
                  &gt; {message.text}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Audit View Modal */}
      {showAuditView && (
        <AuditView
          runId={runId}
          runName={runName}
          projectName={projectName}
          state={state}
          projectData={projectData}
          createdAt={createdAt}
          canExport={canExport}
          isSuperAdmin={isSuperAdmin}
          onClose={() => setShowAuditView(false)}
          onEnterReplay={(snapshot, eventIndex) => {
            enterReplayMode(snapshot, eventIndex)
            setShowAuditView(false)
          }}
          variant="TECH"
        />
      )}
    </div>
  )
}

// Warning badge component
function WarningBadge({ warning }: { warning: Warning }) {
  const severityColors: Record<string, string> = {
    INFO: 'bg-blue-900/30 text-blue-400 border-blue-700/30',
    TRACE: 'bg-yellow-900/30 text-yellow-400 border-yellow-700/30',
    ALERT: 'bg-orange-900/30 text-orange-400 border-orange-700/30',
    LOCKDOWN: 'bg-red-900/30 text-red-400 border-red-700/30',
    BLACK_ICE: 'bg-purple-900/30 text-purple-400 border-purple-700/30',
  }

  return (
    <div className={`px-3 py-1 rounded border text-xs whitespace-nowrap ${
      severityColors[warning.severity] || severityColors.INFO
    }`}>
      <span className="font-bold">{warning.severity}:</span> {warning.message.slice(0, 50)}
      {warning.message.length > 50 && '...'}
    </div>
  )
}

// Circuit map component
function CircuitMap({
  circuit,
  state,
  selectedNodeId,
  availableMoves,
  onSelectNode,
}: {
  circuit: CircuitDefinition
  state: RunState
  selectedNodeId: string | null
  availableMoves: { fastTravel: string[]; advance: string[]; all: string[] }
  onSelectNode: (id: string | null) => void
}) {
  // Group nodes by level
  const nodesByLevel = circuit.nodes.reduce((acc, node) => {
    const level = node.level
    if (!acc[level]) acc[level] = []
    acc[level].push(node)
    return acc
  }, {} as Record<number, NodeDefinition[]>)

  const levels = Object.keys(nodesByLevel)
    .map(Number)
    .sort((a, b) => a - b)

  const currentNodeId = state.position.nodeId

  return (
    <div className="space-y-4">
      {levels.map((level) => (
        <div key={level}>
          <p className="text-xs font-mono text-gray-600 mb-2">LAYER_{level}</p>
          <div className="flex flex-wrap gap-2">
            {nodesByLevel[level].map((node) => {
              const nodeState = state.nodes[node.id]
              const isDiscovered = nodeState?.descubierto
              const isHacked = nodeState?.hackeado
              const isBlocked = nodeState?.bloqueado
              const isCurrent = node.id === currentNodeId
              const isSelected = node.id === selectedNodeId
              const isFastTravel = availableMoves.fastTravel.includes(node.id)
              const isAdvance = availableMoves.advance.includes(node.id)
              const isAccessible = isFastTravel || isAdvance

              if (!isDiscovered) {
                return (
                  <div
                    key={node.id}
                    className="px-4 py-2 rounded border border-gray-800 bg-gray-900/50 text-gray-700 text-sm font-mono"
                  >
                    [???]
                  </div>
                )
              }

              return (
                <button
                  key={node.id}
                  onClick={() => onSelectNode(isSelected ? null : node.id)}
                  className={`px-4 py-2 rounded border text-sm font-mono font-medium transition-all ${
                    isCurrent
                      ? 'bg-cyber-primary/20 border-cyber-primary text-cyber-primary ring-2 ring-cyber-primary/50'
                      : isSelected
                      ? 'bg-cyber-secondary/20 border-cyber-secondary text-cyber-secondary'
                      : isBlocked
                      ? 'bg-red-900/20 border-red-700/30 text-red-400 cursor-not-allowed'
                      : isFastTravel
                      ? 'bg-cyber-primary/10 border-cyber-primary/30 text-cyber-primary/70 hover:border-cyber-primary/50'
                      : isAdvance
                      ? 'bg-gray-800 border-cyber-accent/50 text-white hover:border-cyber-accent'
                      : isHacked
                      ? 'bg-cyber-primary/10 border-cyber-primary/20 text-cyber-primary/50'
                      : 'bg-gray-900 border-gray-700 text-gray-400'
                  }`}
                  disabled={isCurrent || isBlocked || (!isAccessible && !isCurrent)}
                >
                  {node.name}
                  {isHacked && <span className="ml-1 text-xs opacity-70">[OK]</span>}
                  {isBlocked && <span className="ml-1 text-xs">[X]</span>}
                  {isAdvance && !isHacked && <span className="ml-1 text-xs opacity-50">&gt;</span>}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
