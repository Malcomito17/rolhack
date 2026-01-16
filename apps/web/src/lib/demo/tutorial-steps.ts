// =============================================================================
// DEMO MODE - Tutorial Steps Definition
// =============================================================================
// Step-by-step tutorial that guides users through RolHack mechanics.

import type { RunState, ProjectData } from '../engine/types'

export interface TutorialStep {
  id: string
  title: string
  description: string
  // Condition to auto-advance to next step
  completionCondition?: (state: RunState, projectData: ProjectData) => boolean
  // Position of the tutorial card
  position: 'top' | 'bottom' | 'center' | 'near-input'
  // Whether to show a "Continue" button (false = auto-advance only)
  showContinue: boolean
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Bienvenido a RolHack',
    description: 'Este es un simulador de hacking para juegos de rol cyberpunk. Vamos a aprender las mecanicas basicas en unos minutos.',
    position: 'center',
    showContinue: true,
  },
  {
    id: 'understand-terminal',
    title: 'La Terminal',
    description: 'Esta es tu interfaz de hacker. Los mensajes del sistema aparecen arriba, y tus controles estan abajo. La barra de estado muestra tu posicion actual.',
    position: 'bottom',
    showContinue: true,
  },
  {
    id: 'first-move',
    title: 'Movimiento',
    description: 'Haz click en el boton amarillo "FIREWALL BASICO" para moverte al primer nodo objetivo.',
    completionCondition: (state) => state.position.nodeId === 'node-firewall',
    position: 'near-input',
    showContinue: false,
  },
  {
    id: 'explain-cd',
    title: 'Challenge Difficulty (CD)',
    description: 'Cada nodo tiene un CD (dificultad). Para hackearlo exitosamente, tu tirada debe ser IGUAL O MAYOR al CD. Este nodo tiene CD: 11.',
    position: 'bottom',
    showContinue: true,
  },
  {
    id: 'hack-node',
    title: 'Hackear',
    description: 'Ingresa un numero (11 o mas) en el campo CODE y presiona BREACH. En el juego real, este numero vendria de una tirada de dados.',
    completionCondition: (state) => state.nodes['node-firewall']?.hackeado === true,
    position: 'near-input',
    showContinue: false,
  },
  {
    id: 'hack-success',
    title: 'Hack Exitoso!',
    description: 'Excelente! Has comprometido el firewall. Ahora puedes moverte a nodos conectados o volver a nodos ya hackeados (fast-travel).',
    position: 'bottom',
    showContinue: true,
  },
  {
    id: 'return-to-start',
    title: 'Fast Travel',
    description: 'Vuelve al "TERMINAL DE ACCESO" haciendo click en el. Los nodos hackeados son accesibles desde cualquier punto del circuito.',
    completionCondition: (state) => state.position.nodeId === 'node-start',
    position: 'near-input',
    showContinue: false,
  },
  {
    id: 'discover-scan',
    title: 'Escanear Rutas Ocultas',
    description: 'Algunos nodos tienen conexiones ocultas. Presiona el boton SCAN para revelar rutas secretas desde tu posicion actual.',
    completionCondition: (state) => state.links['link-start-hidden']?.descubierto === true,
    position: 'near-input',
    showContinue: false,
  },
  {
    id: 'explain-hidden',
    title: 'Ruta Descubierta!',
    description: 'Has encontrado un "PUERTO OCULTO". Las rutas ocultas pueden ofrecer caminos alternativos mas faciles o acceso a areas secretas.',
    position: 'bottom',
    showContinue: true,
  },
  {
    id: 'go-to-core',
    title: 'Objetivo Final',
    description: 'Ahora navega y hackea hasta llegar al "NUCLEO DEL SISTEMA" (CD: 20). Cuidado: si fallas con menos de 3, el nodo se BLOQUEA permanentemente!',
    completionCondition: (state) => state.nodes['node-core']?.hackeado === true,
    position: 'bottom',
    showContinue: false,
  },
  {
    id: 'complete-tutorial',
    title: 'Tutorial Completado!',
    description: 'Felicidades! Ya conoces las mecanicas basicas de RolHack. Crea una cuenta para acceder a proyectos completos y guardar tu progreso.',
    position: 'center',
    showContinue: true,
  },
]

// Get the current tutorial step based on index
export function getTutorialStep(index: number): TutorialStep | null {
  return TUTORIAL_STEPS[index] || null
}

// Check if tutorial is complete
export function isTutorialComplete(index: number): boolean {
  return index >= TUTORIAL_STEPS.length
}

// Get tutorial progress percentage
export function getTutorialProgress(index: number): number {
  return Math.round((index / TUTORIAL_STEPS.length) * 100)
}
