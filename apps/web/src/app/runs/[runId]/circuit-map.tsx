'use client'

import { useMemo } from 'react'
import type { CircuitDefinition, RunState } from '@/lib/engine'

export type MapStyle = 'graph' | 'breadcrumb' | 'none'

interface CircuitMapProps {
  circuit: CircuitDefinition
  state: RunState
  theme: {
    primaryColor: string
    secondaryColor: string
    textColor: string
    bgColor: string
  }
  mapStyle: MapStyle
  currentNodeId: string
}

interface NodeDisplay {
  id: string
  name: string
  level: number
  isHacked: boolean
  isBlocked: boolean
  isDiscovered: boolean
  isCurrent: boolean
  children: string[] // IDs of connected nodes at higher levels
}

export function CircuitMap({
  circuit,
  state,
  theme,
  mapStyle,
  currentNodeId,
}: CircuitMapProps) {
  const { primaryColor, secondaryColor, textColor, bgColor } = theme

  // Build the node display data
  const nodeDisplays = useMemo(() => {
    const displays: NodeDisplay[] = []

    // Build adjacency map from discovered links
    const adjacency: Record<string, string[]> = {}
    for (const link of circuit.links) {
      const linkState = state.links[link.id]
      if (!linkState?.descubierto) continue

      // Add both directions for bidirectional links
      if (!adjacency[link.from]) adjacency[link.from] = []
      if (!adjacency[link.to]) adjacency[link.to] = []

      adjacency[link.from].push(link.to)
      if (link.bidirectional !== false) {
        adjacency[link.to].push(link.from)
      }
    }

    for (const node of circuit.nodes) {
      const nodeState = state.nodes[node.id]
      if (!nodeState?.descubierto) continue

      // Find children (connected nodes at higher levels)
      const connectedIds = adjacency[node.id] || []
      const children = connectedIds.filter(id => {
        const connectedNode = circuit.nodes.find(n => n.id === id)
        const connectedState = state.nodes[id]
        return connectedNode &&
               connectedState?.descubierto &&
               connectedNode.level > node.level
      })

      displays.push({
        id: node.id,
        name: node.name,
        level: node.level,
        isHacked: nodeState.hackeado,
        isBlocked: nodeState.bloqueado,
        isDiscovered: nodeState.descubierto,
        isCurrent: node.id === currentNodeId,
        children,
      })
    }

    // Sort by level, then by name
    return displays.sort((a, b) => {
      if (a.level !== b.level) return a.level - b.level
      return a.name.localeCompare(b.name)
    })
  }, [circuit, state, currentNodeId])

  // Get stats
  const stats = useMemo(() => {
    let total = 0
    let discovered = 0
    let hacked = 0
    let blocked = 0

    for (const node of circuit.nodes) {
      total++
      const nodeState = state.nodes[node.id]
      if (nodeState?.descubierto) discovered++
      if (nodeState?.hackeado) hacked++
      if (nodeState?.bloqueado) blocked++
    }

    return {
      total,
      discovered,
      hacked,
      blocked,
      undiscovered: total - discovered,
    }
  }, [circuit, state])

  // Get node symbol based on state
  const getNodeSymbol = (node: NodeDisplay) => {
    if (node.isCurrent) return '●'
    if (node.isBlocked) return '×'
    if (node.isHacked) return '◉'
    return '○'
  }

  // Get node color based on state
  const getNodeColor = (node: NodeDisplay) => {
    if (node.isCurrent) return '#00ffff' // Cyan for current
    if (node.isBlocked) return '#ff5555' // Red for blocked
    if (node.isHacked) return primaryColor // Green for hacked
    return '#ffff55' // Yellow for pending
  }

  if (mapStyle === 'none') return null

  // Render Graph style
  if (mapStyle === 'graph') {
    return (
      <div
        className="h-full flex flex-col border-l font-mono text-xs"
        style={{ borderColor: `${primaryColor}33`, backgroundColor: `${bgColor}f0`, width: '200px' }}
      >
        {/* Header */}
        <div
          className="px-3 py-2 border-b flex items-center gap-2"
          style={{ borderColor: `${primaryColor}33` }}
        >
          <span style={{ color: `${primaryColor}66` }}>[</span>
          <span style={{ color: primaryColor }}>MAP</span>
          <span style={{ color: `${primaryColor}66` }}>]</span>
          <span style={{ color: textColor }} className="opacity-60">NETWORK_GRID</span>
        </div>

        {/* Node tree */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {nodeDisplays.map((node, index) => {
            const indent = node.level * 12
            const hasChildren = node.children.length > 0
            const isLast = index === nodeDisplays.length - 1 ||
                          nodeDisplays[index + 1]?.level <= node.level

            return (
              <div
                key={node.id}
                className="flex items-center gap-1 whitespace-nowrap"
                style={{ paddingLeft: `${indent}px` }}
              >
                {/* Tree connector */}
                {node.level > 0 && (
                  <span style={{ color: `${primaryColor}44` }}>
                    {isLast ? '└' : '├'}──
                  </span>
                )}

                {/* Node symbol */}
                <span style={{ color: getNodeColor(node) }}>
                  {getNodeSymbol(node)}
                </span>

                {/* Node name */}
                <span
                  className={`truncate ${node.isCurrent ? 'font-bold' : ''}`}
                  style={{
                    color: node.isCurrent ? '#00ffff' : textColor,
                    maxWidth: '100px',
                  }}
                  title={node.name}
                >
                  {node.name.toUpperCase()}
                </span>

                {/* Current indicator */}
                {node.isCurrent && (
                  <span style={{ color: '#00ffff' }} className="animate-pulse">←</span>
                )}
              </div>
            )
          })}

          {nodeDisplays.length === 0 && (
            <div style={{ color: `${textColor}66` }} className="text-center py-4">
              NO NODES DISCOVERED
            </div>
          )}
        </div>

        {/* Legend */}
        <div
          className="px-3 py-2 border-t space-y-1"
          style={{ borderColor: `${primaryColor}33` }}
        >
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1">
              <span style={{ color: primaryColor }}>◉</span>
              <span style={{ color: `${textColor}88` }}>HACKED</span>
            </span>
            <span style={{ color: primaryColor }}>{stats.hacked}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1">
              <span style={{ color: '#ffff55' }}>○</span>
              <span style={{ color: `${textColor}88` }}>PENDING</span>
            </span>
            <span style={{ color: '#ffff55' }}>{stats.discovered - stats.hacked - stats.blocked}</span>
          </div>
          {stats.blocked > 0 && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1">
                <span style={{ color: '#ff5555' }}>×</span>
                <span style={{ color: `${textColor}88` }}>BLOCKED</span>
              </span>
              <span style={{ color: '#ff5555' }}>{stats.blocked}</span>
            </div>
          )}
          {stats.undiscovered > 0 && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1">
                <span style={{ color: `${textColor}44` }}>?</span>
                <span style={{ color: `${textColor}88` }}>HIDDEN</span>
              </span>
              <span style={{ color: `${textColor}44` }}>{stats.undiscovered}</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Render Breadcrumb style
  return (
    <div
      className="h-full flex flex-col border-l font-mono text-xs"
      style={{ borderColor: `${primaryColor}33`, backgroundColor: `${bgColor}f0`, width: '180px' }}
    >
      {/* Header */}
      <div
        className="px-3 py-2 border-b flex items-center gap-2"
        style={{ borderColor: `${primaryColor}33` }}
      >
        <span style={{ color: `${primaryColor}66` }}>[</span>
        <span style={{ color: primaryColor }}>MAP</span>
        <span style={{ color: `${primaryColor}66` }}>]</span>
        <span style={{ color: textColor }} className="opacity-60">ROUTE_TRACE</span>
      </div>

      {/* Breadcrumb trail */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {nodeDisplays.map((node, index) => {
          const isLast = index === nodeDisplays.length - 1

          return (
            <div key={node.id}>
              {/* Node entry */}
              <div className="flex items-center gap-2">
                {/* Current marker */}
                {node.isCurrent && (
                  <span style={{ color: '#00ffff' }} className="animate-pulse">►</span>
                )}
                {!node.isCurrent && <span className="w-3" />}

                {/* Node name */}
                <span
                  className={`truncate ${node.isCurrent ? 'font-bold' : ''}`}
                  style={{ color: getNodeColor(node), maxWidth: '120px' }}
                  title={node.name}
                >
                  {node.name.toUpperCase()}
                </span>

                {/* Status badge */}
                <span
                  className="text-[9px] px-1 rounded"
                  style={{
                    backgroundColor: `${getNodeColor(node)}22`,
                    color: getNodeColor(node),
                    border: `1px solid ${getNodeColor(node)}44`,
                  }}
                >
                  {node.isBlocked ? 'LOCK' : node.isHacked ? 'OK' : 'SEC'}
                </span>
              </div>

              {/* Arrow connector */}
              {!isLast && (
                <div className="flex items-center pl-1 py-0.5">
                  <span style={{ color: `${primaryColor}44` }}>↓</span>
                </div>
              )}
            </div>
          )
        })}

        {nodeDisplays.length === 0 && (
          <div style={{ color: `${textColor}66` }} className="text-center py-4">
            NO ROUTE DATA
          </div>
        )}
      </div>

      {/* Stats footer */}
      <div
        className="px-3 py-2 border-t space-y-1"
        style={{ borderColor: `${primaryColor}33` }}
      >
        <div
          className="w-full h-px mb-2"
          style={{ backgroundColor: `${primaryColor}33` }}
        />
        <div className="flex items-center justify-between">
          <span style={{ color: `${textColor}88` }}>PROGRESS</span>
          <span style={{ color: primaryColor }}>
            {stats.hacked}/{stats.total}
          </span>
        </div>
        {stats.undiscovered > 0 && (
          <div className="flex items-center justify-between">
            <span style={{ color: `${textColor}88` }}>HIDDEN</span>
            <span style={{ color: `${textColor}44` }}>{stats.undiscovered}</span>
          </div>
        )}
        {stats.blocked > 0 && (
          <div className="flex items-center justify-between">
            <span style={{ color: `${textColor}88` }}>BLOCKED</span>
            <span style={{ color: '#ff5555' }}>{stats.blocked}</span>
          </div>
        )}
      </div>
    </div>
  )
}
