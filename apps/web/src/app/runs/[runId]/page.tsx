import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { isSuperAdmin } from '@/lib/rbac'
import { prisma } from '@rolhack/database'
import { parseProjectData, parseRunState } from '@/lib/engine'
import { GameScreen } from './game-screen'
import type { ProjectData, RunState } from '@/lib/engine'

interface Props {
  params: Promise<{ runId: string }>
}

export default async function RunPage({ params }: Props) {
  const session = await auth()

  if (!session?.user) {
    redirect('/')
  }

  const { runId } = await params
  const user = session.user
  const isAdmin = isSuperAdmin(user)

  // Get run with definition
  const run = await prisma.run.findUnique({
    where: { id: runId },
    include: {
      definition: true,
      project: true,
    },
  })

  if (!run || run.deletedAt) {
    notFound()
  }

  // Check access
  if (!isAdmin && run.ownerUserId !== user.id) {
    notFound()
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

  return (
    <GameScreen
      runId={runId}
      projectId={run.projectId}
      projectName={run.project.name}
      runName={run.name}
      initialState={runState}
      projectData={projectData}
    />
  )
}
