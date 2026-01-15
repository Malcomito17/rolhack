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

export const NodeDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  level: z.number().int().min(0),
  cd: z.number().int().min(1),
  failMode: FailModeSchema,
  visibleByDefault: z.boolean(),
})

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
})

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

export const RunStateSchema = z.object({
  position: PositionSchema,
  lastHackedNodeByCircuit: z.record(z.string(), z.string()),
  nodes: z.record(z.string(), NodeStateSchema),
  links: z.record(z.string(), LinkStateSchema),
  warnings: z.array(WarningSchema),
})

// =============================================================================
// API INPUT SCHEMAS
// =============================================================================

export const CreateRunInputSchema = z.object({
  name: z.string().optional(),
})

export const AttemptHackInputSchema = z.object({
  nodeId: z.string().min(1),
  inputValue: z.number().int().min(0),
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
