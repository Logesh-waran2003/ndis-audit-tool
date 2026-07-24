import { readFileSync } from 'fs'
import { join } from 'path'
import { prisma } from './db'
import { generateText } from './ai'
import { AUDIT_CHECKLIST } from './audit-checklist'
import { evaluateAllRules } from './rule-evaluator'

// DOCX text extraction
async function extractDocxText(filePath: string): Promise<string> {
  try {
    const mammoth = await import('mammoth')
    const buffer = readFileSync(filePath)
    const result = await mammoth.extractRawText({ buffer })
    return result.value || ''
  } catch (e) {
    console.warn('[extractDocxText] Failed:', e)
    return ''
  }
}

// Get document text based on file type
async function getDocumentText(evidence: { fileUrl: string | null; fileName: string | null; fileType: string | null }): Promise<string> {
  const filePath = join(process.cwd(), 'public', evidence.fileUrl || '')
  
  try {
    if (evidence.fileName?.endsWith('.docx') || evidence.fileType?.includes('word')) {
      return await extractDocxText(filePath)
    } else if (evidence.fileType?.includes('pdf')) {
      // For PDF: read as base64 and include in prompt (Gemini reads inline)
      const buffer = readFileSync(filePath)
      // Truncate large PDFs
      const base64 = buffer.toString('base64').substring(0, 50000)
      return `[PDF CONTENT - base64 first 50000 chars provided for analysis]\nBase64: ${base64}`
    } else {
      // Try plain text
      return readFileSync(filePath, 'utf-8').substring(0, 30000)
    }
  } catch {
    return ''
  }
}

// ═══════════════════════════════════════════
// PROMPT 1: Classification + Metadata
// ═══════════════════════════════════════════
async function classifyDocument(text: string, fileName: string): Promise<{
  type: string; title: string; dates: Array<{date: string; context: string}>; names: string[]; organisation: string
} | null> {
  const prompt = `Read this document content. Answer ONLY these questions:

1. What TYPE of document is this? Choose ONE:
   policy_manual, insurance_certificate, worker_screening_certificate, service_agreement, risk_register, meeting_minutes, training_certificate, financial_statement, organisation_chart, business_plan, position_description, induction_checklist, code_of_conduct_signed, conflict_of_interest_declaration, police_check, resume_cv, other

2. What is the EXACT title as written in the document? (Not the filename "${fileName}")

3. What DATES appear in the document? List each date with what it relates to.

4. What NAMES of people appear?

5. What ORGANISATION is this document for?

DOCUMENT CONTENT:
${text.substring(0, 15000)}

Return ONLY this JSON (no explanation):
{"type": "...", "title": "...", "dates": [{"date": "YYYY-MM-DD or as found", "context": "what this date means"}], "names": ["..."], "organisation": "..."}`

  const result = await generateText(prompt, undefined, { temperature: 0.05, maxOutputTokens: 1024 })
  if (result.isMock) return null
  
  try {
    let cleaned = result.text.trim()
    if (cleaned.startsWith('```')) cleaned = cleaned.substring(cleaned.indexOf('\n') + 1)
    if (cleaned.endsWith('```')) cleaned = cleaned.substring(0, cleaned.lastIndexOf('```'))
    return JSON.parse(cleaned.trim())
  } catch { return null }
}

// ═══════════════════════════════════════════
// PROMPT 2: Section Mapping
// ═══════════════════════════════════════════
async function mapSections(text: string): Promise<Array<{heading: string; summary: string}>> {
  const prompt = `Read this document. List EVERY section, chapter, or major heading you find.
For each, write ONE sentence summarising what it covers.

DOCUMENT CONTENT:
${text.substring(0, 20000)}

Return ONLY this JSON (no explanation):
{"sections": [{"heading": "exact heading text", "summary": "one sentence summary"}]}

Do NOT interpret or evaluate. Just list what's structurally there.`

  const result = await generateText(prompt, undefined, { temperature: 0.05, maxOutputTokens: 2048 })
  if (result.isMock) return []
  
  try {
    let cleaned = result.text.trim()
    if (cleaned.startsWith('```')) cleaned = cleaned.substring(cleaned.indexOf('\n') + 1)
    if (cleaned.endsWith('```')) cleaned = cleaned.substring(0, cleaned.lastIndexOf('```'))
    const parsed = JSON.parse(cleaned.trim())
    return parsed.sections || []
  } catch { return [] }
}

