// =============================================================================
// ROLHACK THEME SYSTEM - Type Definitions
// =============================================================================
// Extends the visual template system to support multiple themes
// (cyberpunk, medieval, horror/Cthulhu) with customizable terminology and effects.

/**
 * Semantic colors for game states
 * Used to replace hardcoded colors (#00ffff, #ff5555, etc.)
 */
export interface SemanticColors {
  currentNode: string      // Player's current position (default: #00ffff)
  hackedNode: string       // Successfully hacked node
  blockedNode: string      // Blocked/locked node (default: #ff5555)
  pendingNode: string      // Not yet hacked node (default: #ffff55)
  warning: string          // Warning/alert color
  success: string          // Success message color
  error: string            // Error message color
}

/**
 * Terminology for UI labels - allows thematic language
 * Example: "HACK" -> "DESCIFRAR RUNAS" (medieval) or "INVOCAR" (Cthulhu)
 */
export interface ThemeTerminology {
  // Action verbs
  hack: string             // "HACKEAR" / "DESCIFRAR" / "INVOCAR"
  scan: string             // "ESCANEAR" / "BUSCAR PASADIZOS" / "PERCIBIR"
  move: string             // "MOVER" / "AVANZAR" / "DESLIZARSE"
  breach: string           // "BREACH" / "FORZAR" / "PENETRAR"

  // Entity names
  node: string             // "NODO" / "CAMARA" / "NEXO"
  circuit: string          // "CIRCUITO" / "NIVEL" / "DIMENSION"
  link: string             // "ENLACE" / "PASADIZO" / "PORTAL"

  // Status labels
  hacked: string           // "HACKEADO" / "CONQUISTADA" / "CORROMPIDO"
  blocked: string          // "BLOQUEADO" / "SELLADA" / "CLAUSURADO"
  pending: string          // "PENDIENTE" / "SIN EXPLORAR" / "LATENTE"
  secure: string           // "SEGURO" / "PROTEGIDA" / "SELLADO"

  // Result messages
  hackSuccess: string      // Success message when hacking
  hackFailed: string       // Failure message when hacking
  scanSuccess: string      // Success message when scanning
  scanEmpty: string        // No hidden links found
  moveSuccess: string      // Success message when moving

  // Game states
  gameOver: string         // "GAME OVER" / "FIN DEL JUEGO" / "TU MENTE COLAPSA"
  circuitLockdown: string  // "CIRCUIT LOCKDOWN" / "MAZMORRA SELLADA" / "DIMENSION CERRADA"

  // Map/navigation labels
  map: string              // "MAP" / "MAPA" / "VISION"
  mapGrid: string          // "NETWORK_GRID" / "PLANO" / "RED_COSMICA"
  mapRoute: string         // "ROUTE_TRACE" / "SENDERO" / "RASTRO"
  hidden: string           // "HIDDEN" / "OCULTO" / "VELADO"
  progress: string         // "PROGRESS" / "AVANCE" / "CORRUPCION"

  // Lockdown modal
  lockdownIcon: string     // "🔒" / "⚔️" / "👁️"
  lockdownSubtitle: string // "NEURAL LINK DESTROYED" subtitle
  lockdownMessages: string[] // Terminal messages for lockdown
  selectNewCircuit: string // "SELECT NEW CIRCUIT" button text
  noRoutesExit: string     // "NO ROUTES AVAILABLE - EXIT" button text

  // Game Over modal
  gameOverIcon: string     // "💀" / "⚰️" / "🦑"
  gameOverSubtitle: string // Subtitle under GAME OVER
  gameOverMessages: string[] // Terminal messages for game over
  disconnect: string       // "DISCONNECT" button text

  // Boot sequence messages (array of messages for startup animation)
  bootMessages: string[]
}

/**
 * Extended effects definition with thematic effects
 */
export interface ThemeEffects {
  // Existing cyber effects
  scanlines: boolean
  glitch: boolean
  flicker: boolean
  neonGlow: boolean
  matrixRain: boolean
  crtCurve: boolean
  warningPulse: boolean
  radarSweep: boolean

  // Medieval effects
  dust: boolean            // Floating dust particles
  fireEmbers: boolean      // Rising ember particles
  candleFlicker: boolean   // Warm light flicker
  torchGlow: boolean       // Torch ambient glow

  // Horror/Cthulhu effects
  fog: boolean             // Creeping fog effect
  tentacles: boolean       // Shadow tentacles at edges
  eyeBlink: boolean        // Occasional eye blink effect
  whispers: boolean        // Subtle visual distortion (whispers)
  corruption: boolean      // Edge corruption effect
}

