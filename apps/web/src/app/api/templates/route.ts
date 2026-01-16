// =============================================================================
// GET /api/templates - List all visual templates
// =============================================================================

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@rolhack/database'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const templates = await prisma.visualTemplate.findMany({
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({
      templates: templates.map((t) => ({
        id: t.id,
        key: t.key,
        name: t.name,
        description: t.description,
        renderer: t.renderer,
        theme: JSON.parse(t.theme),
        components: JSON.parse(t.components),
        effects: JSON.parse(t.effects),
        isSystem: t.isSystem,
      })),
    })
  } catch (error) {
    console.error('[API] GET /api/templates error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
