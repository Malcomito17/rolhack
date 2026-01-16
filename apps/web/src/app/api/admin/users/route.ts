// =============================================================================
// GET /api/admin/users - List all users (SUPERADMIN only)
// =============================================================================

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/rbac'
import { prisma } from '@rolhack/database'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isSuperAdmin(session.user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const users = await prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        roleGlobal: true,
        createdAt: true,
        _count: {
          select: {
            projectMemberships: true,
            runs: true,
          },
        },
      },
    })

    return NextResponse.json({
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        image: u.image,
        roleGlobal: u.roleGlobal,
        createdAt: u.createdAt,
        projectCount: u._count.projectMemberships,
        runCount: u._count.runs,
      })),
    })
  } catch (error) {
    console.error('[API] GET /api/admin/users error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
