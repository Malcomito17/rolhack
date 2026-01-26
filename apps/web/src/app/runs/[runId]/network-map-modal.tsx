'use client'

import { useMemo } from 'react'
import type { CircuitDefinition, RunState } from '@/lib/engine/types'
import type { SemanticColors, ThemeTerminology } from '@/lib/theme/types'

interface NetworkMapModalProps {
  circuit: CircuitDefinition
  runState: RunState
  theme: {
    primaryColor: string
    secondaryColor: string
    textColor: string
    background: string
  }
  semanticColors: SemanticColors
  terminology: ThemeTerminology
  onClose: () => void
}

interface NodeWithPosition {
  id: string
  name: string
  level: number
  x: number
  y: number
  isFinal?: boolean
}

export function NetworkMapModal({
  circuit,
  runState,
  theme,
  semanticColors,
  terminology,
  onClose,
}: NetworkMapModalProps) {
  const { primaryColor, secondaryColor, textColor, background } = theme

  // Calculate positions for nodes (using mapX/mapY or auto-layout)
  const nodesWithPositions = useMemo<NodeWithPosition[]>(() => {
    // Group nodes by level for auto-layout
    const nodesByLevel: Record<number, typeof circuit.nodes> = {}
    circuit.nodes.forEach(node => {
      const level = node.level
      if (!nodesByLevel[level]) nodesByLevel[level] = []
      nodesByLevel[level].push(node)
    })

    const levels = Object.keys(nodesByLevel).map(Number).sort((a, b) => a - b)
    const maxLevel = Math.max(...levels, 0)

    return circuit.nodes.map(node => {
      // Use manual position if defined
      if (node.mapX !== undefined && node.mapY !== undefined) {
        return { id: node.id, name: node.name, level: node.level, x: node.mapX, y: node.mapY, isFinal: node.isFinal }
      }

      // Auto-calculate position based on level
      const levelNodes = nodesByLevel[node.level] || []
      const indexInLevel = levelNodes.indexOf(node)
      const countInLevel = levelNodes.length

      // Y: level 0 at bottom, higher levels go up (SVG y is inverted)
      const y = maxLevel === 0 ? 50 : 85 - (node.level / maxLevel) * 70

      // X: spread evenly across the level
      const x = countInLevel === 1 ? 50 : 15 + (indexInLevel / (countInLevel - 1)) * 70

      return { id: node.id, name: node.name, level: node.level, x, y, isFinal: node.isFinal }
    })
  }, [circuit.nodes])

  // Helpers
  const getNodeState = (nodeId: string) => runState.nodes[nodeId]
  const getLinkState = (linkId: string) => runState.links[linkId]

  const isNodeVisible = (nodeId: string) => {
    const state = getNodeState(nodeId)
    return state?.descubierto === true
  }

  const isLinkVisible = (link: typeof circuit.links[0]) => {
    const linkState = getLinkState(link.id)
    // Hidden links only show when discovered
    if (link.hidden && !linkState?.descubierto) return false
    // Links show if both endpoints are discovered
    return isNodeVisible(link.from) && isNodeVisible(link.to)
  }

  const getNodeColor = (nodeId: string) => {
    const state = getNodeState(nodeId)
    const isCurrentNode = runState.position.nodeId === nodeId

    if (isCurrentNode) return semanticColors.currentNode
    if (state?.bloqueado) return semanticColors.blockedNode
    if (state?.hackeado) return semanticColors.hackedNode
    if (state?.descubierto) return semanticColors.pendingNode
    return textColor + '33'
  }

  const getLinkStrokeDash = (link: typeof circuit.links[0]) => {
    switch (link.style) {
      case 'dashed': return '6,3'
      case 'dotted': return '2,3'
      default: return 'none'
    }
  }

  const getLinkColor = (link: typeof circuit.links[0]) => {
    if (link.hidden) return secondaryColor
    return primaryColor + 'bb'
  }

  const getNodePosition = (nodeId: string) => {
    const node = nodesWithPositions.find(n => n.id === nodeId)
    return node ? { x: node.x, y: node.y } : { x: 50, y: 50 }
  }

  // Stats
  const stats = useMemo(() => {
    let total = 0, discovered = 0, hacked = 0, blocked = 0
    circuit.nodes.forEach(node => {
      total++
      const state = getNodeState(node.id)
      if (state?.descubierto) discovered++
      if (state?.hackeado) hacked++
      if (state?.bloqueado) blocked++
    })
    return { total, discovered, hacked, blocked, pending: discovered - hacked - blocked }
  }, [circuit.nodes, runState])

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl rounded-lg overflow-hidden"
        style={{
          backgroundColor: background,
          border: `2px solid ${primaryColor}`,
          boxShadow: `0 0 40px ${primaryColor}33`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: primaryColor + '44' }}
        >
          <div className="flex items-center gap-3">
            <span style={{ color: primaryColor }} className="text-lg font-bold font-mono">
              [{terminology.map}]
            </span>
            <span style={{ color: textColor }} className="font-mono opacity-70">
              {circuit.name.toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span style={{ color: textColor }} className="text-xs font-mono opacity-60">
              {terminology.progress}: {stats.hacked}/{stats.total}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 rounded text-sm font-mono transition-opacity hover:opacity-70 cursor-pointer"
              style={{ border: `1px solid ${primaryColor}`, color: primaryColor }}
            >
              [X]
            </button>
          </div>
        </div>

        {/* Map Area */}
        <div className="relative" style={{ height: '60vh', minHeight: '400px' }}>
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Background grid */}
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path
                  d="M 10 0 L 0 0 0 10"
                  fill="none"
                  stroke={primaryColor + '15'}
                  strokeWidth="0.2"
                />
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#grid)" />

            {/* Links */}
            {circuit.links.map(link => {
              if (!isLinkVisible(link)) return null

              const from = getNodePosition(link.from)
              const to = getNodePosition(link.to)

              return (
                <line
                  key={link.id}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={getLinkColor(link)}
                  strokeWidth="0.4"
                  strokeDasharray={getLinkStrokeDash(link)}
                  opacity={link.hidden ? 0.8 : 1}
                />
              )
            })}

            {/* Nodes */}
            {nodesWithPositions.map(node => {
              if (!isNodeVisible(node.id)) return null

              const nodeState = getNodeState(node.id)
              const isCurrentNode = runState.position.nodeId === node.id
              const color = getNodeColor(node.id)
              const radius = isCurrentNode ? 4.5 : 3.5

              return (
                <g key={node.id}>
                  {/* Pulse ring for current node */}
                  {isCurrentNode && (
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={radius + 2}
                      fill="none"
                      stroke={semanticColors.currentNode}
                      strokeWidth="0.3"
                      opacity="0.5"
                      className="animate-pulse"
                    />
                  )}

                  {/* Node circle */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={radius}
                    fill={background}
                    stroke={color}
                    strokeWidth={isCurrentNode ? 0.6 : 0.4}
                  />

                  {/* Level number inside */}
                  <text
                    x={node.x}
                    y={node.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={color}
                    fontSize="2.5"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {node.level}
                  </text>

                  {/* Node name */}
                  <text
                    x={node.x}
                    y={node.y + 6}
                    textAnchor="middle"
                    fill={color}
                    fontSize="1.8"
                    fontFamily="monospace"
                    opacity={isCurrentNode ? 1 : 0.8}
                  >
                    {node.name.length > 18 ? node.name.substring(0, 18) + '..' : node.name}
                  </text>

                  {/* Status indicator dot */}
                  {(nodeState?.hackeado || nodeState?.bloqueado) && (
                    <circle
                      cx={node.x + radius - 0.5}
                      cy={node.y - radius + 0.5}
                      r="1"
                      fill={nodeState.bloqueado ? semanticColors.blockedNode : semanticColors.hackedNode}
                    />
                  )}

                  {/* Final node indicator - target/star */}
                  {node.isFinal && (
                    <>
                      {/* Outer target ring */}
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={radius + 3}
                        fill="none"
                        stroke={semanticColors.success}
                        strokeWidth="0.3"
                        strokeDasharray="1,1"
                        opacity="0.7"
                      />
                      {/* Corner markers */}
                      <text
                        x={node.x}
                        y={node.y - radius - 4.5}
                        textAnchor="middle"
                        fill={semanticColors.success}
                        fontSize="2"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        {terminology.finalNode}
                      </text>
                    </>
                  )}
                </g>
              )
            })}
          </svg>
        </div>

        {/* Legend */}
        <div
          className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 px-4 py-3 border-t font-mono text-xs"
          style={{ borderColor: primaryColor + '44', color: textColor }}
        >
          <span className="flex items-center gap-2">
            <span
              className="w-4 h-4 rounded-full flex items-center justify-center text-[8px]"
              style={{ border: `2px solid ${semanticColors.currentNode}`, color: semanticColors.currentNode }}
            >
              0
            </span>
            {terminology.node} actual
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: semanticColors.hackedNode }} />
            {terminology.hacked}
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: semanticColors.pendingNode }} />
            {terminology.pending}
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: semanticColors.blockedNode }} />
            {terminology.blocked}
          </span>
          <span className="flex items-center gap-2">
            <span className="w-6 border-t-2" style={{ borderColor: primaryColor, borderStyle: 'solid' }} />
            {terminology.link}
          </span>
          <span className="flex items-center gap-2">
            <span className="w-6 border-t-2" style={{ borderColor: secondaryColor, borderStyle: 'dashed' }} />
            {terminology.hidden}
          </span>
          <span className="flex items-center gap-2">
            <span
              className="w-4 h-4 rounded-full flex items-center justify-center text-[8px]"
              style={{ border: `1px dashed ${semanticColors.success}`, color: semanticColors.success }}
            >
              F
            </span>
            {terminology.finalNode}
          </span>
        </div>
      </div>
    </div>
  )
}
