'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import type { ProjectData, RunState } from '@/lib/engine'
import type { AttemptHackResult, DiscoverLinksResult, MoveToNodeResult } from '@/lib/engine/types'
import { CircuitMap } from '../runs/[runId]/circuit-map'
import { BackgroundLayer, ThemedEffects } from '@/components/theme'
import type { ThemeDefinition, ThemeEffects, ThemeTerminology, SemanticColors } from '@/lib/theme'
import { DEFAULT_TERMINOLOGY, DEFAULT_SEMANTIC_COLORS, DEFAULT_EFFECTS } from '@/lib/theme'

interface Props {
  projectName: string
  state: RunState
  projectData: ProjectData
  theme: {
    primaryColor: string
    secondaryColor: string
    textColor: string
    bgColor: string
    semanticColors?: Partial<SemanticColors>
    terminology?: Partial<ThemeTerminology>
  }
  effects: Partial<ThemeEffects>
  onHack: (inputValue: number, failDieRoll?: number) => AttemptHackResult
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

  // Get semantic colors from theme (for node states)
  const semanticColors = useMemo<SemanticColors>(() => ({
    ...DEFAULT_SEMANTIC_COLORS,
    ...(theme.semanticColors || {}),
    hackedNode: theme.semanticColors?.hackedNode || primaryColor,
  }), [theme.semanticColors, primaryColor])

  // Get terminology from theme (for UI labels)
  const terminology = useMemo<ThemeTerminology>(() => ({
    ...DEFAULT_TERMINOLOGY,
    ...(theme.terminology || {}),
  }), [theme.terminology])

  // Merge effects with defaults
  const mergedEffects = useMemo<ThemeEffects>(() => ({
    ...DEFAULT_EFFECTS,
    ...effects,
  }), [effects])

  const [loading, setLoading] = useState(false)
  const [hackInput, setHackInput] = useState('')
  const [terminalLines, setTerminalLines] = useState<{ type: 'system' | 'user' | 'success' | 'error' | 'info' | 'warning'; text: string }[]>([])
  const terminalRef = useRef<HTMLDivElement>(null)
  const [showGameOver, setShowGameOver] = useState(false)
  const [gameOverMessage, setGameOverMessage] = useState('')

  // Phase 2 state (fail die roll after failed CD check)
  const [pendingPhase2, setPendingPhase2] = useState(false)
  const [phase2FailDie, setPhase2FailDie] = useState<number>(0)
  const [phase2Input, setPhase2Input] = useState('')
  const [phase1Value, setPhase1Value] = useState<number>(0)

  // Get current circuit and node
  const currentCircuit = projectData.circuits.find(c => c.id === state.position.circuitId)
  const currentNode = currentCircuit?.nodes.find(n => n.id === state.position.nodeId)
  const currentNodeState = state.nodes[state.position.nodeId]

  // Check if current circuit is blocked
  const currentCircuitBlocked = state.blockedCircuits?.[state.position.circuitId] === true

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
  const addLine = (type: 'system' | 'user' | 'success' | 'error' | 'info' | 'warning', text: string) => {
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
    const inputVal = parseInt(hackInput, 10)
    addLine('user', `> EXEC BREACH [${hackInput}]`)

    // Small delay for visual effect
    setTimeout(() => {
      const result = onHack(inputVal)

      // Check if phase 2 is needed (first roll failed CD check)
      if (result.needsPhase2) {
        addLine('warning', '> ════════════════════════════════════════')
        addLine('warning', `> ${terminology.phase2Required || 'BREACH FAILED — SYSTEM COUNTERATTACK'}`)
        addLine('warning', `> ${terminology.phase2Instruction || 'ROLL FAIL DIE'}: D${result.failDie} (1-${result.failDie})`)
        addLine('warning', '> ════════════════════════════════════════')
        // Store values and enter phase 2 mode
        setPhase1Value(inputVal)
        setPhase2FailDie(result.failDie || 4)
        setPendingPhase2(true)
        setHackInput('')
        setLoading(false)
        return
      }

      if (result.success) {
        addLine('success', `> ${result.message}`)
      } else {
        addLine('error', `> ${result.message}`)

        // Check for circuit blocked
        if (result.circuitBlocked) {
          addLine('error', '> ═══════════════════════════════════════')
          addLine('error', '> CIRCUIT LOCKDOWN INITIATED')
          addLine('error', '> ALL ACCESS TO THIS NETWORK REVOKED')
          addLine('error', '> ═══════════════════════════════════════')
        }

        // Check for game over (critical failure on CD 1-2)
        if (result.gameOver) {
          setGameOverMessage(result.message)
          setShowGameOver(true)
        }
      }

      if (result.warning) {
        addLine('warning', '> ════════════════════════════════════════')
        addLine('warning', `> ⚠ ${result.warning.message}`)
        addLine('warning', '> ════════════════════════════════════════')
        addLine('info', `> ${terminology.retryAvailable || 'RETRY AVAILABLE — SYSTEM STILL ACCESSIBLE'}`)
      }

      setHackInput('')
      setLoading(false)
    }, 300)
  }

