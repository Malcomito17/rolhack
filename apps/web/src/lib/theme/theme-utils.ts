// =============================================================================
// ROLHACK THEME UTILITIES
// =============================================================================
// Helper functions for theme management and transformations

import type {
  ThemeDefinition,
  ThemeEffects,
  ThemeTerminology,
  SemanticColors,
  ThemeCategory,
} from './types'
import {
  DEFAULT_TERMINOLOGY,
  MEDIEVAL_TERMINOLOGY,
  CTHULHU_TERMINOLOGY,
  DEFAULT_SEMANTIC_COLORS,
  DEFAULT_EFFECTS,
} from './types'

// =============================================================================
// THEME PRESETS
// =============================================================================

/**
 * Medieval theme semantic colors
 */
export const MEDIEVAL_SEMANTIC_COLORS: SemanticColors = {
  currentNode: '#ffd700',      // Gold for current position
  hackedNode: '#d4a574',       // Warm orange (torch light)
  blockedNode: '#8b0000',      // Dark red (sealed)
  pendingNode: '#8b4513',      // Saddle brown (unexplored)
  warning: '#ff8c00',          // Dark orange
  success: '#32cd32',          // Lime green (nature)
  error: '#dc143c',            // Crimson
}

/**
 * Cthulhu theme semantic colors
 */
export const CTHULHU_SEMANTIC_COLORS: SemanticColors = {
  currentNode: '#9400d3',      // Dark violet (eldritch glow)
  hackedNode: '#00ff88',       // Sickly green (corrupted)
  blockedNode: '#4a0080',      // Deep purple (sealed by ancients)
  pendingNode: '#1a4a2e',      // Dark eldritch green
  warning: '#ff00ff',          // Magenta (unnatural)
  success: '#00ff88',          // Sickly green
  error: '#ff0066',            // Pink-red (blood)
}

// =============================================================================
// PRESET DEFINITIONS
// =============================================================================

/**
 * Get preset terminology by category
 */
export function getPresetTerminology(category: ThemeCategory): ThemeTerminology {
  switch (category) {
    case 'medieval':
      return MEDIEVAL_TERMINOLOGY
    case 'horror':
      return CTHULHU_TERMINOLOGY
    case 'cyber':
    case 'minimal':
    case 'custom':
    default:
      return DEFAULT_TERMINOLOGY
  }
}

/**
 * Get preset semantic colors by category
 */
export function getPresetSemanticColors(category: ThemeCategory): SemanticColors {
  switch (category) {
    case 'medieval':
      return MEDIEVAL_SEMANTIC_COLORS
    case 'horror':
      return CTHULHU_SEMANTIC_COLORS
    case 'cyber':
    case 'minimal':
    case 'custom':
    default:
      return DEFAULT_SEMANTIC_COLORS
  }
}

// =============================================================================
// THEME CREATION HELPERS
// =============================================================================

/**
 * Create a complete medieval theme
 */
export function createMedievalTheme(overrides?: Partial<ThemeDefinition>): ThemeDefinition {
  return {
    background: '#1a1209',
    primaryColor: '#d4a574',
    secondaryColor: '#8b4513',
    accentColor: '#ffd700',
    textColor: '#e8d5b7',
    backgroundImage: '/themes/medieval/stone-wall.jpg',
    backgroundOverlay: 'rgba(0, 0, 0, 0.7)',
    backgroundPattern: 'stone',
    semanticColors: MEDIEVAL_SEMANTIC_COLORS,
    terminology: MEDIEVAL_TERMINOLOGY,
    terminalStyle: 'medieval',
    ...overrides,
  }
}

/**
 * Create a complete Cthulhu/horror theme
 */
export function createCthulhuTheme(overrides?: Partial<ThemeDefinition>): ThemeDefinition {
  return {
    background: '#0a0a14',
    primaryColor: '#4a0080',
    secondaryColor: '#1a4a2e',
    accentColor: '#00ff88',
    textColor: '#b8c4d0',
    backgroundImage: '/themes/cthulhu/eldritch-pattern.jpg',
    backgroundOverlay: 'rgba(10, 10, 20, 0.8)',
    backgroundPattern: 'eldritch',
    semanticColors: CTHULHU_SEMANTIC_COLORS,
    terminology: CTHULHU_TERMINOLOGY,
    terminalStyle: 'eldritch',
    ...overrides,
  }
}

/**
 * Create default cyber theme
 */
export function createCyberTheme(overrides?: Partial<ThemeDefinition>): ThemeDefinition {
  return {
    background: '#000000',
    primaryColor: '#00ff00',
    secondaryColor: '#003300',
    accentColor: '#00ffff',
    textColor: '#00ff00',
    semanticColors: DEFAULT_SEMANTIC_COLORS,
    terminology: DEFAULT_TERMINOLOGY,
    terminalStyle: 'classic',
    ...overrides,
  }
}

