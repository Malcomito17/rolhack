'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import Link from 'next/link'
import type { ProjectData, RunState, Warning, CircuitDefinition, StateSnapshot } from '@/lib/engine'
import { Timeline, ReplayIndicator } from './timeline'
import { AuditView } from './audit-view'
import { SharePanel } from '@/components/share-panel'

interface Props {
  runId: string
  projectId: string
  projectName: string
  runName: string | null
  state: RunState
  projectData: ProjectData
  theme: Record<string, string>
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
  onStateChange: (newState: RunState) => void
  onToggleView: () => void
  createdAt: string
  canExport?: boolean
  isSuperAdmin?: boolean
}

export function ImmersiveView({
  runId,
  projectId,
  projectName,
  runName,
  state,
  projectData,
  theme,
  effects,
  onStateChange,
  onToggleView,
  createdAt,
  canExport = false,
  isSuperAdmin = false,
}: Props) {
  // Get theme colors with fallbacks
  const primaryColor = theme.primaryColor || '#00ff00'
  const secondaryColor = theme.secondaryColor || '#003300'
  const textColor = theme.textColor || '#00ff00'
  const bgColor = theme.background || '#000000'

  // Circuit selector state
  const [showCircuitSelector, setShowCircuitSelector] = useState(false)
  const [circuitTransition, setCircuitTransition] = useState(false)
  const hasMultipleCircuits = projectData.circuits.length > 1

  // =============================================================================
  // REPLAY MODE STATE (Visual only - does NOT modify actual run state)
  // =============================================================================
  const [isReplayMode, setIsReplayMode] = useState(false)
  const [replayIndex, setReplayIndex] = useState<number | null>(null)
  const [replaySnapshot, setReplaySnapshot] = useState<StateSnapshot | null>(null)

  // =============================================================================
  // AUDIT MODE STATE (Visual only - comprehensive run overview)
  // =============================================================================
  const [showAuditView, setShowAuditView] = useState(false)

  // Enter replay mode with a specific snapshot
  const enterReplayMode = (snapshot: StateSnapshot, eventIndex: number) => {
    setReplaySnapshot(snapshot)
    setReplayIndex(eventIndex)
    setIsReplayMode(true)
    addLine('system', '> ENTERING REPLAY MODE...')
    addLine('info', `> OBSERVING STATE AT EVENT ${eventIndex + 1}`)
  }

  // Exit replay mode - return to current actual state
  const exitReplayMode = () => {
    setReplaySnapshot(null)
    setReplayIndex(null)
    setIsReplayMode(false)
    addLine('system', '> EXITING REPLAY MODE...')
    addLine('success', '> RETURNED TO CURRENT STATE')
  }

  // Get the state to display (actual or replay snapshot)
  const displayState = isReplayMode && replaySnapshot
    ? { ...state, position: replaySnapshot.position, nodes: replaySnapshot.nodes, links: replaySnapshot.links }
    : state

  // Circuit status type
  type CircuitStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'ADVANCED' | 'COMPLETED' | 'BLOCKED'

  // Get circuit summary with detailed status
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

  // Get contextual hint for circuit (terminal style)
  const getCircuitHint = (circuitSummary: ReturnType<typeof getCircuitSummary>[0]) => {
    if (circuitSummary.isActive) return null

    if (circuitSummary.status === 'COMPLETED') {
      return { type: 'success' as const, text: '> ALL NODES COMPROMISED' }
    }
    if (circuitSummary.status === 'BLOCKED') {
      return { type: 'warning' as const, text: '> BLACK ICE DETECTED' }
    }
    if (circuitSummary.status === 'ADVANCED') {
      return { type: 'info' as const, text: '> DEEP PENETRATION ACHIEVED' }
    }
    if (circuitSummary.status === 'IN_PROGRESS') {
      return { type: 'info' as const, text: '> PARTIAL ACCESS ESTABLISHED' }
    }
    return { type: 'info' as const, text: '> ROUTE NOT EXPLORED' }
  }

  // Get status badge config (terminal style)
  const getStatusBadge = (status: CircuitStatus) => {
    switch (status) {
      case 'COMPLETED':
        return { label: 'PWNED', color: primaryColor }
      case 'ADVANCED':
        return { label: 'ACTIVE', color: primaryColor }
      case 'IN_PROGRESS':
        return { label: 'TRACE', color: '#ffff55' }
      case 'BLOCKED':
        return { label: 'LOCKED', color: '#ff5555' }
      default:
        return { label: 'NEW', color: `${primaryColor}66` }
    }
  }

  // Switch circuit with transition
  async function doSwitchCircuit(targetCircuitId: string) {
    if (targetCircuitId === state.position.circuitId) {
      setShowCircuitSelector(false)
      return
    }

    const targetCircuit = projectData.circuits.find(c => c.id === targetCircuitId)
    const targetName = targetCircuit?.name || targetCircuitId.slice(0, 8)

    setLoading(true)
    addLine('user', `> EXEC ROUTE_SWITCH --target="${targetName.toUpperCase()}"`)
    addLine('system', '> DISCONNECTING FROM CURRENT NETWORK...')

    // Start transition effect
    setCircuitTransition(true)

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

      // Add immersive feedback
      addLine('system', '> ESTABLISHING NEW CONNECTION...')
      await new Promise(r => setTimeout(r, 300))

      await refreshState()
      setShowCircuitSelector(false)

      if (data.success) {
        addLine('success', `> ROUTE SWITCHED: ${targetName.toUpperCase()}`)
        addLine('system', `> CURRENT NODE: ${data.newPosition?.nodeId?.slice(0, 8).toUpperCase() || 'UNKNOWN'}`)
      } else {
        addLine('error', `> SWITCH FAILED: ${data.message}`)
      }
    } catch (err) {
      addLine('error', `> ERROR: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
      // End transition after a brief delay
      setTimeout(() => setCircuitTransition(false), 500)
    }
  }
  const [loading, setLoading] = useState(false)
  const [hackInput, setHackInput] = useState('')
  const [terminalLines, setTerminalLines] = useState<{ type: 'system' | 'user' | 'success' | 'error' | 'info'; text: string }[]>([])
  const terminalRef = useRef<HTMLDivElement>(null)

  // Get current circuit and node (using displayState for visual representation)
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
  const getAvailableMoves = useCallback(() => {
    if (!currentCircuit) return { fastTravel: [], advance: [] }

    const currentNodeId = displayState.position.nodeId
    const fastTravel: { id: string; name: string }[] = []
    const advance: { id: string; name: string }[] = []

    const currentNodeStateLocal = displayState.nodes[currentNodeId]
    const currentIsHacked = currentNodeStateLocal?.hackeado === true

    for (const node of currentCircuit.nodes) {
      if (node.id === currentNodeId) continue
      const nodeState = displayState.nodes[node.id]
      if (!nodeState || nodeState.inaccesible || nodeState.bloqueado) continue

      if (nodeState.hackeado) {
        fastTravel.push({ id: node.id, name: node.name })
      }
    }

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
          const targetNode = currentCircuit.nodes.find(n => n.id === targetId)
          if (
            targetNode &&
            targetState &&
            targetState.descubierto &&
            !targetState.inaccesible &&
            !targetState.bloqueado &&
            !targetState.hackeado &&
            !advance.find(a => a.id === targetId)
          ) {
            advance.push({ id: targetNode.id, name: targetNode.name })
          }
        }
      }
    }

    return { fastTravel, advance }
  }, [currentCircuit, displayState])

  const availableMoves = getAvailableMoves()

  // Add terminal line
  const addLine = (type: 'system' | 'user' | 'success' | 'error' | 'info', text: string) => {
    setTerminalLines(prev => [...prev.slice(-50), { type, text }])
  }

  // Initial boot sequence
  useEffect(() => {
    const bootSequence = async () => {
      addLine('system', '> INITIALIZING NEURAL INTERFACE...')
      await new Promise(r => setTimeout(r, 300))
      addLine('system', `> CONNECTED TO: ${projectName.toUpperCase()}`)
      await new Promise(r => setTimeout(r, 200))
      addLine('system', `> CURRENT NODE: ${currentNode?.name || 'UNKNOWN'}`)
      await new Promise(r => setTimeout(r, 200))
      if (currentNodeState?.hackeado) {
        addLine('success', '> STATUS: NODE COMPROMISED')
      } else if (currentNodeState?.bloqueado) {
        addLine('error', '> STATUS: NODE LOCKED - BLACK ICE ACTIVE')
      } else {
        addLine('info', '> STATUS: AWAITING BREACH ATTEMPT')
      }
      addLine('system', '> READY FOR INPUT...')
    }
    bootSequence()
  }, [])

  // Scroll to bottom on new lines
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [terminalLines])

  // API calls
  async function doHack() {
    if (!hackInput) return
    setLoading(true)
    addLine('user', `> EXEC BREACH [${hackInput}]`)

    try {
      const res = await fetch(`/api/runs/${runId}/hack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputValue: parseInt(hackInput, 10) }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error')
      }

      await refreshState()

      if (data.success) {
        addLine('success', `> ${data.message}`)
      } else {
        addLine('error', `> ${data.message}`)
      }
      setHackInput('')
    } catch (err) {
      addLine('error', `> ERROR: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  async function doDiscover() {
    setLoading(true)
    addLine('user', '> EXEC SCAN')

    try {
      const res = await fetch(`/api/runs/${runId}/discover`, {
        method: 'POST',
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error')
      }

      await refreshState()

      if (data.discoveredLinks.length > 0) {
        addLine('success', `> ${data.message}`)
        data.discoveredLinks.forEach((linkId: string) => {
          addLine('info', `> PATHWAY REVEALED: ${linkId.slice(0, 8).toUpperCase()}`)
        })
      } else {
        addLine('info', `> ${data.message}`)
      }
    } catch (err) {
      addLine('error', `> ERROR: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  async function doMove(targetNodeId: string, targetName: string) {
    setLoading(true)
    addLine('user', `> EXEC MOVE [${targetName.toUpperCase()}]`)

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

      if (data.success) {
        addLine('success', `> ${data.message}`)
        addLine('system', `> CURRENT NODE: ${targetName.toUpperCase()}`)
      } else {
        addLine('error', `> ${data.message}`)
      }
    } catch (err) {
      addLine('error', `> ERROR: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  async function refreshState() {
    const res = await fetch(`/api/runs/${runId}`)
    const data = await res.json()
    if (res.ok && data.state) {
      onStateChange(data.state)
    }
  }

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && hackInput) {
      doHack()
    }
  }

  return (
    <div
      className={`h-screen flex flex-col font-mono relative overflow-hidden ${effects.flicker ? 'animate-flicker' : ''} ${effects.crtCurve ? 'crt-curve' : ''} ${circuitTransition ? 'circuit-transition' : ''}`}
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      {/* Scanlines overlay */}
      {effects.scanlines && (
        <div className="absolute inset-0 pointer-events-none z-50 bg-scanlines opacity-10" />
      )}

      {/* Glitch effect */}
      {effects.glitch && (
        <div className="absolute inset-0 pointer-events-none z-40 animate-glitch" />
      )}

      {/* Matrix rain background effect */}
      {effects.matrixRain && (
        <div className="absolute inset-0 pointer-events-none z-0 matrix-rain" style={{ '--rain-color': primaryColor } as React.CSSProperties} />
      )}

      {/* Warning pulse effect */}
      {effects.warningPulse && (
        <div className="absolute inset-0 pointer-events-none z-0 animate-warning-pulse" style={{ '--pulse-color': primaryColor } as React.CSSProperties} />
      )}

      {/* Radar sweep effect */}
      {effects.radarSweep && (
        <div className="absolute inset-0 pointer-events-none z-0 radar-sweep" style={{ '--radar-color': primaryColor } as React.CSSProperties} />
      )}

      {/* Background gradient */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: `linear-gradient(to bottom, ${primaryColor}08, ${bgColor})` }} />

      {/* Replay Mode Indicator */}
      <ReplayIndicator
        isReplayMode={isReplayMode}
        replayIndex={replayIndex}
        totalEvents={state.timeline?.length || 0}
        currentEvent={replayIndex !== null ? state.timeline?.[replayIndex] : undefined}
        onExitReplay={exitReplayMode}
        variant="IMMERSIVE"
        theme={{ primaryColor }}
      />

      {/* Header - Mobile responsive */}
      <header className="relative z-10 border-b px-2 sm:px-4 py-2 flex-shrink-0" style={{ borderColor: `${primaryColor}33` }}>
        <div className="max-w-4xl mx-auto">
          {/* Mobile: Two rows, Desktop: Single row */}
          <div className="flex items-center justify-between gap-2">
            {/* Left: Back + Share */}
            <div className="flex items-center gap-1 sm:gap-4">
              <Link
                href={`/projects/${projectId}`}
                className="text-[10px] sm:text-xs opacity-60 hover:opacity-100 transition-opacity"
                style={{ color: primaryColor }}
              >
                <span className="hidden sm:inline">[ESC] DISCONNECT</span>
                <span className="sm:hidden">[ESC]</span>
              </Link>
              <SharePanel
                runId={runId}
                runName={runName}
                projectName={projectName}
                variant="COMPACT"
              />
            </div>

            {/* Center: Run name (hidden on very small screens) */}
            <div className="hidden xs:block text-center flex-1 min-w-0 px-2">
              <p className="text-[10px] sm:text-xs opacity-60 truncate" style={{ color: primaryColor }}>{projectName}</p>
              <p className="text-xs sm:text-sm font-bold truncate" style={{ color: primaryColor }}>{runName || `RUN_${runId.slice(0, 8)}`}</p>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={() => setShowAuditView(true)}
                className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-1 border rounded opacity-60 hover:opacity-100 transition-opacity"
                style={{ borderColor: `${primaryColor}66`, color: primaryColor }}
                title="Ver auditoría del run"
              >
                <span className="hidden sm:inline">[A] AUDIT</span>
                <span className="sm:hidden">[A]</span>
              </button>
              <button
                onClick={onToggleView}
                className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-1 border rounded opacity-60 hover:opacity-100 transition-opacity"
                style={{ borderColor: `${primaryColor}66`, color: primaryColor }}
                title="Cambiar a vista técnica"
              >
                <span className="hidden sm:inline">[T] TECH</span>
                <span className="sm:hidden">[T]</span>
              </button>
              {hasMultipleCircuits ? (
                <button
                  onClick={() => setShowCircuitSelector(!showCircuitSelector)}
                  className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-1 rounded border transition-opacity opacity-60 hover:opacity-100"
                  style={{ borderColor: `${primaryColor}66`, color: primaryColor }}
                  title="Cambiar circuito"
                >
                  <span className="hidden sm:inline">[C] {currentCircuit?.name}</span>
                  <span className="sm:hidden">[C]</span>
                  {showCircuitSelector ? ' ▲' : ' ▼'}
                </button>
              ) : (
                <span className="text-[10px] sm:text-xs opacity-60 hidden sm:inline" style={{ color: primaryColor }}>
                  {currentCircuit?.name}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Circuit selector panel (enhanced immersive style) */}
      {showCircuitSelector && hasMultipleCircuits && (
        <div className="relative z-10 px-4 py-4 border-b flex-shrink-0" style={{ borderColor: `${primaryColor}33`, backgroundColor: `${bgColor}f0` }}>
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs opacity-60" style={{ color: primaryColor }}>[</span>
                <span className="text-xs font-bold" style={{ color: primaryColor }}>NETWORK_ROUTES</span>
                <span className="text-xs opacity-60" style={{ color: primaryColor }}>]</span>
              </div>
              <button
                onClick={() => setShowCircuitSelector(false)}
                className="text-xs opacity-60 hover:opacity-100 transition-opacity"
                style={{ color: primaryColor }}
              >
                [X] CLOSE
              </button>
            </div>

            <p className="text-[10px] mb-3 opacity-50" style={{ color: textColor }}>
              &gt; EACH ROUTE MAINTAINS INDEPENDENT PROGRESS. SELECT DESTINATION...
            </p>

            {/* Circuit cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {getCircuitSummary().map((circuit) => {
                const statusBadge = getStatusBadge(circuit.status)
                const hint = getCircuitHint(circuit)

                return (
                  <button
                    key={circuit.id}
                    onClick={() => doSwitchCircuit(circuit.id)}
                    disabled={loading}
                    className="group relative p-3 rounded text-left transition-all disabled:opacity-50"
                    style={{
                      border: `1px solid ${circuit.isActive ? primaryColor : `${primaryColor}33`}`,
                      backgroundColor: circuit.isActive ? `${primaryColor}15` : `${bgColor}aa`,
                      boxShadow: circuit.isActive ? `0 0 20px ${primaryColor}22` : 'none',
                    }}
                  >
                    {/* Active indicator */}
                    {circuit.isActive && (
                      <div className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r" style={{ backgroundColor: primaryColor }} />
                    )}

                    {/* Header row */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <span
                          className="text-sm font-medium block truncate"
                          style={{ color: circuit.isActive ? primaryColor : textColor }}
                        >
                          {circuit.name}
                        </span>
                        {circuit.description && (
                          <span className="text-[10px] opacity-50 block truncate" style={{ color: textColor }}>
                            {circuit.description}
                          </span>
                        )}
                      </div>
                      <span
                        className="shrink-0 text-[9px] px-1.5 py-0.5 rounded font-mono"
                        style={{
                          border: `1px solid ${circuit.isActive ? primaryColor : statusBadge.color}66`,
                          color: circuit.isActive ? primaryColor : statusBadge.color,
                          backgroundColor: `${circuit.isActive ? primaryColor : statusBadge.color}22`,
                        }}
                      >
                        {circuit.isActive ? 'LINKED' : statusBadge.label}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="mb-2">
                      <div className="flex items-center justify-between text-[9px] mb-1 font-mono">
                        <span style={{ color: `${textColor}88` }}>
                          NODES: {circuit.hackedCount}/{circuit.nodeCount}
                        </span>
                        <span style={{ color: circuit.progress === 100 ? primaryColor : `${textColor}66` }}>
                          [{circuit.progress}%]
                        </span>
                      </div>
                      <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: `${primaryColor}22` }}>
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${circuit.progress}%`,
                            backgroundColor: circuit.blockedCount > 0 && circuit.progress < 100
                              ? '#ff5555'
                              : circuit.progress === 100
                              ? primaryColor
                              : `${primaryColor}cc`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center gap-3 text-[9px] font-mono" style={{ color: `${textColor}66` }}>
                      {circuit.hackedCount > 0 && (
                        <span style={{ color: primaryColor }}>
                          [{circuit.hackedCount}] PWNED
                        </span>
                      )}
                      {circuit.blockedCount > 0 && (
                        <span style={{ color: '#ff5555' }}>
                          [{circuit.blockedCount}] LOCKED
                        </span>
                      )}
                      {circuit.discoveredCount > 0 && circuit.discoveredCount < circuit.nodeCount && (
                        <span style={{ color: secondaryColor }}>
                          [{circuit.discoveredCount}] VISIBLE
                        </span>
                      )}
                    </div>

                    {/* Contextual hint */}
                    {hint && !circuit.isActive && (
                      <div
                        className="mt-2 pt-2 text-[9px] font-mono border-t"
                        style={{
                          borderColor: `${primaryColor}22`,
                          color: hint.type === 'warning' ? '#ffaa00' : hint.type === 'success' ? primaryColor : `${textColor}66`,
                        }}
                      >
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

      {/* Timeline panel - collapsible */}
      {state.timeline && state.timeline.length > 0 && (
        <div className="relative z-10 px-4 flex-shrink-0">
          <div className="max-w-4xl mx-auto">
            <Timeline
              timeline={state.timeline}
              projectData={projectData}
              currentState={state}
              onEnterReplay={enterReplayMode}
              onExitReplay={exitReplayMode}
              isReplayMode={isReplayMode}
              replayIndex={replayIndex}
              variant="IMMERSIVE"
              theme={{ primaryColor, secondaryColor, textColor, bgColor }}
            />
          </div>
        </div>
      )}

      {/* Main terminal */}
      <main className={`relative z-10 flex flex-col flex-1 min-h-0 ${isReplayMode ? 'opacity-80' : ''}`}>
        {/* Terminal output - responsive text sizes */}
        <div
          ref={terminalRef}
          className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-0.5 sm:space-y-1"
        >
          {terminalLines.map((line, i) => (
            <p
              key={i}
              className={`text-xs sm:text-sm ${
                line.type === 'system' ? 'text-green-700' :
                line.type === 'user' ? 'text-green-400' :
                line.type === 'success' ? 'text-green-300 font-bold' :
                line.type === 'error' ? 'text-red-500 font-bold' :
                'text-cyan-500'
              }`}
            >
              {line.text}
            </p>
          ))}
        </div>

        {/* Status bar - mobile responsive */}
        <div className="border-t px-2 sm:px-4 py-1.5 sm:py-2 flex-shrink-0" style={{ borderColor: isReplayMode ? '#ffaa0044' : `${primaryColor}33`, backgroundColor: `${bgColor}cc` }}>
          <div className="max-w-4xl mx-auto flex flex-wrap items-center gap-x-2 sm:gap-x-4 gap-y-1 text-[10px] sm:text-xs">
            {isReplayMode && (
              <>
                <span style={{ color: '#ffaa00' }}>[REPLAY]</span>
                <span className="hidden sm:inline" style={{ color: `${primaryColor}33` }}>|</span>
              </>
            )}
            <span style={{ color: `${primaryColor}88` }}>NODE:</span>
            <span className="font-bold truncate max-w-[100px] sm:max-w-none" style={{
              color: currentNodeState?.hackeado ? primaryColor :
                     currentNodeState?.bloqueado ? '#ff5555' :
                     '#ffff55'
            }}>
              {currentNode?.name || 'UNKNOWN'}
            </span>
            <span className="hidden sm:inline" style={{ color: `${primaryColor}33` }}>|</span>
            <span style={{ color: `${primaryColor}88` }}>STATUS:</span>
            <span style={{
              color: currentNodeState?.hackeado ? primaryColor :
                     currentNodeState?.bloqueado ? '#ff5555' :
                     '#ffff55'
            }}>
              {currentNodeState?.hackeado ? 'OK' :
               currentNodeState?.bloqueado ? 'LOCK' :
               'SEC'}
            </span>
            {availableMoves.fastTravel.length > 0 && (
              <>
                <span className="hidden sm:inline" style={{ color: `${primaryColor}33` }}>|</span>
                <span style={{ color: `${primaryColor}88` }}>JMP:</span>
                <span style={{ color: primaryColor }}>{availableMoves.fastTravel.length}</span>
              </>
            )}
            {availableMoves.advance.length > 0 && (
              <>
                <span className="hidden sm:inline" style={{ color: `${primaryColor}33` }}>|</span>
                <span style={{ color: `${primaryColor}88` }}>ADV:</span>
                <span style={{ color: secondaryColor }}>{availableMoves.advance.length}</span>
              </>
            )}
          </div>
        </div>

        {/* Input area - disabled in replay mode */}
        <div className="border-t px-2 sm:px-4 py-2 sm:py-3 flex-shrink-0" style={{ borderColor: isReplayMode ? '#ffaa0044' : `${primaryColor}33`, backgroundColor: `${bgColor}ee` }}>
          <div className="max-w-4xl mx-auto">
            {/* Replay mode notice */}
            {isReplayMode && (
              <div className="mb-2 sm:mb-3 text-center">
                <span className="text-[8px] sm:text-[10px] font-mono" style={{ color: '#ffaa00' }}>
                  &gt; REPLAY MODE - INPUTS DISABLED
                </span>
              </div>
            )}

            {/* Action buttons - hidden in replay mode */}
            {!isReplayMode && (
              <div className="flex flex-wrap gap-1 sm:gap-2 mb-2 sm:mb-3">
                {/* Hack input - only show if not hacked and not blocked */}
                {currentNodeState && !currentNodeState.hackeado && !currentNodeState.bloqueado && (
                  <div className="flex gap-1">
                    <input
                      type="number"
                      value={hackInput}
                      onChange={(e) => setHackInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="CODE"
                      className="w-16 sm:w-20 bg-transparent rounded px-1 sm:px-2 py-1 text-center text-xs sm:text-sm focus:outline-none"
                      style={{
                        border: `1px solid ${primaryColor}88`,
                        color: primaryColor,
                      }}
                      disabled={loading}
                    />
                    <button
                      onClick={doHack}
                      disabled={loading || !hackInput}
                      className="px-2 sm:px-3 py-1 rounded text-[10px] sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      style={{
                        border: `1px solid ${primaryColor}88`,
                        color: primaryColor,
                      }}
                    >
                      BREACH
                    </button>
                  </div>
                )}

                {/* Scan button */}
                {hasHiddenLinks() && (
                  <button
                    onClick={doDiscover}
                    disabled={loading}
                    className="px-2 sm:px-3 py-1 rounded text-[10px] sm:text-sm disabled:opacity-50 transition-colors"
                    style={{
                      border: `1px solid ${secondaryColor}`,
                      color: secondaryColor,
                    }}
                  >
                    SCAN
                  </button>
                )}

                {/* Move buttons */}
                {availableMoves.fastTravel.map(node => (
                  <button
                    key={node.id}
                    onClick={() => doMove(node.id, node.name)}
                    disabled={loading}
                    className="px-2 sm:px-3 py-1 rounded text-[10px] sm:text-sm disabled:opacity-50 transition-colors"
                    style={{
                      border: `1px solid ${primaryColor}aa`,
                      color: primaryColor,
                    }}
                  >
                    <span className="hidden sm:inline">JUMP: </span>{node.name}
                  </button>
                ))}

                {availableMoves.advance.map(node => (
                  <button
                    key={node.id}
                    onClick={() => doMove(node.id, node.name)}
                    disabled={loading}
                    className="px-2 sm:px-3 py-1 rounded text-[10px] sm:text-sm disabled:opacity-50 transition-colors"
                    style={{
                      border: '1px solid #ffff5588',
                      color: '#ffff55',
                    }}
                  >
                    &gt; {node.name}
                  </button>
                ))}
              </div>
            )}

            {/* Command prompt */}
            <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-sm">
              <span className="truncate max-w-[150px] sm:max-w-none" style={{ color: isReplayMode ? '#ffaa0088' : `${primaryColor}88` }}>
                {isReplayMode ? 'replay@' : 'root@'}{currentNode?.name?.toLowerCase().replace(/\s+/g, '-') || 'unknown'}:~$
              </span>
              <span className={loading ? 'animate-pulse' : ''} style={{ color: isReplayMode ? '#ffaa00' : primaryColor }}>
                {loading ? 'PROCESSING...' : isReplayMode ? '[READ-ONLY]' : '_'}
              </span>
            </div>
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
          variant="IMMERSIVE"
          theme={{ primaryColor, secondaryColor, textColor, bgColor }}
        />
      )}

      <style jsx>{`
        .bg-scanlines {
          background: repeating-linear-gradient(
            0deg,
            ${primaryColor}08 0px,
            ${primaryColor}08 1px,
            transparent 1px,
            transparent 2px
          );
        }
        @keyframes flicker {
          0%, 100% { opacity: 1; }
          92% { opacity: 1; }
          93% { opacity: 0.8; }
          94% { opacity: 1; }
        }
        .animate-flicker {
          animation: flicker 0.15s infinite;
        }
        @keyframes glitch {
          0%, 100% { clip-path: inset(0 0 0 0); }
          20% { clip-path: inset(10% 0 60% 0); transform: translate(-2px); }
          40% { clip-path: inset(40% 0 40% 0); transform: translate(2px); }
          60% { clip-path: inset(70% 0 10% 0); transform: translate(-1px); }
          80% { clip-path: inset(20% 0 50% 0); transform: translate(1px); }
        }
        .animate-glitch::before {
          content: '';
          position: absolute;
          inset: 0;
          background: inherit;
          animation: glitch 2s infinite;
        }
        .crt-curve {
          border-radius: 20px;
          box-shadow: inset 0 0 100px rgba(0,0,0,0.5);
        }
        .matrix-rain {
          background: linear-gradient(180deg,
            transparent 0%,
            var(--rain-color, #00ff00)05 50%,
            transparent 100%
          );
          animation: rain 20s linear infinite;
        }
        @keyframes rain {
          0% { background-position: 0 -100vh; }
          100% { background-position: 0 100vh; }
        }
        @keyframes warning-pulse {
          0%, 100% { opacity: 0; }
          50% { opacity: 0.1; }
        }
        .animate-warning-pulse {
          background: var(--pulse-color, #ffab00);
          animation: warning-pulse 2s ease-in-out infinite;
        }
        .radar-sweep {
          background: conic-gradient(
            from 0deg,
            transparent 0deg,
            var(--radar-color, #00b4d8)20 30deg,
            transparent 60deg
          );
          animation: radar 4s linear infinite;
        }
        @keyframes radar {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes circuit-switch {
          0% { opacity: 1; filter: brightness(1) blur(0); }
          30% { opacity: 0.3; filter: brightness(2) blur(2px); }
          50% { opacity: 0.1; filter: brightness(0.5) blur(4px); }
          70% { opacity: 0.3; filter: brightness(1.5) blur(2px); }
          100% { opacity: 1; filter: brightness(1) blur(0); }
        }
        .circuit-transition {
          animation: circuit-switch 0.6s ease-in-out;
        }
        .circuit-transition::after {
          content: '';
          position: absolute;
          inset: 0;
          background: ${primaryColor};
          opacity: 0;
          pointer-events: none;
          animation: circuit-flash 0.6s ease-in-out;
        }
        @keyframes circuit-flash {
          0%, 100% { opacity: 0; }
          40% { opacity: 0.15; }
          60% { opacity: 0.1; }
        }
      `}</style>
    </div>
  )
}
