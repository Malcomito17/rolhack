// =============================================================================
// ROLHACK ENGINE - Core Game Logic
// =============================================================================
// This module contains all the game logic for RolHack.
// It operates on ProjectData (world definition) and RunState (execution state).

import type {
  ProjectData,
  RunState,
  NodeState,
  LinkState,
  Warning,
  Position,
  CircuitDefinition,
  NodeDefinition,
  LinkDefinition,
  AttemptHackResult,
  DiscoverLinksResult,
  MoveToNodeResult,
} from './types'

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Find a circuit by ID in the project data
 */
export function findCircuit(
  data: ProjectData,
  circuitId: string
): CircuitDefinition | undefined {
  return data.circuits.find((c) => c.id === circuitId)
}

/**
 * Find a node by ID across all circuits
 */
export function findNode(
  data: ProjectData,
  nodeId: string
): { circuit: CircuitDefinition; node: NodeDefinition } | undefined {
  for (const circuit of data.circuits) {
    const node = circuit.nodes.find((n) => n.id === nodeId)
    if (node) {
      return { circuit, node }
    }
  }
  return undefined
}

/**
 * Find a link by ID across all circuits
 */
export function findLink(
  data: ProjectData,
  linkId: string
): { circuit: CircuitDefinition; link: LinkDefinition } | undefined {
  for (const circuit of data.circuits) {
    const link = circuit.links.find((l) => l.id === linkId)
    if (link) {
      return { circuit, link }
    }
  }
  return undefined
}

/**
 * Get all links connected to a node (considering bidirectionality)
 */
export function getLinksFromNode(
  circuit: CircuitDefinition,
  nodeId: string
): LinkDefinition[] {
  return circuit.links.filter((link) => {
    const bidirectional = link.bidirectional !== false
    if (link.from === nodeId) return true
    if (bidirectional && link.to === nodeId) return true
    return false
  })
}

/**
 * Get the other end of a link from a given node
 */
export function getLinkTarget(link: LinkDefinition, fromNodeId: string): string {
  if (link.from === fromNodeId) return link.to
  return link.from
}

/**
 * Check if a link connects two specific nodes
 */
export function linkConnectsNodes(
  link: LinkDefinition,
  nodeA: string,
  nodeB: string
): boolean {
  const bidirectional = link.bidirectional !== false
  if (link.from === nodeA && link.to === nodeB) return true
  if (bidirectional && link.from === nodeB && link.to === nodeA) return true
  return false
}

/**
 * Find entry nodes (level 0) in a circuit
 */
export function findEntryNodes(circuit: CircuitDefinition): NodeDefinition[] {
  return circuit.nodes.filter((n) => n.level === 0)
}

// =============================================================================
// STATE INITIALIZATION
// =============================================================================

/**
 * Initialize RunState from ProjectData
 * Called when creating a new run
 */
export function initializeRunState(data: ProjectData): RunState {
  const nodes: Record<string, NodeState> = {}
  const links: Record<string, LinkState> = {}

  // Initialize all nodes and links
  for (const circuit of data.circuits) {
    for (const node of circuit.nodes) {
      nodes[node.id] = {
        hackeado: false,
        bloqueado: false,
        inaccesible: false,
        descubierto: node.visibleByDefault,
        intentos: 0,
        ultimoResultado: null,
      }
    }

    for (const link of circuit.links) {
      links[link.id] = {
        descubierto: !link.hidden,
        inaccesible: false,
      }
    }
  }

  // Find initial position: first circuit, first entry node (level 0)
  const firstCircuit = data.circuits[0]
  const entryNodes = findEntryNodes(firstCircuit)

  if (entryNodes.length === 0) {
    throw new Error('No entry nodes (level 0) found in first circuit')
  }

  const startNode = entryNodes[0]

  // Ensure start node is discovered
  nodes[startNode.id].descubierto = true

  const position: Position = {
    circuitId: firstCircuit.id,
    nodeId: startNode.id,
  }

  return {
    position,
    lastHackedNodeByCircuit: {},
    nodes,
    links,
    warnings: [],
  }
}

// =============================================================================
// GAME OPERATIONS
// =============================================================================

/**
 * Check if there are hidden links available from current position
 * Used to show/hide the "Buscar accesos" icon in UI
 */
export function hasHiddenLinksAvailable(
  state: RunState,
  data: ProjectData
): boolean {
  const { circuitId, nodeId } = state.position
  const circuit = findCircuit(data, circuitId)

  if (!circuit) return false

  const linksFromNode = getLinksFromNode(circuit, nodeId)

  return linksFromNode.some((link) => {
    const linkState = state.links[link.id]
    // Link is hidden in definition AND not yet discovered in state
    return link.hidden && linkState && !linkState.descubierto
  })
}

