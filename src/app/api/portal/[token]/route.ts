import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ token: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { token } = await params
    const pack = await prisma.auditPack.findUnique({ where: { token } })

    if (!pack) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 404 })
    }
    if (pack.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Token expired' }, { status: 410 })
    }

    // Gather full audit data
    const [organisation, standards, incidents, improvements, workers, selfAssessments] = await Promise.all([
      prisma.organisation.findFirst(),
      prisma.standard.findMany({
        orderBy: { order: 'asc' },
        include: { evidenceLinks: { include: { evidence: true } } },
      }),
      prisma.incident.findMany({ orderBy: { dateOccurred: 'desc' } }),
      prisma.improvement.findMany({ orderBy: { identifiedDate: 'desc' } }),
      prisma.worker.findMany({ where: { isActive: true }, include: { trainings: true, supervisions: true } }),
      prisma.selfAssessment.findMany({ include: { standard: { select: { code: true, name: true } } } }),
    ])

    const now = new Date()
    const standardsWithStatus = standards.map((s) => {
      const currentEvidence = s.evidenceLinks.filter(
        (l) => l.evidence.status === 'CURRENT' && (!l.evidence.expiryDate || l.evidence.expiryDate > now)
      )
      let status: string
      if (currentEvidence.length >= 2) status = 'MET'
      else if (currentEvidence.length === 1) status = 'PARTIAL'
      else status = 'GAP'
      return {
        ...s,
        status,
        evidence: s.evidenceLinks.map((l) => l.evidence),
      }
    })

    return NextResponse.json({
      pack: { name: pack.name, generatedAt: pack.generatedAt, expiresAt: pack.expiresAt },
      organisation,
      standards: standardsWithStatus,
      incidents,
      improvements,
      workers,
      selfAssessments,
    })
  } catch (error) {
    console.error('[GET /api/portal/:token]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
