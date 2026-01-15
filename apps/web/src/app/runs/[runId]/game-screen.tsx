'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import type { ProjectData, RunState, Warning, NodeDefinition, CircuitDefinition } from '@/lib/engine'
import { ImmersiveView } from './immersive-view'

interface VisualTemplate {
  layout: 'TECH' | 'IMMERSIVE'
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
}

export function GameScreen({
  runId,
  projectId,
  projectName,
  runName,
  initialState,
  projectData,
  visualTemplate,
}: Props) {
  const [state, setState] = useState<RunState>(initialState)

  // Render IMMERSIVE view if layout is IMMERSIVE
  if (visualTemplate.layout === 'IMMERSIVE') {
    return (
      <ImmersiveView
        runId={runId}
        projectId={projectId}
        projectName={projectName}
        runName={runName}
        state={state}
        projectData={projectData}
        effects={visualTemplate.effects}
        onStateChange={setState}
      />
    )
  }

  // Continue with TECH view below...
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)
  const [hackInput, setHackInput] = useState('')

  // Get current circuit and node
  const currentCircuit = projectData.circuits.find(c => c.id === state.position.circuitId)
  const currentNode = currentCircuit?.nodes.find(n => n.id === state.position.nodeId)
  const currentNodeState = state.nodes[state.position.nodeId]

  // Check if hidden links available
  const hasHiddenLinks = useCallback(() => {
    if (!currentCircuit) return false
    const nodeId = state.position.nodeId

    return currentCircuit.links.some(link => {
      const isFromNode = link.from === nodeId || (link.bidirectional !== false && link.to === nodeId)
      if (!isFromNode) return false
      const linkState = state.links[link.id]
      return link.hidden && linkState && !linkState.descubierto
    })
  }, [currentCircuit, state])

  // Get available moves (PROMPT 7: fast-travel to hacked, advance to linked if current is hacked)
  const getAvailableMoveIds = useCallback((): { fastTravel: string[]; advance: string[]; all: string[] } => {
    if (!currentCircuit) return { fastTravel: [], advance: [], all: [] }

    const currentNodeId = state.position.nodeId
    const fastTravel: string[] = []
    const advance: string[] = []

    const currentNodeState = state.nodes[currentNodeId]
    const currentIsHacked = currentNodeState?.hackeado === true

    // Collect all hacked nodes (fast-travel targets)
    for (const node of currentCircuit.nodes) {
      if (node.id === currentNodeId) continue
      const nodeState = state.nodes[node.id]
      if (!nodeState) continue
      if (nodeState.inaccesible || nodeState.bloqueado) continue

      if (nodeState.hackeado) {
        fastTravel.push(node.id)
      }
    }

    // If current node is hacked, collect linked non-hacked nodes (advance targets)
    if (currentIsHacked) {
      for (const link of currentCircuit.links) {
        const linkState = state.links[link.id]
        if (!linkState?.descubierto || linkState.inaccesible) continue

        let targetId: string | null = null
        if (link.from === currentNodeId) {
          targetId = link.to
        } else if (link.bidirectional !== false && link.to === currentNodeId) {
          targetId = link.from
        }

        if (targetId) {
          const targetState = state.nodes[targetId]
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
  }, [currentCircuit, state])

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
          <div className="text-right">
            <p className="text-gray-400 text-xs">Circuito</p>
            <p className="text-cyber-secondary font-medium">
              {currentCircuit?.name || 'Desconocido'}
            </p>
          </div>
        </div>
      </header>

      {/* Warnings bar */}
      {state.warnings.length > 0 && (
        <div className="bg-cyber-dark/80 border-b border-red-900/30 px-4 py-2">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-4 overflow-x-auto">
              {state.warnings.slice(-3).map((warning, i) => (
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
                  state={state}
                  selectedNodeId={selectedNodeId}
                  availableMoves={availableMoves}
                  onSelectNode={setSelectedNodeId}
                />
              )}
            </div>
          </div>

          {/* Actions panel */}
          <div className="space-y-4">
            {/* Current node info */}
            <div className="bg-cyber-dark/50 border border-cyber-primary/20 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-400">
                  TERMINAL ACTIVO
                </h3>
                <span className="text-xs font-mono text-gray-600">
                  {state.position.nodeId.slice(0, 8).toUpperCase()}
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

            {/* Hack action */}
            {currentNode && currentNodeState && !currentNodeState.hackeado && !currentNodeState.bloqueado && (
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

            {/* Discover action */}
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

            {/* Move action */}
            {selectedNodeId && accessibleNodes.includes(selectedNodeId) && (
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
