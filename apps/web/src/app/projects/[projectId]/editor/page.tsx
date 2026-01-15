// =============================================================================
// /projects/[projectId]/editor - Adventure Editor Page
// =============================================================================
// Server component that handles auth and RBAC, then renders the editor

import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@rolhack/database'
import { auth } from '@/lib/auth'
import { canEditProject, isSuperAdmin } from '@/lib/rbac'
import { EditorContainer } from './editor-container'
import type { ProjectData } from '@/lib/engine'

interface Props {
  params: Promise<{ projectId: string }>
}

export default async function EditorPage({ params }: Props) {
  const { projectId } = await params

  // Auth check
  const session = await auth()
  if (!session?.user) {
    redirect('/api/auth/signin')
  }

  const user = session.user

  // RBAC check - must be OWNER or SUPERADMIN
  const canEdit = await canEditProject(user, projectId)
  if (!canEdit) {
    redirect(`/projects/${projectId}`)
  }

  // Get project with active definition
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      definitions: {
        orderBy: { version: 'desc' },
        include: {
          createdBy: {
            select: { id: true, name: true, email: true },
          },
          _count: {
            select: {
              runs: { where: { deletedAt: null } },
            },
          },
        },
      },
    },
  })

  if (!project) {
    notFound()
  }

  // Get active definition data
  const activeDefinition = project.definitions.find((d) => d.isActive)
  let initialData: ProjectData | null = null

  if (activeDefinition) {
    try {
      initialData = JSON.parse(activeDefinition.data) as ProjectData
    } catch {
      initialData = null
    }
  }

  // Create default data if no definition exists
  if (!initialData) {
    initialData = {
      meta: {
        version: '1.0.0',
        author: user.name || user.email,
        description: project.description || '',
      },
      circuits: [],
    }
  }

  // Format versions for the editor
  const versions = project.definitions.map((d) => ({
    id: d.id,
    version: d.version,
    isActive: d.isActive,
    createdAt: d.createdAt.toISOString(),
    createdBy: d.createdBy,
    runsCount: d._count.runs,
  }))

  return (
    <div className="min-h-screen bg-cyber-darker">
      {/* Header */}
      <header className="border-b border-gray-800 bg-cyber-dark/50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href={`/projects/${projectId}`}
                className="text-gray-500 hover:text-gray-400 transition-colors"
              >
                &larr; Volver
              </Link>
              <div>
                <h1 className="text-xl font-bold text-cyber-primary">
                  Editor de Aventura
                </h1>
                <p className="text-sm text-gray-400">{project.name}</p>
              </div>
            </div>

            {isSuperAdmin(user) && (
              <span className="px-2 py-1 text-xs bg-cyber-accent/20 text-cyber-accent rounded">
                SUPERADMIN
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Editor Container */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <EditorContainer
          projectId={projectId}
          projectName={project.name}
          initialData={initialData}
          versions={versions}
          activeVersionId={activeDefinition?.id || null}
        />
      </main>
    </div>
  )
}
