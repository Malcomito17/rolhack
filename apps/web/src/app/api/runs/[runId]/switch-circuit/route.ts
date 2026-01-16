// =============================================================================
// POST /api/runs/:runId/switch-circuit - Switch to a different circuit
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/rbac'
import { switchCircuitService, canAccessRun } from '@/lib/engine'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { runId } = await params
    const user = session.user
    const isAdmin = isSuperAdmin(user)

    // Check access
    const hasAccess = await canAccessRun(user.id, runId, isAdmin)
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'No tienes acceso a esta run' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { targetCircuitId } = body

    if (!targetCircuitId || typeof targetCircuitId !== 'string') {
      return NextResponse.json(
        { error: 'targetCircuitId is required' },
        { status: 400 }
      )
    }

    const result = await switchCircuitService(runId, targetCircuitId)

    return NextResponse.json(result)
  } catch (error) {
    console.error('[API] POST /api/runs/[runId]/switch-circuit error:', error)

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Run no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
