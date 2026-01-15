'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import type { ProjectData, RunState, Warning, NodeDefinition, CircuitDefinition } from '@/lib/engine'

interface Props {
  runId: string
  projectId: string
  projectName: string
  runName: string | null
  initialState: RunState
  projectData: ProjectData
}

export function GameScreen({
  runId,
  projectId,
  projectName,
  runName,
  initialState,
  projectData,
}: Props) {
  const [state, setState] = useState<RunState>(initialState)
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

  // Get accessible node IDs
  const getAccessibleNodeIds = useCallback((): string[] => {
    if (!currentCircuit) return []
    const nodeId = state.position.nodeId
    const accessible: string[] = []

    for (const link of currentCircuit.links) {
      const linkState = state.links[link.id]
      if (!linkState?.descubierto || linkState.inaccesible) continue

      let targetId: string | null = null
      if (link.from === nodeId) {
        targetId = link.to
      } else if (link.bidirectional !== false && link.to === nodeId) {
        targetId = link.from
      }

      if (targetId) {
        const targetState = state.nodes[targetId]
        if (targetState && !targetState.inaccesible) {
          accessible.push(targetId)
        }
      }
    }
    return accessible
  }, [currentCircuit, state])

  const accessibleNodes = getAccessibleNodeIds()

  // API calls
  async function doHack() {
    if (!hackInput) return
    setLoading(true)
    setMessage(null)

    try {
      const res = await fetch(`/api/runs/${runId}/hack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeId: state.position.nodeId,
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
              <h2 className="text-sm font-medium text-gray-400 mb-4">
                Mapa del Circuito
              </h2>
              {currentCircuit && (
                <CircuitMap
                  circuit={currentCircuit}
                  state={state}
                  selectedNodeId={selectedNodeId}
                  accessibleNodes={accessibleNodes}
                  onSelectNode={setSelectedNodeId}
                />
              )}
            </div>
          </div>

          {/* Actions panel */}
          <div className="space-y-4">
            {/* Current node info */}
            <div className="bg-cyber-dark/50 border border-cyber-primary/20 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-400 mb-2">
                Nodo Actual
              </h3>
              {currentNode && currentNodeState && (
                <div>
                  <p className="text-xl font-bold text-white mb-1">
                    {currentNode.name}
                  </p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300">
                      Nivel {currentNode.level}
                    </span>
                    {currentNodeState.hackeado && (
                      <span className="text-xs px-2 py-0.5 rounded bg-cyber-primary/20 text-cyber-primary">
                        HACKEADO
                      </span>
                    )}
                    {currentNodeState.bloqueado && (
                      <span className="text-xs px-2 py-0.5 rounded bg-red-900/30 text-red-400">
                        BLOQUEADO
                      </span>
                    )}
                  </div>
                  {currentNode.description && (
                    <p className="text-gray-400 text-sm">
                      {currentNode.description}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Hack action */}
            {currentNode && currentNodeState && !currentNodeState.hackeado && !currentNodeState.bloqueado && (
              <div className="bg-cyber-dark/50 border border-gray-800 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-400 mb-3">
                  Hackear Nodo
                </h3>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={hackInput}
                    onChange={(e) => setHackInput(e.target.value)}
                    placeholder="Valor"
                    className="flex-1 bg-cyber-darker border border-gray-700 rounded px-3 py-2 text-white focus:border-cyber-primary focus:outline-none"
                    disabled={loading}
                  />
                  <button
                    onClick={doHack}
                    disabled={loading || !hackInput}
                    className="px-4 py-2 bg-cyber-primary/20 border border-cyber-primary/30 hover:bg-cyber-primary/30 text-cyber-primary rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? '...' : 'Ejecutar'}
                  </button>
                </div>
                <p className="text-gray-500 text-xs mt-2">
                  Modo de fallo: {currentNode.failMode === 'BLOQUEO' ? 'BLOQUEO (sin reintentos)' : 'WARNING (puedes reintentar)'}
                </p>
              </div>
            )}

            {/* Discover action */}
            <div className="bg-cyber-dark/50 border border-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-400">
                  Buscar Accesos
                </h3>
                <span className={`text-lg font-bold ${
                  hasHiddenLinks()
                    ? 'text-cyber-accent animate-pulse'
                    : 'text-gray-600'
                }`}>
                  A
                </span>
              </div>
              <button
                onClick={doDiscover}
                disabled={loading || !hasHiddenLinks()}
                className="w-full px-4 py-2 bg-cyber-accent/20 border border-cyber-accent/30 hover:bg-cyber-accent/30 text-cyber-accent rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Buscando...' : 'Buscar'}
              </button>
              {!hasHiddenLinks() && (
                <p className="text-gray-500 text-xs mt-2">
                  No hay accesos ocultos desde aqui
                </p>
              )}
            </div>

            {/* Move action */}
            {selectedNodeId && accessibleNodes.includes(selectedNodeId) && (
              <div className="bg-cyber-dark/50 border border-cyber-secondary/20 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-400 mb-3">
                  Moverse
                </h3>
                <button
                  onClick={() => doMove(selectedNodeId)}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-cyber-secondary/20 border border-cyber-secondary/30 hover:bg-cyber-secondary/30 text-cyber-secondary rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Moviendo...' : `Ir a ${
                    currentCircuit?.nodes.find(n => n.id === selectedNodeId)?.name || selectedNodeId
                  }`}
                </button>
              </div>
            )}

            {/* Message */}
            {message && (
              <div className={`rounded-lg p-4 ${
                message.type === 'success'
                  ? 'bg-green-900/20 border border-green-700/30 text-green-400'
                  : message.type === 'error'
                  ? 'bg-red-900/20 border border-red-700/30 text-red-400'
                  : 'bg-blue-900/20 border border-blue-700/30 text-blue-400'
              }`}>
                <p className="text-sm">{message.text}</p>
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
  accessibleNodes,
  onSelectNode,
}: {
  circuit: CircuitDefinition
  state: RunState
  selectedNodeId: string | null
  accessibleNodes: string[]
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
          <p className="text-xs text-gray-500 mb-2">Nivel {level}</p>
          <div className="flex flex-wrap gap-2">
            {nodesByLevel[level].map((node) => {
              const nodeState = state.nodes[node.id]
              const isDiscovered = nodeState?.descubierto
              const isHacked = nodeState?.hackeado
              const isBlocked = nodeState?.bloqueado
              const isCurrent = node.id === currentNodeId
              const isSelected = node.id === selectedNodeId
              const isAccessible = accessibleNodes.includes(node.id)

              if (!isDiscovered) {
                return (
                  <div
                    key={node.id}
                    className="px-4 py-2 rounded border border-gray-800 bg-gray-900/50 text-gray-600 text-sm"
                  >
                    ???
                  </div>
                )
              }

              return (
                <button
                  key={node.id}
                  onClick={() => onSelectNode(isSelected ? null : node.id)}
                  className={`px-4 py-2 rounded border text-sm font-medium transition-all ${
                    isCurrent
                      ? 'bg-cyber-primary/20 border-cyber-primary text-cyber-primary ring-2 ring-cyber-primary/50'
                      : isSelected
                      ? 'bg-cyber-secondary/20 border-cyber-secondary text-cyber-secondary'
                      : isBlocked
                      ? 'bg-red-900/20 border-red-700/30 text-red-400 cursor-not-allowed'
                      : isHacked
                      ? 'bg-cyber-primary/10 border-cyber-primary/30 text-cyber-primary/70 hover:border-cyber-primary/50'
                      : isAccessible
                      ? 'bg-gray-800 border-gray-600 text-white hover:border-cyber-secondary/50'
                      : 'bg-gray-900 border-gray-700 text-gray-400'
                  }`}
                  disabled={isCurrent || isBlocked}
                >
                  {node.name}
                  {isHacked && <span className="ml-1 text-xs">✓</span>}
                  {isBlocked && <span className="ml-1 text-xs">✕</span>}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
