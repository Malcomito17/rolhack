'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import Link from 'next/link'
import type { ProjectData, RunState } from '@/lib/engine'
import type { AttemptHackResult, DiscoverLinksResult, MoveToNodeResult } from '@/lib/engine/types'

interface Props {
  projectName: string
  state: RunState
  projectData: ProjectData
  theme: {
    primaryColor: string
    secondaryColor: string
    textColor: string
    bgColor: string
  }
  effects: {
    scanlines: boolean
    glitch: boolean
    flicker: boolean
  }
  onHack: (inputValue: number) => AttemptHackResult
  onDiscover: () => DiscoverLinksResult
  onMove: (targetNodeId: string) => MoveToNodeResult
}

export function DemoImmersiveView({
  projectName,
  state,
  projectData,
  theme,
  effects,
  onHack,
  onDiscover,
  onMove,
}: Props) {
  const { primaryColor, secondaryColor, textColor, bgColor } = theme

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
      const isFromNode = link.from === nodeId || link.to === nodeId
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

    const currentNodeStateLocal = state.nodes[currentNodeId]
    const currentIsHacked = currentNodeStateLocal?.hackeado === true

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
        } else if (link.to === currentNodeId) {
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
      addLine('system', '> INITIALIZING DEMO MODE...')
      await new Promise(r => setTimeout(r, 300))
      addLine('system', `> CONNECTED TO: ${projectName.toUpperCase()}`)
      await new Promise(r => setTimeout(r, 200))
      addLine('system', `> CURRENT NODE: ${currentNode?.name || 'UNKNOWN'}`)
      await new Promise(r => setTimeout(r, 200))
      addLine('info', '> TUTORIAL MODE ACTIVE')
      addLine('system', '> READY FOR INPUT...')
    }
    bootSequence()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Scroll to bottom on new lines
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [terminalLines])

  // Game actions (local engine calls)
  function doHack() {
    if (!hackInput) return
    setLoading(true)
    addLine('user', `> EXEC BREACH [${hackInput}]`)

    // Small delay for visual effect
    setTimeout(() => {
      const result = onHack(parseInt(hackInput, 10))

      if (result.success) {
        addLine('success', `> ${result.message}`)
      } else {
        addLine('error', `> ${result.message}`)
      }

      if (result.warning) {
        addLine('error', `> WARNING: ${result.warning.severity} - ${result.warning.message}`)
      }

      setHackInput('')
      setLoading(false)
    }, 300)
  }

  function doDiscover() {
    setLoading(true)
    addLine('user', '> EXEC SCAN')

    setTimeout(() => {
      const result = onDiscover()

      if (result.discoveredLinks.length > 0) {
        addLine('success', `> ${result.message}`)
        result.discoveredLinks.forEach((linkId: string) => {
          addLine('info', `> PATHWAY REVEALED: ${linkId.slice(0, 12).toUpperCase()}`)
        })
      } else {
        addLine('info', `> ${result.message}`)
      }

      setLoading(false)
    }, 300)
  }

  function doMove(targetNodeId: string, targetName: string) {
    setLoading(true)
    addLine('user', `> EXEC MOVE [${targetName.toUpperCase()}]`)

    setTimeout(() => {
      const result = onMove(targetNodeId)

      if (result.success) {
        addLine('success', `> ${result.message}`)
        addLine('system', `> CURRENT NODE: ${targetName.toUpperCase()}`)
      } else {
        addLine('error', `> ${result.message}`)
      }

      setLoading(false)
    }, 200)
  }

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && hackInput) {
      doHack()
    }
  }

  return (
    <div
      className={`h-screen flex flex-col font-mono relative overflow-hidden ${effects.flicker ? 'animate-flicker' : ''}`}
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

      {/* Background gradient */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: `linear-gradient(to bottom, ${primaryColor}08, ${bgColor})` }} />

      {/* Header - with demo banner space */}
      <header className="relative z-10 border-b px-2 sm:px-4 py-2 mt-10 flex-shrink-0" style={{ borderColor: `${primaryColor}33` }}>
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between gap-2">
            {/* Left: Back */}
            <Link
              href="/"
              className="text-[10px] sm:text-xs opacity-60 hover:opacity-100 transition-opacity"
              style={{ color: primaryColor }}
            >
              <span className="hidden sm:inline">[ESC] EXIT DEMO</span>
              <span className="sm:hidden">[ESC]</span>
            </Link>

            {/* Center: Project name */}
            <div className="text-center flex-1 min-w-0 px-2">
              <p className="text-[10px] sm:text-xs opacity-60 truncate" style={{ color: primaryColor }}>DEMO MODE</p>
              <p className="text-xs sm:text-sm font-bold truncate" style={{ color: primaryColor }}>{projectName}</p>
            </div>

            {/* Right: Placeholder */}
            <div className="w-12 sm:w-20" />
          </div>
        </div>
      </header>

      {/* Main terminal */}
      <main className="relative z-10 flex flex-col flex-1 min-h-0">
        {/* Terminal output */}
        <div
          ref={terminalRef}
          className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-0.5 sm:space-y-1"
        >
          {terminalLines.map((line, i) => (
            <p
              key={i}
              className={`text-xs sm:text-sm ${
                line.type === 'system' ? 'opacity-60' :
                line.type === 'user' ? '' :
                line.type === 'success' ? 'font-bold' :
                line.type === 'error' ? 'font-bold' :
                'opacity-80'
              }`}
              style={{
                color: line.type === 'error' ? '#ff5555' :
                       line.type === 'success' ? primaryColor :
                       line.type === 'info' ? secondaryColor :
                       textColor
              }}
            >
              {line.text}
            </p>
          ))}
        </div>

        {/* Status bar */}
        <div
          className="border-t border-b px-2 sm:px-4 py-1 sm:py-1.5 text-[9px] sm:text-[10px] flex-shrink-0"
          style={{ borderColor: `${primaryColor}33`, backgroundColor: `${bgColor}ee` }}
        >
          <div className="max-w-4xl mx-auto flex flex-wrap items-center gap-x-2 sm:gap-x-4 gap-y-0.5">
            {/* Node info */}
            <span style={{ color: `${primaryColor}88` }}>NODE:</span>
            <span style={{ color: primaryColor }}>{currentNode?.name || '???'}</span>

            <span className="hidden sm:inline" style={{ color: `${primaryColor}33` }}>|</span>

            {/* CD */}
            <span style={{ color: `${primaryColor}88` }}>CD:</span>
            <span style={{ color: secondaryColor }}>{currentNode?.cd || 0}</span>

            <span className="hidden sm:inline" style={{ color: `${primaryColor}33` }}>|</span>

            {/* Status */}
            <span style={{ color: `${primaryColor}88` }}>STATUS:</span>
            <span style={{
              color: currentNodeState?.hackeado ? primaryColor :
                     currentNodeState?.bloqueado ? '#ff5555' :
                     '#ffff55'
            }}>
              {currentNodeState?.hackeado ? 'HACKED' :
               currentNodeState?.bloqueado ? 'BLOCKED' :
               'SECURE'}
            </span>

            {/* Available moves */}
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

        {/* Input area */}
        <div className="border-t px-2 sm:px-4 py-2 sm:py-3 flex-shrink-0" style={{ borderColor: `${primaryColor}33`, backgroundColor: `${bgColor}ee` }}>
          <div className="max-w-4xl mx-auto">
            {/* Action buttons */}
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

            {/* Command prompt */}
            <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-sm">
              <span className="truncate max-w-[150px] sm:max-w-none" style={{ color: `${primaryColor}88` }}>
                demo@{currentNode?.name?.toLowerCase().replace(/\s+/g, '-') || 'unknown'}:~$
              </span>
              <span className={loading ? 'animate-pulse' : ''} style={{ color: primaryColor }}>
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
            ${primaryColor}08 0px,
            ${primaryColor}08 1px,
            transparent 1px,
            transparent 2px
          );
        }

        @keyframes flicker {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.98; }
          52% { opacity: 0.95; }
          54% { opacity: 1; }
        }

        .animate-flicker {
          animation: flicker 0.15s infinite;
        }

        @keyframes glitch {
          0%, 100% { transform: translate(0); }
          20% { transform: translate(-2px, 2px); }
          40% { transform: translate(-2px, -2px); }
          60% { transform: translate(2px, 2px); }
          80% { transform: translate(2px, -2px); }
        }

        .animate-glitch {
          animation: glitch 0.3s infinite;
        }
      `}</style>
    </div>
  )
}
