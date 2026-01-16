import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Default visual templates
const DEFAULT_TEMPLATES = [
  // === TECH TEMPLATES ===
  {
    key: 'default-tech',
    name: 'Tech Clásico',
    description: 'Vista técnica con mapa de nodos y panel lateral. Fondo oscuro neutro.',
    renderer: 'TECH',
    theme: JSON.stringify({
      background: 'cyber-dark',
      backgroundImage: null,
      backgroundPattern: null,
      overlay: null,
      primaryColor: '#00ff88',
      secondaryColor: '#00ccff',
      accentColor: '#ff00ff',
      textColor: '#ffffff',
      nodeStyle: 'rounded',
      linkStyle: 'solid',
    }),
    components: JSON.stringify({
      showNodeMap: true,
      showSidePanel: true,
      showCentralTerminal: false,
      showMinimap: false,
      showWarningBar: true,
    }),
    effects: JSON.stringify({
      scanlines: false,
      glitch: false,
      flicker: false,
      neonGlow: false,
      matrixRain: false,
    }),
    isSystem: true,
  },
  {
    key: 'neon-grid',
    name: 'Neon Grid',
    description: 'Estética cyberpunk con grilla neon. Colores cyan/magenta vibrantes.',
    renderer: 'TECH',
    theme: JSON.stringify({
      background: '#0a0014',
      backgroundImage: null,
      backgroundPattern: 'grid',
      overlay: 'gradient-purple',
      primaryColor: '#00ffff',
      secondaryColor: '#ff00ff',
      accentColor: '#ffff00',
      textColor: '#ffffff',
      nodeStyle: 'hexagon',
      linkStyle: 'glow',
    }),
    components: JSON.stringify({
      showNodeMap: true,
      showSidePanel: true,
      showCentralTerminal: false,
      showMinimap: true,
      showWarningBar: true,
    }),
    effects: JSON.stringify({
      scanlines: true,
      glitch: false,
      flicker: false,
      neonGlow: true,
      matrixRain: false,
    }),
    isSystem: true,
  },
  {
    key: 'minimal-clean',
    name: 'Minimal Clean',
    description: 'Diseño minimalista y limpio. Ideal para presentaciones o streaming.',
    renderer: 'TECH',
    theme: JSON.stringify({
      background: '#1a1a2e',
      backgroundImage: null,
      backgroundPattern: null,
      overlay: null,
      primaryColor: '#4ade80',
      secondaryColor: '#60a5fa',
      accentColor: '#f472b6',
      textColor: '#e2e8f0',
      nodeStyle: 'pill',
      linkStyle: 'dashed',
    }),
    components: JSON.stringify({
      showNodeMap: true,
      showSidePanel: true,
      showCentralTerminal: false,
      showMinimap: false,
      showWarningBar: false,
    }),
    effects: JSON.stringify({
      scanlines: false,
      glitch: false,
      flicker: false,
      neonGlow: false,
      matrixRain: false,
    }),
    isSystem: true,
  },
  {
    key: 'cyberpunk-dark',
    name: 'Cyberpunk Dark',
    description: 'Estilo cyberpunk oscuro con acentos neón. Grilla de fondo sutil.',
    renderer: 'TECH',
    theme: JSON.stringify({
      background: '#0d0d0d',
      backgroundImage: null,
      backgroundPattern: 'dots',
      overlay: 'vignette',
      primaryColor: '#f9a825',
      secondaryColor: '#e91e63',
      accentColor: '#00e5ff',
      textColor: '#fafafa',
      nodeStyle: 'sharp',
      linkStyle: 'glow',
    }),
    components: JSON.stringify({
      showNodeMap: true,
      showSidePanel: true,
      showCentralTerminal: false,
      showMinimap: true,
      showWarningBar: true,
    }),
    effects: JSON.stringify({
      scanlines: true,
      glitch: false,
      flicker: false,
      neonGlow: true,
      matrixRain: false,
    }),
    isSystem: true,
  },

  // === IMMERSIVE TEMPLATES ===
  {
    key: 'matrix-immersive',
    name: 'Matrix Inmersivo',
    description: 'Vista inmersiva tipo Matrix con terminal central y lluvia de código animada.',
    renderer: 'IMMERSIVE',
    theme: JSON.stringify({
      background: '#000000',
      backgroundImage: null,
      backgroundPattern: 'matrix-rain',
      overlay: 'scanlines',
      primaryColor: '#00ff00',
      secondaryColor: '#003300',
      accentColor: '#00ff00',
      textColor: '#00ff00',
      terminalStyle: 'classic',
    }),
    components: JSON.stringify({
      showNodeMap: false,
      showSidePanel: false,
      showCentralTerminal: true,
      showStatusBar: true,
      showBootSequence: true,
    }),
    effects: JSON.stringify({
      scanlines: true,
      glitch: true,
      flicker: true,
      neonGlow: false,
      matrixRain: true,
      crtCurve: true,
    }),
    isSystem: true,
  },
  {
    key: 'corp-sec',
    name: 'Corp Security',
    description: 'Estética corporativa oscura con ámbar. Ideal para redes bancarias o datacenters.',
    renderer: 'IMMERSIVE',
    theme: JSON.stringify({
      background: '#0a0a0a',
      backgroundImage: null,
      backgroundPattern: 'hex-grid',
      overlay: 'warning-stripe',
      primaryColor: '#ffab00',
      secondaryColor: '#ff3d00',
      accentColor: '#ff6e40',
      textColor: '#ffcc80',
      terminalStyle: 'corporate',
    }),
    components: JSON.stringify({
      showNodeMap: false,
      showSidePanel: false,
      showCentralTerminal: true,
      showStatusBar: true,
      showBootSequence: true,
    }),
    effects: JSON.stringify({
      scanlines: true,
      glitch: false,
      flicker: true,
      neonGlow: false,
      matrixRain: false,
      warningPulse: true,
      crtCurve: false,
    }),
    isSystem: true,
  },
  {
    key: 'ghost-protocol',
    name: 'Ghost Protocol',
    description: 'Estética de operaciones encubiertas. Tonos azules fríos con HUD militar.',
    renderer: 'IMMERSIVE',
    theme: JSON.stringify({
      background: '#000a14',
      backgroundImage: null,
      backgroundPattern: 'radar-sweep',
      overlay: 'hud-frame',
      primaryColor: '#00b4d8',
      secondaryColor: '#0077b6',
      accentColor: '#90e0ef',
      textColor: '#caf0f8',
      terminalStyle: 'military',
    }),
    components: JSON.stringify({
      showNodeMap: false,
      showSidePanel: false,
      showCentralTerminal: true,
      showStatusBar: true,
      showBootSequence: true,
    }),
    effects: JSON.stringify({
      scanlines: false,
      glitch: false,
      flicker: false,
      neonGlow: true,
      matrixRain: false,
      radarSweep: true,
      crtCurve: false,
    }),
    isSystem: true,
  },
  {
    key: 'presentation-mode',
    name: 'Presentation Mode',
    description: 'Modo presentación con fuentes grandes y alto contraste. Sin efectos distractores.',
    renderer: 'IMMERSIVE',
    theme: JSON.stringify({
      background: '#000000',
      backgroundImage: null,
      backgroundPattern: null,
      overlay: null,
      primaryColor: '#22c55e',
      secondaryColor: '#3b82f6',
      accentColor: '#eab308',
      textColor: '#ffffff',
      terminalStyle: 'large',
    }),
    components: JSON.stringify({
      showNodeMap: false,
      showSidePanel: false,
      showCentralTerminal: true,
      showStatusBar: true,
      showBootSequence: false,
    }),
    effects: JSON.stringify({
      scanlines: false,
      glitch: false,
      flicker: false,
      neonGlow: false,
      matrixRain: false,
      crtCurve: false,
    }),
    isSystem: true,
  },
]

