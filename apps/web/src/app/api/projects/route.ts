// =============================================================================
// GET /api/projects - List accessible projects
// POST /api/projects - Create new project (SUPERADMIN only)
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/rbac'
import { prisma } from '@rolhack/database'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user
    const isAdmin = isSuperAdmin(user)

    let projects

    if (isAdmin) {
      // SUPERADMIN sees all projects
      projects = await prisma.project.findMany({
        where: { deletedAt: null },
        include: {
          members: {
            where: { userId: user.id, active: true },
            select: { role: true },
          },
          _count: {
            select: { runs: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
      })
    } else {
      // Regular users see only projects they're members of
      projects = await prisma.project.findMany({
        where: {
          deletedAt: null,
          members: {
            some: {
              userId: user.id,
              active: true,
            },
          },
        },
        include: {
          members: {
            where: { userId: user.id, active: true },
            select: { role: true },
          },
          _count: {
            select: { runs: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
      })
    }

    // Transform to include user's role
    const result = projects.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      enabled: p.enabled,
      userRole: isAdmin ? 'SUPERADMIN' : p.members[0]?.role || null,
      runCount: p._count.runs,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }))

    return NextResponse.json({ projects: result })
  } catch (error) {
    console.error('[API] GET /api/projects error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// =============================================================================
// POST /api/projects - Create new project (SUPERADMIN only)
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user

    // Only SUPERADMIN can create projects
    if (!isSuperAdmin(user)) {
      return NextResponse.json(
        { error: 'Solo SUPERADMIN puede crear proyectos' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, description } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'El nombre es requerido' },
        { status: 400 }
      )
    }

    // Create project with SUPERADMIN as OWNER
    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        enabled: true,
        members: {
          create: {
            userId: user.id,
            role: 'OWNER',
            active: true,
          },
        },
      },
    })

    return NextResponse.json({
      id: project.id,
      name: project.name,
      description: project.description,
      message: 'Proyecto creado exitosamente',
    })
  } catch (error) {
    console.error('[API] POST /api/projects error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
