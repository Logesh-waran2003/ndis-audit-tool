import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const evidence = await prisma.evidence.update({
      where: { id },
      data: {
        status: 'VERIFIED',
        verifiedAt: new Date(),
        verifiedBy: 'Plan Manager', // ponytail: hardcoded for v1 single-user; upgrade to auth user when auth lands
      }
    })
    return NextResponse.json(evidence)
  } catch (error) {
    console.error('[PATCH /api/evidence/:id/verify]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
