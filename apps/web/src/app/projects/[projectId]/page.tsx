import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { isSuperAdmin, getProjectRole } from '@/lib/rbac'
import { prisma } from '@rolhack/database'
import { CreateRunButton } from './create-run-button'

interface Props {
  params: Promise<{ projectId: string }>
}

export default async function ProjectDetailPage({ params }: Props) {
  const session = await auth()

  if (!session?.user) {
    redirect('/')
  }

  const { projectId } = await params
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

  // Get user's runs for this project
  const runs = await prisma.run.findMany({
    where: {
      projectId,
      ownerUserId: user.id,
      deletedAt: null,
    },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      name: true,
      status: true,
      createdAt: true,
      updatedAt: true,
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
              <Link
                href={`/admin/projects/${projectId}`}
                className="text-cyber-accent hover:text-cyber-accent/80 text-sm whitespace-nowrap"
              >
                Gestionar
              </Link>
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
            <CreateRunButton projectId={projectId} hasActiveRun={!!lastActiveRun} />
          </div>
        )}

        {/* Runs list */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">
            Mis Runs ({runs.length})
          </h2>

          {runs.length === 0 ? (
            <div className="bg-cyber-dark/50 border border-gray-800 rounded-lg p-8 text-center">
              <p className="text-gray-400">No tienes runs en este proyecto</p>
              <p className="text-gray-600 text-sm mt-1">
                Crea una nueva run para comenzar a jugar
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {runs.map((run) => (
                <div
                  key={run.id}
                  className="bg-cyber-dark/50 border border-gray-800 hover:border-gray-700 rounded-lg p-4 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-white font-medium truncate">
                          {run.name || `Run ${run.id.slice(0, 8)}`}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          run.status === 'ACTIVE'
                            ? 'bg-cyber-primary/20 text-cyber-primary'
                            : 'bg-gray-700 text-gray-400'
                        }`}>
                          {run.status}
                        </span>
                      </div>
                      <p className="text-gray-500 text-xs">
                        Actualizado: {new Date(run.updatedAt).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <Link
                      href={`/runs/${run.id}`}
                      className="px-4 py-2 bg-cyber-secondary/10 border border-cyber-secondary/30 hover:bg-cyber-secondary/20 text-cyber-secondary rounded-lg text-sm font-medium transition-colors"
                    >
                      Jugar
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
