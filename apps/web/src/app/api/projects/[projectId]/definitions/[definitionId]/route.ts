// =============================================================================
// GET/PATCH /api/projects/:projectId/definitions/:definitionId
// =============================================================================
// GET: Get a specific definition version with data
// PATCH: Activate a specific version

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@rolhack/database'
import { auth } from '@/lib/auth'
import { isSuperAdmin, canEditProject } from '@/lib/rbac'

// =============================================================================
// GET - Get specific version with data
// =============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; definitionId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { projectId, definitionId } = await params
    const user = session.user

    // RBAC: Must be OWNER or SUPERADMIN to view definition data
    const canEdit = await canEditProject(user, projectId)
    if (!canEdit) {
      return NextResponse.json(
        { error: 'No tienes permiso para ver las definiciones de este proyecto' },
        { status: 403 }
      )
    }

    // Get definition
    const definition = await prisma.projectDefinition.findUnique({
      where: { id: definitionId },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            runs: {
              where: { deletedAt: null },
            },
          },
        },
      },
    })

    if (!definition) {
      return NextResponse.json(
        { error: 'Definición no encontrada' },
        { status: 404 }
      )
    }

    // Verify definition belongs to project
    if (definition.projectId !== projectId) {
      return NextResponse.json(
        { error: 'Definición no pertenece a este proyecto' },
        { status: 404 }
      )
    }

    // Parse data
    let data = null
    try {
      data = JSON.parse(definition.data)
    } catch {
      // If data is corrupted, return null
      data = null
    }

    return NextResponse.json({
      id: definition.id,
      projectId: definition.projectId,
      version: definition.version,
      isActive: definition.isActive,
      data,
      createdAt: definition.createdAt.toISOString(),
      createdBy: definition.createdBy,
      runsCount: definition._count.runs,
    })
  } catch (error) {
    console.error(
      '[API] GET /api/projects/[projectId]/definitions/[definitionId] error:',
      error
    )
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// =============================================================================
// PATCH - Activate a version
// =============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; definitionId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { projectId, definitionId } = await params
    const user = session.user

    // RBAC: Must be OWNER or SUPERADMIN to activate versions
    const canEdit = await canEditProject(user, projectId)
    if (!canEdit) {
      return NextResponse.json(
        { error: 'No tienes permiso para modificar este proyecto' },
        { status: 403 }
      )
    }

    // Parse body
    const body = await request.json().catch(() => ({}))

    // Only support isActive: true for now
    if (body.isActive !== true) {
      return NextResponse.json(
        { error: 'Solo se soporta activar versiones (isActive: true)' },
        { status: 400 }
      )
    }

    // Get definition
    const definition = await prisma.projectDefinition.findUnique({
      where: { id: definitionId },
      select: {
        id: true,
        projectId: true,
        version: true,
        isActive: true,
      },
    })

    if (!definition) {
      return NextResponse.json(
        { error: 'Definición no encontrada' },
        { status: 404 }
      )
    }

    // Verify definition belongs to project
    if (definition.projectId !== projectId) {
      return NextResponse.json(
        { error: 'Definición no pertenece a este proyecto' },
        { status: 404 }
      )
    }

    // Already active?
    if (definition.isActive) {
      return NextResponse.json({
        message: 'Esta versión ya está activa',
        version: definition.version,
      })
    }

    // Check for active runs on ANOTHER version (warn if switching)
    const activeRunsOnOtherVersions = await prisma.run.count({
      where: {
        definition: {
          projectId,
          id: { not: definitionId },
        },
        status: 'ACTIVE',
        deletedAt: null,
      },
    })

    // Allow SUPERADMIN to force switch even with active runs
    if (activeRunsOnOtherVersions > 0 && !isSuperAdmin(user)) {
      return NextResponse.json(
        {
          error: 'Hay runs activas en otras versiones. Contacta a un admin para cambiar.',
          activeRunsCount: activeRunsOnOtherVersions,
        },
        { status: 409 }
      )
    }

    // Activate in transaction
    await prisma.$transaction(async (tx) => {
      // Deactivate all other versions
      await tx.projectDefinition.updateMany({
        where: { projectId, isActive: true },
        data: { isActive: false },
      })

      // Activate this version
      await tx.projectDefinition.update({
        where: { id: definitionId },
        data: { isActive: true },
      })
    })

    console.log(
      `[API] Activated definition v${definition.version} for project ${projectId} by ${user.email}`
    )

    return NextResponse.json({
      message: `Versión ${definition.version} activada exitosamente`,
      version: definition.version,
    })
  } catch (error) {
    console.error(
      '[API] PATCH /api/projects/[projectId]/definitions/[definitionId] error:',
      error
    )
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
