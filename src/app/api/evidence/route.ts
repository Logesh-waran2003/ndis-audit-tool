import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { evaluateAllRules } from '@/lib/rule-evaluator'
import { evaluateChecklist } from '@/lib/checklist-evaluator'
import { analyseDocumentFull } from '@/lib/document-analyser'
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
      title: formData.get('title'),
      category: formData.get('category'),
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

    // Background: AI full document analysis + classify + auto-link + re-evaluate rules
    // This runs AFTER we return the response to the user (non-blocking)
    analyseDocumentFull(evidence.id).then(() => {
      return evaluateAllRules()
    }).catch(err => {
      console.error('[evidence POST] full analysis failed, falling back to classifyAndLink:', err)
      // Fallback to fast classify if full analysis fails
      classifyAndLink(evidence.id, title, category, filepath).catch(e =>
        console.error('[evidence POST] fallback classify also failed:', e)
      )
    })

    return NextResponse.json(evidence, { status: 201 })
  } catch (error) {
    console.error('[POST /api/evidence]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Background task: classify document and auto-link to standards.
 * Runs after upload response is sent to user.
 */
async function classifyAndLink(evidenceId: string, title: string, category: string, filepath: string) {
  try {
    // Get all standards for the prompt
    const standards = await prisma.standard.findMany({ orderBy: { order: 'asc' } })
    const standardsList = standards.map(s => `${s.code} — ${s.name}`).join('\n')

    // Build classification prompt using title + category (fast, no file reading needed for text-based classification)
    const prompt = `You are an NDIS compliance classifier. Given this document metadata, determine which NDIS Practice Standards (Verification Module) it provides evidence for.

Document title: "${title}"
Category: ${category}
Filename: ${filepath.split('/').pop()}

Available standards:
${standardsList}

Based on the document title and category, identify which standards this document likely provides evidence for. Consider:
- A "Policies & Procedures Manual" covers governance (VM-1.1), risk (VM-1.2), quality (VM-1.3), information (VM-1.4), complaints (VM-1.5), incidents (VM-1.6), HR (VM-1.7)
- Worker screening certificates map to VM-4.1
- Service agreements map to VM-2.1, VM-2.3
- Insurance certificates map to governance (VM-1.1)
- Privacy policies map to VM-1.4
- Risk registers map to VM-1.2

Return ONLY a JSON array of objects: [{"code":"VM-1.1","confidence":0.9}]
No explanation, just the JSON array.`

    const result = await generateText(prompt, undefined, { temperature: 0.1, maxOutputTokens: 1024 })

    if (result.isMock) {
      console.warn('[classifyAndLink] AI unavailable, skipping auto-link')
      await evaluateAllRules()
      return
    }

    // Parse response
    let codes: string[] = []
    try {
      let cleaned = result.text.trim()
      if (cleaned.startsWith('```')) {
        const firstNewline = cleaned.indexOf('\n')
        if (firstNewline !== -1) cleaned = cleaned.substring(firstNewline + 1)
      }
      if (cleaned.endsWith('```')) cleaned = cleaned.substring(0, cleaned.lastIndexOf('```'))
      cleaned = cleaned.trim()

      const parsed = JSON.parse(cleaned)
      if (Array.isArray(parsed)) {
        codes = parsed
          .filter((item: { confidence?: number }) => typeof item.confidence === 'number' && item.confidence >= 0.5)
          .map((item: { code?: string }) => {
            const code = item.code || ''
            return code.startsWith('VM-') ? code : `VM-${code}`
          })
      }
    } catch {
      console.warn('[classifyAndLink] Could not parse AI response')
    }

    if (codes.length === 0) {
      console.log('[classifyAndLink] No standards identified, skipping link')
      await evaluateAllRules()
      return
    }

    // Look up standard UUIDs from codes
    const matchingStandards = await prisma.standard.findMany({
      where: { code: { in: codes } }
    })

    // Create links (skip if already linked)
    const existingLinks = await prisma.evidenceStandardLink.findMany({
      where: { evidenceId }
    })
    const existingStandardIds = new Set(existingLinks.map(l => l.standardId))

    const newLinks = matchingStandards
      .filter(s => !existingStandardIds.has(s.id))
      .map(s => ({
        evidenceId,
        standardId: s.id,
        confidence: 0.8, // AI-suggested
        confirmedByUser: false,
      }))

    if (newLinks.length > 0) {
      await prisma.evidenceStandardLink.createMany({ data: newLinks })
      console.log(`[classifyAndLink] Auto-linked evidence to ${newLinks.length} standards: ${codes.join(', ')}`)
    }

    // Re-evaluate rules
    await evaluateAllRules()

    // Also evaluate against the auditor's checklist
    await evaluateChecklist(evidenceId)
  } catch (error) {
    console.error('[classifyAndLink] Error:', error)
    // Still try to evaluate rules even if classification fails
    await evaluateAllRules().catch(() => {})
  }
}
