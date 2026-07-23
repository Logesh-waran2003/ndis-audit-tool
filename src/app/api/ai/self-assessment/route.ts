import { NextRequest } from 'next/server'
import { generateText } from '@/lib/ai'
import { SELF_ASSESSMENT_SYSTEM_PROMPT } from '@/lib/ai-prompts'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { standardCode } = await request.json()
    if (!standardCode) {
      return Response.json({ error: 'standardCode is required' }, { status: 400 })
    }

    const standard = await prisma.standard.findUnique({
      where: { code: standardCode },
      include: {
        evidenceLinks: { include: { evidence: true } },
      },
    })
    if (!standard) {
      return Response.json({ error: `Standard ${standardCode} not found` }, { status: 404 })
    }

    const qualityIndicators = standard.qualityIndicators as Array<{ description: string }>
    const planManagementSpecific = standard.planManagementSpecific as string[]
    const linkedEvidence = standard.evidenceLinks.map((l) => l.evidence)

    const prompt = `Write a self-assessment response (~300 words) for this standard:

Standard: ${standard.code} — ${standard.name}
Description: ${standard.description}

Quality Indicators to address:
${qualityIndicators.map((qi) => `- ${qi.description}`).join('\n')}

Plan Management Specific Context:
${planManagementSpecific.length > 0 ? planManagementSpecific.map((p) => `- ${p}`).join('\n') : '- General provider context'}

Available Evidence to reference:
${linkedEvidence.length > 0 ? linkedEvidence.map((e) => `- "${e.title}" (${e.category}, ${e.status}${e.notes ? `, note: ${e.notes}` : ''})`).join('\n') : '- No evidence currently linked'}

Gold Standard (what excellence looks like):
${standard.goldStandard || 'Not specified'}

Write the response as the provider. Reference specific evidence by name. Be factual and professional.`

    const result = await generateText(prompt, SELF_ASSESSMENT_SYSTEM_PROMPT, {
      temperature: 0.3,
      maxOutputTokens: 4096,
    })

    const responseText = result.isMock
      ? `[AI Unavailable - Mock Response]\n\nOur organisation demonstrates compliance with ${standard.code} (${standard.name}) through documented policies and procedures. Evidence includes: ${linkedEvidence.map((e) => e.title).join(', ') || 'pending upload'}. We maintain active oversight through regular reviews and continuous improvement processes.`
      : result.text

    const wordCount = responseText.split(/\s+/).length
    const evidenceCited = linkedEvidence.map((e) => e.title)

    // Persist to DB
    await prisma.selfAssessment.upsert({
      where: { standardId: standard.id },
      update: { responseText, generatedAt: new Date() },
      create: { standardId: standard.id, responseText, generatedAt: new Date() },
    })

    return Response.json({
      standardCode,
      response: responseText,
      wordCount,
      evidenceCited,
      isMock: result.isMock,
    })
  } catch (error) {
    console.error('[AI Self Assessment]', error)
    return Response.json({ error: 'Self-assessment generation failed' }, { status: 500 })
  }
}
