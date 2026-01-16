// =============================================================================
// DELETE /api/admin/users/:userId - Delete user (SUPERADMIN only)
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/rbac'
import { prisma } from '@rolhack/database'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isSuperAdmin(session.user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { userId } = await params

    // Cannot delete yourself
    if (userId === session.user.id) {
      return NextResponse.json(
        { error: 'No puedes eliminarte a ti mismo' },
        { status: 400 }
      )
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        roleGlobal: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // Cannot delete another SUPERADMIN
    if (user.roleGlobal === 'SUPERADMIN') {
      return NextResponse.json(
        { error: 'No puedes eliminar a otro SUPERADMIN' },
        { status: 400 }
      )
    }

    // Delete physically (cascade will handle memberships, runs, etc.)
    // First delete related records in correct order
    await prisma.$transaction(async (tx) => {
      // Delete user's runs
      await tx.run.deleteMany({ where: { ownerUserId: userId } })

      // Delete user's project memberships
      await tx.projectMember.deleteMany({ where: { userId } })

      // Delete user's accounts (OAuth)
      await tx.account.deleteMany({ where: { userId } })

      // Delete user's sessions
      await tx.session.deleteMany({ where: { userId } })

      // Finally delete the user
      await tx.user.delete({ where: { id: userId } })
    })

    return NextResponse.json({
      success: true,
      message: `Usuario ${user.email} eliminado permanentemente`,
    })
  } catch (error) {
    console.error('[API] DELETE /api/admin/users/[userId] error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
