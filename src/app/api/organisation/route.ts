import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const org = await prisma.organisation.findFirst()
    if (!org) return NextResponse.json({ error: 'No organisation found' }, { status: 404 })
    return NextResponse.json(org)
  } catch (error) {
    console.error('[GET /api/organisation]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const org = await prisma.organisation.findFirst()
    if (!org) return NextResponse.json({ error: 'No organisation found' }, { status: 404 })

    // Only allow updating specific fields
    const data: Record<string, unknown> = {}
    if (body.participantCount !== undefined) data.participantCount = body.participantCount
    if (body.staffCount !== undefined) data.staffCount = body.staffCount
    if (body.name !== undefined) data.name = body.name
    if (body.abn !== undefined) data.abn = body.abn

    const updated = await prisma.organisation.update({
      where: { id: org.id },
      data,
    })
    return NextResponse.json(updated)
  } catch (error) {
    console.error('[PATCH /api/organisation]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
