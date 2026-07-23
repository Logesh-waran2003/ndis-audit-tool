import { generateText } from '@/lib/ai'
import { ADVISORY_SYSTEM_PROMPT } from '@/lib/ai-prompts'
import { prisma } from '@/lib/db'

export async function POST() {
  try {
    const standards = await prisma.standard.findMany({
      orderBy: { order: 'asc' },
      include: { evidenceLinks: { include: { evidence: true } } },
    })

    const allEvidence = await prisma.evidence.findMany()

    // Compute status for each standard
    const now = new Date()
    const standardsWithStatus = standards.map((s) => {
      const currentEvidence = s.evidenceLinks.filter(
        (l) => l.evidence.status === 'CURRENT' && (!l.evidence.expiryDate || l.evidence.expiryDate > now)
      )
      const status = currentEvidence.length >= 2 ? 'MET' : currentEvidence.length === 1 ? 'PARTIAL' : 'GAP'
      const qualityIndicators = s.qualityIndicators as Array<{ description: string; evidenced: boolean }>
      return { ...s, status, qualityIndicators }
    })

    const statusSummary = standardsWithStatus
      .map((s) => `${s.code} ${s.name}: ${s.status}`)
      .join('\n')

    const gaps = standardsWithStatus
      .filter((s) => s.status !== 'MET')
      .flatMap((s) =>
        s.qualityIndicators
          .filter((qi) => !qi.evidenced)
          .map((qi) => `[${s.code}] ${qi.description}`)
      )

    const outdatedDocs = allEvidence
      .filter((e) => e.status === 'OUTDATED')
      .map((e) => `"${e.title}"`)

    const metCount = standardsWithStatus.filter((s) => s.status === 'MET').length
    const gapCount = standardsWithStatus.filter((s) => s.status === 'GAP').length

    const prompt = `Current compliance state:

Standards Status:
${statusSummary}

Open Gaps (quality indicators without evidence):
${gaps.length > 0 ? gaps.join('\n') : 'None'}

Alerts - Outdated Documents:
${outdatedDocs.length > 0 ? outdatedDocs.join('\n') : 'None'}

Total evidence documents: ${allEvidence.length}
Standards fully met: ${metCount}/${standards.length}
Standards with gaps: ${gapCount}/${standards.length}

Provide strategic advisory. Return ONLY valid JSON matching the schema in your instructions.`

    const result = await generateText(prompt, ADVISORY_SYSTEM_PROMPT, { temperature: 0.5 })

    if (result.isMock) {
      return Response.json({
        priorities: [
          { action: 'Update outdated policy documents', why: `${outdatedDocs.length} documents are marked outdated — auditors will flag these`, effort: 'MEDIUM' },
          { action: 'Link evidence to gap standards', why: `${gapCount} standards have no evidence`, effort: 'HIGH' },
          { action: 'Complete quality indicator mapping', why: 'Demonstrates systematic compliance approach', effort: 'LOW' },
        ],
        observations: [
          `${outdatedDocs.length} of ${allEvidence.length} evidence documents are outdated`,
          `Only ${metCount} of ${standards.length} standards are fully met`,
        ],
        strengths: [
          'Evidence collection has begun across multiple categories',
        ],
        isMock: true,
      })
    }

    const parsed = parseAdvisoryResponse(result.text)
    return Response.json({ ...parsed, isMock: false })
  } catch (error) {
    console.error('[AI Advisory]', error)
    return Response.json({ error: 'Advisory generation failed' }, { status: 500 })
  }
}

function parseAdvisoryResponse(text: string) {
  try {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(cleaned)
  } catch {
    return {
      priorities: [],
      observations: [text.substring(0, 300)],
      strengths: [],
    }
  }
}