/**
 * Extended theme definition with backgrounds and semantic data
 */
export interface ThemeDefinition {
  // Base colors (existing)
  background: string
  primaryColor: string
  secondaryColor: string
  accentColor: string
  textColor: string

  // Background enhancements
  backgroundImage?: string       // URL: '/themes/medieval/stone-wall.jpg'
  backgroundOverlay?: string     // Overlay color: 'rgba(0,0,0,0.6)'
  backgroundPattern?: string     // Pattern: 'grid', 'dots', 'stone', 'eldritch'

  // Semantic colors
  semanticColors: SemanticColors

  // Terminology
  terminology: ThemeTerminology

  // Terminal style
  terminalStyle?: 'classic' | 'corporate' | 'military' | 'medieval' | 'eldritch' | 'large'

  // Font family override
  fontFamily?: string
}

/**
 * Complete visual template with extended theme support
 */
export interface ExtendedVisualTemplate {
  id: string
  key: string
  name: string
  description?: string
  renderer: 'TECH' | 'IMMERSIVE'
  theme: ThemeDefinition
  effects: ThemeEffects
  components: Record<string, boolean | string>
  isSystem: boolean
}

/**
 * Theme category for grouping templates
 */
export type ThemeCategory = 'cyber' | 'medieval' | 'horror' | 'minimal' | 'custom'

/**
 * Theme preset metadata for selector UI
 */
export interface ThemePreset {
  key: string
  name: string
  description: string
  category: ThemeCategory
  preview?: {
    primaryColor: string
    secondaryColor: string
    backgroundImage?: string
  }
}

// =============================================================================
// DEFAULT VALUES
// =============================================================================

/**
 * Default semantic colors (cyber theme)
 */
export const DEFAULT_SEMANTIC_COLORS: SemanticColors = {
  currentNode: '#00ffff',
  hackedNode: '#00ff00',
  blockedNode: '#ff5555',
  pendingNode: '#ffff55',
  warning: '#ffaa00',
  success: '#00ff00',
  error: '#ff0000',
}

/**
 * Default terminology (cyber/hacking theme)
 */
export const DEFAULT_TERMINOLOGY: ThemeTerminology = {
  hack: 'HACKEAR',
  scan: 'ESCANEAR',
  move: 'MOVER',
  breach: 'BREACH',
  node: 'NODO',
  circuit: 'CIRCUITO',
  link: 'ENLACE',
  hacked: 'HACKEADO',
  blocked: 'BLOQUEADO',
  pending: 'PENDIENTE',
  secure: 'SEGURO',
  hackSuccess: 'NODO COMPROMETIDO',
  hackFailed: 'ACCESO DENEGADO',
  scanSuccess: 'RUTAS DESCUBIERTAS',
  scanEmpty: 'NO SE ENCONTRARON RUTAS OCULTAS',
  moveSuccess: 'POSICION ACTUALIZADA',
  gameOver: 'GAME OVER',
  circuitLockdown: 'CIRCUIT LOCKDOWN',
  map: 'MAP',
  mapGrid: 'NETWORK_GRID',
  mapRoute: 'ROUTE_TRACE',
  hidden: 'HIDDEN',
  progress: 'PROGRESS',
  lockdownIcon: '🔒',
  lockdownSubtitle: 'SECURITY BREACH CONTAINED',
  lockdownMessages: [
    'INTRUSION DETECTED',
    'SECURITY PROTOCOL ACTIVATED',
    'ALL ACCESS TO THIS CIRCUIT REVOKED',
    'SEEK ALTERNATE ROUTE...',
  ],
  selectNewCircuit: 'SELECT NEW CIRCUIT',
  noRoutesExit: 'NO ROUTES AVAILABLE - EXIT',
  gameOverIcon: '💀',
  gameOverSubtitle: 'NEURAL LINK DESTROYED',
  gameOverMessages: [
    'CRITICAL SYSTEM FAILURE',
    'BLACK ICE COUNTERMEASURE ACTIVATED',
    'OPERATOR CONNECTION TERMINATED',
    'RUN STATUS: FAILED',
  ],
  disconnect: 'DISCONNECT',
  bootMessages: [
    '> INITIALIZING NEURAL INTERFACE...',
    '> ESTABLISHING SECURE CONNECTION...',
    '> BYPASSING FIREWALL...',
    '> READY FOR INPUT...',
  ],
}

/**
 * Medieval terminology
 */