// Demo project data
const DEMO_PROJECT_DATA = {
  meta: {
    version: '1.0.0',
    author: 'RolHack Demo',
    description: 'Proyecto de demostración con un circuito simple',
  },
  circuits: [
    {
      id: 'circuit-demo-1',
      name: 'Red Corporativa Demo',
      description: 'Un circuito simple para probar las mecánicas básicas',
      nodes: [
        {
          id: 'node-entry',
          name: 'Terminal Pública',
          description: 'Punto de entrada a la red corporativa',
          level: 0,
          cd: 0, // Entry node, no CD
          failMode: 'WARNING',
          visibleByDefault: true,
        },
        {
          id: 'node-firewall',
          name: 'Firewall Perimetral',
          description: 'Primera línea de defensa. CD moderado.',
          level: 1,
          cd: 5,
          failMode: 'WARNING',
          visibleByDefault: true,
        },
        {
          id: 'node-server',
          name: 'Servidor Principal',
          description: 'Servidor con datos importantes. CD alto.',
          level: 2,
          cd: 8,
          failMode: 'BLOQUEO',
          visibleByDefault: true,
        },
        {
          id: 'node-hidden-backup',
          name: 'Backup Secreto',
          description: 'Servidor de respaldo oculto. Acceso alternativo.',
          level: 2,
          cd: 3,
          failMode: 'WARNING',
          visibleByDefault: false,
        },
      ],
      links: [
        {
          id: 'link-1',
          from: 'node-entry',
          to: 'node-firewall',
          style: 'solid',
          hidden: false,
          bidirectional: true,
        },
        {
          id: 'link-2',
          from: 'node-firewall',
          to: 'node-server',
          style: 'solid',
          hidden: false,
          bidirectional: true,
        },
        {
          id: 'link-3-hidden',
          from: 'node-entry',
          to: 'node-hidden-backup',
          style: 'dashed',
          hidden: true,
          bidirectional: true,
        },
        {
          id: 'link-4',
          from: 'node-hidden-backup',
          to: 'node-server',
          style: 'dashed',
          hidden: false,
          bidirectional: true,
        },
      ],
    },
  ],
}

