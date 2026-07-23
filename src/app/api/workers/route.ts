import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const workers = await prisma.worker.findMany({
      where: { isActive: true },
      include: { trainings: true, supervisions: true },
      orderBy: { name: 'asc' },
    })

    const now = new Date()
    const result = workers.map((w) => {
      const expiryDates = [w.screeningExpiry, w.policeCheckExpiry, w.wwccExpiry].filter(Boolean) as Date[]
      const nearestExpiry = expiryDates.length ? expiryDates.reduce((min, d) => (d < min ? d : min)) : null
      const daysUntilExpiry = nearestExpiry ? Math.ceil((nearestExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null

      let complianceStatus: 'CURRENT' | 'EXPIRING' | 'EXPIRED' | 'PENDING'
      if (!w.screeningExpiry) complianceStatus = 'PENDING'
      else if (daysUntilExpiry !== null && daysUntilExpiry < 0) complianceStatus = 'EXPIRED'
      else if (daysUntilExpiry !== null && daysUntilExpiry < 60) complianceStatus = 'EXPIRING'
      else complianceStatus = 'CURRENT'

      return { ...w, complianceStatus, daysUntilExpiry }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('[GET /api/workers]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const createSchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  email: z.string().email().optional(),
  screeningCheckNumber: z.string().optional(),
  screeningExpiry: z.string().optional(),
  orientationDate: z.string().optional(),
  policeCheckExpiry: z.string().optional(),
  wwccExpiry: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    let screeningStatus: 'PENDING' | 'CURRENT' | 'EXPIRING' | 'EXPIRED' = 'PENDING'
    const screeningExpiry = parsed.data.screeningExpiry ? new Date(parsed.data.screeningExpiry) : undefined
    if (screeningExpiry) {
      const days = Math.ceil((screeningExpiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      if (days < 0) screeningStatus = 'EXPIRED'
      else if (days < 60) screeningStatus = 'EXPIRING'
      else screeningStatus = 'CURRENT'
    }

    const data = {
      name: parsed.data.name,
      role: parsed.data.role,
      email: parsed.data.email,
      screeningCheckNumber: parsed.data.screeningCheckNumber,
      screeningExpiry,
      orientationDate: parsed.data.orientationDate ? new Date(parsed.data.orientationDate) : undefined,
      policeCheckExpiry: parsed.data.policeCheckExpiry ? new Date(parsed.data.policeCheckExpiry) : undefined,
      wwccExpiry: parsed.data.wwccExpiry ? new Date(parsed.data.wwccExpiry) : undefined,
      screeningStatus,
    }

    const worker = await prisma.worker.create({ data })
    return NextResponse.json(worker, { status: 201 })
  } catch (error) {
    console.error('[POST /api/workers]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
