import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { unlink } from 'fs/promises'
import { join } from 'path'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const evidence = await prisma.evidence.findUnique({
      where: { id },
      include: { standardLinks: { include: { standard: true } } },
    })
    if (!evidence) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(evidence)
  } catch (error) {
    console.error('[GET /api/evidence/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  category: z.enum(['POLICY', 'PARTICIPANT', 'WORKER', 'INCIDENT', 'SERVICE_DELIVERY', 'GOVERNANCE', 'OTHER']).optional(),
  status: z.enum(['MISSING', 'UPLOADED', 'UNDER_REVIEW', 'VERIFIED', 'EXPIRING', 'EXPIRED', 'CURRENT', 'OUTDATED', 'DRAFT']).optional(),
  notes: z.string().optional(),
  expiryDate: z.string().nullable().optional(),
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
    if (parsed.data.expiryDate !== undefined) {
      data.expiryDate = parsed.data.expiryDate ? new Date(parsed.data.expiryDate) : null
    }

    const evidence = await prisma.evidence.update({ where: { id }, data })
    return NextResponse.json(evidence)
  } catch (error) {
    console.error('[PATCH /api/evidence/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const evidence = await prisma.evidence.findUnique({ where: { id } })
    if (!evidence) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Delete file from disk
    if (evidence.fileUrl) {
      const filepath = join(process.cwd(), 'public', evidence.fileUrl)
      await unlink(filepath).catch(() => {}) // ignore if file already gone
    }

    await prisma.evidence.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/evidence/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
