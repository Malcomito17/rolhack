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
  cd: number // Challenge Difficulty - value needed to hack (first roll >= CD = success)
  failDie: number // Fail die (D3-D20) - determines fail roll range in phase 2
  criticalFailMode: FailMode // What happens on fail die rolls 1-2 (critical failure)
  rangeFailMode: FailMode // What happens on fail die rolls 3 to failDie (range failure)
  rangeErrorMessage?: string // Custom message for WARNING in range failure
  visibleByDefault: boolean // Is this node visible at run start?
  isFinal?: boolean // Final node - hacking completes the circuit (only 1 per circuit)
  // Map positioning (for visual circuit map)
  mapX?: number // X coordinate (0-100 percentage)
  mapY?: number // Y coordinate (0-100 percentage)
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
 * Timeline event types - milestones in a RUN
 */
export type TimelineEventType =
  | 'RUN_START'
  | 'CIRCUIT_SELECTED'
  | 'NODE_HACKED'
  | 'NODE_BLOCKED'
  | 'CIRCUIT_BLOCKED'
  | 'LINKS_DISCOVERED'
  | 'CIRCUIT_CHANGED'
  | 'CIRCUIT_COMPLETED'
  | 'RUN_COMPLETED'

/**
 * Snapshot of state at a point in time (for visual replay)
 * Contains only what's needed for observation, not full state
 */
export interface StateSnapshot {
  position: Position
  nodes: Record<string, NodeState>
  links: Record<string, LinkState>
}

/**
 * Timeline event - a milestone in the RUN progression
 * Used for visual replay and progress understanding
 * NOT for logic rollback - purely observational
 */
export interface TimelineEvent {
  id: string
  type: TimelineEventType
  timestamp: string // ISO 8601
  circuitId: string
  nodeId?: string
  // Human-readable description
  description: string
  // Optional additional context
  details?: {
    discoveredLinks?: string[]
    discoveredNodes?: string[]
    warningGenerated?: boolean
    previousCircuitId?: string
  }
  // State snapshot for visual replay (observation only)
  snapshot: StateSnapshot
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
  // Timeline for visual replay (UI-only feature, doesn't affect logic)
  timeline: TimelineEvent[]
  // Blocked circuits - when a BLOQUEO occurs, entire circuit is locked
  blockedCircuits: Record<string, boolean>
  // Completed circuits - when final node is hacked, circuit is complete
  completedCircuits: Record<string, boolean>
}

// =============================================================================
// AUDIT & DEMO TYPES (Observation-only features)
// =============================================================================

/**
 * Observation mode for the run view
 * - 'live': Normal interactive mode
 * - 'replay': Viewing historical state (from timeline)
 * - 'demo': Full demo/explanation mode (frozen, guided)
 * - 'audit': Audit view mode (comprehensive overview)
 */
export type ObservationMode = 'live' | 'replay' | 'demo' | 'audit'

/**
 * Circuit audit summary for comprehensive view
 */
export interface CircuitAuditSummary {
  id: string
  name: string
  description?: string
  totalNodes: number
  hackedNodes: number
  blockedNodes: number
  discoveredNodes: number
  progress: number // 0-100
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'ADVANCED' | 'COMPLETED' | 'BLOCKED'
  isCurrentCircuit: boolean
  // Timeline events for this circuit
  events: TimelineEvent[]
}

/**
 * Full audit data for a run
 */
export interface RunAuditData {
  runId: string
  runName: string | null
  projectName: string
  createdAt: string
  // Overall progress
  totalCircuits: number
  completedCircuits: number
  totalNodes: number
  hackedNodes: number
  blockedNodes: number
  // Per-circuit breakdown
  circuits: CircuitAuditSummary[]
  // Full timeline
  timeline: TimelineEvent[]
  // Current position (if viewing live state)
  currentPosition: Position
}

/**
 * Export format options
 */
export type ExportFormat = 'text' | 'markdown' | 'json'

/**
 * Export content type
 */
export type ExportContentType =
  | 'timeline_summary'
  | 'circuit_overview'
  | 'full_audit'
  | 'checkpoint_snapshot'

// =============================================================================
// SERVICE TYPES (Input/Output for engine operations)
// =============================================================================

export interface CreateRunInput {
  projectId: string
  name?: string
}

export interface CreateRunResult {
  runId: string
  runName: string | null
  state: RunState
}

export interface AttemptHackInput {
  runId: string
  nodeId: string
  inputValue: number
  failDieRoll?: number // Phase 2: fail die roll (1 to failDie)
}

export interface AttemptHackResult {
  success: boolean
  hackeado: boolean
  bloqueado: boolean
  circuitBlocked?: boolean // True if entire circuit is now blocked
  circuitCompleted?: boolean // True if final node was hacked (circuit complete)
  gameOver?: boolean // True if this is a critical game-ending failure (CD=1-2 + block)
  warning?: Warning
  message: string
  // Phase 2 support
  needsPhase2?: boolean // True if first roll failed and needs fail die roll
  failDie?: number // The fail die value (D3-D20) for phase 2 input validation
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

export interface SwitchCircuitInput {
  runId: string
  targetCircuitId: string
}

export interface SwitchCircuitResult {
  success: boolean
  newPosition: Position
  message: string
}
