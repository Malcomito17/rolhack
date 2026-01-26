// =============================================================================
// ROLHACK ENGINE - Database Services
// =============================================================================
// Services that bridge the engine logic with Prisma database operations.

import { prisma } from '@rolhack/database'
import {
  initializeRunState,
  attemptHack as engineAttemptHack,
  discoverHiddenLinks as engineDiscoverLinks,
  moveToNode as engineMoveToNode,
  switchCircuit as engineSwitchCircuit,
  hasHiddenLinksAvailable,
} from './engine'
import { parseProjectData, parseRunState } from './schemas'
import type {
  ProjectData,
  RunState,
  CreateRunResult,
  AttemptHackResult,
  DiscoverLinksResult,
  MoveToNodeResult,
  SwitchCircuitResult,
} from './types'

// =============================================================================
// ERROR CLASSES
// =============================================================================

export class EngineError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message)
    this.name = 'EngineError'
  }
}

export class NotFoundError extends EngineError {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`, 'NOT_FOUND')
  }
}

export class PermissionError extends EngineError {
  constructor(message: string) {
    super(message, 'PERMISSION_DENIED')
  }
}

export class ValidationError extends EngineError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR')
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get run with validation
 */
async function getRunWithDefinition(runId: string) {
  const run = await prisma.run.findUnique({
    where: { id: runId },
    include: {
      definition: true,
      project: true,
    },
  })

  if (!run) {
    throw new NotFoundError('Run', runId)
  }

  if (run.deletedAt) {
    throw new EngineError('Run has been deleted', 'RUN_DELETED')
  }

  // Parse project data
  const projectDataResult = parseProjectData(run.definition.data)
  if (!projectDataResult.success) {
    throw new ValidationError('Invalid project definition data')
  }

  // Parse run state
  const runStateResult = parseRunState(run.state)
  if (!runStateResult.success) {
    throw new ValidationError('Invalid run state')
  }

  return {
    run,
    projectData: projectDataResult.data as ProjectData,
    runState: runStateResult.data as RunState,
  }
}

/**
 * Save run state to database
 */
async function saveRunState(runId: string, state: RunState) {
  await prisma.run.update({
    where: { id: runId },
    data: {
      state: JSON.stringify(state),
      updatedAt: new Date(),
    },
  })
}

// =============================================================================
// CREATE RUN SERVICE
// =============================================================================

export async function createRun(
  projectId: string,
  userId: string,
  name?: string
): Promise<CreateRunResult> {
  // Get project with active definition
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      definitions: {
        where: { isActive: true },
        take: 1,
      },
    },
  })

  if (!project) {
    throw new NotFoundError('Project', projectId)
  }

  if (project.deletedAt) {
    throw new EngineError('Project has been deleted', 'PROJECT_DELETED')
  }

  if (project.definitions.length === 0) {
    throw new EngineError(
      'Project has no active definition',
      'NO_ACTIVE_DEFINITION'
    )
  }

  const definition = project.definitions[0]

  // Parse and validate project data
  const projectDataResult = parseProjectData(definition.data)
  if (!projectDataResult.success) {
    throw new ValidationError('Invalid project definition data')
  }

  const projectData = projectDataResult.data as ProjectData

  // Initialize run state
  const initialState = initializeRunState(projectData)

  // Create run in database
  const runName = name || `Run ${new Date().toLocaleDateString()}`
  const run = await prisma.run.create({
    data: {
      projectId,
      definitionId: definition.id,
      ownerUserId: userId,
      name: runName,
      status: 'ACTIVE',
      state: JSON.stringify(initialState),
    },
  })

  return {
    runId: run.id,
    runName: run.name,
    state: initialState,
  }
}

// =============================================================================
// ATTEMPT HACK SERVICE
// =============================================================================

/**
 * Attempt to hack the current node
 * Two-phase hack system:
 * - Phase 1: inputValue >= CD = success, inputValue < CD = needs phase 2
 * - Phase 2: failDieRoll (1 to failDie) determines failure type
 */
export async function attemptHackService(
  runId: string,
  inputValue: number,
  failDieRoll?: number
): Promise<AttemptHackResult> {
  const { runState, projectData } = await getRunWithDefinition(runId)

  const { newState, result } = engineAttemptHack(
    runState,
    projectData,
    inputValue,
    failDieRoll
  )

  // Save state if changed
  if (newState !== runState) {
    await saveRunState(runId, newState)
  }

  return result
}

// =============================================================================
// DISCOVER HIDDEN LINKS SERVICE
// =============================================================================

export async function discoverLinksService(
  runId: string
): Promise<DiscoverLinksResult> {
  const { runState, projectData } = await getRunWithDefinition(runId)

  const { newState, result } = engineDiscoverLinks(runState, projectData)

  // Save state if changed
  if (newState !== runState) {
    await saveRunState(runId, newState)
  }

  return result
}

// =============================================================================
// MOVE TO NODE SERVICE
// =============================================================================

export async function moveToNodeService(
  runId: string,
  targetNodeId: string
): Promise<MoveToNodeResult> {
  const { runState, projectData } = await getRunWithDefinition(runId)

  const { newState, result } = engineMoveToNode(
    runState,
    projectData,
    targetNodeId
  )

  // Save state if changed
  if (newState !== runState) {
    await saveRunState(runId, newState)
  }

  return result
}

// =============================================================================
// GET RUN INFO SERVICE
// =============================================================================

export interface RunInfo {
  id: string
  name: string | null
  status: string
  projectId: string
  projectName: string
  definitionId: string
  definitionVersion: number
  state: RunState
  hasHiddenLinks: boolean
  createdAt: Date
  updatedAt: Date
}

export async function getRunInfo(runId: string): Promise<RunInfo> {
  const { run, runState, projectData } = await getRunWithDefinition(runId)

  return {
    id: run.id,
    name: run.name,
    status: run.status,
    projectId: run.projectId,
    projectName: run.project.name,
    definitionId: run.definitionId,
    definitionVersion: run.definition.version,
    state: runState,
    hasHiddenLinks: hasHiddenLinksAvailable(runState, projectData),
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
  }
}

// =============================================================================
// LIST RUNS SERVICE
// =============================================================================

export interface RunListItem {
  id: string
  name: string | null
  status: string
  projectId: string
  projectName: string
  createdAt: Date
  updatedAt: Date
}

export async function listUserRuns(userId: string): Promise<RunListItem[]> {
  const runs = await prisma.run.findMany({
    where: {
      ownerUserId: userId,
      deletedAt: null,
    },
    include: {
      project: {
        select: { name: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return runs.map((run) => ({
    id: run.id,
    name: run.name,
    status: run.status,
    projectId: run.projectId,
    projectName: run.project.name,
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
  }))
}

export async function listAllRuns(): Promise<RunListItem[]> {
  const runs = await prisma.run.findMany({
    where: {
      deletedAt: null,
    },
    include: {
      project: {
        select: { name: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return runs.map((run) => ({
    id: run.id,
    name: run.name,
    status: run.status,
    projectId: run.projectId,
    projectName: run.project.name,
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
  }))
}

// =============================================================================
// AUTHORIZATION HELPERS
// =============================================================================

/**
 * Check if user can access a run
 * Allows: SUPERADMIN, run owner, or project members
 */
export async function canAccessRun(
  userId: string,
  runId: string,
  isSuperAdmin: boolean
): Promise<boolean> {
  if (isSuperAdmin) return true

  const run = await prisma.run.findUnique({
    where: { id: runId },
    select: { ownerUserId: true, projectId: true },
  })

  if (!run) return false

  // Owner can always access
  if (run.ownerUserId === userId) return true

  // Check if user is a member of the project
  const membership = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: { projectId: run.projectId, userId },
    },
    select: { active: true },
  })

  return membership?.active === true
}

/**
 * Check if user can create run in project
 */
export async function canCreateRunInProject(
  userId: string,
  projectId: string,
  isSuperAdmin: boolean
): Promise<boolean> {
  if (isSuperAdmin) return true

  // Check project membership
  const membership = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: { projectId, userId },
    },
    select: { active: true },
  })

  if (!membership || !membership.active) {
    return false
  }

  // Check project is enabled
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { enabled: true, deletedAt: true },
  })

  return project?.enabled === true && project?.deletedAt === null
}

// =============================================================================
// SWITCH CIRCUIT SERVICE
// =============================================================================

export async function switchCircuitService(
  runId: string,
  targetCircuitId: string
): Promise<SwitchCircuitResult> {
  const { runState, projectData } = await getRunWithDefinition(runId)

  const { newState, result } = engineSwitchCircuit(
    runState,
    projectData,
    targetCircuitId
  )

  // Save state if changed
  if (newState !== runState) {
    await saveRunState(runId, newState)
  }

  return result
}
