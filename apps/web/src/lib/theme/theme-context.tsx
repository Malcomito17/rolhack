'use client'

import { createContext, useContext, useMemo, ReactNode } from 'react'
import type {
  ThemeDefinition,
  ThemeEffects,
  SemanticColors,
  ThemeTerminology,
} from './types'
import {
  DEFAULT_SEMANTIC_COLORS,
  DEFAULT_TERMINOLOGY,
  DEFAULT_EFFECTS,
} from './types'

// =============================================================================
// THEME CONTEXT
// =============================================================================

interface ThemeContextValue {
  // Core theme data
  theme: ThemeDefinition
  effects: ThemeEffects

  // Quick access to colors
  colors: {
    primary: string
    secondary: string
    accent: string
    text: string
    background: string
  }

  // Semantic colors
  semantic: SemanticColors

  // Terminology
  terminology: ThemeTerminology

  // Helper functions
  t: (key: keyof ThemeTerminology) => string
  getNodeColor: (state: 'current' | 'hacked' | 'blocked' | 'pending') => string
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

// =============================================================================
// PROVIDER COMPONENT
// =============================================================================

interface ThemeProviderProps {
  children: ReactNode
  theme?: Partial<ThemeDefinition>
  effects?: Partial<ThemeEffects>
}

/**
 * Provides theme context to the component tree
 */
export function ThemeProvider({
  children,
  theme: themeProp,
  effects: effectsProp,
}: ThemeProviderProps) {
  // Merge provided theme with defaults
  const theme: ThemeDefinition = useMemo(() => ({
    background: themeProp?.background || '#000000',
    primaryColor: themeProp?.primaryColor || '#00ff00',
    secondaryColor: themeProp?.secondaryColor || '#003300',
    accentColor: themeProp?.accentColor || '#00ff00',
    textColor: themeProp?.textColor || '#00ff00',
    backgroundImage: themeProp?.backgroundImage,
    backgroundOverlay: themeProp?.backgroundOverlay,
    backgroundPattern: themeProp?.backgroundPattern,
    semanticColors: {
      ...DEFAULT_SEMANTIC_COLORS,
      ...themeProp?.semanticColors,
    },
    terminology: {
      ...DEFAULT_TERMINOLOGY,
      ...themeProp?.terminology,
    },
    terminalStyle: themeProp?.terminalStyle,
    fontFamily: themeProp?.fontFamily,
  }), [themeProp])

  // Merge provided effects with defaults
  const effects: ThemeEffects = useMemo(() => ({
    ...DEFAULT_EFFECTS,
    ...effectsProp,
  }), [effectsProp])

  // Quick access colors
  const colors = useMemo(() => ({
    primary: theme.primaryColor,
    secondary: theme.secondaryColor,
    accent: theme.accentColor,
    text: theme.textColor,
    background: theme.background,
  }), [theme])

  // Semantic colors (with fallback to primary for hacked)
  const semantic = useMemo(() => ({
    ...theme.semanticColors,
    hackedNode: theme.semanticColors.hackedNode || theme.primaryColor,
  }), [theme])

  // Terminology
  const terminology = theme.terminology

  // Helper: get translated term
  const t = (key: keyof ThemeTerminology): string => {
    const value = terminology[key]
    if (Array.isArray(value)) {
      return value.join('\n')
    }
    return value
  }

  // Helper: get node color by state
  const getNodeColor = (state: 'current' | 'hacked' | 'blocked' | 'pending'): string => {
    switch (state) {
      case 'current':
        return semantic.currentNode
      case 'hacked':
        return semantic.hackedNode
      case 'blocked':
        return semantic.blockedNode
      case 'pending':
        return semantic.pendingNode
      default:
        return theme.textColor
    }
  }

  const value: ThemeContextValue = {
    theme,
    effects,
    colors,
    semantic,
    terminology,
    t,
    getNodeColor,
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook to access the current theme context
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)

  if (!context) {
    // Return default values if used outside provider
    // This allows components to work without explicit provider
    return {
      theme: {
        background: '#000000',
        primaryColor: '#00ff00',
        secondaryColor: '#003300',
        accentColor: '#00ff00',
        textColor: '#00ff00',
        semanticColors: DEFAULT_SEMANTIC_COLORS,
        terminology: DEFAULT_TERMINOLOGY,
      },
      effects: DEFAULT_EFFECTS,
      colors: {
        primary: '#00ff00',
        secondary: '#003300',
        accent: '#00ff00',
        text: '#00ff00',
        background: '#000000',
      },
      semantic: DEFAULT_SEMANTIC_COLORS,
      terminology: DEFAULT_TERMINOLOGY,
      t: (key) => {
        const value = DEFAULT_TERMINOLOGY[key]
        if (Array.isArray(value)) {
          return value.join('\n')
        }
        return value
      },
      getNodeColor: (state) => {
        switch (state) {
          case 'current':
            return DEFAULT_SEMANTIC_COLORS.currentNode
          case 'hacked':
            return DEFAULT_SEMANTIC_COLORS.hackedNode
          case 'blocked':
            return DEFAULT_SEMANTIC_COLORS.blockedNode
          case 'pending':
            return DEFAULT_SEMANTIC_COLORS.pendingNode
          default:
            return '#00ff00'
        }
      },
    }
  }

  return context
}

// =============================================================================
// UTILITY: Parse theme from database JSON
// =============================================================================

/**
 * Parse theme JSON from database VisualTemplate
 */
export function parseThemeFromTemplate(
  themeJson: string,
  effectsJson?: string
): { theme: Partial<ThemeDefinition>; effects: Partial<ThemeEffects> } {
  let theme: Partial<ThemeDefinition> = {}
  let effects: Partial<ThemeEffects> = {}

  try {
    theme = JSON.parse(themeJson || '{}')
  } catch {
    console.warn('Failed to parse theme JSON')
  }

  try {
    effects = JSON.parse(effectsJson || '{}')
  } catch {
    console.warn('Failed to parse effects JSON')
  }

  return { theme, effects }
}
