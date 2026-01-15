import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // Get SUPERADMIN emails from env
  const superadminEmails = process.env.SUPERADMIN_EMAILS?.split(',').map((e) =>
    e.trim().toLowerCase()
  )

  if (!superadminEmails || superadminEmails.length === 0) {
    console.log('⚠️  No SUPERADMIN_EMAILS configured. Skipping superadmin seed.')
    console.log('   Set SUPERADMIN_EMAILS env var to bootstrap superadmins.')
    return
  }

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