// ═══════════════════════════════════════════
// PROMPT 3: Per-Item Checklist Verification
// ═══════════════════════════════════════════
async function verifyChecklistItems(
  text: string,
  docType: string,
  sections: Array<{heading: string; summary: string}>,
  relevantItems: typeof AUDIT_CHECKLIST
): Promise<Array<{checklistId: string; satisfied: string; evidence: string}>> {
  // Build items list for the prompt
  const itemsList = relevantItems.map(item => 
    `- ${item.id}: "${item.name}" — Auditor looks for: ${item.description}${item.perWorker ? ' [REQUIRES ACTUAL PER-PERSON DOCUMENT — a policy mentioning this is NOT sufficient]' : ''}`
  ).join('\n')

  const sectionsText = sections.map(s => `• ${s.heading}: ${s.summary}`).join('\n')

  const prompt = `This document is a "${docType}".
It contains these sections:
${sectionsText}

For each requirement below, determine if this document satisfies it.

REQUIREMENTS TO CHECK:
${itemsList}

RULES:
- "YES" = document contains SUBSTANTIVE content that directly satisfies this requirement
- "PARTIAL" = document mentions or partially covers this but is incomplete or outdated
- "NO" = document does not contain sufficient content for this requirement
- Items marked [REQUIRES ACTUAL PER-PERSON DOCUMENT]: If this document is a policy_manual, the answer is ALWAYS "NO" even if the policy describes the process. Only answer "YES" if this IS the actual certificate/signed document for a specific named person.
- You MUST provide a one-line evidence quote or section reference to prove your answer.

DOCUMENT CONTENT (for verification):
${text.substring(0, 20000)}

Return ONLY this JSON array:
[{"checklistId": "GOV-POLICY", "satisfied": "YES", "evidence": "exact quote or section reference proving this"}]

Include ALL items from the requirements list. Do not skip any.`

  const result = await generateText(prompt, undefined, { temperature: 0.05, maxOutputTokens: 4096 })
  if (result.isMock) return []
  
  try {
    let cleaned = result.text.trim()
    if (cleaned.startsWith('```')) cleaned = cleaned.substring(cleaned.indexOf('\n') + 1)
    if (cleaned.endsWith('```')) cleaned = cleaned.substring(0, cleaned.lastIndexOf('```'))
    return JSON.parse(cleaned.trim())
  } catch { return [] }
}

// ═══════════════════════════════════════════
// PROMPT 4: Currency Check (Level 5)
// ═══════════════════════════════════════════
async function checkCurrency(text: string, dates: Array<{date: string; context: string}>): Promise<{
  isStale: boolean; documentAge: string; outdatedRefs: string[]; missingRefs: string[]; overallCurrency: string
}> {
  const datesInfo = dates.map(d => `${d.date} (${d.context})`).join(', ')
  
  const prompt = `This document has these dates: ${datesInfo || 'no dates found'}

Current NDIS legislation (as of July 2026):
- NDIS Act 2013 (compilation C2026C00181, May 2026)
- Provider Registration Rules 2018 (compilation F2026C00527, July 2026)
- Quality Indicators Guidelines 2018 (compilation F2026C00528, July 2026)
- NDIS Code of Conduct Rules 2018
- NDIS Amendment (Integrity and Safeguarding) Act 2026 (NEW - Royal Assent April 2026)
- NDIS Amendment (Getting Back on Track) Act 2024 (Royal Assent September 2024)
- NDIS Mandatory Registration Rules 2026 (NEW - registered June 2026)
- NDIS Pricing Arrangements 2025-26 (superseded by 2026-27 from July 2026)
- NDIS Pricing Schedule 2026-27 (current from 1 July 2026)
- Plan Management monthly fee: $104.45 (2025-26), check 2026-27 for update

DOCUMENT CONTENT (search for legislation references and dates):
${text.substring(0, 15000)}

Answer these questions:
1. Is the document older than 12 months based on dates found? (true/false + what date you used)
2. List any OUTDATED legislation references found in the document (e.g., "references NDIS Practice Standards 2020" when current is 2026)
3. List any NEW legislation since this document was written that SHOULD be referenced but isn't
4. Overall currency: "CURRENT" (within 12 months, refs up to date) | "NEEDS_UPDATE" (some outdated refs but mostly fine) | "OUTDATED" (>12 months old OR major legislation gaps)

Return ONLY JSON:
{"isStale": true/false, "documentAge": "X months based on [date found]", "outdatedRefs": ["what's outdated and why"], "missingRefs": ["what should be added"], "overallCurrency": "CURRENT|NEEDS_UPDATE|OUTDATED"}`

  const result = await generateText(prompt, undefined, { temperature: 0.05, maxOutputTokens: 1024 })
  if (result.isMock) return { isStale: false, documentAge: 'unknown', outdatedRefs: [], missingRefs: [], overallCurrency: 'unknown' }
  
  try {
    let cleaned = result.text.trim()
    if (cleaned.startsWith('```')) cleaned = cleaned.substring(cleaned.indexOf('\n') + 1)
    if (cleaned.endsWith('```')) cleaned = cleaned.substring(0, cleaned.lastIndexOf('```'))
    return JSON.parse(cleaned.trim())
  } catch { return { isStale: false, documentAge: 'unknown', outdatedRefs: [], missingRefs: [], overallCurrency: 'unknown' } }
}

