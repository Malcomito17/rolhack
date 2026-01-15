// =============================================================================
// GET /api/projects/:projectId/my-runs - List user's runs for this project
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { isSuperAdmin, getProjectRole } from '@/lib/rbac'
import { prisma } from '@rolhack/database'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { projectId } = await params
    const user = session.user
    const isAdmin = isSuperAdmin(user)

    // Check access to project
    if (!isAdmin) {
      const role = await getProjectRole(user.id, projectId)
      if (!role) {
        return NextResponse.json(
          { error: 'No tienes acceso a este proyecto' },
          { status: 403 }
        )
      }
    }

    // Get runs for this project owned by current user
    const runs = await prisma.run.findMany({
      where: {
        projectId,
        ownerUserId: user.id,
        deletedAt: null,
      },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ runs })
  } catch (error) {
    console.error('[API] GET /api/projects/[projectId]/my-runs error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
