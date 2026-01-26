// =============================================================================
// ROLHACK ENGINE - Zod Schemas
// =============================================================================
// Validation schemas for all engine types

import { z } from 'zod'

// =============================================================================
// PROJECT DEFINITION SCHEMAS
// =============================================================================

export const FailModeSchema = z.enum(['WARNING', 'BLOQUEO'])

export const LinkStyleSchema = z.enum(['solid', 'dashed', 'dotted'])

// Raw schema before migration (accepts both old and new format)
const NodeDefinitionRawSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  level: z.number().int().min(0),
  cd: z.number().int().min(0), // 0 allowed for entry nodes
  // Fail die (D3-D20) - for phase 2 fail determination (optional for legacy data)
  failDie: z.number().int().min(3).max(20).optional(),
  // Legacy field for backward compatibility
  failMode: FailModeSchema.optional(),
  // New fields for expanded failMode system
  criticalFailMode: FailModeSchema.optional(),
  rangeFailMode: FailModeSchema.optional(),
  rangeErrorMessage: z.string().optional(),
  visibleByDefault: z.boolean(),
  // Final node - hacking completes the circuit (only 1 per circuit)
  isFinal: z.boolean().optional(),
  // Map positioning (optional, for visual circuit map)
  mapX: z.number().min(0).max(100).optional(),
  mapY: z.number().min(0).max(100).optional(),
})

// Schema with migration transform for backward compatibility
export const NodeDefinitionSchema = NodeDefinitionRawSchema.transform((node) => ({
  id: node.id,
  name: node.name,
  description: node.description,
  level: node.level,
  cd: node.cd,
  // Migration: default to D4 for legacy nodes without failDie
  failDie: node.failDie ?? 4,
  // Migration: use new fields if present, otherwise fall back to legacy failMode
  criticalFailMode: node.criticalFailMode ?? node.failMode ?? 'BLOQUEO',
  rangeFailMode: node.rangeFailMode ?? node.failMode ?? 'WARNING',
  rangeErrorMessage: node.rangeErrorMessage,
  visibleByDefault: node.visibleByDefault,
  isFinal: node.isFinal ?? false,
  // Map positioning
  mapX: node.mapX,
  mapY: node.mapY,
}))

export const LinkDefinitionSchema = z.object({
  id: z.string().min(1),
  from: z.string().min(1),
  to: z.string().min(1),
  style: LinkStyleSchema,
  hidden: z.boolean(),
  bidirectional: z.boolean().optional().default(true),
})

export const CircuitDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  nodes: z.array(NodeDefinitionSchema).min(1),
  links: z.array(LinkDefinitionSchema),
}).refine(
  (circuit) => {
    const finalNodes = circuit.nodes.filter(n => n.isFinal === true)
    return finalNodes.length <= 1
  },
  { message: 'Solo puede haber un nodo final por circuito' }
)

export const ProjectMetaSchema = z.object({
  version: z.string().min(1),
  author: z.string().optional(),
  createdAt: z.string().optional(),
  description: z.string().optional(),
})

export const ProjectDataSchema = z.object({
  meta: ProjectMetaSchema,
  circuits: z.array(CircuitDefinitionSchema).min(1),
})

// =============================================================================
// RUN STATE SCHEMAS
// =============================================================================

export const WarningSeveritySchema = z.enum([
  'INFO',
  'TRACE',
  'ALERT',
  'LOCKDOWN',
  'BLACK_ICE',
])

export const HackResultSchema = z.enum(['exito', 'fallo']).nullable()

export const NodeStateSchema = z.object({
  hackeado: z.boolean(),
  bloqueado: z.boolean(),
  inaccesible: z.boolean(),
  descubierto: z.boolean(),
  intentos: z.number().int().min(0),
  ultimoResultado: HackResultSchema,
})

export const LinkStateSchema = z.object({
  descubierto: z.boolean(),
  inaccesible: z.boolean(),
})

export const WarningSchema = z.object({
  severity: WarningSeveritySchema,
  nodeId: z.string(),
  message: z.string(),
  timestamp: z.string().optional(),
})

export const PositionSchema = z.object({
  circuitId: z.string(),
  nodeId: z.string(),
})

// Timeline event types for visual replay
export const TimelineEventTypeSchema = z.enum([
  'RUN_START',
  'CIRCUIT_SELECTED',
  'NODE_HACKED',
  'NODE_BLOCKED',
  'CIRCUIT_BLOCKED',
  'LINKS_DISCOVERED',
  'CIRCUIT_CHANGED',
  'CIRCUIT_COMPLETED',
  'RUN_COMPLETED',
])

// State snapshot for visual replay (observation only)
export const StateSnapshotSchema = z.object({
  position: PositionSchema,
  nodes: z.record(z.string(), NodeStateSchema),
  links: z.record(z.string(), LinkStateSchema),
})

// Timeline event for visual replay
export const TimelineEventSchema = z.object({
  id: z.string(),
  type: TimelineEventTypeSchema,
  timestamp: z.string(),
  circuitId: z.string(),
  nodeId: z.string().optional(),
  description: z.string(),
  details: z.object({
    discoveredLinks: z.array(z.string()).optional(),
    discoveredNodes: z.array(z.string()).optional(),
    warningGenerated: z.boolean().optional(),
    previousCircuitId: z.string().optional(),
  }).optional(),
  snapshot: StateSnapshotSchema,
})

export const RunStateSchema = z.object({
  position: PositionSchema,
  lastHackedNodeByCircuit: z.record(z.string(), z.string()),
  nodes: z.record(z.string(), NodeStateSchema),
  links: z.record(z.string(), LinkStateSchema),
  warnings: z.array(WarningSchema),
  // Timeline for visual replay - optional for backward compatibility with existing runs
  timeline: z.array(TimelineEventSchema).optional().default([]),
  // Blocked circuits - when a BLOQUEO occurs, entire circuit is locked
  blockedCircuits: z.record(z.string(), z.boolean()).optional().default({}),
})

// =============================================================================
// API INPUT SCHEMAS
// =============================================================================

export const CreateRunInputSchema = z.object({
  name: z.string().optional(),
})

/**
 * PROMPT 7: No longer accepts nodeId - hack always applies to current position
 * Two-phase hack system:
 * - Phase 1: inputValue >= CD = success, inputValue < CD = needs phase 2
 * - Phase 2: failDieRoll (1 to failDie) determines failure type
 */
export const AttemptHackInputSchema = z.object({
  inputValue: z.number().int().min(0),
  failDieRoll: z.number().int().min(1).max(20).optional(), // Phase 2 fail die roll
})

export const MoveToNodeInputSchema = z.object({
  targetNodeId: z.string().min(1),
})

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Validate project definition data
 */
export function validateProjectData(data: unknown) {
  return ProjectDataSchema.safeParse(data)
}

/**
 * Validate run state
 */
export function validateRunState(state: unknown) {
  return RunStateSchema.safeParse(state)
}

/**
 * Parse JSON string to ProjectData
 */
export function parseProjectData(jsonString: string) {
  try {
    const parsed = JSON.parse(jsonString)
    return validateProjectData(parsed)
  } catch {
    return { success: false as const, error: new z.ZodError([]) }
  }
}

/**
 * Parse JSON string to RunState
 */
export function parseRunState(jsonString: string) {
  try {
    const parsed = JSON.parse(jsonString)
    return validateRunState(parsed)
  } catch {
    return { success: false as const, error: new z.ZodError([]) }
  }
}
