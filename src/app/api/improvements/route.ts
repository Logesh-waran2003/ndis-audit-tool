import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const source = searchParams.get('source')
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}
    if (source) where.source = source
    if (status) where.status = status

    const improvements = await prisma.improvement.findMany({
      where,
      orderBy: { identifiedDate: 'desc' },
      include: { evidence: true, incidents: true },
    })
    return NextResponse.json(improvements)
  } catch (error) {
    console.error('[GET /api/improvements]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  source: z.enum(['INCIDENT', 'COMPLAINT', 'FEEDBACK', 'AUDIT', 'INTERNAL_REVIEW', 'RISK_ASSESSMENT']),
  sourceId: z.string().optional(),
  actionRequired: z.string().min(1),
  responsiblePerson: z.string().min(1),
  dueDate: z.string(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const improvement = await prisma.improvement.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        source: parsed.data.source,
        sourceId: parsed.data.sourceId,
        actionRequired: parsed.data.actionRequired,
        responsiblePerson: parsed.data.responsiblePerson,
        dueDate: new Date(parsed.data.dueDate),
      },
    })
    return NextResponse.json(improvement, { status: 201 })
  } catch (error) {
    console.error('[POST /api/improvements]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
