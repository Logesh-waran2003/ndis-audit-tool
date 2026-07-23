import { NextRequest } from 'next/server'
import { generateText } from '@/lib/ai'
import { DOCUMENT_REVIEW_SYSTEM_PROMPT } from '@/lib/ai-prompts'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { evidenceId } = await request.json()
    if (!evidenceId) {
      return Response.json({ error: 'evidenceId is required' }, { status: 400 })
    }

    const evidence = await prisma.evidence.findUnique({
      where: { id: evidenceId },
      include: { standardLinks: { include: { standard: true } } },
    })
    if (!evidence) {
      return Response.json({ error: `Evidence ${evidenceId} not found` }, { status: 404 })
    }

    // ponytail: without actual file content extraction, we review based on metadata
    // Upgrade path: read file from disk and use analyseDocument() for PDFs
    const linkedStandards = evidence.standardLinks.map((l) => l.standard.code).join(', ')
    const prompt = `Review this document for compliance issues:

Document: "${evidence.title}"
File: ${evidence.fileName} (${evidence.fileType})
Category: ${evidence.category}
Status: ${evidence.status}
Uploaded: ${evidence.uploadedAt}
${evidence.notes ? `Notes: ${evidence.notes}` : ''}
Linked Standards: ${linkedStandards || 'None'}

Based on the document metadata and your knowledge of NDIS Plan Management requirements:
1. Assess whether this document is likely current and fit for purpose
2. Identify potential issues based on the upload date and category
3. Suggest updates needed

Return ONLY valid JSON matching the schema in your instructions.`

    const result = await generateText(prompt, DOCUMENT_REVIEW_SYSTEM_PROMPT)

    if (result.isMock) {
      const isOutdated = evidence.status === 'OUTDATED'
      return Response.json({
        evidenceId,
        issues: isOutdated
          ? [{ section: 'General', issue: 'Document is marked as outdated', suggestion: 'Review and update to reflect current practices', severity: 'HIGH' }]
          : [],
        overallStatus: isOutdated ? 'OUTDATED' : 'CURRENT',
        isMock: true,
      })
    }

    const parsed = parseReviewResponse(result.text, evidenceId)
    return Response.json({ ...parsed, isMock: false })
  } catch (error) {
    console.error('[AI Document Review]', error)
    return Response.json({ error: 'Document review failed' }, { status: 500 })
  }
}

function parseReviewResponse(text: string, evidenceId: string) {
  try {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleaned)
    return { evidenceId, ...parsed }
  } catch {
    return {
      evidenceId,
      issues: [],
      overallStatus: 'NEEDS_UPDATE',
    }
  }
}
