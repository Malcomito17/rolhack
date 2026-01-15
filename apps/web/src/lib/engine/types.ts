// =============================================================================
// ROLHACK ENGINE - Domain Types
// =============================================================================
// These types define the core data structures for the RolHack game engine.
// ProjectDefinition.data contains the world definition (static).
// Run.state contains the execution state (mutable per user).

// =============================================================================
// PROJECT DEFINITION TYPES (World Definition - Static)
// =============================================================================

/**
 * Fail mode determines what happens when a hack attempt fails
 */
export type FailMode = 'WARNING' | 'BLOQUEO'

/**
 * Link visual style
 */
export type LinkStyle = 'solid' | 'dashed' | 'dotted'

/**
 * Node in a circuit - represents a hackable system
 */
export interface NodeDefinition {
  id: string
  name: string
  description?: string
  level: number // 0 = entry point, higher = deeper in the network
  cd: number // Challenge Difficulty - value needed to hack
  failMode: FailMode // What happens on failed hack attempt
  visibleByDefault: boolean // Is this node visible at run start?
}

/**
 * Link between nodes - represents a connection/path
 */
export interface LinkDefinition {
  id: string
  from: string // Source node ID
  to: string // Target node ID
  style: LinkStyle
  hidden: boolean // Must be discovered via "Buscar accesos"
  bidirectional?: boolean // Default true - can traverse both ways
}

/**
 * Circuit - a sub-network of nodes and links
 */
export interface CircuitDefinition {
  id: string
  name: string
  description?: string
  nodes: NodeDefinition[]
  links: LinkDefinition[]
}

/**
 * Project metadata
 */
export interface ProjectMeta {
  version: string
  author?: string
  createdAt?: string
  description?: string
}

/**
 * Complete project data structure stored in ProjectDefinition.data
 */
export interface ProjectData {
  meta: ProjectMeta
  circuits: CircuitDefinition[]
}

// =============================================================================
// RUN STATE TYPES (Execution State - Mutable per user)
// =============================================================================

/**
 * Warning severity levels
 */
export type WarningSeverity = 'INFO' | 'TRACE' | 'ALERT' | 'LOCKDOWN' | 'BLACK_ICE'

/**
 * Hack result
 */
export type HackResult = 'exito' | 'fallo' | null

/**
 * Node state in a run
 */
export interface NodeState {
  hackeado: boolean
  bloqueado: boolean
  inaccesible: boolean
  descubierto: boolean
  intentos: number
  ultimoResultado: HackResult
}

/**
 * Link state in a run
 */
export interface LinkState {
  descubierto: boolean
  inaccesible: boolean
}

/**
 * Warning event during gameplay
 */
export interface Warning {
  severity: WarningSeverity
  nodeId: string
  message: string
  timestamp?: string
}

/**
 * Current position in the network
 */
export interface Position {
  circuitId: string
  nodeId: string
}

/**
 * Complete run state stored in Run.state
 */
export interface RunState {
  position: Position
  lastHackedNodeByCircuit: Record<string, string>
  nodes: Record<string, NodeState>
  links: Record<string, LinkState>
  warnings: Warning[]
}

// =============================================================================
// SERVICE TYPES (Input/Output for engine operations)
// =============================================================================

export interface CreateRunInput {
  projectId: string
  name?: string
}

export interface CreateRunResult {
  runId: string
  state: RunState
}

export interface AttemptHackInput {
  runId: string
  nodeId: string
  inputValue: number
}

export interface AttemptHackResult {
  success: boolean
  hackeado: boolean
  bloqueado: boolean
  warning?: Warning
  message: string
}

export interface DiscoverLinksInput {
  runId: string
}

export interface DiscoverLinksResult {
  discoveredLinks: string[]
  discoveredNodes: string[]
  message: string
}

export interface MoveToNodeInput {
  runId: string
  targetNodeId: string
}

export interface MoveToNodeResult {
  success: boolean
  newPosition: Position
  message: string
}
