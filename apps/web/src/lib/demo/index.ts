// =============================================================================
// DEMO MODE - Public Exports
// =============================================================================

export { TUTORIAL_PROJECT_DATA, DEMO_PROJECT_NAME, DEMO_THEME, DEMO_EFFECTS } from './tutorial-project'
export {
  TUTORIAL_STEPS,
  getTutorialStep,
  isTutorialComplete,
  getTutorialProgress,
  type TutorialStep,
} from './tutorial-steps'
export {
  saveDemoState,
  loadDemoState,
  clearDemoState,
  saveTutorialStep,
  loadTutorialStep,
  hasDemoProgress,
} from './state-manager'
