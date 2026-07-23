import { prisma } from './db'
import { generateText } from './ai'
import { AUDIT_CHECKLIST } from './audit-checklist'

/**
 * Evaluate a single evidence document against the auditor's checklist.
 * Called in background after upload. Uses title+category heuristic (fast).
 */
export async function evaluateChecklist(evidenceId: string) {
  const evidence = await prisma.evidence.findUnique({ where: { id: evidenceId } })
  if (!evidence) return

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

  if (result.isMock) {
    console.warn('[evaluateChecklist] AI unavailable, skipping')
    return
  }

  let satisfied: Array<{ checklistId: string; satisfiedFrom: string }> = []
  try {
    let cleaned = result.text.trim()
    if (cleaned.startsWith('```')) cleaned = cleaned.substring(cleaned.indexOf('\n') + 1)
    if (cleaned.endsWith('```')) cleaned = cleaned.substring(0, cleaned.lastIndexOf('```'))
    const parsed = JSON.parse(cleaned.trim())
    if (Array.isArray(parsed)) {
      const validIds = new Set(AUDIT_CHECKLIST.map(i => i.id))
      satisfied = parsed.filter(
        (item: { checklistId?: string }) => item.checklistId && validIds.has(item.checklistId)
      )
    }
  } catch {
    console.warn('[evaluateChecklist] Could not parse AI response')
    return
  }

  // Upsert each satisfied item
  for (const item of satisfied) {
    await prisma.checklistStatus.upsert({
      where: { checklistId: item.checklistId },
      update: { satisfied: true, evidenceId, satisfiedFrom: item.satisfiedFrom },
      create: { checklistId: item.checklistId, satisfied: true, evidenceId, satisfiedFrom: item.satisfiedFrom },
    })
  }

  if (satisfied.length > 0) {
    console.log(`[evaluateChecklist] Evidence "${evidence.title}" satisfied ${satisfied.length} checklist items: ${satisfied.map(s => s.checklistId).join(', ')}`)
  }
}