// ═══════════════════════════════════════════
// FAST PASS: Quick classification from first 2000 chars.
// Marks checklist items as PARTIAL within 5-10 seconds.
// Deep pass (analyseDocumentFull) will upgrade to VERIFIED later.
// ═══════════════════════════════════════════
export async function fastClassify(evidenceId: string) {
  const evidence = await prisma.evidence.findUnique({ where: { id: evidenceId } })
  if (!evidence) return

  console.log(`[fastClassify] Starting quick scan of "${evidence.fileName}"...`)
  const startTime = Date.now()

  const text = await getDocumentText(evidence)
  if (!text || text.length < 20) {
    console.warn('[fastClassify] No content extracted')
    return
  }
  const snippet = text.substring(0, 2000)

  const checklistList = AUDIT_CHECKLIST.map(i => `${i.id}: ${i.name}${i.perWorker ? ' [per-worker doc needed]' : ''}`).join('\n')

  const prompt = `Read this document snippet quickly. Determine:
1. What TYPE of document is this? Choose one: policy_manual, insurance_certificate, worker_screening_certificate, service_agreement, risk_register, meeting_minutes, training_certificate, business_plan, organisation_chart, position_description, code_of_conduct_signed, other

2. Which checklist items does it LIKELY satisfy? Only include items you're fairly confident about from reading the snippet. Do NOT include per-worker items (marked [per-worker doc needed]) unless this appears to be an actual individual certificate/signed document for a specific person.

Checklist items:
${checklistList}

Document filename: "${evidence.fileName}"
First 2000 characters:
${snippet}

Return ONLY JSON:
{"type": "policy_manual", "likelySatisfies": ["GOV-POLICY", "REG-RISK"]}`

  const result = await generateText(prompt, undefined, { temperature: 0.1, maxOutputTokens: 512, context: 'fastClassify' })

  if (result.isMock) {
    console.warn('[fastClassify] AI unavailable')
    return
  }

  try {
    let cleaned = result.text.trim()
    if (cleaned.startsWith('```')) cleaned = cleaned.substring(cleaned.indexOf('\n') + 1)
    if (cleaned.endsWith('```')) cleaned = cleaned.substring(0, cleaned.lastIndexOf('```'))
    const parsed = JSON.parse(cleaned.trim())

    if (parsed.type) {
      await prisma.evidence.update({
        where: { id: evidenceId },
        data: { category: mapTypeToCategory(parsed.type) as any }
      })
    }

    // Mark checklist items as PARTIAL (quick scan, not fully verified yet)
    const validIds = new Set(AUDIT_CHECKLIST.map(i => i.id))
    const likelySatisfies = (parsed.likelySatisfies || []).filter((id: string) => validIds.has(id))

    for (const checklistId of likelySatisfies) {
      const existing = await prisma.checklistStatus.findUnique({ where: { checklistId } })
      // Don't downgrade VERIFIED items from previous deep analysis
      if (!existing || (existing.confidence !== 'VERIFIED')) {
        await prisma.checklistStatus.upsert({
          where: { checklistId },
          update: { satisfied: true, confidence: 'PARTIAL', evidenceId, satisfiedFrom: 'Quick scan — full verification pending' },
          create: { checklistId, satisfied: true, confidence: 'PARTIAL', evidenceId, satisfiedFrom: 'Quick scan — full verification pending' },
        })
      }
    }

    console.log(`[fastClassify] ✓ Quick scan done in ${Date.now() - startTime}ms: type=${parsed.type}, likely=${likelySatisfies.length} items`)
  } catch (err) {
    console.warn('[fastClassify] Could not parse response:', err)
  }
}

