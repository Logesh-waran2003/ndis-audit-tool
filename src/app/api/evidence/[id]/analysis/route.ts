import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params
  const analysis = await prisma.documentAnalysis.findUnique({ where: { evidenceId: id } })
  if (!analysis) return NextResponse.json({ error: 'Not analysed yet' }, { status: 404 })
  return NextResponse.json(analysis)
}
