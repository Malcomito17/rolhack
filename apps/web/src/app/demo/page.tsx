'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  TUTORIAL_PROJECT_DATA,
  DEMO_PROJECT_NAME,
  DEMO_THEME,
  DEMO_EFFECTS,
  saveDemoState,
  loadDemoState,
  clearDemoState,
  saveTutorialStep,
  loadTutorialStep,
  isTutorialComplete,
} from '@/lib/demo'
import {
  initializeRunState,
  attemptHack,
  discoverHiddenLinks,
  moveToNode,
} from '@/lib/engine/engine'
import type { RunState } from '@/lib/engine/types'
import { DemoImmersiveView } from './demo-immersive-view'
import { DemoBanner } from './demo-banner'
import { TutorialOverlay } from './tutorial-overlay'
import { CompletionModal } from './completion-modal'

export default function DemoPage() {
  // Initialize state from sessionStorage or create new
  const [state, setState] = useState<RunState | null>(null)
  const [tutorialStep, setTutorialStep] = useState(0)
  const [showCompletion, setShowCompletion] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Initialize on mount (client-side only)
  useEffect(() => {
    const savedState = loadDemoState()
    const savedStep = loadTutorialStep()

    if (savedState) {
      setState(savedState)
      setTutorialStep(savedStep)
    } else {
      const initialState = initializeRunState(TUTORIAL_PROJECT_DATA)
      setState(initialState)
      saveDemoState(initialState)
    }

    setIsLoading(false)
  }, [])

  // Update state and persist to sessionStorage
  const updateState = useCallback((newState: RunState) => {
    setState(newState)
    saveDemoState(newState)
  }, [])

  // Advance tutorial step
  const advanceTutorial = useCallback(() => {
    const nextStep = tutorialStep + 1
    setTutorialStep(nextStep)
    saveTutorialStep(nextStep)

    // Check if tutorial is complete
    if (isTutorialComplete(nextStep)) {
      setShowCompletion(true)
    }
  }, [tutorialStep])

  // Skip tutorial
  const skipTutorial = useCallback(() => {
    // Jump to after last step
    const finalStep = 100 // Beyond any step
    setTutorialStep(finalStep)
    saveTutorialStep(finalStep)
  }, [])

  // Reset demo
  const resetDemo = useCallback(() => {
    clearDemoState()
    const initialState = initializeRunState(TUTORIAL_PROJECT_DATA)
    setState(initialState)
    saveDemoState(initialState)
    setTutorialStep(0)
    saveTutorialStep(0)
    setShowCompletion(false)
  }, [])

  // Engine action handlers (local, no API)
  // Note: These are only called when state is defined (after loading)
  const handleHack = useCallback((inputValue: number) => {
    const { newState, result } = attemptHack(state!, TUTORIAL_PROJECT_DATA, inputValue)
    updateState(newState)
    return result
  }, [state, updateState])

  const handleDiscover = useCallback(() => {
    const { newState, result } = discoverHiddenLinks(state!, TUTORIAL_PROJECT_DATA)
    updateState(newState)
    return result
  }, [state, updateState])

  const handleMove = useCallback((targetNodeId: string) => {
    const { newState, result } = moveToNode(state!, TUTORIAL_PROJECT_DATA, targetNodeId)
    updateState(newState)
    return result
  }, [state, updateState])

  // Loading state
  if (isLoading || !state) {
    return (
      <div
        className="h-screen flex items-center justify-center font-mono"
        style={{ backgroundColor: DEMO_THEME.bgColor, color: DEMO_THEME.primaryColor }}
      >
        <div className="text-center">
          <div className="animate-pulse text-lg mb-2">&gt; LOADING DEMO...</div>
          <div className="text-xs opacity-50">Initializing neural interface</div>
        </div>
      </div>
    )
  }

  const showTutorial = !isTutorialComplete(tutorialStep) && !showCompletion

  return (
    <div className="relative">
      {/* Demo Banner */}
      <DemoBanner onReset={resetDemo} />

      {/* Main Game View */}
      <DemoImmersiveView
        projectName={DEMO_PROJECT_NAME}
        state={state}
        projectData={TUTORIAL_PROJECT_DATA}
        theme={DEMO_THEME}
        effects={DEMO_EFFECTS}
        onHack={handleHack}
        onDiscover={handleDiscover}
        onMove={handleMove}
      />

      {/* Tutorial Overlay */}
      {showTutorial && (
        <TutorialOverlay
          step={tutorialStep}
          state={state}
          projectData={TUTORIAL_PROJECT_DATA}
          onAdvance={advanceTutorial}
          onSkip={skipTutorial}
        />
      )}

      {/* Completion Modal */}
      {showCompletion && (
        <CompletionModal
          onContinueDemo={() => setShowCompletion(false)}
          onReset={resetDemo}
        />
      )}
    </div>
  )
}
