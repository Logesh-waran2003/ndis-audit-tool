import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { evaluateAllRules } from '@/lib/rule-evaluator'
import { evaluateChecklist } from '@/lib/checklist-evaluator'
import { analyseDocumentFull, fastClassify } from '@/lib/document-analyser'
import { generateText } from '@/lib/ai'
import { z } from 'zod'
import { writeFile, mkdir, readFile } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const standardId = searchParams.get('standardId')

    const where: Record<string, unknown> = {}
    if (category) where.category = category
    if (status) where.status = status
    if (search) where.title = { contains: search, mode: 'insensitive' }
    if (standardId) where.standardLinks = { some: { standardId } }

    const evidence = await prisma.evidence.findMany({
      where,
      include: { standardLinks: { include: { standard: true } } },
      orderBy: { uploadedAt: 'desc' },
    })
    return NextResponse.json(evidence)
  } catch (error) {
    console.error('[GET /api/evidence]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const createSchema = z.object({
  title: z.string().optional(),
  category: z.enum(['POLICY', 'PARTICIPANT', 'WORKER', 'INCIDENT', 'SERVICE_DELIVERY', 'GOVERNANCE', 'OTHER']).optional(),
  notes: z.string().optional(),
  expiryDate: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 })
    }

    const parsed = createSchema.safeParse({
      title: formData.get('title') || undefined,
      category: formData.get('category') || undefined,
      notes: formData.get('notes') || undefined,
      expiryDate: formData.get('expiryDate') || undefined,
    })
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    // Save file locally
    const uploadDir = join(process.cwd(), 'public', 'uploads')
    await mkdir(uploadDir, { recursive: true })
    const filename = `${randomUUID()}-${file.name}`
    const filepath = join(uploadDir, filename)
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filepath, buffer)

    // Create evidence record
    const title = parsed.data.title || file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')
    const category = parsed.data.category || 'OTHER'
    const evidence = await prisma.evidence.create({
      data: {
        title,
        category,
        status: 'CURRENT',
        notes: parsed.data.notes,
        expiryDate: parsed.data.expiryDate ? new Date(parsed.data.expiryDate) : null,
        fileUrl: `/uploads/${filename}`,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      },
    })

    // Background: Two-pass analysis
    // Fast pass (5-10s): quick classification → marks items PARTIAL
    // Deep pass (30-90s): full content verification → upgrades to VERIFIED
    fastClassify(evidence.id).then(() => {
      console.log('[evidence POST] Fast pass complete — starting deep analysis')
      return analyseDocumentFull(evidence.id)
    }).then(() => {
      return evaluateAllRules()
    }).catch(err => {
      console.error('[evidence POST] analysis pipeline failed:', err)
    })

    return NextResponse.json(evidence, { status: 201 })
  } catch (error) {
    console.error('[POST /api/evidence]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
