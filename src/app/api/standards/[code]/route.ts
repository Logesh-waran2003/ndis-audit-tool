import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ code: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { code } = await params
    const standard = await prisma.standard.findUnique({
      where: { code },
      include: {
        evidenceLinks: { include: { evidence: true } },
        selfAssessment: true,
      },
    })
    if (!standard) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const now = new Date()
    const currentEvidence = standard.evidenceLinks.filter(
      (l) => l.evidence.status === 'CURRENT' && (!l.evidence.expiryDate || l.evidence.expiryDate > now)
    )

    let status: 'MET' | 'PARTIAL' | 'GAP'
    if (currentEvidence.length >= 2) status = 'MET'
    else if (currentEvidence.length === 1) status = 'PARTIAL'
    else status = 'GAP'

    // Parse quality indicators and map evidence
    const qualityIndicators = standard.qualityIndicators as Array<{
      id: string; description: string; evidenced: boolean; linkedEvidenceIds: string[]
    }>
    const indicatorsWithEvidence = qualityIndicators.map((qi) => ({
      ...qi,
      evidence: standard.evidenceLinks
        .filter((l) => qi.linkedEvidenceIds.includes(l.evidenceId))
        .map((l) => l.evidence),
    }))

    return NextResponse.json({
      ...standard,
      status,
      qualityIndicators: indicatorsWithEvidence,
      evidence: standard.evidenceLinks.map((l) => l.evidence),
    })
  } catch (error) {
    console.error('[GET /api/standards/:code]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
