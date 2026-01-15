import { auth } from '@/lib/auth'

export default async function HomePage() {
  const session = await auth()

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold text-cyber-primary mb-8">
        RolHack
      </h1>
      <p className="text-xl text-gray-400 mb-8">
        Framework de simulación de hacking en entornos ciberpunk
      </p>

      {session?.user ? (
        <div className="text-center">
          <p className="text-lg mb-2">
            Conectado como: <span className="text-cyber-secondary">{session.user.email}</span>
          </p>
          <p className="text-sm text-gray-500">
            Rol: {session.user.roleGlobal}
          </p>
        </div>
      ) : (
        <p className="text-gray-500">
          No autenticado
        </p>
      )}
    </main>
  )
}
