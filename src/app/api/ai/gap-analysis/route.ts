import { NextRequest } from 'next/server'
import { generateText } from '@/lib/ai'
import { GAP_ANALYSIS_SYSTEM_PROMPT } from '@/lib/ai-prompts'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { standardCode } = await request.json()
    if (!standardCode) {
      return Response.json({ error: 'standardCode is required' }, { status: 400 })
    }

    const standard = await prisma.standard.findUnique({
      where: { code: standardCode },
      include: { evidenceLinks: { include: { evidence: true } } },
    })
    if (!standard) {
      return Response.json({ error: `Standard ${standardCode} not found` }, { status: 404 })
    }

    const qualityIndicators = standard.qualityIndicators as Array<{
      id: string; description: string; evidenced: boolean; linkedEvidenceIds: string[]
    }>
    const planManagementSpecific = standard.planManagementSpecific as string[]
    const commonGaps = standard.commonGaps as string[]
    const linkedEvidence = standard.evidenceLinks.map((l) => l.evidence)

    const prompt = `Standard: ${standard.code} — ${standard.name}
Description: ${standard.description}

Quality Indicators:
${qualityIndicators.map((qi) => `- ${qi.description} (evidenced: ${qi.evidenced})`).join('\n')}

Evidence Guidance (what's expected):
${standard.evidenceGuidance}

Plan Management Specific Requirements:
${planManagementSpecific.length > 0 ? planManagementSpecific.map((p) => `- ${p}`).join('\n') : '- General provider context'}

Currently Linked Evidence (${linkedEvidence.length} documents):
${linkedEvidence.length > 0 ? linkedEvidence.map((e) => `- ${e.title} (${e.status}, uploaded ${e.uploadedAt})`).join('\n') : '- No evidence linked yet'}

Known Common Gaps:
${commonGaps.length > 0 ? commonGaps.map((g) => `- ${g}`).join('\n') : '- None documented'}

Analyse the gaps. Return ONLY valid JSON matching the schema in your instructions.`

    const result = await generateText(prompt, GAP_ANALYSIS_SYSTEM_PROMPT)

    if (result.isMock) {
      const unevidenced = qualityIndicators.filter((qi) => !qi.evidenced)
      return Response.json({
        standardCode,
        status: unevidenced.length === qualityIndicators.length ? 'GAP' : unevidenced.length > 0 ? 'PARTIAL' : 'MET',
        gaps: unevidenced.map((qi) => ({
          indicator: qi.description,
          issue: 'No evidence linked to this quality indicator',
          suggestion: `Upload or link evidence demonstrating: ${qi.description}`,
        })),
        overallAssessment: `[AI Unavailable - Mock Response] Standard ${standardCode} has ${unevidenced.length} quality indicators without evidence.`,
        isMock: true,
      })
    }

    const parsed = parseGapResponse(result.text, standardCode)
    return Response.json({ ...parsed, isMock: false })
  } catch (error) {
    console.error('[AI Gap Analysis]', error)
    return Response.json({ error: 'Gap analysis failed' }, { status: 500 })
  }
}

function parseGapResponse(text: string, standardCode: string) {
  try {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleaned)
    return { standardCode, ...parsed }
  } catch {
    return {
      standardCode,
      status: 'PARTIAL',
      gaps: [],
      overallAssessment: text.substring(0, 500),
    }
  }
}
