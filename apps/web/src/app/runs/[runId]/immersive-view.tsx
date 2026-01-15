'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import Link from 'next/link'
import type { ProjectData, RunState, Warning, CircuitDefinition } from '@/lib/engine'

interface Props {
  runId: string
  projectId: string
  projectName: string
  runName: string | null
  state: RunState
  projectData: ProjectData
  effects: {
    scanlines: boolean
    glitch: boolean
    flicker: boolean
  }
  onStateChange: (newState: RunState) => void
}

export function ImmersiveView({
  runId,
  projectId,
  projectName,
  runName,
  state,
  projectData,
  effects,
  onStateChange,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [hackInput, setHackInput] = useState('')
  const [terminalLines, setTerminalLines] = useState<{ type: 'system' | 'user' | 'success' | 'error' | 'info'; text: string }[]>([])
  const terminalRef = useRef<HTMLDivElement>(null)

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

  // Get available moves
  const getAvailableMoves = useCallback(() => {
    if (!currentCircuit) return { fastTravel: [], advance: [] }

    const currentNodeId = state.position.nodeId
    const fastTravel: { id: string; name: string }[] = []
    const advance: { id: string; name: string }[] = []

    const currentNodeState = state.nodes[currentNodeId]
    const currentIsHacked = currentNodeState?.hackeado === true

    for (const node of currentCircuit.nodes) {
      if (node.id === currentNodeId) continue
      const nodeState = state.nodes[node.id]
      if (!nodeState || nodeState.inaccesible || nodeState.bloqueado) continue

      if (nodeState.hackeado) {
        fastTravel.push({ id: node.id, name: node.name })
      }
    }

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
  }, [currentCircuit, state])

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
    <div className={`min-h-screen bg-black text-green-500 font-mono relative overflow-hidden ${effects.flicker ? 'animate-flicker' : ''}`}>
      {/* Scanlines overlay */}
      {effects.scanlines && (
        <div className="absolute inset-0 pointer-events-none z-50 bg-scanlines opacity-10" />
      )}

      {/* Glitch effect */}
      {effects.glitch && (
        <div className="absolute inset-0 pointer-events-none z-40 animate-glitch" />
      )}

      {/* Matrix rain background */}
      <div className="absolute inset-0 bg-gradient-to-b from-green-900/5 to-black pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 border-b border-green-900/50 px-4 py-2">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link
            href={`/projects/${projectId}`}
            className="text-green-700 hover:text-green-500 text-xs"
          >
            [ESC] DISCONNECT
          </Link>
          <div className="text-center">
            <p className="text-green-600 text-xs">{projectName}</p>
            <p className="text-green-500 text-sm font-bold">{runName || `RUN_${runId.slice(0, 8)}`}</p>
          </div>
          <div className="text-right text-xs">
            <p className="text-green-700">CIRCUIT: {currentCircuit?.name}</p>
          </div>
        </div>
      </header>

      {/* Main terminal */}
      <main className="relative z-10 flex flex-col h-[calc(100vh-60px)]">
        {/* Terminal output */}
        <div
          ref={terminalRef}
          className="flex-1 overflow-y-auto p-4 space-y-1"
        >
          {terminalLines.map((line, i) => (
            <p
              key={i}
              className={`text-sm ${
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

        {/* Status bar */}
        <div className="border-t border-green-900/50 px-4 py-2 bg-black/80">
          <div className="max-w-4xl mx-auto flex items-center gap-4 text-xs">
            <span className="text-green-700">NODE:</span>
            <span className={`font-bold ${
              currentNodeState?.hackeado ? 'text-green-400' :
              currentNodeState?.bloqueado ? 'text-red-500' :
              'text-yellow-500'
            }`}>
              {currentNode?.name || 'UNKNOWN'}
            </span>
            <span className="text-green-900">|</span>
            <span className="text-green-700">STATUS:</span>
            <span className={`${
              currentNodeState?.hackeado ? 'text-green-400' :
              currentNodeState?.bloqueado ? 'text-red-500' :
              'text-yellow-500'
            }`}>
              {currentNodeState?.hackeado ? 'COMPROMISED' :
               currentNodeState?.bloqueado ? 'LOCKED' :
               'SECURED'}
            </span>
            {availableMoves.fastTravel.length > 0 && (
              <>
                <span className="text-green-900">|</span>
                <span className="text-green-700">JUMP:</span>
                <span className="text-green-500">{availableMoves.fastTravel.length}</span>
              </>
            )}
            {availableMoves.advance.length > 0 && (
              <>
                <span className="text-green-900">|</span>
                <span className="text-green-700">ADVANCE:</span>
                <span className="text-cyan-500">{availableMoves.advance.length}</span>
              </>
            )}
          </div>
        </div>

        {/* Input area */}
        <div className="border-t border-green-900/50 px-4 py-3 bg-black/90">
          <div className="max-w-4xl mx-auto">
            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 mb-3">
              {/* Hack input - only show if not hacked and not blocked */}
              {currentNodeState && !currentNodeState.hackeado && !currentNodeState.bloqueado && (
                <div className="flex gap-1">
                  <input
                    type="number"
                    value={hackInput}
                    onChange={(e) => setHackInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="CODE"
                    className="w-20 bg-transparent border border-green-700 rounded px-2 py-1 text-green-400 text-center focus:border-green-500 focus:outline-none"
                    disabled={loading}
                  />
                  <button
                    onClick={doHack}
                    disabled={loading || !hackInput}
                    className="px-3 py-1 border border-green-700 hover:border-green-500 hover:bg-green-900/20 text-green-500 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
                  className="px-3 py-1 border border-cyan-700 hover:border-cyan-500 hover:bg-cyan-900/20 text-cyan-500 rounded text-sm disabled:opacity-50"
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
                  className="px-3 py-1 border border-green-600 hover:border-green-400 hover:bg-green-900/20 text-green-400 rounded text-sm disabled:opacity-50"
                >
                  JUMP: {node.name}
                </button>
              ))}

              {availableMoves.advance.map(node => (
                <button
                  key={node.id}
                  onClick={() => doMove(node.id, node.name)}
                  disabled={loading}
                  className="px-3 py-1 border border-yellow-700 hover:border-yellow-500 hover:bg-yellow-900/20 text-yellow-500 rounded text-sm disabled:opacity-50"
                >
                  &gt; {node.name}
                </button>
              ))}
            </div>

            {/* Command prompt */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-green-700">root@{currentNode?.name?.toLowerCase().replace(/\s+/g, '-') || 'unknown'}:~$</span>
              <span className={`${loading ? 'animate-pulse' : ''} text-green-500`}>
                {loading ? 'PROCESSING...' : '_'}
              </span>
            </div>
          </div>
        </div>
      </main>

      <style jsx>{`
        .bg-scanlines {
          background: repeating-linear-gradient(
            0deg,
            rgba(0, 255, 0, 0.03) 0px,
            rgba(0, 255, 0, 0.03) 1px,
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
      `}</style>
    </div>
  )
}
