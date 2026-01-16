// =============================================================================
// DEMO MODE - State Manager
// =============================================================================
// Manages demo state persistence using sessionStorage.
// State is ephemeral - survives page refresh but not browser close.

import type { RunState } from '../engine/types'

const DEMO_STATE_KEY = 'rolhack-demo-state'
const DEMO_TUTORIAL_KEY = 'rolhack-demo-tutorial'

/**
 * Save demo run state to sessionStorage
 */
export function saveDemoState(state: RunState): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(DEMO_STATE_KEY, JSON.stringify(state))
  } catch {
    // Storage full or unavailable - silently fail
  }
}

/**
 * Load demo run state from sessionStorage
 */
export function loadDemoState(): RunState | null {
  if (typeof window === 'undefined') return null
  try {
    const saved = sessionStorage.getItem(DEMO_STATE_KEY)
    return saved ? JSON.parse(saved) : null
  } catch {
    return null
  }
}

/**
 * Clear all demo state from sessionStorage
 */
export function clearDemoState(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(DEMO_STATE_KEY)
    sessionStorage.removeItem(DEMO_TUTORIAL_KEY)
  } catch {
    // Silently fail
  }
}

/**
 * Save tutorial step progress
 */
export function saveTutorialStep(step: number): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(DEMO_TUTORIAL_KEY, String(step))
  } catch {
    // Silently fail
  }
}

/**
 * Load tutorial step progress
 */
export function loadTutorialStep(): number {
  if (typeof window === 'undefined') return 0
  try {
    const saved = sessionStorage.getItem(DEMO_TUTORIAL_KEY)
    return saved ? parseInt(saved, 10) : 0
  } catch {
    return 0
  }
}

/**
 * Check if demo has been started before
 */
export function hasDemoProgress(): boolean {
  if (typeof window === 'undefined') return false
  return sessionStorage.getItem(DEMO_STATE_KEY) !== null
}
