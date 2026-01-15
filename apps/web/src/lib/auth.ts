import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@rolhack/database'
import type { GlobalRole } from '@rolhack/database'

// Extend NextAuth types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      roleGlobal: GlobalRole
      active: boolean
    }
  }

  interface User {
    roleGlobal?: GlobalRole
    active?: boolean
    deletedAt?: Date | null
  }
}

// Get superadmin emails from env
function getSuperadminEmails(): string[] {
  const emails = process.env.SUPERADMIN_EMAILS || ''
  return emails
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },
  callbacks: {
    async signIn({ user, account }) {
      // Block sign-in if user is inactive or deleted
      if (user.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { active: true, deletedAt: true },
        })

        if (dbUser) {
          if (!dbUser.active || dbUser.deletedAt) {
            console.log(`[Auth] Blocked login for inactive/deleted user: ${user.email}`)
            return false
          }
        }
      }

      // Auto-register on first OAuth login (handled by adapter)
      // Check if user should be SUPERADMIN
      if (account?.provider === 'google' && user.email) {
        const superadminEmails = getSuperadminEmails()
        const isSuperadmin = superadminEmails.includes(user.email.toLowerCase())

        if (isSuperadmin) {
          // Update role to SUPERADMIN on each login
          await prisma.user.updateMany({
            where: { email: user.email.toLowerCase() },
            data: { roleGlobal: 'SUPERADMIN' },
          })
        }
      }

      return true
    },

    async jwt({ token, user, trigger }) {
      // On initial sign-in, add user data to token
      if (user) {
        token.id = user.id
        token.roleGlobal = user.roleGlobal || 'USER'
        token.active = user.active ?? true
      }

      // Refresh user data on session update or periodically
      if (trigger === 'update' || !token.roleGlobal) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { roleGlobal: true, active: true, deletedAt: true },
        })

        if (dbUser) {
          token.roleGlobal = dbUser.roleGlobal as GlobalRole
          token.active = dbUser.active && !dbUser.deletedAt
        }
      }

      return token
    },

    async session({ session, token }) {
      // Add custom fields to session
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.roleGlobal = (token.roleGlobal as GlobalRole) || 'USER'
        session.user.active = (token.active as boolean) ?? true
      }

      return session
    },
  },
  events: {
    async createUser({ user }) {
      // Check if new user should be SUPERADMIN
      if (user.email) {
        const superadminEmails = getSuperadminEmails()
        const isSuperadmin = superadminEmails.includes(user.email.toLowerCase())

        if (isSuperadmin) {
          await prisma.user.update({
            where: { id: user.id },
            data: { roleGlobal: 'SUPERADMIN' },
          })
          console.log(`[Auth] New user ${user.email} set as SUPERADMIN`)
        }
      }
    },
  },
})