// ═══════════════════════════════════════════
// MAIN PIPELINE: Orchestrates all 4 prompts
// ═══════════════════════════════════════════
export async function analyseDocumentFull(evidenceId: string) {
  const evidence = await prisma.evidence.findUnique({ where: { id: evidenceId } })
  if (!evidence) return null

  console.log(`[analyseDocumentFull] Starting analysis of "${evidence.fileName}"...`)

  // Extract text
  const text = await getDocumentText(evidence)
  if (!text || text.length < 50) {
    console.warn('[analyseDocumentFull] Could not extract meaningful text')
    return null
  }

  // STEP 1: Classify
  console.log('[analyseDocumentFull] Step 1: Classifying...')
  const classification = await classifyDocument(text, evidence.fileName || '')
  if (!classification) {
    console.warn('[analyseDocumentFull] Classification failed')
    return null
  }

  // STEP 2: Map sections
  console.log('[analyseDocumentFull] Step 2: Mapping sections...')
  const sections = await mapSections(text)

  // STEP 3: Determine which checklist items are RELEVANT for this doc type
  const relevantItems = getRelevantItems(classification.type)
  
  // STEP 3: Verify checklist items
  console.log(`[analyseDocumentFull] Step 3: Verifying ${relevantItems.length} relevant checklist items...`)
  const checklistResults = await verifyChecklistItems(text, classification.type, sections, relevantItems)

  // STEP 4: Currency check
  console.log('[analyseDocumentFull] Step 4: Checking currency...')
  const currency = await checkCurrency(text, classification.dates)

  // Calculate quality score
  const qualityScore = calculateQualityScore(checklistResults, currency, sections)

  // Save to DB
  await prisma.documentAnalysis.upsert({
    where: { evidenceId },
    update: {
      documentType: classification.type,
      extractedTitle: classification.title,
      dates: classification.dates as any,
      sections: sections as any,
      legislationRefs: currency.outdatedRefs as any,
      personnel: classification.names as any,
      keyFindings: checklistResults.filter(r => r.satisfied === 'YES').map(r => r.evidence) as any,
      concerns: [
        ...currency.outdatedRefs.map(r => `Outdated reference: ${r}`),
        ...currency.missingRefs.map(r => `Missing: ${r}`),
        ...(currency.isStale ? [`Document is ${currency.documentAge} old`] : []),
      ] as any,
      qualityScore,
      checklistMapping: checklistResults as any,
      analysedAt: new Date(),
    },
    create: {
      evidenceId,
      documentType: classification.type,
      extractedTitle: classification.title,
      dates: classification.dates as any,
      sections: sections as any,
      legislationRefs: currency.outdatedRefs as any,
      personnel: classification.names as any,
      keyFindings: checklistResults.filter(r => r.satisfied === 'YES').map(r => r.evidence) as any,
      concerns: [
        ...currency.outdatedRefs.map(r => `Outdated reference: ${r}`),
        ...currency.missingRefs.map(r => `Missing: ${r}`),
        ...(currency.isStale ? [`Document is ${currency.documentAge} old`] : []),
      ] as any,
      qualityScore,
      checklistMapping: checklistResults as any,
      analysedAt: new Date(),
    },
  })

  // Update ChecklistStatus based on verified results
  for (const item of checklistResults) {
    if (item.satisfied === 'YES') {
      await prisma.checklistStatus.upsert({
        where: { checklistId: item.checklistId },
        update: { satisfied: true, confidence: 'VERIFIED', evidenceId, satisfiedFrom: item.evidence },
        create: { checklistId: item.checklistId, satisfied: true, confidence: 'VERIFIED', evidenceId, satisfiedFrom: item.evidence },
      })
    } else if (item.satisfied === 'PARTIAL') {
      // Only update if not already VERIFIED by another doc
      const existing = await prisma.checklistStatus.findUnique({ where: { checklistId: item.checklistId } })
      if (!existing || existing.confidence !== 'VERIFIED') {
        await prisma.checklistStatus.upsert({
          where: { checklistId: item.checklistId },
          update: { satisfied: false, confidence: 'PARTIAL', evidenceId, satisfiedFrom: item.evidence },
          create: { checklistId: item.checklistId, satisfied: false, confidence: 'PARTIAL', evidenceId, satisfiedFrom: item.evidence },
        })
      }
    }
  }

  // Update evidence title + status from analysis
  await prisma.evidence.update({
    where: { id: evidenceId },
    data: {
      title: classification.title || evidence.title,
      category: mapTypeToCategory(classification.type) as any,
      status: currency.overallCurrency === 'OUTDATED' ? 'OUTDATED' : 'CURRENT',
    },
  })

  // Re-evaluate rules
  await evaluateAllRules()

  console.log(`[analyseDocumentFull] ✓ Complete: type=${classification.type}, quality=${qualityScore}/100, items=${checklistResults.filter(r => r.satisfied === 'YES').length} verified, currency=${currency.overallCurrency}`)
  return { classification, sections, checklistResults, currency, qualityScore }
}

