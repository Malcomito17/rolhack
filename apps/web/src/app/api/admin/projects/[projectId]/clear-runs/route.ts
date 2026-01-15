// =============================================================================
// POST /api/admin/projects/:id/clear-runs - Clear all runs (SUPERADMIN only)
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/rbac'
import { prisma } from '@rolhack/database'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only SUPERADMIN can clear runs
    if (!isSuperAdmin(session.user)) {
      return NextResponse.json(
        { error: 'Solo SUPERADMIN puede limpiar runs' },
        { status: 403 }
      )
    }

    const { projectId } = await params

    // Check project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    })

    if (!project || project.deletedAt) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado' },
        { status: 404 }
      )
    }

    // Count runs to delete
    const runCount = await prisma.run.count({
      where: { projectId, deletedAt: null },
    })

    // Soft delete all runs for this project
    await prisma.run.updateMany({
      where: { projectId, deletedAt: null },
      data: { deletedAt: new Date() },
    })

    return NextResponse.json({
      message: `${runCount} runs eliminadas`,
      count: runCount,
    })
  } catch (error) {
    console.error('[API] POST /api/admin/projects/[projectId]/clear-runs error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