/**
 * Attempt to hack the current node
 *
 * RULES (PROMPT 7/8):
 * - Hack always applies to current position node
 * - Roll < 3 = BLOCKED always (critical failure)
 * - Roll >= cd = HACKED (success)
 * - 3 <= roll < cd = depends on failMode (WARNING allows retry, BLOQUEO blocks)
 *
 * DIEGETIC MESSAGES (PROMPT 8):
 * - No CD, failMode, or threshold information revealed to user
 * - Use system-style messages: ACCESS GRANTED, LOCKDOWN, etc.
 */
export function attemptHack(
  state: RunState,
  data: ProjectData,
  inputValue: number
): { newState: RunState; result: AttemptHackResult } {
  // Ensure numeric conversion
  const roll = Number(inputValue)

  // Always hack current position node
  const nodeId = state.position.nodeId

  // Find the node
  const found = findNode(data, nodeId)
  if (!found) {
    return {
      newState: state,
      result: {
        success: false,
        hackeado: false,
        bloqueado: false,
        message: 'TARGET NODE NOT FOUND',
      },
    }
  }

  const { circuit, node } = found
  const cd = Number(node.cd)
  const nodeState = state.nodes[nodeId]

  if (!nodeState) {
    return {
      newState: state,
      result: {
        success: false,
        hackeado: false,
        bloqueado: false,
        message: 'NODE STATE ERROR',
      },
    }
  }

  // Check if node is already hacked
  if (nodeState.hackeado) {
    return {
      newState: state,
      result: {
        success: false,
        hackeado: true,
        bloqueado: false,
        message: 'NODE ALREADY COMPROMISED',
      },
    }
  }

  // Check if node is blocked or inaccessible
  if (nodeState.bloqueado) {
    return {
      newState: state,
      result: {
        success: false,
        hackeado: false,
        bloqueado: true,
        message: 'LOCKDOWN ACTIVE — ACCESS PERMANENTLY DENIED',
      },
    }
  }

  if (nodeState.inaccesible) {
    return {
      newState: state,
      result: {
        success: false,
        hackeado: false,
        bloqueado: false,
        message: 'NODE UNREACHABLE',
      },
    }
  }

  // Create new state (immutable update)
  const newState = structuredClone(state)
  const newNodeState = newState.nodes[nodeId]

  // Increment attempts
  newNodeState.intentos++

  const timestamp = new Date().toISOString()

  // RULE 1: Roll < 3 = CRITICAL FAILURE - Always blocked
  if (roll < 3) {
    newNodeState.bloqueado = true
    newNodeState.ultimoResultado = 'fallo'

    const warning: Warning = {
      severity: 'BLACK_ICE',
      nodeId,
      message: `BLACK ICE DEPLOYED — ${node.name} TERMINATED`,
      timestamp,
    }
    newState.warnings.push(warning)

    return {
      newState,
      result: {
        success: false,
        hackeado: false,
        bloqueado: true,
        warning,
        message: 'CRITICAL FAILURE — BLACK ICE DEPLOYED — NODE LOCKED',
      },
    }
  }

  // RULE 2: Roll >= CD = SUCCESS
  if (roll >= cd) {
    newNodeState.hackeado = true
    newNodeState.ultimoResultado = 'exito'
    newState.lastHackedNodeByCircuit[circuit.id] = nodeId

    return {
      newState,
      result: {
        success: true,
        hackeado: true,
        bloqueado: false,
        message: 'ACCESS GRANTED — SECURITY HANDSHAKE ACCEPTED',
      },
    }
  }

  // RULE 3: 3 <= roll < CD = Depends on failMode
  newNodeState.ultimoResultado = 'fallo'
  let warning: Warning

  if (node.failMode === 'WARNING') {
    warning = {
      severity: 'TRACE',
      nodeId,
      message: `TRACE DETECTED — ${node.name}`,
      timestamp,
    }
    newState.warnings.push(warning)

    return {
      newState,
      result: {
        success: false,
        hackeado: false,
        bloqueado: false,
        warning,
        message: 'ACCESS DENIED — TRACE DETECTED — RETRY WINDOW OPEN',
      },
    }
  }

  // BLOQUEO mode
  newNodeState.bloqueado = true
  warning = {
    severity: 'LOCKDOWN',
    nodeId,
    message: `LOCKDOWN ENGAGED — ${node.name}`,
    timestamp,
  }
  newState.warnings.push(warning)

  return {
    newState,
    result: {
      success: false,
      hackeado: false,
      bloqueado: true,
      warning,
      message: 'ACCESS DENIED — LOCKDOWN ENGAGED — NODE LOCKED',
    },
  }
}

/**
 * Discover hidden links from current position
 *
 * NOTE (PROMPT 8): Does NOT require current node to be hacked
 */
