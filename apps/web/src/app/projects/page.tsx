import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { isSuperAdmin } from '@/lib/rbac'
import { prisma } from '@rolhack/database'

interface ProjectItem {
  id: string
  name: string
  description: string | null
  enabled: boolean
  userRole: string
  runCount: number
}

async function getProjects(userId: string, isAdmin: boolean): Promise<ProjectItem[]> {
  if (isAdmin) {
    const projects = await prisma.project.findMany({
      where: { deletedAt: null },
      include: {
        members: {
          where: { userId, active: true },
          select: { role: true },
        },
        _count: {
          select: { runs: { where: { ownerUserId: userId, deletedAt: null } } },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return projects.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      enabled: p.enabled,
      userRole: 'SUPERADMIN',
      runCount: p._count.runs,
    }))
  }

  const projects = await prisma.project.findMany({
    where: {
      deletedAt: null,
      members: {
        some: { userId, active: true },
      },
    },
    include: {
      members: {
        where: { userId, active: true },
        select: { role: true },
      },
      _count: {
        select: { runs: { where: { ownerUserId: userId, deletedAt: null } } },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return projects.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    enabled: p.enabled,
    userRole: p.members[0]?.role || 'USER',
    runCount: p._count.runs,
  }))
}

export default async function ProjectsPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/')
  }

  const user = session.user
  const isAdmin = isSuperAdmin(user)
  const projects = await getProjects(user.id, isAdmin)

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/" className="text-gray-500 hover:text-gray-400 text-sm mb-2 inline-block">
              &larr; Volver
            </Link>
            <h1 className="text-3xl font-bold text-cyber-primary">
              Proyectos
            </h1>
          </div>
          {isAdmin && (
            <Link
              href="/admin"
              className="text-cyber-accent hover:text-cyber-accent/80 text-sm"
            >
              Admin Panel
            </Link>
          )}
        </div>

        {/* Projects list */}
        {projects.length === 0 ? (
          <div className="bg-cyber-dark/50 border border-gray-800 rounded-lg p-12 text-center">
            <p className="text-gray-400 mb-2">No tienes proyectos asignados</p>
            <p className="text-gray-600 text-sm">
              Contacta a un administrador para obtener acceso
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {projects.map((project) => (
              <div
                key={project.id}
                className={`bg-cyber-dark/50 border rounded-lg p-6 transition-colors ${
                  project.enabled
                    ? 'border-cyber-primary/20 hover:border-cyber-primary/40'
                    : 'border-gray-800 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-xl font-semibold text-white truncate">
                        {project.name}
                      </h2>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        project.userRole === 'SUPERADMIN'
                          ? 'bg-cyber-accent/20 text-cyber-accent'
                          : project.userRole === 'OWNER'
                          ? 'bg-cyber-secondary/20 text-cyber-secondary'
                          : 'bg-gray-700 text-gray-400'
                      }`}>
                        {project.userRole}
                      </span>
                      {!project.enabled && (
                        <span className="text-xs px-2 py-0.5 rounded bg-red-900/30 text-red-400">
                          Deshabilitado
                        </span>
                      )}
                    </div>
                    {project.description && (
                      <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                        {project.description}
                      </p>
                    )}
                    <p className="text-gray-500 text-xs">
                      {project.runCount} {project.runCount === 1 ? 'run' : 'runs'}
                    </p>
                  </div>
                  <Link
                    href={`/projects/${project.id}`}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      project.enabled || isAdmin
                        ? 'bg-cyber-primary/10 border border-cyber-primary/30 hover:bg-cyber-primary/20 text-cyber-primary'
                        : 'bg-gray-800 text-gray-500 cursor-not-allowed pointer-events-none'
                    }`}
                  >
                    Abrir
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