// =============================================================================
// EFFECTS PRESETS
// =============================================================================

/**
 * Medieval effects preset
 */
export const MEDIEVAL_EFFECTS: Partial<ThemeEffects> = {
  scanlines: false,
  glitch: false,
  flicker: false,
  neonGlow: false,
  matrixRain: false,
  crtCurve: false,
  warningPulse: false,
  radarSweep: false,
  dust: true,
  fireEmbers: true,
  candleFlicker: true,
  torchGlow: true,
  fog: false,
  tentacles: false,
  eyeBlink: false,
  whispers: false,
  corruption: false,
}

/**
 * Cthulhu effects preset
 */
export const CTHULHU_EFFECTS: Partial<ThemeEffects> = {
  scanlines: false,
  glitch: true,
  flicker: true,
  neonGlow: false,
  matrixRain: false,
  crtCurve: false,
  warningPulse: false,
  radarSweep: false,
  dust: false,
  fireEmbers: false,
  candleFlicker: false,
  torchGlow: false,
  fog: true,
  tentacles: true,
  eyeBlink: true,
  whispers: true,
  corruption: true,
}

// =============================================================================
// CONVERSION UTILITIES
// =============================================================================

/**
 * Convert legacy theme object to extended ThemeDefinition
 */
export function convertLegacyTheme(
  legacyTheme: Record<string, string>,
  category: ThemeCategory = 'cyber'
): Partial<ThemeDefinition> {
  return {
    background: legacyTheme.background || '#000000',
    primaryColor: legacyTheme.primaryColor || '#00ff00',
    secondaryColor: legacyTheme.secondaryColor || '#003300',
    accentColor: legacyTheme.accentColor || '#00ffff',
    textColor: legacyTheme.textColor || '#00ff00',
    backgroundImage: legacyTheme.backgroundImage,
    backgroundOverlay: legacyTheme.backgroundOverlay,
    backgroundPattern: legacyTheme.backgroundPattern,
    semanticColors: getPresetSemanticColors(category),
    terminology: getPresetTerminology(category),
  }
}

/**
 * Merge theme with defaults
 */
export function mergeThemeWithDefaults(
  partial: Partial<ThemeDefinition>
): ThemeDefinition {
  return {
    background: partial.background || '#000000',
    primaryColor: partial.primaryColor || '#00ff00',
    secondaryColor: partial.secondaryColor || '#003300',
    accentColor: partial.accentColor || '#00ffff',
    textColor: partial.textColor || '#00ff00',
    backgroundImage: partial.backgroundImage,
    backgroundOverlay: partial.backgroundOverlay,
    backgroundPattern: partial.backgroundPattern,
    semanticColors: {
      ...DEFAULT_SEMANTIC_COLORS,
      ...partial.semanticColors,
    },
    terminology: {
      ...DEFAULT_TERMINOLOGY,
      ...partial.terminology,
    },
    terminalStyle: partial.terminalStyle,
    fontFamily: partial.fontFamily,
  }
}

/**
 * Merge effects with defaults
 */
export function mergeEffectsWithDefaults(
  partial: Partial<ThemeEffects>
): ThemeEffects {
  return {
    ...DEFAULT_EFFECTS,
    ...partial,
  }
}

// =============================================================================
// CSS HELPERS
// =============================================================================

/**
 * Generate CSS custom properties from theme
 */
export function generateThemeCSSVars(theme: ThemeDefinition): Record<string, string> {
  return {
    '--theme-background': theme.background,
    '--theme-primary': theme.primaryColor,
    '--theme-secondary': theme.secondaryColor,
    '--theme-accent': theme.accentColor,
    '--theme-text': theme.textColor,
    '--theme-current-node': theme.semanticColors.currentNode,
    '--theme-hacked-node': theme.semanticColors.hackedNode,
    '--theme-blocked-node': theme.semanticColors.blockedNode,
    '--theme-pending-node': theme.semanticColors.pendingNode,
    '--theme-warning': theme.semanticColors.warning,
    '--theme-success': theme.semanticColors.success,
    '--theme-error': theme.semanticColors.error,
  }
}

/**
 * Get background style object
 */
export function getBackgroundStyle(theme: ThemeDefinition): React.CSSProperties {
  const style: React.CSSProperties = {
    backgroundColor: theme.background,
  }

  if (theme.backgroundImage) {
    style.backgroundImage = `url(${theme.backgroundImage})`
    style.backgroundSize = 'cover'
    style.backgroundPosition = 'center'
    style.backgroundRepeat = 'no-repeat'
  }

  return style
}
