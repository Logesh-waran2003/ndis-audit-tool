import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const status = searchParams.get('status')
    const severity = searchParams.get('severity')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    const where: Record<string, unknown> = {}
    if (type) where.type = type
    if (status) where.status = status
    if (severity) where.severity = severity
    if (dateFrom || dateTo) {
      where.dateOccurred = {
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo && { lte: new Date(dateTo) }),
      }
    }

    const incidents = await prisma.incident.findMany({
      where,
      orderBy: { dateOccurred: 'desc' },
      include: { linkedImprovement: true },
    })
    return NextResponse.json(incidents)
  } catch (error) {
    console.error('[GET /api/incidents]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const createSchema = z.object({
  type: z.enum(['INCIDENT', 'COMPLAINT', 'NEAR_MISS', 'FEEDBACK']),
  title: z.string().min(1),
  description: z.string().min(1),
  dateOccurred: z.string(),
  reportedBy: z.string().min(1),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  isReportable: z.boolean().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const incident = await prisma.incident.create({
      data: {
        type: parsed.data.type,
        title: parsed.data.title,
        description: parsed.data.description,
        dateOccurred: new Date(parsed.data.dateOccurred),
        reportedBy: parsed.data.reportedBy,
        severity: parsed.data.severity,
        isReportable: parsed.data.isReportable ?? false,
      },
    })
    return NextResponse.json(incident, { status: 201 })
  } catch (error) {
    console.error('[POST /api/incidents]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
