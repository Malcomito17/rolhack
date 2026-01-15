import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Default visual templates
const DEFAULT_TEMPLATES = [
  {
    name: 'default-tech',
    description: 'Vista tecnica con mapa de nodos y panel lateral',
    layout: 'TECH',
    theme: JSON.stringify({
      background: 'cyber-dark',
      primaryColor: 'cyber-primary',
      secondaryColor: 'cyber-secondary',
      font: 'mono',
    }),
    components: JSON.stringify({
      showNodeMap: true,
      showSidePanel: true,
      showCentralTerminal: false,
    }),
    effects: JSON.stringify({
      scanlines: false,
      glitch: false,
      flicker: false,
    }),
    isSystem: true,
  },
  {
    name: 'matrix-immersive',
    description: 'Vista inmersiva tipo Matrix con terminal central',
    layout: 'IMMERSIVE',
    theme: JSON.stringify({
      background: 'matrix-black',
      primaryColor: 'matrix-green',
      secondaryColor: 'matrix-green-dark',
      font: 'mono',
    }),
    components: JSON.stringify({
      showNodeMap: false,
      showSidePanel: false,
      showCentralTerminal: true,
    }),
    effects: JSON.stringify({
      scanlines: true,
      glitch: true,
      flicker: true,
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
      where: { name: template.name },
    })

    if (existing) {
      console.log(`  Template "${template.name}" already exists, updating...`)
      await prisma.visualTemplate.update({
        where: { name: template.name },
        data: template,
      })
    } else {
      await prisma.visualTemplate.create({
        data: template,
      })
      console.log(`  ✅ Created template: ${template.name}`)
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
