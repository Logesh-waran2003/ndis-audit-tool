import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const category = searchParams.get('category')
    const search = searchParams.get('search')

    const where: Record<string, unknown> = {}
    if (category) where.category = category.toUpperCase()
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { summary: { contains: search, mode: 'insensitive' } },
      ]
    }

    const docs = await prisma.kBDocument.findMany({
      where,
      orderBy: { docId: 'asc' },
    })

    return NextResponse.json(docs)
  } catch (error) {
    console.error('[GET /api/kb]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
