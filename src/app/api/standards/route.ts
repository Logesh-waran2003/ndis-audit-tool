import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const standards = await prisma.standard.findMany({
      orderBy: { order: 'asc' },
      include: {
        evidenceLinks: { include: { evidence: true } },
      },
    })

    const now = new Date()
    const result = standards.map((s) => {
      const currentEvidence = s.evidenceLinks.filter(
        (l) => l.evidence.status === 'CURRENT' && (!l.evidence.expiryDate || l.evidence.expiryDate > now)
      )
      const evidenceCount = s.evidenceLinks.length
      const lastUpdated = s.evidenceLinks.length
        ? s.evidenceLinks.reduce((latest, l) =>
            l.evidence.uploadedAt > latest ? l.evidence.uploadedAt : latest, s.evidenceLinks[0].evidence.uploadedAt)
        : null

      let status: 'MET' | 'PARTIAL' | 'GAP'
      if (currentEvidence.length >= 2) status = 'MET'
      else if (currentEvidence.length === 1) status = 'PARTIAL'
      else status = 'GAP'

      const { evidenceLinks: _, ...standard } = s
      return { ...standard, status, evidenceCount, lastUpdated }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('[GET /api/standards]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
