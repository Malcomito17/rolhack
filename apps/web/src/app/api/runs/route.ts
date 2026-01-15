// =============================================================================
// GET /api/runs - List user's runs (SUPERADMIN sees all)
// =============================================================================

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/rbac'
import { listUserRuns, listAllRuns } from '@/lib/engine'

export async function GET() {
  try {
    // Auth check
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user
    const isAdmin = isSuperAdmin(user)

    // List runs
    const runs = isAdmin
      ? await listAllRuns()
      : await listUserRuns(user.id)

    return NextResponse.json({ runs })
  } catch (error) {
    console.error('[API] GET /api/runs error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
