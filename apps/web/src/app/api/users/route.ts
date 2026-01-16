// =============================================================================
// GET /api/users - List available users (for adding to projects)
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { isSuperAdmin, getProjectRole } from '@/lib/rbac'
import { prisma } from '@rolhack/database'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isAdmin = isSuperAdmin(session.user)
    const projectId = request.nextUrl.searchParams.get('projectId')

    // If projectId is provided, check if user has permission to manage that project
    if (projectId && !isAdmin) {
      const role = await getProjectRole(session.user.id, projectId)
      if (role !== 'OWNER') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else if (!projectId && !isAdmin) {
      // Without projectId, only SUPERADMIN can list all users
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get all active users
    const users = await prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { email: 'asc' },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
      },
    })

    // If projectId provided, also return which users are already members
    let existingMemberIds: string[] = []
    if (projectId) {
      const members = await prisma.projectMember.findMany({
        where: { projectId },
        select: { userId: true },
      })
      existingMemberIds = members.map((m) => m.userId)
    }

    return NextResponse.json({
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        image: u.image,
        isMember: existingMemberIds.includes(u.id),
      })),
    })
  } catch (error) {
    console.error('[API] GET /api/users error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
