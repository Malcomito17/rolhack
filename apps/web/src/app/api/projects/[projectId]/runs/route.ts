// =============================================================================
// POST /api/projects/:projectId/runs - Create a new run
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/rbac'
import {
  createRun,
  canCreateRunInProject,
  EngineError,
  CreateRunInputSchema,
} from '@/lib/engine'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    // Auth check
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { projectId } = await params
    const user = session.user
    const isAdmin = isSuperAdmin(user)

    // Permission check
    const canCreate = await canCreateRunInProject(user.id, projectId, isAdmin)
    if (!canCreate) {
      return NextResponse.json(
        { error: 'No tienes permiso para crear runs en este proyecto' },
        { status: 403 }
      )
    }

    // Parse body
    const body = await request.json().catch(() => ({}))
    const parsed = CreateRunInputSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // Create run
    const result = await createRun(projectId, user.id, parsed.data.name)

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('[API] POST /api/projects/[projectId]/runs error:', error)

    if (error instanceof EngineError) {
      const status =
        error.code === 'NOT_FOUND'
          ? 404
          : error.code === 'PERMISSION_DENIED'
            ? 403
            : 400
      return NextResponse.json({ error: error.message }, { status })
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
