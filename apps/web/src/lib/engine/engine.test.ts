/**
 * PROMPT 8 - Required Engine Tests
 * =================================
 * Tests for hack/move logic as specified in the PROMPT
 */

import { describe, it, expect } from 'vitest'
import {
  initializeRunState,
  attemptHack,
  discoverHiddenLinks,
  moveToNode,
  getAvailableMoves,
} from './engine'
import type { ProjectData, RunState } from './types'

// =============================================================================
// TEST FIXTURES
// =============================================================================

/**
 * Simple test project with nodes on different levels and various link configurations
 */
const testProject: ProjectData = {
  meta: { version: '1.0' },
  circuits: [
    {
      id: 'circuit-1',
      name: 'Test Circuit',
      nodes: [
        { id: 'node-a', name: 'Node A', level: 0, cd: 5, failMode: 'WARNING', visibleByDefault: true },
        { id: 'node-b', name: 'Node B', level: 1, cd: 7, failMode: 'BLOQUEO', visibleByDefault: true },
        { id: 'node-c', name: 'Node C', level: 2, cd: 10, failMode: 'WARNING', visibleByDefault: true },
        { id: 'node-d', name: 'Node D', level: 0, cd: 3, failMode: 'WARNING', visibleByDefault: false }, // Hidden node
      ],
      links: [
        { id: 'link-ab', from: 'node-a', to: 'node-b', style: 'solid', hidden: false, bidirectional: true },
        { id: 'link-bc', from: 'node-b', to: 'node-c', style: 'solid', hidden: false, bidirectional: true },
        { id: 'link-ad', from: 'node-a', to: 'node-d', style: 'dashed', hidden: true, bidirectional: true }, // Hidden link
      ],
    },
  ],
}

// =============================================================================
// TEST 1: current no hackeado + link visible → no permite avanzar
// =============================================================================

describe('Movement Rules', () => {
  it('should NOT allow advance when current node is not hacked, even with visible link', () => {
    const state = initializeRunState(testProject)

    // Current node (A) is NOT hacked
    expect(state.nodes['node-a'].hackeado).toBe(false)

    // Link A->B is visible
    expect(state.links['link-ab'].descubierto).toBe(true)

    // Try to move to B
    const { result } = moveToNode(state, testProject, 'node-b')

    // Should be denied
    expect(result.success).toBe(false)
    expect(result.message).toContain('NOT COMPROMISED')
  })

  // =============================================================================
  // TEST 2: hack exitoso en current → habilita enlaces salientes
  // =============================================================================

  it('should allow advance after successful hack on current node', () => {
    let state = initializeRunState(testProject)

    // Hack current node A successfully (roll >= cd of 5)
    const hackResult = attemptHack(state, testProject, 10)
    state = hackResult.newState

    expect(hackResult.result.success).toBe(true)
    expect(hackResult.result.hackeado).toBe(true)
    expect(state.nodes['node-a'].hackeado).toBe(true)

    // Now should be able to move to B via link
    const { result } = moveToNode(state, testProject, 'node-b')

    expect(result.success).toBe(true)
  })

  // =============================================================================
  // TEST 3: target hackeado → permite salto sin enlace
  // =============================================================================

  it('should allow jump to hacked target without link (fast-travel)', () => {
    let state = initializeRunState(testProject)

    // Hack node A
    let hackResult = attemptHack(state, testProject, 10)
    state = hackResult.newState

    // Move to B
    let moveResult = moveToNode(state, testProject, 'node-b')
    state = moveResult.newState

    // Hack node B
    hackResult = attemptHack(state, testProject, 10)
    state = hackResult.newState

    // Move to C
    moveResult = moveToNode(state, testProject, 'node-c')
    state = moveResult.newState

    // Hack node C
    hackResult = attemptHack(state, testProject, 15)
    state = hackResult.newState

    // Now at C, nodes A and B are hacked
    // Should be able to jump back to A (no direct link C->A)
    const { result } = moveToNode(state, testProject, 'node-a')

    expect(result.success).toBe(true)
    expect(result.message).toContain('RECONNECTING')
  })

  // =============================================================================
  // TEST 6: enlace oculto no descubierto → no habilita destino
  // =============================================================================

  it('should NOT allow movement via hidden undiscovered link', () => {
    let state = initializeRunState(testProject)

    // Hack node A
    const hackResult = attemptHack(state, testProject, 10)
    state = hackResult.newState

    // Hidden link A->D exists but is not discovered
    expect(state.links['link-ad'].descubierto).toBe(false)

    // Node D is not visible
    expect(state.nodes['node-d'].descubierto).toBe(false)

    // Try to move to D (should fail - not discovered)
    const { result } = moveToNode(state, testProject, 'node-d')

    expect(result.success).toBe(false)
  })

  // =============================================================================
  // TEST 7: discover revela enlace → pasa a usable (si current hackeado)
  // =============================================================================

  it('should allow movement after discovering hidden link (when current is hacked)', () => {
    let state = initializeRunState(testProject)

    // Hack node A first
    let hackResult = attemptHack(state, testProject, 10)
    state = hackResult.newState

    // Discover hidden links from A
    const discoverResult = discoverHiddenLinks(state, testProject)
    state = discoverResult.newState

    expect(discoverResult.result.discoveredLinks.length).toBeGreaterThan(0)
    expect(state.links['link-ad'].descubierto).toBe(true)
    expect(state.nodes['node-d'].descubierto).toBe(true)

    // Now should be able to move to D
    const { result } = moveToNode(state, testProject, 'node-d')

    expect(result.success).toBe(true)
  })
})

