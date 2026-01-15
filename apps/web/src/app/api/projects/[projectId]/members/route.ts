// =============================================================================
// GET/POST /api/projects/:projectId/members - List/Add members
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { isSuperAdmin, canManageMembers, getProjectRole } from '@/lib/rbac'
import { prisma } from '@rolhack/database'
import { z } from 'zod'

// Schema for adding a member
const AddMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['USER', 'OWNER']),
})

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

    const members = await prisma.projectMember.findMany({
      where: { projectId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({
      members: members.map((m) => ({
        userId: m.userId,
        email: m.user.email,
        name: m.user.name,
        image: m.user.image,
        role: m.role,
        active: m.active,
        createdAt: m.createdAt,
      })),
    })
  } catch (error) {
    console.error('[API] GET /api/projects/[projectId]/members error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { projectId } = await params
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
    const parsed = AddMemberSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { email, role } = parsed.data

    // Check if trying to assign OWNER without permission
    if (role === 'OWNER' && !canAssignOwner) {
      return NextResponse.json(
        { error: 'Solo SUPERADMIN puede asignar rol OWNER' },
        { status: 403 }
      )
    }

    // Find user by email
    const targetUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (!targetUser) {
      return NextResponse.json(
        { error: 'Usuario no encontrado. Debe registrarse primero.' },
        { status: 404 }
      )
    }

    // Create or update membership
    const member = await prisma.projectMember.upsert({
      where: {
        projectId_userId: { projectId, userId: targetUser.id },
      },
      create: {
        projectId,
        userId: targetUser.id,
        role,
        active: true,
      },
      update: {
        role,
        active: true,
      },
    })

    return NextResponse.json({
      userId: member.userId,
      role: member.role,
      active: member.active,
    })
  } catch (error) {
    console.error('[API] POST /api/projects/[projectId]/members error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
