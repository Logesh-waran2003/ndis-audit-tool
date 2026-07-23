import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client.js'
import { standardsData } from '../src/lib/standards-data.js'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  await prisma.organisation.upsert({
    where: { id: 'org-24seven' },
    update: {},
    create: {
      id: 'org-24seven',
      name: '24Seven Plan Management',
      abn: '12 345 678 901',
      registrationGroups: ['0127 - Plan Management'],
      registrationExpiry: new Date('2027-09-11'),
      auditPathway: 'VERIFICATION',
    },
  })

  for (let i = 0; i < standardsData.length; i++) {
    const s = standardsData[i]
    await prisma.standard.upsert({
      where: { code: s.code },
      update: {
        planManagementSpecific: s.planManagementSpecific ?? [],
        commonGaps: s.commonGaps ?? [],
        goldStandard: s.goldStandard ?? '',
      },
      create: {
        code: s.code,
        name: s.name,
        module: 'verification',
        division: s.division,
        description: s.description,
        qualityIndicators: s.qualityIndicators,
        evidenceGuidance: s.evidenceGuidance.join('\n'),
        planManagementSpecific: s.planManagementSpecific ?? [],
        commonGaps: s.commonGaps ?? [],
        goldStandard: s.goldStandard ?? '',
        order: i + 1,
      },
    })
  }

  console.log(`Seeded ${standardsData.length} standards + organisation`)
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e)
    prisma.$disconnect()
    process.exit(1)
  })
