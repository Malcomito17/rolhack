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
 * Attempt to hack a node
 */
export function attemptHack(
  state: RunState,
  data: ProjectData,
  nodeId: string,
  inputValue: number
): { newState: RunState; result: AttemptHackResult } {
  // Find the node
  const found = findNode(data, nodeId)
  if (!found) {
    return {
      newState: state,
      result: {
        success: false,
        hackeado: false,
        bloqueado: false,
        message: `Nodo ${nodeId} no encontrado`,
      },
    }
  }

  const { circuit, node } = found
  const nodeState = state.nodes[nodeId]

  if (!nodeState) {
    return {
      newState: state,
      result: {
        success: false,
        hackeado: false,
        bloqueado: false,
        message: `Estado del nodo ${nodeId} no inicializado`,
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
        message: `Nodo ${node.name} está bloqueado permanentemente`,
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
        message: `Nodo ${node.name} es inaccesible`,
      },
    }
  }

  // Create new state (immutable update)
  const newState = structuredClone(state)
  const newNodeState = newState.nodes[nodeId]

  // Increment attempts
  newNodeState.intentos++

  // Check if hack succeeds
  if (inputValue >= node.cd) {
    // SUCCESS
    newNodeState.hackeado = true
    newNodeState.ultimoResultado = 'exito'
    newState.lastHackedNodeByCircuit[circuit.id] = nodeId

    return {
      newState,
      result: {
        success: true,
        hackeado: true,
        bloqueado: false,
        message: `¡Hackeo exitoso! ${node.name} comprometido.`,
      },
    }
  }

  // FAILURE
  newNodeState.ultimoResultado = 'fallo'

  const timestamp = new Date().toISOString()
  let warning: Warning

  if (node.failMode === 'WARNING') {
    warning = {
      severity: 'ALERT',
      nodeId,
      message: `Intento de intrusión detectado en ${node.name}. Sistema en alerta.`,
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
        message: `Hackeo fallido. Valor ${inputValue} insuficiente (CD: ${node.cd}). Puedes reintentar.`,
      },
    }
  }

  // BLOQUEO
  newNodeState.bloqueado = true
  warning = {
    severity: 'LOCKDOWN',
    nodeId,
    message: `BLOQUEO ACTIVADO: ${node.name} ha entrado en modo de seguridad. Acceso denegado permanentemente.`,
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
      message: `Hackeo fallido. Nodo ${node.name} BLOQUEADO permanentemente.`,
    },
  }
}

/**
 * Discover hidden links from current position
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
        message: 'Circuito no encontrado',
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
        message: 'No hay accesos ocultos desde esta posición',
      },
    }
  }

  return {
    newState,
    result: {
      discoveredLinks,
      discoveredNodes,
      message: `Descubiertos ${discoveredLinks.length} acceso(s) oculto(s)`,
    },
  }
}

/**
 * Move to a connected node
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
        message: 'Circuito actual no encontrado',
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
        message: `No existe conexión entre ${currentNodeId} y ${targetNodeId}`,
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
        message: 'El enlace no ha sido descubierto',
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
        message: 'El enlace está bloqueado',
      },
    }
  }

  // Check target node
  const targetNodeState = state.nodes[targetNodeId]

  if (!targetNodeState) {
    return {
      newState: state,
      result: {
        success: false,
        newPosition: state.position,
        message: 'Nodo destino no encontrado en el estado',
      },
    }
  }

  if (targetNodeState.inaccesible) {
    return {
      newState: state,
      result: {
        success: false,
        newPosition: state.position,
        message: 'El nodo destino es inaccesible',
      },
    }
  }

  // Perform move
  const newState = structuredClone(state)
  newState.position = {
    circuitId,
    nodeId: targetNodeId,
  }

  // Get target node name for message
  const targetNode = circuit.nodes.find((n) => n.id === targetNodeId)
  const nodeName = targetNode?.name || targetNodeId

  return {
    newState,
    result: {
      success: true,
      newPosition: newState.position,
      message: `Movido a ${nodeName}`,
    },
  }
}

/**
 * Get accessible nodes from current position
 * Returns nodes that can be moved to (connected via discovered, non-blocked links)
 */
export function getAccessibleNodes(
  state: RunState,
  data: ProjectData
): string[] {
  const { circuitId, nodeId } = state.position
  const circuit = findCircuit(data, circuitId)

  if (!circuit) return []

  const linksFromNode = getLinksFromNode(circuit, nodeId)
  const accessible: string[] = []

  for (const link of linksFromNode) {
    const linkState = state.links[link.id]

    if (!linkState || !linkState.descubierto || linkState.inaccesible) {
      continue
    }

    const targetNodeId = getLinkTarget(link, nodeId)
    const targetNodeState = state.nodes[targetNodeId]

    if (targetNodeState && !targetNodeState.inaccesible) {
      accessible.push(targetNodeId)
    }
  }

  return accessible
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
