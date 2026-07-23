import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const incident = await prisma.incident.findUnique({
      where: { id },
      include: { linkedImprovement: true, correctiveActionEvidence: true },
    })
    if (!incident) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(incident)
  } catch (error) {
    console.error('[GET /api/incidents/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const updateSchema = z.object({
  investigationNotes: z.string().optional(),
  rootCause: z.string().optional(),
  correctiveAction: z.string().optional(),
  correctiveActionEvidenceId: z.string().optional(),
  status: z.enum(['OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED']).optional(),
  resolvedDate: z.string().optional(),
  linkedImprovementId: z.string().optional(),
  commissionNotified: z.boolean().optional(),
  commissionNotificationDate: z.string().optional(),
})

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const body = await request.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const data: Record<string, unknown> = { ...parsed.data }
    if (parsed.data.resolvedDate) data.resolvedDate = new Date(parsed.data.resolvedDate)
    if (parsed.data.commissionNotificationDate) data.commissionNotificationDate = new Date(parsed.data.commissionNotificationDate)

    const incident = await prisma.incident.update({ where: { id }, data })
    return NextResponse.json(incident)
  } catch (error) {
    console.error('[PATCH /api/incidents/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
