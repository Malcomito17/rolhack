// =============================================================================
// ROLHACK ENGINE - Public API
// =============================================================================

// Types
export * from './types'

// Schemas (Zod)
export * from './schemas'

// Engine functions
export {
  // Utilities
  findCircuit,
  findNode,
  findLink,
  getLinksFromNode,
  getLinkTarget,
  linkConnectsNodes,
  findEntryNodes,
  // State initialization
  initializeRunState,
  // Game operations
  hasHiddenLinksAvailable,
  attemptHack,
  discoverHiddenLinks,
  moveToNode,
  getAccessibleNodes,
  getCurrentNodeInfo,
} from './engine'

// Database services
export {
  // Errors
  EngineError,
  NotFoundError,
  PermissionError,
  ValidationError,
  // Services
  createRun,
  attemptHackService,
  discoverLinksService,
  moveToNodeService,
  getRunInfo,
  listUserRuns,
  listAllRuns,
  canAccessRun,
  canCreateRunInProject,
  // Types
  type RunInfo,
  type RunListItem,
} from './services'
