import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { isSuperAdmin, getProjectRole } from '@/lib/rbac'
import { prisma } from '@rolhack/database'
import { MembersList } from './members-list'

interface Props {
  params: Promise<{ projectId: string }>
}

export default async function AdminProjectPage({ params }: Props) {
  const session = await auth()

  if (!session?.user) {
    redirect('/')
  }

  const { projectId } = await params
  const user = session.user
  const isAdmin = isSuperAdmin(user)

  // Check access - must be SUPERADMIN or OWNER
  if (!isAdmin) {
    const role = await getProjectRole(user.id, projectId)
    if (role !== 'OWNER') {
      redirect('/projects')
    }
  }

  // Get project
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              image: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
      _count: {
        select: { runs: true },
      },
    },
  })

  if (!project || project.deletedAt) {
    notFound()
  }

  const userRole = isAdmin ? 'SUPERADMIN' : 'OWNER'

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={isAdmin ? '/admin' : `/projects/${projectId}`}
            className="text-gray-500 hover:text-gray-400 text-sm mb-2 inline-block"
          >
            &larr; Volver
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-cyber-accent">
              {project.name}
            </h1>
            {!project.enabled && (
              <span className="text-xs px-2 py-0.5 rounded bg-red-900/30 text-red-400">
                Deshabilitado
              </span>
            )}
          </div>
          <p className="text-gray-400">
            Gestion de miembros del proyecto
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-cyber-dark/50 border border-gray-800 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-white">{project.members.length}</p>
            <p className="text-gray-400 text-sm">Miembros</p>
          </div>
          <div className="bg-cyber-dark/50 border border-gray-800 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-white">{project._count.runs}</p>
            <p className="text-gray-400 text-sm">Runs</p>
          </div>
        </div>

        {/* Members list */}
        <MembersList
          projectId={projectId}
          members={project.members.map(m => ({
            userId: m.userId,
            email: m.user.email,
            name: m.user.name,
            role: m.role as 'OWNER' | 'USER',
            active: m.active,
          }))}
          canAssignOwner={isAdmin}
          currentUserId={user.id}
        />
      </div>
    </main>
  )
}