export function discoverHiddenLinks(
  state: RunState,
  data: ProjectData
): { newState: RunState; result: DiscoverLinksResult } {
  const { circuitId, nodeId } = state.position
  const circuit = findCircuit(data, circuitId)

  if (!circuit) {
    return {
      newState: state,
      result: {
        discoveredLinks: [],
        discoveredNodes: [],
        message: 'NETWORK ERROR — CIRCUIT NOT FOUND',
      },
    }
  }

  const linksFromNode = getLinksFromNode(circuit, nodeId)
  const newState = structuredClone(state)

  const discoveredLinks: string[] = []
  const discoveredNodes: string[] = []

  for (const link of linksFromNode) {
    const linkState = newState.links[link.id]

    // Only discover hidden links that aren't yet discovered
    if (link.hidden && linkState && !linkState.descubierto) {
      // Discover the link
      linkState.descubierto = true
      discoveredLinks.push(link.id)

      // Discover the target node if it wasn't visible
      const targetNodeId = getLinkTarget(link, nodeId)
      const targetNodeState = newState.nodes[targetNodeId]

      if (targetNodeState && !targetNodeState.descubierto) {
        targetNodeState.descubierto = true
        discoveredNodes.push(targetNodeId)
      }
    }
  }

  if (discoveredLinks.length === 0) {
    return {
      newState: state, // No changes
      result: {
        discoveredLinks: [],
        discoveredNodes: [],
        message: 'SCAN COMPLETE — NO HIDDEN PATHWAYS DETECTED',
      },
    }
  }

  return {
    newState,
    result: {
      discoveredLinks,
      discoveredNodes,
      message: `SCAN COMPLETE — ${discoveredLinks.length} HIDDEN PATHWAY(S) REVEALED`,
    },
  }
}

/**
 * Move to a node
 *
 * RULES (PROMPT 7/8):
 * - Rule A (Fast-travel): Can ALWAYS move to any already-hacked node in the circuit
 * - Rule B (Advance): To move to a non-hacked node via link, current node must be hacked first
 * - Level does NOT determine movement — only links and hack state matter
 */
export function moveToNode(
  state: RunState,
  data: ProjectData,
  targetNodeId: string
): { newState: RunState; result: MoveToNodeResult } {
  const { circuitId, nodeId: currentNodeId } = state.position
  const circuit = findCircuit(data, circuitId)

  if (!circuit) {
    return {
      newState: state,
      result: {
        success: false,
        newPosition: state.position,
        message: 'NETWORK ERROR — CIRCUIT NOT FOUND',
      },
    }
  }

  // Can't move to same node
  if (targetNodeId === currentNodeId) {
    return {
      newState: state,
      result: {
        success: false,
        newPosition: state.position,
        message: 'ALREADY AT TARGET NODE',
      },
    }
  }

  // Check target node exists and get its state
  const targetNode = circuit.nodes.find((n) => n.id === targetNodeId)
  if (!targetNode) {
    return {
      newState: state,
      result: {
        success: false,
        newPosition: state.position,
        message: 'TARGET NODE NOT FOUND',
      },
    }
  }

  const targetNodeState = state.nodes[targetNodeId]
  if (!targetNodeState) {
    return {
      newState: state,
      result: {
        success: false,
        newPosition: state.position,
        message: 'NODE STATE ERROR',
      },
    }
  }

  // Check target is not inaccessible
  if (targetNodeState.inaccesible) {
    return {
      newState: state,
      result: {
        success: false,
        newPosition: state.position,
        message: 'TARGET NODE UNREACHABLE',
      },
    }
  }

  // Check target is not blocked
  if (targetNodeState.bloqueado) {
    return {
      newState: state,
      result: {
        success: false,
        newPosition: state.position,
        message: 'TARGET NODE IN LOCKDOWN — ACCESS DENIED',
      },
    }
  }

  // RULE A: Fast-travel to already-hacked nodes (always allowed)
  if (targetNodeState.hackeado) {
    const newState = structuredClone(state)
    newState.position = {
      circuitId,
      nodeId: targetNodeId,
    }

    return {
      newState,
      result: {
        success: true,
        newPosition: newState.position,
        message: `RECONNECTING TO ${targetNode.name.toUpperCase()}...`,
      },
    }
  }

  // RULE B: Move to non-hacked node requires:
  // 1. Current node must be hacked
  // 2. Must have a valid link connection

  const currentNodeState = state.nodes[currentNodeId]
  if (!currentNodeState?.hackeado) {
    return {
      newState: state,
      result: {
        success: false,
        newPosition: state.position,
        message: 'CURRENT NODE NOT COMPROMISED — CANNOT TRAVERSE',
      },
    }
  }

  // Find a link between current and target node
  const connectingLink = circuit.links.find((link) =>
    linkConnectsNodes(link, currentNodeId, targetNodeId)
  )

  if (!connectingLink) {
    return {
      newState: state,
      result: {
        success: false,
        newPosition: state.position,
        message: 'NO DIRECT PATHWAY TO TARGET',
      },
    }
  }

  const linkState = state.links[connectingLink.id]

  // Check link is discovered
  if (!linkState || !linkState.descubierto) {
    return {
      newState: state,
      result: {
        success: false,
        newPosition: state.position,
        message: 'PATHWAY NOT YET MAPPED',
      },
    }
  }

  // Check link is not inaccessible
  if (linkState.inaccesible) {
    return {
      newState: state,
      result: {
        success: false,
        newPosition: state.position,
        message: 'PATHWAY BLOCKED',
      },
    }
  }

  // Check target is discovered
  if (!targetNodeState.descubierto) {
    return {
      newState: state,
      result: {
        success: false,
        newPosition: state.position,
        message: 'TARGET NODE NOT YET IDENTIFIED',
      },
    }
  }

  // Perform move
  const newState = structuredClone(state)
  newState.position = {
    circuitId,
    nodeId: targetNodeId,
  }

  return {
    newState,
    result: {
      success: true,
      newPosition: newState.position,
      message: `TRAVERSING TO ${targetNode.name.toUpperCase()}...`,
    },
  }
}

