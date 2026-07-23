import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { evaluateAllRules } from '@/lib/rule-evaluator'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

const linkSchema = z.object({
  standardIds: z.array(z.string().min(1)),
  confidence: z.number().min(0).max(1).optional(),
})

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const body = await request.json()
    const parsed = linkSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    // Resolve codes or UUIDs to actual standard IDs
    const standards = await prisma.standard.findMany({
      where: {
        OR: [
          { id: { in: parsed.data.standardIds } },
          { code: { in: parsed.data.standardIds } },
        ],
      },
      select: { id: true },
    })
    const actualIds = standards.map((s) => s.id)

    if (actualIds.length === 0) {
      return NextResponse.json({ error: 'No matching standards found' }, { status: 404 })
    }

    const links = await Promise.all(
      actualIds.map((standardId) =>
        prisma.evidenceStandardLink.upsert({
          where: { evidenceId_standardId: { evidenceId: id, standardId } },
          update: { confidence: parsed.data.confidence },
          create: { evidenceId: id, standardId, confidence: parsed.data.confidence },
        })
      )
    )

    // Re-evaluate rules after linking
    evaluateAllRules().catch(err => console.error('[evidence standards POST] rule evaluation failed:', err))

    return NextResponse.json(links, { status: 201 })
  } catch (error) {
    console.error('[POST /api/evidence/:id/standards]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const body = await request.json()
    const parsed = linkSchema.pick({ standardIds: true }).safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    // Resolve codes or UUIDs to actual standard IDs
    const standards = await prisma.standard.findMany({
      where: {
        OR: [
          { id: { in: parsed.data.standardIds } },
          { code: { in: parsed.data.standardIds } },
        ],
      },
      select: { id: true },
    })
    const actualIds = standards.map((s) => s.id)

    await prisma.evidenceStandardLink.deleteMany({
      where: { evidenceId: id, standardId: { in: actualIds } },
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/evidence/:id/standards]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
