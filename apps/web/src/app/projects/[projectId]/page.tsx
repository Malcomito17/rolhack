import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { isSuperAdmin, getProjectRole } from '@/lib/rbac'
import { prisma } from '@rolhack/database'
import { CreateRunButton } from './create-run-button'
import { EditProjectForm } from './edit-project-form'
import { RunListItem } from './run-list-item'
import { RunSortControls } from './run-sort-controls'

type SortField = 'date' | 'name' | 'user'
type SortOrder = 'asc' | 'desc'

interface Props {
  params: Promise<{ projectId: string }>
  searchParams: Promise<{ sort?: string; order?: string }>
}

export default async function ProjectDetailPage({ params, searchParams }: Props) {
  const session = await auth()
  const { projectId } = await params
  const { sort, order } = await searchParams

  // Parse sorting params
  const sortField: SortField = ['date', 'name', 'user'].includes(sort || '') ? (sort as SortField) : 'date'
  const sortOrder: SortOrder = order === 'asc' ? 'asc' : 'desc'

  // If not authenticated, redirect to login with return URL
  if (!session?.user) {
    const returnUrl = encodeURIComponent(`/projects/${projectId}`)
    redirect(`/auth/login?callbackUrl=${returnUrl}`)
  }
  const user = session.user
  const isAdmin = isSuperAdmin(user)

  // Check access
  if (!isAdmin) {
    const role = await getProjectRole(user.id, projectId)
    if (!role) {
      notFound()
    }
  }

  // Get project
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      members: {
        where: { userId: user.id, active: true },
        select: { role: true },
      },
      definitions: {
        where: { isActive: true },
        select: { id: true, version: true },
        take: 1,
      },
    },
  })

  if (!project || project.deletedAt) {
    notFound()
  }

  // Build orderBy based on sort params
  const getOrderBy = () => {
    switch (sortField) {
      case 'name':
        return { name: sortOrder }
      case 'user':
        return { owner: { name: sortOrder } }
      case 'date':
      default:
        return { updatedAt: sortOrder }
    }
  }

  // Get runs for this project
  // SUPERADMIN sees all runs, others see only their own
  const runs = await prisma.run.findMany({
    where: {
      projectId,
      ...(isAdmin ? {} : { ownerUserId: user.id }),
      deletedAt: null,
    },
    orderBy: getOrderBy(),
    select: {
      id: true,
      name: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      ownerUserId: true,
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })

  const userRole = isAdmin ? 'SUPERADMIN' : project.members[0]?.role || null
  const canPlay = project.enabled || isAdmin
  const hasDefinition = project.definitions.length > 0
  const lastActiveRun = runs.find((r) => r.status === 'ACTIVE')
  const canManage = userRole === 'SUPERADMIN' || userRole === 'OWNER'

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/projects" className="text-gray-500 hover:text-gray-400 text-sm mb-2 inline-block">
            &larr; Proyectos
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-cyber-primary">
                  {project.name}
                </h1>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  userRole === 'SUPERADMIN'
                    ? 'bg-cyber-accent/20 text-cyber-accent'
                    : userRole === 'OWNER'
                    ? 'bg-cyber-secondary/20 text-cyber-secondary'
                    : 'bg-gray-700 text-gray-400'
                }`}>
                  {userRole}
                </span>
                {!project.enabled && (
                  <span className="text-xs px-2 py-0.5 rounded bg-red-900/30 text-red-400">
                    Deshabilitado
                  </span>
                )}
              </div>
              {project.description && (
                <p className="text-gray-400">{project.description}</p>
              )}
            </div>
            {canManage && (
              <div className="flex items-center gap-3">
                <EditProjectForm
                  projectId={projectId}
                  initialName={project.name}
                  initialDescription={project.description}
                  initialEnabled={project.enabled}
                  initialTemplateId={project.visualTemplateId}
                />
                <Link
                  href={`/projects/${projectId}/editor`}
                  className="px-3 py-1.5 bg-cyber-secondary/10 border border-cyber-secondary/30 hover:bg-cyber-secondary/20 text-cyber-secondary text-sm rounded transition-colors"
                >
                  Editor
                </Link>
                <Link
                  href={`/admin/projects/${projectId}`}
                  className="text-cyber-accent hover:text-cyber-accent/80 text-sm whitespace-nowrap py-1.5"
                >
                  Gestionar
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Status messages */}
        {!hasDefinition && (
          <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-4 mb-6">
            <p className="text-yellow-400 text-sm">
              Este proyecto no tiene una definicion activa. No se pueden crear runs.
            </p>
          </div>
        )}

        {!canPlay && (
          <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-4 mb-6">
            <p className="text-red-400 text-sm">
              Este proyecto esta deshabilitado.
            </p>
          </div>
        )}

        {/* Actions */}
        {canPlay && hasDefinition && (
          <div className="flex gap-4 mb-8">
            {lastActiveRun && (
              <Link
                href={`/runs/${lastActiveRun.id}`}
                className="flex-1 bg-cyber-primary text-cyber-darker hover:bg-cyber-primary/90 py-3 px-4 rounded-lg font-medium text-center transition-colors"
              >
                Continuar ultima run
              </Link>
            )}
            <CreateRunButton projectId={projectId} projectName={project.name} hasActiveRun={!!lastActiveRun} />
          </div>
        )}

        {/* Runs list */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">
              {isAdmin ? `Todas las Runs (${runs.length})` : `Mis Runs (${runs.length})`}
            </h2>
            {runs.length > 1 && (
              <RunSortControls showUserSort={isAdmin} />
            )}
          </div>

          {runs.length === 0 ? (
            <div className="bg-cyber-dark/50 border border-gray-800 rounded-lg p-8 text-center">
              <p className="text-gray-400">
                {isAdmin ? 'No hay runs en este proyecto' : 'No tienes runs en este proyecto'}
              </p>
              <p className="text-gray-600 text-sm mt-1">
                Crea una nueva run para comenzar a jugar
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {runs.map((run) => (
                <RunListItem
                  key={run.id}
                  run={{
                    id: run.id,
                    name: run.name,
                    status: run.status,
                    createdAt: run.createdAt.toISOString(),
                    updatedAt: run.updatedAt.toISOString(),
                  }}
                  projectName={project.name}
                  canManage={canManage}
                  ownerName={isAdmin && run.ownerUserId !== user.id ? (run.owner.name || run.owner.email) : undefined}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