/**
 * Get available moves from current position
 *
 * RULES (PROMPT 7):
 * - All hacked nodes are available (fast-travel)
 * - If current node is hacked, linked non-hacked nodes are also available
 *
 * Returns object with:
 * - fastTravel: nodes that can be fast-traveled to (already hacked)
 * - advance: nodes that can be advanced to (connected via link, current is hacked)
 * - all: combined list of all available moves
 */
export function getAvailableMoves(
  state: RunState,
  data: ProjectData
): { fastTravel: string[]; advance: string[]; all: string[] } {
  const { circuitId, nodeId: currentNodeId } = state.position
  const circuit = findCircuit(data, circuitId)

  if (!circuit) return { fastTravel: [], advance: [], all: [] }

  const fastTravel: string[] = []
  const advance: string[] = []

  const currentNodeState = state.nodes[currentNodeId]
  const currentIsHacked = currentNodeState?.hackeado === true

  // Collect all hacked nodes (fast-travel targets)
  for (const node of circuit.nodes) {
    if (node.id === currentNodeId) continue // Can't move to current

    const nodeState = state.nodes[node.id]
    if (!nodeState) continue
    if (nodeState.inaccesible || nodeState.bloqueado) continue

    if (nodeState.hackeado) {
      fastTravel.push(node.id)
    }
  }

  // If current node is hacked, collect linked non-hacked nodes (advance targets)
  if (currentIsHacked) {
    const linksFromNode = getLinksFromNode(circuit, currentNodeId)

    for (const link of linksFromNode) {
      const linkState = state.links[link.id]

      // Link must be discovered and not blocked
      if (!linkState || !linkState.descubierto || linkState.inaccesible) {
        continue
      }

      const targetNodeId = getLinkTarget(link, currentNodeId)
      const targetNodeState = state.nodes[targetNodeId]

      // Target must be discovered, not blocked, not inaccessible, and not already hacked
      if (
        targetNodeState &&
        targetNodeState.descubierto &&
        !targetNodeState.inaccesible &&
        !targetNodeState.bloqueado &&
        !targetNodeState.hackeado
      ) {
        // Avoid duplicates
        if (!advance.includes(targetNodeId)) {
          advance.push(targetNodeId)
        }
      }
    }
  }

  // Combine both lists (no duplicates since hacked nodes are in fastTravel, non-hacked in advance)
  const all = [...fastTravel, ...advance]

  return { fastTravel, advance, all }
}

/**
 * Get accessible nodes from current position (legacy helper)
 * @deprecated Use getAvailableMoves() instead for proper PROMPT 7 logic
 */
export function getAccessibleNodes(
  state: RunState,
  data: ProjectData
): string[] {
  return getAvailableMoves(state, data).all
}

/**
 * Get current node info
 */
export function getCurrentNodeInfo(
  state: RunState,
  data: ProjectData
): { circuit: CircuitDefinition; node: NodeDefinition; nodeState: NodeState } | null {
  const { circuitId, nodeId } = state.position
  const circuit = findCircuit(data, circuitId)

  if (!circuit) return null

  const node = circuit.nodes.find((n) => n.id === nodeId)
  if (!node) return null

  const nodeState = state.nodes[nodeId]
  if (!nodeState) return null

  return { circuit, node, nodeState }
}
