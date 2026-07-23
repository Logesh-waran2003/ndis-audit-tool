import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ docId: string }> }
) {
  try {
    const { docId } = await params
    const doc = await prisma.kBDocument.findUnique({
      where: { docId },
    })

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    return NextResponse.json(doc)
  } catch (error) {
    console.error('[GET /api/kb/[docId]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
