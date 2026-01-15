import { PrismaClient } from '@prisma/client'

// Global types
export type GlobalRole = 'SUPERADMIN' | 'USER'
export type ProjectRole = 'OWNER' | 'USER'
export type RunStatus = 'ACTIVE' | 'ARCHIVED'

// Re-export Prisma types
export * from '@prisma/client'

// Singleton pattern for Prisma Client
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
