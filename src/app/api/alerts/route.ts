import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const severity = searchParams.get('severity')

    const where: Record<string, unknown> = { acknowledged: false }
    if (severity) where.severity = severity

    const alerts = await prisma.alert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(alerts)
  } catch (error) {
    console.error('[GET /api/alerts]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id query param required' }, { status: 400 })

    const alert = await prisma.alert.update({
      where: { id },
      data: { acknowledged: true, acknowledgedAt: new Date() },
    })
    return NextResponse.json(alert)
  } catch (error) {
    console.error('[PATCH /api/alerts]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