// ═══════════════════════════════════════════
// HELPER: Determine relevant checklist items per doc type
// ═══════════════════════════════════════════
function getRelevantItems(docType: string) {
  switch (docType) {
    case 'policy_manual':
      return AUDIT_CHECKLIST.filter(i => 
        i.id.startsWith('GOV-') || i.id.startsWith('REG-') || i.id === 'PART-SA'
      )
    case 'insurance_certificate':
      return AUDIT_CHECKLIST.filter(i => i.id.startsWith('INS-'))
    case 'worker_screening_certificate':
      return AUDIT_CHECKLIST.filter(i => i.id === 'STAFF-SCREENING')
    case 'service_agreement':
      return AUDIT_CHECKLIST.filter(i => i.id === 'PART-SA' || i.id === 'PART-STATEMENTS')
    case 'risk_register':
      return AUDIT_CHECKLIST.filter(i => i.id === 'REG-RISK')
    case 'meeting_minutes':
      return AUDIT_CHECKLIST.filter(i => i.id === 'GOV-MINUTES')
    case 'training_certificate':
      return AUDIT_CHECKLIST.filter(i => i.id === 'STAFF-ORIENTATION' || i.id === 'STAFF-FIRSTAID')
    case 'business_plan':
      return AUDIT_CHECKLIST.filter(i => i.id === 'GOV-BIZPLAN')
    case 'organisation_chart':
      return AUDIT_CHECKLIST.filter(i => i.id === 'GOV-ORGCHART')
    case 'position_description':
      return AUDIT_CHECKLIST.filter(i => i.id === 'STAFF-PD')
    case 'code_of_conduct_signed':
      return AUDIT_CHECKLIST.filter(i => i.id === 'STAFF-COC')
    case 'conflict_of_interest_declaration':
      return AUDIT_CHECKLIST.filter(i => i.id === 'STAFF-COI' || i.id === 'GOV-COI')
    case 'police_check':
      return AUDIT_CHECKLIST.filter(i => i.id === 'STAFF-POLICE')
    case 'induction_checklist':
      return AUDIT_CHECKLIST.filter(i => i.id === 'STAFF-INDUCTION')
    case 'resume_cv':
      return AUDIT_CHECKLIST.filter(i => i.id === 'STAFF-RESUME')
    case 'financial_statement':
      return AUDIT_CHECKLIST.filter(i => i.id === 'PART-STATEMENTS')
    default:
      // For unknown types, check all non-perWorker items
      return AUDIT_CHECKLIST.filter(i => !i.perWorker)
  }
}

// ═══════════════════════════════════════════
// HELPER: Calculate quality score
// ═══════════════════════════════════════════
function calculateQualityScore(
  checklistResults: Array<{satisfied: string}>,
  currency: {overallCurrency: string; isStale: boolean},
  sections: Array<{heading: string}>
): number {
  let score = 50 // Base

  // Content completeness (+0-30)
  const yesCount = checklistResults.filter(r => r.satisfied === 'YES').length
  const totalChecked = checklistResults.length
  if (totalChecked > 0) score += Math.round((yesCount / totalChecked) * 30)

  // Currency (+0-20)
  if (currency.overallCurrency === 'CURRENT') score += 20
  else if (currency.overallCurrency === 'NEEDS_UPDATE') score += 10
  // OUTDATED gets +0

  // Structure (+0-10 based on section count)
  if (sections.length >= 5) score += 10
  else if (sections.length >= 3) score += 5

  return Math.min(100, Math.max(0, score))
}

// ═══════════════════════════════════════════
// HELPER: Map doc type to evidence category
// ═══════════════════════════════════════════
function mapTypeToCategory(type: string): string {
  if (['insurance_certificate', 'organisation_chart', 'business_plan'].includes(type)) return 'GOVERNANCE'
  if (['worker_screening_certificate', 'training_certificate', 'police_check', 'position_description', 'resume_cv', 'induction_checklist', 'code_of_conduct_signed', 'conflict_of_interest_declaration'].includes(type)) return 'WORKER'
  if (['service_agreement', 'financial_statement'].includes(type)) return 'PARTICIPANT'
  if (['risk_register'].includes(type)) return 'GOVERNANCE'
  if (['meeting_minutes'].includes(type)) return 'GOVERNANCE'
  return 'POLICY'
}
