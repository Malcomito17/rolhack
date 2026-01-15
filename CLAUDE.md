# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

RolHack is a hacking simulation framework for cyberpunk environments. It's a logic engine focused on exploration, decisions, and persistent states - NOT a game with dice or stats.

## Architecture

### Monorepo Structure
- **apps/web** - Next.js 14 App Router application (port 3002)
- **packages/database** - Prisma ORM with SQLite

### Tech Stack
- Next.js 14, React 18, TypeScript
- Prisma + SQLite (supports Raspberry Pi ARM64)
- NextAuth v5 (JWT sessions, Google OAuth)
- Tailwind CSS
- Turborepo

### Key Concepts

**Projects & Runs:**
- A Project defines a playable "world" (static definition)
- ProjectDefinition contains versioned world data as JSON (circuits, nodes, links)
- Users execute projects by creating Runs (persistent, per-user instances)

**World Data (NOT normalized in DB):**
- Circuits, Nodes, and Links are stored as JSON in `ProjectDefinition.data`
- Run state is stored as JSON in `Run.state`

## Commands

### Development
```bash
npm run dev          # Start all packages in dev mode (turbo)
npm run build        # Build all packages
npm run lint         # Lint all packages
npm run format       # Format with prettier
```

### Database (from root)
```bash
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database (dev)
npm run db:migrate   # Run migrations
npm run db:studio    # Open Prisma Studio
npm run db:seed      # Seed superadmin users
```

## RBAC System

### Global Roles
- **SUPERADMIN**: Full access, never blocked, can manage all users/projects
- **USER**: Default role, needs project membership to access projects

### Project Roles
- **OWNER**: Can edit project, create runs, assign USER role to others
- **USER**: Can only create and play runs

### Key Rules
- SUPERADMIN bypasses all project-level checks
- SUPERADMIN ignores `Project.enabled=false`
- Cannot remove the last OWNER from a project
- OWNER cannot assign OWNER role (only SUPERADMIN can)

### RBAC Helpers (`apps/web/src/lib/rbac.ts`)
```typescript
isSuperAdmin(user)                     // Check if user is SUPERADMIN
canEditProject(user, projectId)        // Can modify project definition
canRunProject(user, projectId)         // Can create/play runs
canManageMembers(user, projectId)      // Can add/remove members
requireProjectRole(projectId, role)    // Throws if insufficient permissions
```

## Environment Variables

### Required for Development
```env
DATABASE_URL="file:../../packages/database/dev.db"
AUTH_SECRET="<generate with: openssl rand -base64 32>"
AUTH_URL="http://localhost:3002"
GOOGLE_CLIENT_ID="<from Google Cloud Console>"
GOOGLE_CLIENT_SECRET="<from Google Cloud Console>"
SUPERADMIN_EMAILS="your@email.com"
```

### Bootstrap SUPERADMIN
1. Set `SUPERADMIN_EMAILS` env var with comma-separated emails
2. Run `npm run db:seed` OR
3. Login with Google using an email from the list (auto-promotes)

## Database Models

### Core Entities
| Model | Purpose |
|-------|---------|
| User | Users with global role (SUPERADMIN/USER) |
| Project | Container for a playable world |
| ProjectMember | User-Project relationship with role (OWNER/USER) |
| ProjectDefinition | Versioned world data (JSON) |
| Run | User's execution instance of a project |

### Prisma Conventions
- Model names: PascalCase (e.g., `ProjectMember`)
- Table names: snake_case via `@@map()` (e.g., `project_members`)
- Accessor: lowercase of model name (e.g., `prisma.projectMember`)

## Code Style
- No semicolons, single quotes, 2-space indent
- Server components by default, 'use client' only when needed
- Zod for request validation

## Production Deployment

Target: Raspberry Pi via Cloudflare Tunnel

| Config | Value |
|--------|-------|
| Port | 3002 |
| Subdomain | rolhack.euforiateclog.cloud |
| PM2 Process | rolhack |
| DB Path | /mnt/ssd/projects/rolhack/packages/database/prisma/dev.db |

## Engine Types & Contracts

### ProjectDefinition.data (World Definition)
```typescript
interface ProjectData {
  meta: {
    name: string
    version: string
    description?: string
    author?: string
  }
  circuits: CircuitDefinition[]
}

interface CircuitDefinition {
  id: string
  name: string
  description?: string
  nodes: NodeDefinition[]
  links: LinkDefinition[]
}

interface NodeDefinition {
  id: string                          // Unique within circuit
  name: string
  type: 'ENTRY' | 'NORMAL' | 'EXIT'
  description?: string
  solution?: number                   // Required unless type=ENTRY
  failMode?: 'WARNING' | 'BLOQUEO'    // Default: WARNING
}

interface LinkDefinition {
  id: string
  sourceNodeId: string
  targetNodeId: string
  hidden: boolean                     // Default: false
}
```

### Run.state (Execution State)
```typescript
interface RunState {
  position: {
    circuitId: string
    nodeId: string
  }
  lastHackedNodeByCircuit: Record<string, string>  // circuitId -> nodeId
  nodes: Record<string, {                          // nodeId -> state
    hacked: boolean
    blocked: boolean
  }>
  links: Record<string, {                          // linkId -> state
    discovered: boolean
  }>
  warnings: Array<{
    id: string
    circuitId: string
    nodeId: string
    timestamp: string                              // ISO 8601
    severity: 'INFO' | 'TRACE' | 'ALERT' | 'LOCKDOWN' | 'BLACK_ICE'
    message: string
  }>
}
```

## Engine API Endpoints

### Runs Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/projects/:projectId/runs` | Create new run |
| GET | `/api/runs` | List user's runs (SUPERADMIN sees all) |
| GET | `/api/runs/:runId` | Get run details with state |

### Game Actions
| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | `/api/runs/:runId/hack` | `{nodeId, inputValue}` | Attempt to hack a node |
| POST | `/api/runs/:runId/move` | `{targetNodeId}` | Move to connected node |
| POST | `/api/runs/:runId/discover` | - | Reveal hidden links from current position |

### Engine Functions (`apps/web/src/lib/engine/`)
```typescript
// Core logic (engine.ts)
initializeRunState(data: ProjectData): RunState
attemptHack(state, data, nodeId, inputValue): HackResult
discoverHiddenLinks(state, data): DiscoverResult
moveToNode(state, data, targetNodeId): MoveResult

// Database services (services.ts)
createRun(projectId, userId, name?): Promise<CreateRunResult>
attemptHackService(runId, nodeId, inputValue): Promise<HackResult>
discoverLinksService(runId): Promise<DiscoverResult>
moveToNodeService(runId, targetNodeId): Promise<MoveResult>
```

## Reglas de Oro (NO negociables)

1. **No inventar mecánicas nuevas** - Solo implementar lo explícitamente definido
2. **No agregar**: dados, stats, logs coleccionables, timers, recursos, combates, IA narrativa
3. **Circuitos/Nodos/Enlaces van en JSON** - No normalizar en tablas separadas
4. **Trabajo incremental** - Cada cambio con commit claro