  // Phase 2 hack - submit fail die roll after phase 1 failure
  function doPhase2Hack() {
    if (!phase2Input) return
    setLoading(true)
    const failDieRoll = parseInt(phase2Input, 10)
    addLine('user', `> FAIL DIE ROLL: [${failDieRoll}] (D${phase2FailDie})`)

    setTimeout(() => {
      const result = onHack(phase1Value, failDieRoll)

      // Reset phase 2 state
      setPendingPhase2(false)
      setPhase2Input('')
      setPhase2FailDie(0)
      setPhase1Value(0)

      if (result.success) {
        addLine('success', `> ${result.message}`)
      } else {
        addLine('error', `> ${result.message}`)

        // Check for circuit blocked
        if (result.circuitBlocked) {
          addLine('error', '> ═══════════════════════════════════════')
          addLine('error', '> CIRCUIT LOCKDOWN INITIATED')
          addLine('error', '> ALL ACCESS TO THIS NETWORK REVOKED')
          addLine('error', '> ═══════════════════════════════════════')
        }

        // Check for game over
        if (result.gameOver) {
          setGameOverMessage(result.message)
          setShowGameOver(true)
        }
      }

      if (result.warning) {
        addLine('warning', '> ════════════════════════════════════════')
        addLine('warning', `> ⚠ ${result.warning.message}`)
        addLine('warning', '> ════════════════════════════════════════')
        addLine('info', `> ${terminology.retryAvailable || 'RETRY AVAILABLE — SYSTEM STILL ACCESSIBLE'}`)
      }

      setLoading(false)
    }, 300)
  }

