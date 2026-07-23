import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const supervisions = await prisma.workerSupervision.findMany({
      where: { workerId: id },
      orderBy: { date: 'desc' },
    })
    return NextResponse.json(supervisions)
  } catch (error) {
    console.error('[GET /api/workers/:id/supervision]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const createSchema = z.object({
  date: z.string(),
  supervisorName: z.string().min(1),
  notes: z.string().min(1),
  evidenceId: z.string().optional(),
})

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const body = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const supervision = await prisma.workerSupervision.create({
      data: {
        workerId: id,
        date: new Date(parsed.data.date),
        supervisorName: parsed.data.supervisorName,
        notes: parsed.data.notes,
        evidenceId: parsed.data.evidenceId,
      },
    })
    return NextResponse.json(supervision, { status: 201 })
  } catch (error) {
    console.error('[POST /api/workers/:id/supervision]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
