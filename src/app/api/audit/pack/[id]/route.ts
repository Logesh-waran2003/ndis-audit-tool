import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const body = await request.json()
    const schema = z.object({ expiresAt: z.string().optional() })
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const data: Record<string, unknown> = {}
    if (parsed.data.expiresAt) data.expiresAt = new Date(parsed.data.expiresAt)
    // If no expiresAt, treat as revoke (set to past)
    if (!parsed.data.expiresAt) data.expiresAt = new Date(0)

    const pack = await prisma.auditPack.update({ where: { id }, data })
    return NextResponse.json(pack)
  } catch (error) {
    console.error('[PATCH /api/audit/pack/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    await prisma.auditPack.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/audit/pack/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
