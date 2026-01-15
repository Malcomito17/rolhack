import { prisma } from '@rolhack/database'
import type { GlobalRole, ProjectRole } from '@rolhack/database'
import { auth } from './auth'

// ============================================
// TYPES
// ============================================

export interface SessionUser {
  id: string
  email: string
  name?: string | null
  roleGlobal: GlobalRole
  active: boolean
}

export interface RBACContext {
  user: SessionUser
  projectId?: string
  projectRole?: ProjectRole
}

// Role hierarchy (higher index = more permissions)
const PROJECT_ROLE_HIERARCHY: Record<ProjectRole, number> = {
  USER: 1,
  OWNER: 2,
}

// ============================================
// CORE CHECKS
// ============================================

/**
 * Check if user is a SUPERADMIN
 */
export function isSuperAdmin(user: SessionUser | null): boolean {
  return user?.roleGlobal === 'SUPERADMIN' && user.active
}

/**
 * Get the authenticated user from session
 * Returns null if not authenticated or user is inactive
 */
export async function getAuthUser(): Promise<SessionUser | null> {
  const session = await auth()

  if (!session?.user) {
    return null
  }

  // Check if user is active
  if (!session.user.active) {
    return null
  }

  return session.user as SessionUser
}

/**
 * Get user's role in a specific project
 * Returns null if user has no membership in the project
 */
export async function getProjectRole(
  userId: string,
  projectId: string
): Promise<ProjectRole | null> {
  const membership = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: { projectId, userId },
    },
    select: { role: true, active: true },
  })

  if (!membership || !membership.active) {
    return null
  }

  return membership.role as ProjectRole
}

/**
 * Check if user has at least the required role in a project
 * SUPERADMIN bypasses this check
 */
export async function hasProjectRole(
  user: SessionUser,
  projectId: string,
  requiredRole: ProjectRole
): Promise<boolean> {
  // SUPERADMIN has access to everything
  if (isSuperAdmin(user)) {
    return true
  }

  const userRole = await getProjectRole(user.id, projectId)

  if (!userRole) {
    return false
  }

  return PROJECT_ROLE_HIERARCHY[userRole] >= PROJECT_ROLE_HIERARCHY[requiredRole]
}

// ============================================
// PERMISSION HELPERS
// ============================================

/**
 * Check if user can edit a project (modify definition, settings)
 * Requires: OWNER role or SUPERADMIN
 */
export async function canEditProject(
  user: SessionUser,
  projectId: string
): Promise<boolean> {
  // SUPERADMIN can always edit
  if (isSuperAdmin(user)) {
    return true
  }

  // Check for OWNER role
  return hasProjectRole(user, projectId, 'OWNER')
}

/**
 * Check if user can run a project (create/play runs)
 * Requires: USER role or higher, and project must be enabled (unless SUPERADMIN)
 */
export async function canRunProject(
  user: SessionUser,
  projectId: string
): Promise<boolean> {
  // SUPERADMIN can always run (ignores enabled status)
  if (isSuperAdmin(user)) {
    return true
  }

  // Check project is enabled
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { enabled: true, deletedAt: true },
  })

  if (!project || !project.enabled || project.deletedAt) {
    return false
  }

  // Check for at least USER role
  return hasProjectRole(user, projectId, 'USER')
}

/**
 * Check if user can manage members in a project
 * SUPERADMIN: can assign any role (OWNER or USER)
 * OWNER: can only assign USER role
 */
export async function canManageMembers(
  user: SessionUser,
  projectId: string
): Promise<{ allowed: boolean; canAssignOwner: boolean }> {
  // SUPERADMIN can manage all roles
  if (isSuperAdmin(user)) {
    return { allowed: true, canAssignOwner: true }
  }

  // OWNER can only assign USER role
  const isOwner = await hasProjectRole(user, projectId, 'OWNER')

  return {
    allowed: isOwner,
    canAssignOwner: false, // OWNERs cannot assign OWNER role
  }
}

/**
 * Check if a project member can be removed
 * Cannot remove the last OWNER of a project
 */
export async function canRemoveMember(
  projectId: string,
  targetUserId: string
): Promise<{ allowed: boolean; reason?: string }> {
  // Get target member's role
  const targetMember = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: { projectId, userId: targetUserId },
    },
    select: { role: true },
  })

  if (!targetMember) {
    return { allowed: false, reason: 'Member not found' }
  }

  // If target is OWNER, check if they're the last one
  if (targetMember.role === 'OWNER') {
    const ownerCount = await prisma.projectMember.count({
      where: {
        projectId,
        role: 'OWNER',
        active: true,
      },
    })

    if (ownerCount <= 1) {
      return {
        allowed: false,
        reason: 'Cannot remove the last OWNER of a project',
      }
    }
  }

  return { allowed: true }
}

// ============================================
// REQUIRE HELPERS (throw on failure)
// ============================================

/**
 * Require user to be authenticated
 * Throws if not authenticated
 */
export async function requireAuth(): Promise<SessionUser> {
  const user = await getAuthUser()

  if (!user) {
    throw new Error('Authentication required')
  }

  return user
}

/**
 * Require user to be SUPERADMIN
 * Throws if not SUPERADMIN
 */
export async function requireSuperAdmin(): Promise<SessionUser> {
  const user = await requireAuth()

  if (!isSuperAdmin(user)) {
    throw new Error('SUPERADMIN role required')
  }

  return user
}

/**
 * Require user to have at least the specified role in a project
 * Throws if insufficient permissions
 */
export async function requireProjectRole(
  projectId: string,
  requiredRole: ProjectRole
): Promise<{ user: SessionUser; projectRole: ProjectRole }> {
  const user = await requireAuth()

  // SUPERADMIN bypasses role check
  if (isSuperAdmin(user)) {
    return { user, projectRole: 'OWNER' } // Treat SUPERADMIN as OWNER
  }

  const projectRole = await getProjectRole(user.id, projectId)

  if (!projectRole) {
    throw new Error('No access to this project')
  }

  if (PROJECT_ROLE_HIERARCHY[projectRole] < PROJECT_ROLE_HIERARCHY[requiredRole]) {
    throw new Error(`Requires ${requiredRole} role or higher`)
  }

  return { user, projectRole }
}
