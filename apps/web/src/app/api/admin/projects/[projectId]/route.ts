// =============================================================================
// SUPERADMIN-only endpoints for project management
// DELETE /api/admin/projects/:id - Soft delete project
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/rbac'
import { prisma } from '@rolhack/database'

// DELETE - Soft delete a project (SUPERADMIN only)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only SUPERADMIN can delete projects
    if (!isSuperAdmin(session.user)) {
      return NextResponse.json(
        { error: 'Solo SUPERADMIN puede eliminar proyectos' },
        { status: 403 }
      )
    }

    const { projectId } = await params

    // Check project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado' },
        { status: 404 }
      )
    }

    if (project.deletedAt) {
      return NextResponse.json(
        { error: 'Proyecto ya eliminado' },
        { status: 400 }
      )
    }

    // Soft delete the project
    await prisma.project.update({
      where: { id: projectId },
      data: { deletedAt: new Date() },
    })

    // Also soft delete all runs
    await prisma.run.updateMany({
      where: { projectId, deletedAt: null },
      data: { deletedAt: new Date() },
    })

    return NextResponse.json({
      message: 'Proyecto eliminado',
    })
  } catch (error) {
    console.error('[API] DELETE /api/admin/projects/[projectId] error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
