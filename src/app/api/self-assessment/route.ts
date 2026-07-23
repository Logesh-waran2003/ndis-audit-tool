import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const assessments = await prisma.selfAssessment.findMany({
      include: { standard: { select: { code: true, name: true } } },
      orderBy: { standard: { order: 'asc' } },
    })
    return NextResponse.json(assessments)
  } catch (error) {
    console.error('[GET /api/self-assessment]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const updateSchema = z.object({
  standardId: z.string(),
  responseText: z.string().optional(),
  status: z.enum(['DRAFT', 'REVIEWED', 'FINAL']).optional(),
})

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const data: Record<string, unknown> = {}
    if (parsed.data.responseText !== undefined) data.responseText = parsed.data.responseText
    if (parsed.data.status) {
      data.status = parsed.data.status
      if (parsed.data.status === 'REVIEWED') data.reviewedAt = new Date()
    }

    const assessment = await prisma.selfAssessment.upsert({
      where: { standardId: parsed.data.standardId },
      update: data,
      create: {
        standardId: parsed.data.standardId,
        responseText: parsed.data.responseText || '',
        status: parsed.data.status || 'DRAFT',
      },
    })
    return NextResponse.json(assessment)
  } catch (error) {
    console.error('[PATCH /api/self-assessment]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
