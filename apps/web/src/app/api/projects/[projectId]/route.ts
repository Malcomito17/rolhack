// =============================================================================
// GET /api/projects/:projectId - Get project details
// PATCH /api/projects/:projectId - Update project (name, description, enabled)
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
        visualTemplate: true,
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
      visualTemplateId: project.visualTemplateId,
      visualTemplate: project.visualTemplate
        ? {
            id: project.visualTemplate.id,
            name: project.visualTemplate.name,
            layout: project.visualTemplate.layout,
            theme: JSON.parse(project.visualTemplate.theme),
            components: JSON.parse(project.visualTemplate.components),
            effects: JSON.parse(project.visualTemplate.effects),
          }
        : null,
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

// =============================================================================
// PATCH /api/projects/:projectId - Update project details
// =============================================================================

export async function PATCH(
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
    const isAdmin = isSuperAdmin(user)

    // Check access - must be SUPERADMIN or OWNER
    if (!isAdmin) {
      const role = await getProjectRole(user.id, projectId)
      if (role !== 'OWNER') {
        return NextResponse.json(
          { error: 'Solo SUPERADMIN u OWNER pueden editar el proyecto' },
          { status: 403 }
        )
      }
    }

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

    const body = await request.json()
    const { name, description, enabled, visualTemplateId } = body

    // Build update data
    const updateData: {
      name?: string
      description?: string | null
      enabled?: boolean
      visualTemplateId?: string | null
    } = {}

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { error: 'El nombre no puede estar vacío' },
          { status: 400 }
        )
      }
      updateData.name = name.trim()
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || null
    }

    if (enabled !== undefined) {
      updateData.enabled = Boolean(enabled)
    }

    if (visualTemplateId !== undefined) {
      // Validate template exists if provided
      if (visualTemplateId !== null) {
        const template = await prisma.visualTemplate.findUnique({
          where: { id: visualTemplateId },
        })
        if (!template) {
          return NextResponse.json(
            { error: 'Template no encontrado' },
            { status: 400 }
          )
        }
      }
      updateData.visualTemplateId = visualTemplateId
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No hay campos para actualizar' },
        { status: 400 }
      )
    }

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: updateData,
      include: {
        visualTemplate: true,
      },
    })

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      description: updated.description,
      enabled: updated.enabled,
      visualTemplateId: updated.visualTemplateId,
      visualTemplate: updated.visualTemplate
        ? {
            id: updated.visualTemplate.id,
            name: updated.visualTemplate.name,
            layout: updated.visualTemplate.layout,
          }
        : null,
      message: 'Proyecto actualizado',
    })
  } catch (error) {
    console.error('[API] PATCH /api/projects/[projectId] error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
