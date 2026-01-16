# Changelog

Todos los cambios notables en RolHack se documentan en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

## [1.0.0] - 2026-01-15

### Primera versión estable de RolHack

Framework de simulación de hacking para juegos de rol cyberpunk.

### Agregado

#### Core Engine
- Motor de lógica puro con funciones inmutables
- Soporte para múltiples circuitos por proyecto
- Sistema de nodos con Challenge Difficulty (CD)
- Enlaces visibles y ocultos entre nodos
- Modos de fallo: WARNING y BLOQUEO
- Timeline de eventos para historial completo

#### Gameplay
- **Hack**: Intentar comprometer nodos con valor de entrada vs CD
- **Scan**: Descubrir enlaces ocultos desde posición actual
- **Move**: Navegación entre nodos conectados
- **Fast-travel**: Salto directo a nodos ya hackeados
- **Switch Circuit**: Cambio entre circuitos del proyecto

#### Demo Mode
- Modo demo público sin autenticación (`/demo`)
- Tutorial guiado de 11 pasos
- Proyecto tutorial con CD 11-20
- Estado efímero en sessionStorage
- CTA para registro al completar

#### Vistas
- **Tech View**: Vista técnica con mapa de nodos
- **Immersive View**: Terminal cyberpunk con efectos visuales
  - Scanlines, glitch, flicker
  - Selector de circuitos
  - Barra de estado responsive
- **Audit View**: Modal de auditoría completa del run
- **Replay Mode**: Visualización de estados históricos

#### Compartir
- Panel de compartir con URL copiable
- Generación de código QR
- Deep links con redirect post-login
- Variantes COMPACT e INLINE

#### Administración
- Panel SUPERADMIN completo
- Gestión de usuarios (listar, eliminar)
- Gestión de proyectos (crear, editar, eliminar)
- Gestión de miembros por proyecto
- Asignación de roles (OWNER, USER)

#### Plantillas Visuales
- Sistema de templates personalizables
- Temas: Tech, Cyberpunk, Matrix, Stealth
- Configuración de efectos por template
- Asignación de template por proyecto

#### Autenticación
- NextAuth v5 con Google OAuth
- Página de login personalizada
- Redirect automático post-login
- Auto-promoción a SUPERADMIN por email

#### Base de Datos
- Prisma ORM con SQLite
- Soporte ARM64 (Raspberry Pi)
- Migraciones versionadas
- Seed con datos de demo

#### Deployment
- Docker multi-stage build
- Cloudflare Tunnel para HTTPS
- Scripts de deploy automatizados
- Volumen persistente para DB

### Técnico

- Next.js 14 App Router
- React 18 con Server Components
- TypeScript estricto
- Tailwind CSS
- Turborepo monorepo
- Zod para validación

---

## Enlaces

- **Producción**: https://rolhack.euforiateclog.cloud
- **Demo**: https://rolhack.euforiateclog.cloud/demo
- **Repositorio**: https://github.com/Malcomito17/rolhack
