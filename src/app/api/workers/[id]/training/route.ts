import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const trainings = await prisma.workerTraining.findMany({
      where: { workerId: id },
      orderBy: { completedDate: 'desc' },
    })
    return NextResponse.json(trainings)
  } catch (error) {
    console.error('[GET /api/workers/:id/training]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const createSchema = z.object({
  title: z.string().min(1),
  completedDate: z.string(),
  expiryDate: z.string().optional(),
  notes: z.string().optional(),
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

    const training = await prisma.workerTraining.create({
      data: {
        workerId: id,
        title: parsed.data.title,
        completedDate: new Date(parsed.data.completedDate),
        expiryDate: parsed.data.expiryDate ? new Date(parsed.data.expiryDate) : undefined,
        notes: parsed.data.notes,
        evidenceId: parsed.data.evidenceId,
      },
    })
    return NextResponse.json(training, { status: 201 })
  } catch (error) {
    console.error('[POST /api/workers/:id/training]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
