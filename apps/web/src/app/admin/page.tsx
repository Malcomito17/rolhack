import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { isSuperAdmin } from '@/lib/rbac'
import { prisma } from '@rolhack/database'

export default async function AdminPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/')
  }

  const user = session.user
  const isAdmin = isSuperAdmin(user)

  if (!isAdmin) {
    redirect('/projects')
  }

  // Get stats
  const [projectCount, userCount, runCount] = await Promise.all([
    prisma.project.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.run.count({ where: { deletedAt: null } }),
  ])

  // Get recent projects
  const projects = await prisma.project.findMany({
    where: { deletedAt: null },
    orderBy: { updatedAt: 'desc' },
    take: 10,
    select: {
      id: true,
      name: true,
      enabled: true,
      _count: {
        select: { members: true, runs: true },
      },
    },
  })

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-gray-500 hover:text-gray-400 text-sm mb-2 inline-block">
            &larr; Volver
          </Link>
          <h1 className="text-3xl font-bold text-cyber-accent">
            Admin Panel
          </h1>
          <p className="text-gray-400">
            Panel de administracion de SUPERADMIN
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-cyber-dark/50 border border-cyber-accent/20 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-cyber-accent">{projectCount}</p>
            <p className="text-gray-400 text-sm">Proyectos</p>
          </div>
          <div className="bg-cyber-dark/50 border border-cyber-secondary/20 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-cyber-secondary">{userCount}</p>
            <p className="text-gray-400 text-sm">Usuarios</p>
          </div>
          <div className="bg-cyber-dark/50 border border-cyber-primary/20 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-cyber-primary">{runCount}</p>
            <p className="text-gray-400 text-sm">Runs</p>
          </div>
        </div>

        {/* Projects list */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">
            Proyectos
          </h2>
          {projects.length === 0 ? (
            <div className="bg-cyber-dark/50 border border-gray-800 rounded-lg p-8 text-center">
              <p className="text-gray-400">No hay proyectos</p>
            </div>
          ) : (
            <div className="space-y-3">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="bg-cyber-dark/50 border border-gray-800 hover:border-gray-700 rounded-lg p-4 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-white font-medium truncate">
                          {project.name}
                        </span>
                        {!project.enabled && (
                          <span className="text-xs px-2 py-0.5 rounded bg-red-900/30 text-red-400">
                            Deshabilitado
                          </span>
                        )}
                      </div>
                      <p className="text-gray-500 text-xs">
                        {project._count.members} miembros &middot; {project._count.runs} runs
                      </p>
                    </div>
                    <Link
                      href={`/admin/projects/${project.id}`}
                      className="px-4 py-2 bg-cyber-accent/10 border border-cyber-accent/30 hover:bg-cyber-accent/20 text-cyber-accent rounded-lg text-sm font-medium transition-colors"
                    >
                      Gestionar
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
