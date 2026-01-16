import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { isSuperAdmin, getProjectRole } from '@/lib/rbac'
import { prisma } from '@rolhack/database'
import { parseProjectData, parseRunState } from '@/lib/engine'
import { GameScreen } from './game-screen'
import type { ProjectData, RunState } from '@/lib/engine'

interface Props {
  params: Promise<{ runId: string }>
}

export default async function RunPage({ params }: Props) {
  const session = await auth()
  const { runId } = await params

  // If not authenticated, redirect to login with return URL
  if (!session?.user) {
    // Encode the return URL to safely pass it as a query parameter
    const returnUrl = encodeURIComponent(`/runs/${runId}`)
    redirect(`/auth/login?callbackUrl=${returnUrl}`)
  }
  const user = session.user
  const isAdmin = isSuperAdmin(user)

  // Get run with definition and visual template
  const run = await prisma.run.findUnique({
    where: { id: runId },
    include: {
      definition: true,
      project: {
        include: {
          visualTemplate: true,
        },
      },
    },
  })

  if (!run || run.deletedAt) {
    notFound()
  }

  // Check access - allow: owner, SUPERADMIN, or project members
  const isOwner = run.ownerUserId === user.id
  const projectRole = !isAdmin && !isOwner ? await getProjectRole(user.id, run.projectId) : null
  const hasAccess = isAdmin || isOwner || projectRole !== null

  if (!hasAccess) {
    return (
      <main className="min-h-screen p-8 flex items-center justify-center">
        <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-8 text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-red-900/30 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m4-6V7a4 4 0 00-8 0v4m-1 0h10a2 2 0 012 2v6a2 2 0 01-2 2H7a2 2 0 01-2-2v-6a2 2 0 012-2z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Acceso denegado</h1>
          <p className="text-gray-400 mb-6">No tienes permisos para acceder a esta RUN. Debes ser miembro del proyecto.</p>
          <a
            href="/projects"
            className="inline-block px-4 py-2 bg-cyber-primary text-cyber-darker rounded-lg font-medium hover:bg-cyber-primary/90 transition-colors"
          >
            Ir a Proyectos
          </a>
        </div>
      </main>
    )
  }

  // Parse data
  const projectDataResult = parseProjectData(run.definition.data)
  const runStateResult = parseRunState(run.state)

  if (!projectDataResult.success || !runStateResult.success) {
    return (
      <main className="min-h-screen p-8 flex items-center justify-center">
        <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-6 text-center">
          <p className="text-red-400">Error al cargar los datos del juego</p>
        </div>
      </main>
    )
  }

  const projectData = projectDataResult.data as ProjectData
  const runState = runStateResult.data as RunState

  // Parse visual template
  const visualTemplate = run.project.visualTemplate
    ? {
        renderer: run.project.visualTemplate.renderer as 'TECH' | 'IMMERSIVE',
        theme: JSON.parse(run.project.visualTemplate.theme),
        components: JSON.parse(run.project.visualTemplate.components),
        effects: JSON.parse(run.project.visualTemplate.effects),
      }
    : {
        renderer: 'TECH' as const,
        theme: {},
        components: { showNodeMap: true, showSidePanel: true, showCentralTerminal: false },
        effects: { scanlines: false, glitch: false, flicker: false },
      }

  // Determine export permissions
  // - SUPERADMIN: can always export
  // - Owner: can export their own runs
  const canExport = isAdmin || isOwner

  return (
    <GameScreen
      runId={runId}
      projectId={run.projectId}
      projectName={run.project.name}
      runName={run.name}
      initialState={runState}
      projectData={projectData}
      visualTemplate={visualTemplate}
      createdAt={run.createdAt.toISOString()}
      canExport={canExport}
      isSuperAdmin={isAdmin}
    />
  )
}