export const MEDIEVAL_TERMINOLOGY: ThemeTerminology = {
  hack: 'DESCIFRAR',
  scan: 'BUSCAR PASADIZOS',
  move: 'AVANZAR',
  breach: 'FORZAR',
  node: 'CAMARA',
  circuit: 'NIVEL',
  link: 'PASADIZO',
  hacked: 'CONQUISTADA',
  blocked: 'SELLADA',
  pending: 'SIN EXPLORAR',
  secure: 'PROTEGIDA',
  hackSuccess: 'Runa descifrada. La camara se abre...',
  hackFailed: 'Los glifos rechazan tu intento.',
  scanSuccess: 'Has encontrado pasadizos ocultos.',
  scanEmpty: 'No hay pasadizos secretos aqui.',
  moveSuccess: 'Avanzas por el pasadizo...',
  gameOver: 'HAS CAIDO',
  circuitLockdown: 'MAZMORRA SELLADA',
  map: 'MAPA',
  mapGrid: 'PLANO',
  mapRoute: 'SENDERO',
  hidden: 'OCULTO',
  progress: 'AVANCE',
  lockdownIcon: '⚔️',
  lockdownSubtitle: 'LA MAZMORRA TE RECHAZA',
  lockdownMessages: [
    'Los guardianes han sido alertados',
    'Las puertas se sellan magicamente',
    'Este nivel ya no es accesible',
    'Busca otro camino...',
  ],
  selectNewCircuit: 'BUSCAR OTRO NIVEL',
  noRoutesExit: 'SIN SALIDA - ABANDONAR',
  gameOverIcon: '⚰️',
  gameOverSubtitle: 'TU CUERPO FUE ENCONTRADO',
  gameOverMessages: [
    'Las trampas te han alcanzado',
    'Los guardianes fueron implacables',
    'Tu aventura termina aqui',
    'La mazmorra reclama otra victima',
  ],
  disconnect: 'ABANDONAR',
  bootMessages: [
    '> Encendiendo antorcha...',
    '> Estudiando el pergamino...',
    '> Las runas brillan...',
    '> Preparado para explorar.',
  ],
}

/**
 * Cthulhu/Horror terminology
 */
export const CTHULHU_TERMINOLOGY: ThemeTerminology = {
  hack: 'INVOCAR',
  scan: 'PERCIBIR',
  move: 'DESLIZARSE',
  breach: 'PENETRAR',
  node: 'NEXO',
  circuit: 'DIMENSION',
  link: 'PORTAL',
  hacked: 'CORROMPIDO',
  blocked: 'SELLADO POR LOS ANTIGUOS',
  pending: 'LATENTE',
  secure: 'DORMIDO',
  hackSuccess: 'Los Antiguos responden... el velo se rasga.',
  hackFailed: 'Tu mente tiembla ante lo incomprensible.',
  scanSuccess: 'Percibes portales entre las sombras...',
  scanEmpty: 'Las tinieblas no revelan nada... por ahora.',
  moveSuccess: 'Te deslizas entre dimensiones...',
  gameOver: 'TU MENTE COLAPSA',
  circuitLockdown: 'LA DIMENSION SE CIERRA',
  map: 'VISION',
  mapGrid: 'RED_COSMICA',
  mapRoute: 'RASTRO',
  hidden: 'VELADO',
  progress: 'CORRUPCION',
  lockdownIcon: '👁️',
  lockdownSubtitle: 'LOS ANTIGUOS TE RECHAZAN',
  lockdownMessages: [
    'Has perturbado fuerzas primigenias',
    'Los sellos antiguos se activan',
    'Esta dimension se cierra ante ti',
    'Busca otro portal...',
  ],
  selectNewCircuit: 'BUSCAR OTRA DIMENSION',
  noRoutesExit: 'ATRAPADO - DESPERTAR',
  gameOverIcon: '🦑',
  gameOverSubtitle: 'TU MENTE HA COLAPSADO',
  gameOverMessages: [
    'La locura te ha consumido',
    'Los susurros no cesan',
    'Tu cordura se ha desvanecido',
    'Ph\'nglui mglw\'nafh...',
  ],
  disconnect: 'DESPERTAR',
  bootMessages: [
    '> Despertando consciencia primigenia...',
    '> Ph\'nglui mglw\'nafh Cthulhu...',
    '> Las sombras susurran...',
    '> Los ojos te observan.',
  ],
}

/**
 * Default effects (all disabled)
 */
export const DEFAULT_EFFECTS: ThemeEffects = {
  scanlines: false,
  glitch: false,
  flicker: false,
  neonGlow: false,
  matrixRain: false,
  crtCurve: false,
  warningPulse: false,
  radarSweep: false,
  dust: false,
  fireEmbers: false,
  candleFlicker: false,
  torchGlow: false,
  fog: false,
  tentacles: false,
  eyeBlink: false,
  whispers: false,
  corruption: false,
}
