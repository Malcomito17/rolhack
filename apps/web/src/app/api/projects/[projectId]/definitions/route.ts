// =============================================================================
// GET/POST /api/projects/:projectId/definitions
// =============================================================================
// GET: List all definition versions for a project
// POST: Create a new definition version

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@rolhack/database'
import { auth } from '@/lib/auth'
import { isSuperAdmin, canEditProject } from '@/lib/rbac'
import { validateProjectDataFull } from '@/lib/engine/validation'
import type { ProjectData } from '@/lib/engine'

// =============================================================================
// GET - List all versions
// =============================================================================

export async function GET(
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

    // RBAC: Must be OWNER or SUPERADMIN to view definitions
    const canEdit = await canEditProject(user, projectId)
    if (!canEdit) {
      return NextResponse.json(
        { error: 'No tienes permiso para ver las definiciones de este proyecto' },
        { status: 403 }
      )
    }

    // Check project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true },
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado' },
        { status: 404 }
      )
    }

    // Get all versions
    const definitions = await prisma.projectDefinition.findMany({
      where: { projectId },
      orderBy: { version: 'desc' },
      select: {
        id: true,
        version: true,
        isActive: true,
        createdAt: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // Count runs per definition
    const definitionIds = definitions.map((d) => d.id)
    const runCounts = await prisma.run.groupBy({
      by: ['definitionId'],
      where: {
        definitionId: { in: definitionIds },
        deletedAt: null,
      },
      _count: { id: true },
    })

    const runCountMap = new Map(
      runCounts.map((r) => [r.definitionId, r._count.id])
    )

    // Find active definition
    const activeDefinition = definitions.find((d) => d.isActive)

    return NextResponse.json({
      projectId,
      projectName: project.name,
      activeVersionId: activeDefinition?.id || null,
      versions: definitions.map((d) => ({
        id: d.id,
        version: d.version,
        isActive: d.isActive,
        createdAt: d.createdAt.toISOString(),
        createdBy: d.createdBy,
        runsCount: runCountMap.get(d.id) || 0,
      })),
    })
  } catch (error) {
    console.error('[API] GET /api/projects/[projectId]/definitions error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// =============================================================================
// POST - Create new version
// =============================================================================

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

    // RBAC: Must be OWNER or SUPERADMIN to create definitions
    const canEdit = await canEditProject(user, projectId)
    if (!canEdit) {
      return NextResponse.json(
        { error: 'No tienes permiso para crear definiciones en este proyecto' },
        { status: 403 }
      )
    }

    // Check project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado' },
        { status: 404 }
      )
    }

    // Parse body
    const body = await request.json().catch(() => null)
    if (!body || !body.data) {
      return NextResponse.json(
        { error: 'Body must contain "data" field with ProjectData' },
        { status: 400 }
      )
    }

    // Validate ProjectData with full business rules
    const validation = validateProjectDataFull(body.data)
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'Validación fallida',
          errors: validation.errors,
        },
        { status: 400 }
      )
    }

    // Check for active runs (cannot create new version if there are active runs)
    const activeRunsCount = await prisma.run.count({
      where: {
        definition: { projectId },
        status: 'ACTIVE',
        deletedAt: null,
      },
    })

    if (activeRunsCount > 0 && !isSuperAdmin(user)) {
      return NextResponse.json(
        {
          error: 'No se puede crear nueva versión mientras hay runs activas',
          activeRunsCount,
        },
        { status: 409 }
      )
    }

    // Get next version number
    const lastVersion = await prisma.projectDefinition.findFirst({
      where: { projectId },
      orderBy: { version: 'desc' },
      select: { version: true },
    })
    const nextVersion = (lastVersion?.version || 0) + 1

    // Determine if this should be active (first version is always active)
    const isFirstVersion = !lastVersion
    const shouldBeActive = isFirstVersion || body.setActive === true

    // Create new definition in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // If setting as active, deactivate other versions
      if (shouldBeActive) {
        await tx.projectDefinition.updateMany({
          where: { projectId, isActive: true },
          data: { isActive: false },
        })
      }

      // Create new definition
      const definition = await tx.projectDefinition.create({
        data: {
          projectId,
          version: nextVersion,
          isActive: shouldBeActive,
          data: JSON.stringify(body.data),
          createdByUserId: user.id,
        },
        select: {
          id: true,
          version: true,
          isActive: true,
          createdAt: true,
        },
      })

      return definition
    })

    console.log(
      `[API] Created definition v${result.version} for project ${projectId} by ${user.email}`
    )

    return NextResponse.json(
      {
        id: result.id,
        version: result.version,
        isActive: result.isActive,
        createdAt: result.createdAt.toISOString(),
        message: `Versión ${result.version} creada exitosamente`,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[API] POST /api/projects/[projectId]/definitions error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
