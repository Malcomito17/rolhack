// =============================================================================
// GET /api/projects/:projectId - Get project details
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

    // Check access
    if (!isAdmin) {
      const role = await getProjectRole(user.id, projectId)
      if (!role) {
        return NextResponse.json(
          { error: 'No tienes acceso a este proyecto' },
          { status: 403 }
        )
      }
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          where: { userId: user.id, active: true },
          select: { role: true },
        },
        definitions: {
          where: { isActive: true },
          select: { id: true, version: true, data: true },
          take: 1,
        },
      },
    })

    if (!project || project.deletedAt) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: project.id,
      name: project.name,
      description: project.description,
      enabled: project.enabled,
      userRole: isAdmin ? 'SUPERADMIN' : project.members[0]?.role || null,
      hasDefinition: project.definitions.length > 0,
      definitionVersion: project.definitions[0]?.version || null,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    })
  } catch (error) {
    console.error('[API] GET /api/projects/[projectId] error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
