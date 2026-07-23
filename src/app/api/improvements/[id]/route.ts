import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const improvement = await prisma.improvement.findUnique({
      where: { id },
      include: { evidence: true, incidents: true },
    })
    if (!improvement) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(improvement)
  } catch (error) {
    console.error('[GET /api/improvements/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const updateSchema = z.object({
  actionTaken: z.string().optional(),
  evidenceId: z.string().optional(),
  status: z.enum(['IDENTIFIED', 'IN_PROGRESS', 'COMPLETED', 'VERIFIED']).optional(),
  completedDate: z.string().optional(),
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
    if (parsed.data.completedDate) data.completedDate = new Date(parsed.data.completedDate)

    const improvement = await prisma.improvement.update({ where: { id }, data })
    return NextResponse.json(improvement)
  } catch (error) {
    console.error('[PATCH /api/improvements/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
