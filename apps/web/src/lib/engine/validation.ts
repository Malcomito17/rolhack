// =============================================================================
// ROLHACK ENGINE - Full Validation
// =============================================================================
// Extended validation with business rules for the editor

import { z } from 'zod'
import type { ProjectData } from './types'
import { ProjectDataSchema } from './schemas'

// =============================================================================
// VALIDATION TYPES
// =============================================================================

export interface ValidationError {
  path: (string | number)[]
  code: string
  message: string
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

// =============================================================================
// BUSINESS RULE VALIDATION
// =============================================================================

/**
 * Convert Zod errors to ValidationError format
 */
function convertZodErrors(zodError: z.ZodError): ValidationError[] {
  return zodError.errors.map((err) => ({
    path: err.path,
    code: err.code,
    message: err.message,
  }))
}

/**
 * Full validation for ProjectData including business rules
 *
 * Business Rules:
 * 1. At least 1 circuit (enforced by Zod)
 * 2. Each circuit must have at least one node with level=0 (entry point)
 * 3. No orphan links (from/to must reference existing nodes in circuit)
 * 4. Unique node IDs within each circuit
 * 5. Unique link IDs within each circuit
 * 6. Unique circuit IDs within project
 * 7. CD must be >= 0 (0 allowed for entry nodes)
 * 8. failDie must be present and in range 3-20 (BLOCKING validation)
 */
export function validateProjectDataFull(data: unknown): ValidationResult {
  const errors: ValidationError[] = []

  // Layer 1: Zod schema validation
  const zodResult = ProjectDataSchema.safeParse(data)
  if (!zodResult.success) {
    return {
      valid: false,
      errors: convertZodErrors(zodResult.error),
    }
  }

  const projectData = zodResult.data as ProjectData

  // Layer 2: Business rules

  // Rule: Unique circuit IDs
  const seenCircuitIds = new Set<string>()
  for (let circuitIdx = 0; circuitIdx < projectData.circuits.length; circuitIdx++) {
    const circuit = projectData.circuits[circuitIdx]

    if (seenCircuitIds.has(circuit.id)) {
      errors.push({
        path: ['circuits', circuitIdx, 'id'],
        code: 'DUPLICATE_CIRCUIT_ID',
        message: `ID de circuito duplicado: "${circuit.id}"`,
      })
    }
    seenCircuitIds.add(circuit.id)

    // Rule: Each circuit must have at least one level-0 node (entry point)
    const hasEntryNode = circuit.nodes.some((n) => n.level === 0)
    if (!hasEntryNode) {
      errors.push({
        path: ['circuits', circuitIdx],
        code: 'NO_ENTRY_NODE',
        message: `El circuito "${circuit.name}" debe tener al menos un nodo con level 0 (punto de entrada)`,
      })
    }

    // Collect node IDs for orphan link detection
    const nodeIds = new Set(circuit.nodes.map((n) => n.id))

    // Rule: Unique node IDs within circuit
    const seenNodeIds = new Set<string>()
    for (let nodeIdx = 0; nodeIdx < circuit.nodes.length; nodeIdx++) {
      const node = circuit.nodes[nodeIdx]

      if (seenNodeIds.has(node.id)) {
        errors.push({
          path: ['circuits', circuitIdx, 'nodes', nodeIdx, 'id'],
          code: 'DUPLICATE_NODE_ID',
          message: `ID de nodo duplicado en circuito "${circuit.name}": "${node.id}"`,
        })
      }
      seenNodeIds.add(node.id)

      // Rule: CD must be >= 0 (already handled by Zod, but double-check)
      if (node.cd < 0) {
        errors.push({
          path: ['circuits', circuitIdx, 'nodes', nodeIdx, 'cd'],
          code: 'INVALID_CD',
          message: `CD debe ser >= 0 en nodo "${node.name}"`,
        })
      }

      // Rule: failDie must be present and in range 3-20 (BLOCKING)
      if (node.failDie === undefined || node.failDie === null) {
        errors.push({
          path: ['circuits', circuitIdx, 'nodes', nodeIdx, 'failDie'],
          code: 'MISSING_FAIL_DIE',
          message: `Dado de fallo (failDie) es requerido en nodo "${node.name}"`,
        })
      } else if (node.failDie < 3 || node.failDie > 20) {
        errors.push({
          path: ['circuits', circuitIdx, 'nodes', nodeIdx, 'failDie'],
          code: 'INVALID_FAIL_DIE',
          message: `Dado de fallo debe ser entre D3 y D20 en nodo "${node.name}" (valor: D${node.failDie})`,
        })
      }
    }

    // Rule: Unique link IDs within circuit
    const seenLinkIds = new Set<string>()
    for (let linkIdx = 0; linkIdx < circuit.links.length; linkIdx++) {
      const link = circuit.links[linkIdx]

      if (seenLinkIds.has(link.id)) {
        errors.push({
          path: ['circuits', circuitIdx, 'links', linkIdx, 'id'],
          code: 'DUPLICATE_LINK_ID',
          message: `ID de enlace duplicado en circuito "${circuit.name}": "${link.id}"`,
        })
      }
      seenLinkIds.add(link.id)

      // Rule: No orphan links - from must exist
      if (!nodeIds.has(link.from)) {
        errors.push({
          path: ['circuits', circuitIdx, 'links', linkIdx, 'from'],
          code: 'ORPHAN_LINK_FROM',
          message: `Enlace "${link.id}" referencia nodo origen inexistente: "${link.from}"`,
        })
      }

      // Rule: No orphan links - to must exist
      if (!nodeIds.has(link.to)) {
        errors.push({
          path: ['circuits', circuitIdx, 'links', linkIdx, 'to'],
          code: 'ORPHAN_LINK_TO',
          message: `Enlace "${link.id}" referencia nodo destino inexistente: "${link.to}"`,
        })
      }

      // Rule: Link cannot connect node to itself
      if (link.from === link.to) {
        errors.push({
          path: ['circuits', circuitIdx, 'links', linkIdx],
          code: 'SELF_LINK',
          message: `Enlace "${link.id}" no puede conectar un nodo consigo mismo`,
        })
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Validate and parse JSON string to ProjectData with full business rules
 */
export function validateProjectDataFromJson(jsonString: string): ValidationResult & { data?: ProjectData } {
  try {
    const parsed = JSON.parse(jsonString)
    const result = validateProjectDataFull(parsed)
    if (result.valid) {
      return { ...result, data: parsed as ProjectData }
    }
    return result
  } catch (e) {
    return {
      valid: false,
      errors: [
        {
          path: [],
          code: 'INVALID_JSON',
          message: `JSON inválido: ${e instanceof Error ? e.message : 'Error de sintaxis'}`,
        },
      ],
    }
  }
}

/**
 * Get human-readable path string from error path
 */
export function formatErrorPath(path: (string | number)[]): string {
  if (path.length === 0) return 'raíz'
  return path
    .map((p, i) => {
      if (typeof p === 'number') {
        return `[${p}]`
      }
      return i === 0 ? p : `.${p}`
    })
    .join('')
}
