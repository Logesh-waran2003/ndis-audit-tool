import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const worker = await prisma.worker.findUnique({
      where: { id },
      include: { trainings: true, supervisions: { orderBy: { date: 'desc' } } },
    })
    if (!worker) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(worker)
  } catch (error) {
    console.error('[GET /api/workers/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.string().min(1).optional(),
  email: z.string().email().optional(),
  screeningCheckNumber: z.string().optional(),
  screeningExpiry: z.string().optional(),
  orientationDate: z.string().optional(),
  policeCheckExpiry: z.string().optional(),
  wwccExpiry: z.string().optional(),
})

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const body = await request.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const data: Record<string, unknown> = {}
    if (parsed.data.name) data.name = parsed.data.name
    if (parsed.data.role) data.role = parsed.data.role
    if (parsed.data.email) data.email = parsed.data.email
    if (parsed.data.screeningCheckNumber) data.screeningCheckNumber = parsed.data.screeningCheckNumber
    if (parsed.data.screeningExpiry) data.screeningExpiry = new Date(parsed.data.screeningExpiry)
    if (parsed.data.orientationDate) data.orientationDate = new Date(parsed.data.orientationDate)
    if (parsed.data.policeCheckExpiry) data.policeCheckExpiry = new Date(parsed.data.policeCheckExpiry)
    if (parsed.data.wwccExpiry) data.wwccExpiry = new Date(parsed.data.wwccExpiry)

    const worker = await prisma.worker.update({ where: { id }, data })
    return NextResponse.json(worker)
  } catch (error) {
    console.error('[PATCH /api/workers/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const worker = await prisma.worker.update({
      where: { id },
      data: { isActive: false },
    })
    return NextResponse.json(worker)
  } catch (error) {
    console.error('[DELETE /api/workers/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
