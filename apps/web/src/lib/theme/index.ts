// =============================================================================
// ROLHACK THEME SYSTEM - Public API
// =============================================================================

// Types
export type {
  ThemeDefinition,
  ThemeEffects,
  ThemeTerminology,
  SemanticColors,
  ExtendedVisualTemplate,
  ThemeCategory,
  ThemePreset,
} from './types'

// Default values
export {
  DEFAULT_SEMANTIC_COLORS,
  DEFAULT_TERMINOLOGY,
  MEDIEVAL_TERMINOLOGY,
  CTHULHU_TERMINOLOGY,
  DEFAULT_EFFECTS,
} from './types'

// Context and hook
export {
  ThemeProvider,
  useTheme,
  parseThemeFromTemplate,
} from './theme-context'

// Utilities
export {
  MEDIEVAL_SEMANTIC_COLORS,
  CTHULHU_SEMANTIC_COLORS,
  MEDIEVAL_EFFECTS,
  CTHULHU_EFFECTS,
  getPresetTerminology,
  getPresetSemanticColors,
  createMedievalTheme,
  createCthulhuTheme,
  createCyberTheme,
  convertLegacyTheme,
  mergeThemeWithDefaults,
  mergeEffectsWithDefaults,
  generateThemeCSSVars,
  getBackgroundStyle,
} from './theme-utils'
