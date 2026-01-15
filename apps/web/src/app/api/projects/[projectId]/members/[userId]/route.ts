// =============================================================================
// PATCH /api/projects/:projectId/members/:userId - Update member role/active
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { canManageMembers, canRemoveMember } from '@/lib/rbac'
import { prisma } from '@rolhack/database'
import { z } from 'zod'

// Schema for updating a member
const UpdateMemberSchema = z.object({
  role: z.enum(['USER', 'OWNER']).optional(),
  active: z.boolean().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; userId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { projectId, userId: targetUserId } = await params
    const user = session.user

    // Check permission to manage members
    const { allowed, canAssignOwner } = await canManageMembers(user, projectId)
    if (!allowed) {
      return NextResponse.json(
        { error: 'No tienes permiso para gestionar miembros' },
        { status: 403 }
      )
    }

    // Parse body
    const body = await request.json().catch(() => ({}))
    const parsed = UpdateMemberSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { role, active } = parsed.data

    // Check if trying to assign OWNER without permission
    if (role === 'OWNER' && !canAssignOwner) {
      return NextResponse.json(
        { error: 'Solo SUPERADMIN puede asignar rol OWNER' },
        { status: 403 }
      )
    }

    // Check if deactivating a member
    if (active === false) {
      const { allowed: canRemove, reason } = await canRemoveMember(
        projectId,
        targetUserId
      )
      if (!canRemove) {
        return NextResponse.json({ error: reason }, { status: 400 })
      }
    }

    // Get current member
    const currentMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId, userId: targetUserId },
      },
    })

    if (!currentMember) {
      return NextResponse.json(
        { error: 'Miembro no encontrado' },
        { status: 404 }
      )
    }

    // If changing OWNER to USER, check last owner
    if (role === 'USER' && currentMember.role === 'OWNER') {
      const { allowed: canChange, reason } = await canRemoveMember(
        projectId,
        targetUserId
      )
      if (!canChange) {
        return NextResponse.json({ error: reason }, { status: 400 })
      }
    }

    // Update member
    const member = await prisma.projectMember.update({
      where: {
        projectId_userId: { projectId, userId: targetUserId },
      },
      data: {
        ...(role !== undefined && { role }),
        ...(active !== undefined && { active }),
      },
    })

    return NextResponse.json({
      userId: member.userId,
      role: member.role,
      active: member.active,
    })
  } catch (error) {
    console.error(
      '[API] PATCH /api/projects/[projectId]/members/[userId] error:',
      error
    )
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