  // Cancel phase 2 (reset to normal state without submitting)
  const cancelPhase2 = () => {
    setPendingPhase2(false)
    setPhase2Input('')
    setPhase2FailDie(0)
    setPhase1Value(0)
    addLine('info', '> FAIL DIE ROLL CANCELLED')
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

  // Handle key press for phase 1
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && hackInput) {
      doHack()
    }
  }

  // Handle key press for phase 2
  const handlePhase2KeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && phase2Input) {
      doPhase2Hack()
    }
  }

  return (
    <div
      className={`h-screen flex flex-col font-mono relative overflow-hidden ${mergedEffects.flicker ? 'animate-flicker' : ''}`}
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      {/* Background layer (image, overlay, pattern) */}
      <BackgroundLayer theme={theme as Partial<ThemeDefinition>} />

      {/* Themed effects (scanlines, glitch, fog, embers, etc.) */}
      <ThemedEffects effects={mergedEffects} primaryColor={primaryColor} />

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

      {/* Main content area with sidebar */}
      <div className="relative z-10 flex flex-1 min-h-0">
        {/* Main terminal */}
        <main className="flex flex-col flex-1 min-h-0">
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
                line.type === 'warning' ? 'font-bold animate-pulse' :
                'opacity-80'
              }`}
              style={{
                color: line.type === 'error' ? '#ff5555' :
                       line.type === 'success' ? primaryColor :
                       line.type === 'warning' ? '#ffaa00' :
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
            <span style={{ color: `${primaryColor}88` }}>{terminology.node.toUpperCase()}:</span>
            <span style={{ color: primaryColor }}>{currentNode?.name || '???'}</span>

            <span className="hidden sm:inline" style={{ color: `${primaryColor}33` }}>|</span>

            {/* CD */}
            <span style={{ color: `${primaryColor}88` }}>CD:</span>
            <span style={{ color: secondaryColor }}>{currentNode?.cd || 0}</span>

            <span className="hidden sm:inline" style={{ color: `${primaryColor}33` }}>|</span>

            {/* Status */}
            <span style={{ color: `${primaryColor}88` }}>STATUS:</span>
            <span style={{
              color: currentNodeState?.hackeado ? semanticColors.hackedNode :
                     currentNodeState?.bloqueado ? semanticColors.blockedNode :
                     semanticColors.pendingNode
            }}>
              {currentNodeState?.hackeado ? terminology.hacked.toUpperCase() :
               currentNodeState?.bloqueado ? terminology.blocked.toUpperCase() :
               terminology.secure.toUpperCase()}
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
              {/* Circuit Blocked Message */}
              {currentCircuitBlocked ? (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full">
                  <div
                    className="flex items-center gap-2 px-3 py-2 rounded text-xs sm:text-sm animate-pulse"
                    style={{ backgroundColor: '#ff555522', border: '1px solid #ff5555', color: '#ff5555' }}
                  >
                    <span>⚠</span>
                    <span>CIRCUIT LOCKDOWN — DEMO ENDED</span>
                  </div>
                  <Link
                    href="/"
                    className="px-3 py-2 rounded text-xs sm:text-sm font-bold transition-colors"
                    style={{ backgroundColor: `${secondaryColor}22`, border: `1px solid ${secondaryColor}`, color: secondaryColor }}
                  >
                    EXIT DEMO
                  </Link>
                </div>
              ) : (
                <>
                  {/* Phase 2 Input - Fail die roll after failed CD check */}
                  {pendingPhase2 && (
                    <div
                      className="flex flex-col sm:flex-row gap-2 p-2 sm:p-3 rounded w-full animate-pulse"
                      style={{
                        backgroundColor: '#ff660022',
                        border: `2px solid #ff6600`,
                        boxShadow: '0 0 20px #ff660044, inset 0 0 30px #ff660011',
                      }}
                    >
                      <div className="flex flex-col gap-1 flex-1">
                        <span
                          className="text-[10px] sm:text-xs font-bold tracking-wider"
                          style={{ color: '#ff9900' }}
                        >
                          ⚠ {terminology.phase2Title || 'DADO DE FALLO REQUERIDO'}
                        </span>
                        <span
                          className="text-[9px] sm:text-[10px] opacity-80"
                          style={{ color: '#ffaa00' }}
                        >
                          {terminology.phase2Range || 'INGRESA VALOR'}: 1 - {phase2FailDie} (D{phase2FailDie})
                        </span>
                      </div>
                      <div className="flex gap-1 items-center">
                        <input
                          type="number"
                          value={phase2Input}
                          onChange={(e) => {
                            const val = e.target.value
                            if (val === '' || (parseInt(val) >= 1 && parseInt(val) <= phase2FailDie)) {
                              setPhase2Input(val)
                            }
                          }}
                          onBlur={(e) => {
                            const val = parseInt(e.target.value)
                            if (!isNaN(val)) {
                              setPhase2Input(String(Math.max(1, Math.min(phase2FailDie, val))))
                            }
                          }}
                          onKeyPress={handlePhase2KeyPress}
                          placeholder={`1-${phase2FailDie}`}
                          min={1}
                          max={phase2FailDie}
                          autoFocus
                          className="w-16 sm:w-20 bg-transparent rounded px-1 sm:px-2 py-1.5 text-center text-sm sm:text-base font-bold focus:outline-none"
                          style={{
                            border: `2px solid #ff9900`,
                            color: '#ffcc00',
                            backgroundColor: '#1a0a0022',
                          }}
                          disabled={loading}
                        />
                        <button
                          onClick={doPhase2Hack}
                          disabled={loading || !phase2Input}
                          className="px-3 sm:px-4 py-1.5 rounded text-xs sm:text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105"
                          style={{
                            border: `2px solid #ff9900`,
                            color: '#ffcc00',
                            backgroundColor: '#ff660033',
                          }}
                        >
                          D{phase2FailDie}
                        </button>
                        <button
                          onClick={cancelPhase2}
                          disabled={loading}
                          className="px-2 py-1.5 rounded text-[10px] sm:text-xs opacity-60 hover:opacity-100 transition-opacity"
                          style={{
                            border: `1px solid #ff660066`,
                            color: '#ff6600',
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Hack input - only show if not hacked and not blocked AND not in phase 2 */}
                  {!pendingPhase2 && currentNodeState && !currentNodeState.hackeado && !currentNodeState.bloqueado && (
                    <div className="flex gap-1">
                      <input
                        type="number"
                        value={hackInput}
                        onChange={(e) => {
                          const val = e.target.value
                          if (val === '' || (parseInt(val) >= 1 && parseInt(val) <= 20)) {
                            setHackInput(val)
                          }
                        }}
                        onBlur={(e) => {
                          const val = parseInt(e.target.value)
                          if (!isNaN(val)) {
                            setHackInput(String(Math.max(1, Math.min(20, val))))
                          }
                        }}
                        onKeyPress={handleKeyPress}
                        placeholder="1-20"
                        min={1}
                        max={20}
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
                        {terminology.breach.toUpperCase()}
                      </button>
                      {/* Scan button - always visible, only works when hidden links available */}
                      <button
                        onClick={() => {
                          if (hasHiddenLinks()) {
                            doDiscover()
                          }
                        }}
                        disabled={loading}
                        className="px-2 py-1 rounded text-xs sm:text-sm transition-colors"
                        style={{
                          border: `1px solid ${secondaryColor}88`,
                          color: secondaryColor,
                        }}
                      >
                        @
                      </button>
                    </div>
                  )}

                  {/* Move buttons - hidden during phase 2 */}
                  {!pendingPhase2 && (
                    <>
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
                          <span className="hidden sm:inline">{terminology.move.toUpperCase()}: </span>{node.name}
                        </button>
                      ))}

                      {availableMoves.advance.map(node => (
                        <button
                          key={node.id}
                          onClick={() => doMove(node.id, node.name)}
                          disabled={loading}
                          className="px-2 sm:px-3 py-1 rounded text-[10px] sm:text-sm disabled:opacity-50 transition-colors"
                          style={{
                            border: `1px solid ${semanticColors.pendingNode}88`,
                            color: semanticColors.pendingNode,
                          }}
                        >
                          &gt; {node.name}
                        </button>
                      ))}
                    </>
                  )}
                </>
              )}
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

        {/* Circuit Map Sidebar - hidden on mobile */}
        {currentCircuit && (
          <div className="hidden md:block flex-shrink-0">
            <CircuitMap
              circuit={currentCircuit}
              state={state}
              theme={{ primaryColor, secondaryColor, textColor, bgColor }}
              semanticColors={semanticColors}
              mapStyle="graph"
              currentNodeId={state.position.nodeId}
            />
          </div>
        )}
      </div>

      {/* Game Over Modal */}
      {showGameOver && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95">
          {/* Glitch/explosion effect background */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 bg-red-900/20 animate-pulse" />
            <div
              className="absolute inset-0"
              style={{
                background: `
                  radial-gradient(circle at 50% 50%, #ff000033 0%, transparent 50%),
                  repeating-linear-gradient(0deg, #ff000008 0px, #ff000008 2px, transparent 2px, transparent 4px)
                `,
              }}
            />
          </div>

          {/* Game Over content */}
          <div className="relative z-10 text-center p-8 max-w-lg">
            {/* Skull/explosion icon */}
            <div className="text-8xl mb-6 animate-pulse">💀</div>

            {/* Main message */}
            <h1
              className="text-4xl sm:text-5xl font-bold mb-4 tracking-wider animate-pulse"
              style={{ color: '#ff0000', textShadow: '0 0 20px #ff0000, 0 0 40px #ff000088' }}
            >
              GAME OVER
            </h1>

            {/* Sub message */}
            <div
              className="text-lg sm:text-xl mb-6 font-mono"
              style={{ color: '#ff5555' }}
            >
              <p className="mb-2">NEURAL LINK DESTROYED</p>
              <p className="text-sm opacity-75">{gameOverMessage}</p>
            </div>

            {/* Terminal-style details */}
            <div
              className="text-left font-mono text-xs sm:text-sm p-4 rounded mb-6 mx-auto max-w-md"
              style={{ backgroundColor: '#1a0000', border: '1px solid #ff000044', color: '#ff5555' }}
            >
              <p className="mb-1">&gt; DEMO TERMINATED</p>
              <p className="mb-1">&gt; BLACK ICE COUNTERMEASURE ACTIVATED</p>
              <p>&gt; OPERATOR CONNECTION SEVERED</p>
            </div>

            {/* Action button */}
            <Link
              href="/"
              className="inline-block px-6 py-3 rounded text-lg font-bold transition-all hover:scale-105"
              style={{
                backgroundColor: '#ff000022',
                border: '2px solid #ff0000',
                color: '#ff0000',
                textShadow: '0 0 10px #ff0000',
              }}
            >
              DISCONNECT
            </Link>
          </div>
        </div>
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
