import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateText } from '@/lib/ai'
import { AUDIT_CHECKLIST } from '@/lib/audit-checklist'

export const dynamic = 'force-dynamic'

/**
 * POST /api/checklist/evaluate
 * Takes { evidenceId } — looks up the evidence, calls AI to determine which
 * checklist items it satisfies, then upserts ChecklistStatus rows.
 */
export async function POST(request: NextRequest) {
  try {
    const { evidenceId } = await request.json()
    if (!evidenceId) {
      return NextResponse.json({ error: 'evidenceId required' }, { status: 400 })
    }

    const evidence = await prisma.evidence.findUnique({ where: { id: evidenceId } })
    if (!evidence) {
      return NextResponse.json({ error: 'Evidence not found' }, { status: 404 })
    }

    // Build checklist JSON for the prompt (just id + name for brevity)
    const checklistJson = JSON.stringify(
      AUDIT_CHECKLIST.map(i => ({ id: i.id, name: i.name, category: i.category, perWorker: i.perWorker || false }))
    )

    const prompt = `You are analysing a document for an NDIS Plan Management provider's verification audit.

The auditor needs these items (checklist):
${checklistJson}

The uploaded document is titled: "${evidence.title}"
Category: ${evidence.category}
Filename: ${evidence.fileName}

Based on the document title and category, determine which checklist items this SINGLE document satisfies. A policy manual can satisfy multiple items. An insurance certificate only satisfies one.

IMPORTANT: Items marked "perWorker": true in the checklist require the ACTUAL document for each worker (e.g., the actual screening certificate, the actual signed contract, the actual police check). A policy manual that MENTIONS these requirements does NOT satisfy them. Only mark "perWorker" items as satisfied if the uploaded document IS that actual per-worker document (e.g., filename contains a person's name + the document type, or category is WORKER).

Consider:
- A "Policies & Procedures Manual" satisfies GOV-* items (governance, delegation, COI, legislative compliance) and REG-* items (risk, incidents, complaints, CI) — but NEVER STAFF-* items
- An insurance certificate satisfies only its specific type (INS-PL, INS-PI, or INS-WC)
- A worker screening certificate satisfies only STAFF-SCREENING for that worker
- A service agreement satisfies PART-SA
- A risk register satisfies REG-RISK
- Meeting minutes satisfy GOV-MINUTES
- A business plan satisfies GOV-BIZPLAN
- An org chart satisfies GOV-ORGCHART
- STAFF-* items are ONLY satisfied by actual per-worker documents (category WORKER, or filename with a person's name)

Return ONLY a JSON array of objects:
[{"checklistId": "GOV-POLICY", "satisfiedFrom": "This is the complete policy manual"}, {"checklistId": "REG-RISK", "satisfiedFrom": "Chapter 8 covers risk management procedures"}]

If the document doesn't clearly satisfy any item, return an empty array: []`

    const result = await generateText(prompt, undefined, { temperature: 0.1, maxOutputTokens: 2048 })

    let satisfied: Array<{ checklistId: string; satisfiedFrom: string }> = []

    if (!result.isMock) {
      try {
        let cleaned = result.text.trim()
        if (cleaned.startsWith('```')) {
          cleaned = cleaned.substring(cleaned.indexOf('\n') + 1)
        }
        if (cleaned.endsWith('```')) {
          cleaned = cleaned.substring(0, cleaned.lastIndexOf('```'))
        }
        const parsed = JSON.parse(cleaned.trim())
        if (Array.isArray(parsed)) {
          // Only accept valid checklist IDs
          const validIds = new Set(AUDIT_CHECKLIST.map(i => i.id))
          satisfied = parsed.filter(
            (item: { checklistId?: string }) => item.checklistId && validIds.has(item.checklistId)
          )
        }
      } catch {
        console.warn('[checklist/evaluate] Could not parse AI response')
      }
    }

    // Upsert ChecklistStatus rows
    for (const item of satisfied) {
      await prisma.checklistStatus.upsert({
        where: { checklistId: item.checklistId },
        update: { satisfied: true, evidenceId, satisfiedFrom: item.satisfiedFrom },
        create: { checklistId: item.checklistId, satisfied: true, evidenceId, satisfiedFrom: item.satisfiedFrom },
      })
    }

    // Build response: what was satisfied + what's still missing
    const allStatus = await prisma.checklistStatus.findMany({ where: { satisfied: true } })
    const satisfiedIds = new Set(allStatus.map(s => s.checklistId))
    const stillMissing = AUDIT_CHECKLIST.filter(i => !satisfiedIds.has(i.id))

    return NextResponse.json({
      satisfied: satisfied.map(s => s.checklistId),
      satisfiedFrom: satisfied,
      stillMissing: stillMissing.map(i => i.id),
      progress: `${satisfiedIds.size}/${AUDIT_CHECKLIST.length}`,
    })
  } catch (error) {
    console.error('[POST /api/checklist/evaluate]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/checklist/status
 * Returns current checklist state — all items with their satisfaction status.
 */
export async function GET() {
  try {
    const statuses = await prisma.checklistStatus.findMany()
    const statusMap = new Map(statuses.map(s => [s.checklistId, s]))

    const items = AUDIT_CHECKLIST.map(item => {
      const status = statusMap.get(item.id)
      return {
        ...item,
        satisfied: status?.satisfied ?? false,
        evidenceId: status?.evidenceId ?? null,
        satisfiedFrom: status?.satisfiedFrom ?? null,
      }
    })

    const satisfiedCount = items.filter(i => i.satisfied).length
    return NextResponse.json({
      items,
      progress: `${satisfiedCount}/${items.length}`,
      satisfiedCount,
      totalCount: items.length,
    })
  } catch (error) {
    console.error('[GET /api/checklist/status]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
