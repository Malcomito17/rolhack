// =============================================================================
// POST /api/runs/:runId/move - Move to a connected node
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/rbac'
import {
  moveToNodeService,
  canAccessRun,
  EngineError,
  MoveToNodeInputSchema,
} from '@/lib/engine'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    // Auth check
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { runId } = await params
    const user = session.user
    const isAdmin = isSuperAdmin(user)

    // Permission check
    const canAccess = await canAccessRun(user.id, runId, isAdmin)
    if (!canAccess) {
      return NextResponse.json(
        { error: 'No tienes acceso a esta run' },
        { status: 403 }
      )
    }

    // Parse body
    const body = await request.json().catch(() => ({}))
    const parsed = MoveToNodeInputSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // Move
    const result = await moveToNodeService(runId, parsed.data.targetNodeId)

    return NextResponse.json(result)
  } catch (error) {
    console.error('[API] POST /api/runs/[runId]/move error:', error)

    if (error instanceof EngineError) {
      const status = error.code === 'NOT_FOUND' ? 404 : 400
      return NextResponse.json({ error: error.message }, { status })
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
