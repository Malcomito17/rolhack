import { auth } from '@/lib/auth'
import Link from 'next/link'
import { LoginButton, LogoutButton } from '@/components/auth-buttons'
import { isSuperAdmin } from '@/lib/rbac'

export default async function HomePage() {
  const session = await auth()
  const user = session?.user
  const isAdmin = user ? isSuperAdmin(user) : false

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-cyber-primary mb-4 tracking-wider">
            ROLHACK
          </h1>
          <p className="text-gray-400">
            Framework de simulacion de hacking
          </p>
        </div>

        {user ? (
          <div className="space-y-6">
            {/* User info */}
            <div className="bg-cyber-dark/50 border border-cyber-primary/20 rounded-lg p-6">
              <p className="text-sm text-gray-400 mb-1">Conectado como</p>
              <p className="text-cyber-secondary font-mono truncate">
                {user.email}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded ${
                  isAdmin
                    ? 'bg-cyber-accent/20 text-cyber-accent'
                    : 'bg-gray-700 text-gray-400'
                }`}>
                  {user.roleGlobal}
                </span>
              </div>
            </div>

            {/* Navigation */}
            <div className="space-y-3">
              <Link
                href="/projects"
                className="block w-full bg-cyber-primary/10 border border-cyber-primary/30 hover:bg-cyber-primary/20 hover:border-cyber-primary/50 text-cyber-primary text-center py-3 px-4 rounded-lg transition-colors font-medium"
              >
                Mis Proyectos
              </Link>

              {isAdmin && (
                <Link
                  href="/admin"
                  className="block w-full bg-cyber-accent/10 border border-cyber-accent/30 hover:bg-cyber-accent/20 hover:border-cyber-accent/50 text-cyber-accent text-center py-3 px-4 rounded-lg transition-colors font-medium"
                >
                  Admin
                </Link>
              )}
            </div>

            {/* Logout */}
            <div className="pt-4 border-t border-gray-800">
              <LogoutButton />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <p className="text-center text-gray-500">
              Inicia sesion para continuar
            </p>
            <LoginButton />
          </div>
        )}
      </div>
    </main>
  )
}
