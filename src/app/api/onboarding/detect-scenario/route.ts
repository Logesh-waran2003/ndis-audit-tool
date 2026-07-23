import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateText } from '@/lib/ai'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const [evidence, org] = await Promise.all([
      prisma.evidence.findMany({ orderBy: { uploadedAt: 'desc' } }),
      prisma.organisation.findFirst(),
    ])

    if (!org) {
      return NextResponse.json({ error: 'No organisation found' }, { status: 404 })
    }

    const docList = evidence
      .map(e => `- "${e.title}" (${e.category}, ${e.fileName})`)
      .join('\n')

    const prompt = `Based on these uploaded documents for an NDIS Plan Management provider, determine their audit status:

Documents uploaded:
${docList || '(none)'}

Organisation: ${org.participantCount ?? 'unknown'} participants, ${org.staffCount ?? 'unknown'} staff

Determine:
1. SCENARIO:
   - "A" (PRE_FIRST_AUDIT): Has registration but no previous audit evidence (no audit certificate, no audit report, no reverification report)
   - "B" (RENEWAL): Has evidence of a previous audit (audit certificate, audit report, or reverification report with a date)
   - "C" (MID_CYCLE): Has recent audit (within last 18 months) + actively maintained documents

2. Extract if found:
   - lastAuditDate (from audit certificate/report, format YYYY-MM-DD)
   - registrationExpiry (from registration certificate, format YYYY-MM-DD)
   - previousParticipantCount (if mentioned in any doc)

3. List 3-5 priority actions based on the scenario and what's missing.

Return ONLY JSON:
{"scenario": "A", "lastAuditDate": null, "registrationExpiry": "2027-09-11", "previousParticipantCount": null, "reasoning": "No audit certificate or report found among uploads", "priorities": ["Upload worker screening certificates", "Upload insurance certificates", "Ensure incident register is maintained"]}`

    const result = await generateText(prompt, undefined, { temperature: 0.2, maxOutputTokens: 1024 })

    if (result.isMock) {
      // ponytail: sensible fallback when AI unavailable
      return NextResponse.json({
        scenario: 'A',
        lastAuditDate: null,
        registrationExpiry: org.registrationExpiry?.toISOString().slice(0, 10) ?? null,
        previousParticipantCount: null,
        reasoning: 'AI unavailable — defaulting to pre-first audit scenario',
        priorities: [
          'Upload worker screening certificates',
          'Upload insurance certificates',
          'Ensure incident register is maintained',
        ],
        isMock: true,
      })
    }

    // Parse AI response
    try {
      let cleaned = result.text.trim()
      if (cleaned.startsWith('```')) cleaned = cleaned.substring(cleaned.indexOf('\n') + 1)
      if (cleaned.endsWith('```')) cleaned = cleaned.substring(0, cleaned.lastIndexOf('```'))
      const parsed = JSON.parse(cleaned.trim())
      return NextResponse.json(parsed)
    } catch {
      return NextResponse.json({
        scenario: 'A',
        lastAuditDate: null,
        registrationExpiry: org.registrationExpiry?.toISOString().slice(0, 10) ?? null,
        reasoning: 'Could not parse AI response — defaulting to pre-first audit',
        priorities: ['Upload worker screening certificates', 'Upload insurance certificates'],
      })
    }
  } catch (error) {
    console.error('[POST /api/onboarding/detect-scenario]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
