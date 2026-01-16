'use client'

import { useEffect } from 'react'
import type { RunState, ProjectData } from '@/lib/engine'
import { getTutorialStep, getTutorialProgress, TUTORIAL_STEPS } from '@/lib/demo'

interface Props {
  step: number
  state: RunState
  projectData: ProjectData
  onAdvance: () => void
  onSkip: () => void
}

export function TutorialOverlay({ step, state, projectData, onAdvance, onSkip }: Props) {
  const currentStep = getTutorialStep(step)
  const progress = getTutorialProgress(step)

  // Check if auto-advance condition is met
  useEffect(() => {
    if (!currentStep?.completionCondition) return

    const checkCondition = () => {
      if (currentStep.completionCondition!(state, projectData)) {
        // Small delay for visual feedback
        setTimeout(onAdvance, 600)
      }
    }

    checkCondition()
  }, [state, currentStep, projectData, onAdvance])

  if (!currentStep) return null

  // Position classes based on step.position
  const positionClasses: Record<string, string> = {
    'center': 'fixed inset-0 flex items-center justify-center bg-black/60 p-4',
    'top': 'fixed top-16 left-1/2 -translate-x-1/2 p-4',
    'bottom': 'fixed bottom-32 left-1/2 -translate-x-1/2 p-4',
    'near-input': 'fixed bottom-36 right-2 sm:right-4 p-2 sm:p-4',
  }

  const isCenter = currentStep.position === 'center'

  return (
    <div className={positionClasses[currentStep.position]} style={{ zIndex: 60 }}>
      <div
        className={`bg-black/95 border border-green-500/50 rounded-lg p-3 sm:p-4 font-mono shadow-lg shadow-green-500/20 ${
          isCenter ? 'max-w-md w-full' : 'max-w-xs sm:max-w-sm'
        }`}
      >
        {/* Progress bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-[9px] sm:text-[10px] mb-1">
            <span className="text-green-500/50">
              PASO {step + 1}/{TUTORIAL_STEPS.length}
            </span>
            <span className="text-green-500/50">{progress}%</span>
          </div>
          <div className="h-1 bg-green-900/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Title */}
        <h3 className="text-green-400 text-sm sm:text-base font-bold mb-2">
          {currentStep.title}
        </h3>

        {/* Description */}
        <p className="text-green-300/80 text-xs sm:text-sm mb-4 leading-relaxed">
          {currentStep.description}
        </p>

        {/* Actions */}
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={onSkip}
            className="text-[10px] sm:text-xs text-green-500/40 hover:text-green-500/70 transition-colors"
          >
            Saltar tutorial
          </button>

          {currentStep.showContinue && (
            <button
              onClick={onAdvance}
              className="px-3 sm:px-4 py-1.5 text-xs sm:text-sm border border-green-500/50 text-green-400 rounded hover:bg-green-500/20 transition-colors"
            >
              Continuar
            </button>
          )}

          {!currentStep.showContinue && (
            <span className="text-[10px] sm:text-xs text-green-500/50 animate-pulse">
              Esperando accion...
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