async function main() {
  console.log('🌱 Starting seed...')

  // Create default visual templates
  console.log('🎨 Creating visual templates...')
  for (const template of DEFAULT_TEMPLATES) {
    const existing = await prisma.visualTemplate.findUnique({
      where: { key: template.key },
    })

    if (existing) {
      console.log(`  Template "${template.key}" already exists, updating...`)
      await prisma.visualTemplate.update({
        where: { key: template.key },
        data: template,
      })
    } else {
      await prisma.visualTemplate.create({
        data: template,
      })
      console.log(`  ✅ Created template: ${template.key}`)
    }
  }

  // Get SUPERADMIN emails from env
  const superadminEmails = process.env.SUPERADMIN_EMAILS?.split(',').map((e) =>
    e.trim().toLowerCase()
  ).filter(Boolean)

  if (!superadminEmails || superadminEmails.length === 0) {
    console.log('⚠️  No SUPERADMIN_EMAILS configured. Skipping superadmin seed.')
    console.log('   Set SUPERADMIN_EMAILS env var to bootstrap superadmins.')
  } else {
    console.log(`📧 Superadmin emails configured: ${superadminEmails.join(', ')}`)

    // Upsert superadmin users
    for (const email of superadminEmails) {
      if (!email) continue

      const user = await prisma.user.upsert({
        where: { email },
        update: {
          roleGlobal: 'SUPERADMIN',
          active: true,
          deletedAt: null,
        },
        create: {
          email,
          name: email.split('@')[0],
          roleGlobal: 'SUPERADMIN',
          active: true,
        },
      })

      console.log(`✅ Superadmin ensured: ${user.email} (id: ${user.id})`)
    }
  }

  // Check if demo project should be created
  const createDemo = process.env.SEED_DEMO === 'true'

  if (createDemo) {
    console.log('')
    console.log('🎮 Creating demo project...')

    // Get first superadmin user (or create placeholder if none)
    let ownerId: string

    const superadmin = await prisma.user.findFirst({
      where: { roleGlobal: 'SUPERADMIN' },
    })

    if (superadmin) {
      ownerId = superadmin.id
    } else {
      // Create a placeholder user for the demo
      const placeholder = await prisma.user.upsert({
        where: { email: 'demo@rolhack.local' },
        update: {},
        create: {
          email: 'demo@rolhack.local',
          name: 'Demo User',
          roleGlobal: 'USER',
          active: true,
        },
      })
      ownerId = placeholder.id
      console.log('  Created placeholder user for demo project')
    }

    // Check if demo project exists
    const existingProject = await prisma.project.findFirst({
      where: { name: 'Demo: Red Corporativa' },
    })

    if (existingProject) {
      console.log('  Demo project already exists, skipping...')
    } else {
      // Create demo project
      const project = await prisma.project.create({
        data: {
          name: 'Demo: Red Corporativa',
          description: 'Proyecto de demostración para probar las mecánicas de RolHack',
          enabled: true,
        },
      })

      // Add owner as member
      await prisma.projectMember.create({
        data: {
          projectId: project.id,
          userId: ownerId,
          role: 'OWNER',
          active: true,
        },
      })

      // Create project definition
      await prisma.projectDefinition.create({
        data: {
          projectId: project.id,
          version: 1,
          isActive: true,
          data: JSON.stringify(DEMO_PROJECT_DATA),
          createdByUserId: ownerId,
        },
      })

      console.log(`✅ Demo project created: ${project.name} (id: ${project.id})`)
      console.log('   Circuito: Red Corporativa Demo')
      console.log('   Nodos: 4 (1 oculto)')
      console.log('   Enlaces: 4 (1 oculto)')
    }
  } else {
    console.log('')
    console.log('ℹ️  Demo project not created (set SEED_DEMO=true to create)')
  }

  console.log('')
  console.log('🌱 Seed completed!')
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
