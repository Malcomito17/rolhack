// =============================================================================
// ROLHACK ENGINE - Public API
// =============================================================================

// Types
export * from './types'

// Schemas (Zod)
export * from './schemas'

// Validation (extended with business rules)
export {
  validateProjectDataFull,
  validateProjectDataFromJson,
  formatErrorPath,
  type ValidationError as ProjectValidationError,
  type ValidationResult as ProjectValidationResult,
} from './validation'

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
  getAvailableMoves,
  getAccessibleNodes, // @deprecated - use getAvailableMoves
  getCurrentNodeInfo,
  // Circuit navigation
  switchCircuit,
  getCircuitSummary,
  // Audit functions (observation-only)
  generateAuditData,
  exportTimeline,
  exportAuditSummary,
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
  switchCircuitService,
  getRunInfo,
  listUserRuns,
  listAllRuns,
  canAccessRun,
  canCreateRunInProject,
  // Types
  type RunInfo,
  type RunListItem,
} from './services'