// =============================================================================
// TEST 4: hack WARNING → no habilita avance
// =============================================================================

describe('Hack Results', () => {
  it('should NOT enable movement when hack results in WARNING', () => {
    let state = initializeRunState(testProject)

    // Node A has cd=5 and failMode=WARNING
    // Roll 3 (>=3 but < cd) should give WARNING
    const hackResult = attemptHack(state, testProject, 4)
    state = hackResult.newState

    expect(hackResult.result.success).toBe(false)
    expect(hackResult.result.hackeado).toBe(false)
    expect(hackResult.result.bloqueado).toBe(false)
    expect(hackResult.result.message).toContain('TRACE DETECTED')

    // Node should NOT be hacked
    expect(state.nodes['node-a'].hackeado).toBe(false)

    // Movement to B should still be denied
    const { result } = moveToNode(state, testProject, 'node-b')
    expect(result.success).toBe(false)
  })

  // =============================================================================
  // TEST 5: roll < 3 → bloquea nodo actual
  // =============================================================================

  it('should block current node when roll < 3 (critical failure)', () => {
    const state = initializeRunState(testProject)

    // Roll 2 (< 3) should always block regardless of CD or failMode
    const hackResult = attemptHack(state, testProject, 2)

    expect(hackResult.result.success).toBe(false)
    expect(hackResult.result.hackeado).toBe(false)
    expect(hackResult.result.bloqueado).toBe(true)
    expect(hackResult.result.message).toContain('BLACK ICE')

    // Node should be blocked
    expect(hackResult.newState.nodes['node-a'].bloqueado).toBe(true)
    expect(hackResult.newState.nodes['node-a'].hackeado).toBe(false)
  })

  it('should block on roll < 3 even for node with low CD', () => {
    const state = initializeRunState(testProject)

    // Node D has cd=3, so roll of 3 would normally succeed
    // But roll of 2 should still block due to critical failure rule
    // First, we need to be at node D - let's modify state directly for test
    const stateAtD = {
      ...state,
      position: { circuitId: 'circuit-1', nodeId: 'node-d' },
      nodes: {
        ...state.nodes,
        'node-d': { ...state.nodes['node-d'], descubierto: true },
      },
    }

    const hackResult = attemptHack(stateAtD, testProject, 2)

    expect(hackResult.result.bloqueado).toBe(true)
    expect(hackResult.newState.nodes['node-d'].bloqueado).toBe(true)
  })

  it('should grant access when roll >= CD', () => {
    const state = initializeRunState(testProject)

    // Node A has cd=5, roll 5 should succeed
    const hackResult = attemptHack(state, testProject, 5)

    expect(hackResult.result.success).toBe(true)
    expect(hackResult.result.hackeado).toBe(true)
    expect(hackResult.result.message).toContain('ACCESS GRANTED')
  })

  it('should block on BLOQUEO mode when 3 <= roll < CD', () => {
    let state = initializeRunState(testProject)

    // First hack node A to move to B
    let hackResult = attemptHack(state, testProject, 10)
    state = hackResult.newState

    // Move to B
    const moveResult = moveToNode(state, testProject, 'node-b')
    state = moveResult.newState

    // Node B has cd=7 and failMode=BLOQUEO
    // Roll 5 (>=3 but < 7) should block due to BLOQUEO mode
    hackResult = attemptHack(state, testProject, 5)

    expect(hackResult.result.success).toBe(false)
    expect(hackResult.result.bloqueado).toBe(true)
    expect(hackResult.result.message).toContain('LOCKDOWN')
    expect(hackResult.newState.nodes['node-b'].bloqueado).toBe(true)
  })
})

// =============================================================================
// ADDITIONAL: Verify discoverHiddenLinks does NOT require current node hacked
// =============================================================================

describe('Discover Hidden Links', () => {
  it('should work WITHOUT current node being hacked', () => {
    const state = initializeRunState(testProject)

    // Current node A is NOT hacked
    expect(state.nodes['node-a'].hackeado).toBe(false)

    // Discover should still work
    const { result, newState } = discoverHiddenLinks(state, testProject)

    // Should discover the hidden link A->D
    expect(result.discoveredLinks).toContain('link-ad')
    expect(newState.links['link-ad'].descubierto).toBe(true)
  })
})

// =============================================================================
// ADDITIONAL: Verify getAvailableMoves does NOT use level
// =============================================================================

describe('getAvailableMoves', () => {
  it('should NOT use level for determining available moves', () => {
    let state = initializeRunState(testProject)

    // Hack A, then move to B, hack B, move to C, hack C
    let hack = attemptHack(state, testProject, 10)
    state = hack.newState

    let move = moveToNode(state, testProject, 'node-b')
    state = move.newState

    hack = attemptHack(state, testProject, 10)
    state = hack.newState

    move = moveToNode(state, testProject, 'node-c')
    state = move.newState

    hack = attemptHack(state, testProject, 15)
    state = hack.newState

    // Now at C (level 2), with A (level 0) and B (level 1) hacked
    const moves = getAvailableMoves(state, testProject)

    // Fast travel should include A and B regardless of their level
    expect(moves.fastTravel).toContain('node-a')
    expect(moves.fastTravel).toContain('node-b')
  })
})
