import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const packs = await prisma.auditPack.findMany({ orderBy: { generatedAt: 'desc' } })
    return NextResponse.json(packs)
  } catch (error) {
    console.error('[GET /api/audit/pack]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const createSchema = z.object({
  name: z.string().min(1),
  expiresAt: z.string(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    // Snapshot current compliance state
    const standards = await prisma.standard.findMany({
      include: { evidenceLinks: { include: { evidence: true } } },
    })
    const now = new Date()
    const snapshot = standards.map((s) => {
      const currentEvidence = s.evidenceLinks.filter(
        (l) => l.evidence.status === 'CURRENT' && (!l.evidence.expiryDate || l.evidence.expiryDate > now)
      )
      let status: string
      if (currentEvidence.length >= 2) status = 'MET'
      else if (currentEvidence.length === 1) status = 'PARTIAL'
      else status = 'GAP'
      return { code: s.code, name: s.name, status, evidenceCount: s.evidenceLinks.length }
    })

    const token = randomUUID()
    const pack = await prisma.auditPack.create({
      data: {
        name: parsed.data.name,
        token,
        expiresAt: new Date(parsed.data.expiresAt),
        standardsSnapshot: snapshot,
      },
    })

    return NextResponse.json({ ...pack, tokenUrl: `/api/portal/${token}` }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/audit/pack]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
