import { NextRequest, NextResponse } from 'next/server'
import { generateText } from '@/lib/ai'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Support both: checklist-based (checklistId, itemName) and rule-based (ruleCode, displayName)
    const { checklistId, itemName, itemDescription, ruleCode, displayName, evidenceRequired, remediation } = body

    if (!checklistId && !ruleCode) {
      return NextResponse.json({ error: 'checklistId or ruleCode is required' }, { status: 400 })
    }

    let docName: string
    let prompt: string

    if (checklistId) {
      // Checklist-based generation
      docName = itemName || checklistId
      prompt = `You are an NDIS compliance document specialist. Generate a complete, professional template document for an NDIS Plan Management provider.

Document needed: "${itemName}"
Description: ${itemDescription || 'Required for NDIS verification audit'}

Generate a ready-to-use Markdown document that:
1. Has a proper title, version number (1.0), and date placeholder
2. Includes all sections an NDIS auditor would expect for this document type
3. Contains placeholder text that the provider can customise (marked with [ORGANISATION NAME], [DATE], [ROLE], etc.)
4. Is comprehensive enough to satisfy an auditor at a verification module audit
5. Follows Australian English spelling and NDIS terminology
6. Includes a document control section (version, review date, approved by)

Output ONLY the markdown document content. No preamble or explanation.`
    } else {
      // Rule-based generation (legacy)
      docName = evidenceRequired || displayName || ruleCode
      prompt = `You are an NDIS compliance document specialist. Generate a complete, professional template document for an NDIS provider that satisfies this compliance requirement:

Rule: ${ruleCode} — ${displayName}
Required evidence: ${evidenceRequired}
Remediation guidance: ${remediation}

Generate a ready-to-use Markdown document that:
1. Has a proper title, version number (1.0), and date placeholder
2. Includes all sections required by the NDIS Practice Standards
3. Contains placeholder text that the provider can customise (marked with [ORGANISATION NAME], [DATE], etc.)
4. Is comprehensive enough to satisfy an auditor
5. Follows Australian English spelling and NDIS terminology

Output ONLY the markdown document content. No preamble or explanation.`
    }

    const result = await generateText(prompt, undefined, { temperature: 0.3, maxOutputTokens: 4096 })

    if (result.isMock) {
      const fallback = `# ${docName}\n\n**Version:** 1.0\n**Date:** [DATE]\n**Organisation:** [ORGANISATION NAME]\n\n## Purpose\n\nThis document is required for the NDIS verification audit.\n\n## ${itemDescription || remediation || 'Requirements'}\n\n[Add your content here]\n\n---\n*Generated template — review and customise before use.*\n`
      return new NextResponse(fallback, {
        headers: {
          'Content-Type': 'text/markdown',
          'Content-Disposition': `attachment; filename="${docName}.md"`,
        },
      })
    }

    return new NextResponse(result.text, {
      headers: {
        'Content-Type': 'text/markdown',
        'Content-Disposition': `attachment; filename="${docName}.md"`,
      },
    })
  } catch (error) {
    console.error('[POST /api/ai/generate-document]', error)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}
