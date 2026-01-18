// =============================================================================
// API /api/runs/:runId
// GET - Get run details including state
// PATCH - Rename a run (OWNER/SUPERADMIN only)
// DELETE - Soft delete a run (OWNER/SUPERADMIN only)
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { isSuperAdmin, getProjectRole } from '@/lib/rbac'
import { getRunInfo, canAccessRun, EngineError } from '@/lib/engine'
import { prisma } from '@rolhack/database'
import { z } from 'zod'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    // Auth check
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { runId } = await params
    const user = session.user
    const isAdmin = isSuperAdmin(user)

    // Permission check
    const canAccess = await canAccessRun(user.id, runId, isAdmin)
    if (!canAccess) {
      return NextResponse.json(
        { error: 'No tienes acceso a esta run' },
        { status: 403 }
      )
    }

    // Get run info
    const runInfo = await getRunInfo(runId)

    return NextResponse.json(runInfo)
  } catch (error) {
    console.error('[API] GET /api/runs/[runId] error:', error)

    if (error instanceof EngineError) {
      const status = error.code === 'NOT_FOUND' ? 404 : 400
      return NextResponse.json({ error: error.message }, { status })
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// =============================================================================
// PATCH /api/runs/:runId - Rename a run
// Requires: OWNER role or SUPERADMIN
// =============================================================================

const renameSchema = z.object({
  name: z.string().min(1).max(100).trim(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { runId } = await params
    const user = session.user
    const isAdmin = isSuperAdmin(user)

    // Get run to check project ownership
    const run = await prisma.run.findUnique({
      where: { id: runId, deletedAt: null },
      select: { projectId: true },
    })

    if (!run) {
      return NextResponse.json({ error: 'Run no encontrada' }, { status: 404 })
    }

    // Check OWNER or SUPERADMIN permission
    if (!isAdmin) {
      const projectRole = await getProjectRole(user.id, run.projectId)
      if (projectRole !== 'OWNER') {
        return NextResponse.json(
          { error: 'Solo OWNER o SUPERADMIN pueden renombrar runs' },
          { status: 403 }
        )
      }
    }

    // Parse and validate body
    const body = await request.json()
    const parsed = renameSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Nombre inválido', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // Update run name
    const updatedRun = await prisma.run.update({
      where: { id: runId },
      data: { name: parsed.data.name },
      select: { id: true, name: true },
    })

    return NextResponse.json(updatedRun)
  } catch (error) {
    console.error('[API] PATCH /api/runs/[runId] error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// =============================================================================
// DELETE /api/runs/:runId - Soft delete a run
// Requires: OWNER role or SUPERADMIN
// =============================================================================

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { runId } = await params
    const user = session.user
    const isAdmin = isSuperAdmin(user)

    // Get run to check project ownership
    const run = await prisma.run.findUnique({
      where: { id: runId, deletedAt: null },
      select: { projectId: true },
    })

    if (!run) {
      return NextResponse.json({ error: 'Run no encontrada' }, { status: 404 })
    }

    // Check OWNER or SUPERADMIN permission
    if (!isAdmin) {
      const projectRole = await getProjectRole(user.id, run.projectId)
      if (projectRole !== 'OWNER') {
        return NextResponse.json(
          { error: 'Solo OWNER o SUPERADMIN pueden eliminar runs' },
          { status: 403 }
        )
      }
    }

    // Soft delete
    await prisma.run.update({
      where: { id: runId },
      data: { deletedAt: new Date() },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] DELETE /api/runs/[runId] error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
