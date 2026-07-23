import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateText } from '@/lib/ai'
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'

export const dynamic = 'force-dynamic'

interface DocSection {
  heading: string
  content: string
}

export async function POST(request: NextRequest) {
  try {
    const { evidenceId, ruleCode, issue } = await request.json()

    if (!ruleCode && !issue) {
      return NextResponse.json({ error: 'ruleCode or issue is required' }, { status: 400 })
    }

    // Get rule details
    let ruleInfo = ''
    if (ruleCode) {
      const rule = await prisma.rule.findUnique({ where: { code: ruleCode } })
      if (rule) {
        ruleInfo = `Rule: ${rule.code} — ${rule.displayName}\nIssue: ${rule.remediation}\nRequired evidence: ${rule.evidenceRequired}`
      }
    }

    // Get existing evidence info if provided
    let evidenceInfo = ''
    if (evidenceId) {
      const evidence = await prisma.evidence.findUnique({ where: { id: evidenceId } })
      if (evidence) {
        evidenceInfo = `\nExisting document: "${evidence.title}" (${evidence.category})`
      }
    }

    const prompt = `An NDIS Plan Management provider called "24 Seven Plan Management" has a compliance issue that needs to be fixed by generating a corrected document.

${ruleInfo}
${evidenceInfo}
${issue ? `\nSpecific issue: ${issue}` : ''}

Generate a corrected/updated version of this document that addresses the identified issue. The document should:
1. Fix the specific compliance gap identified
2. Be professional and ready to use
3. Follow NDIS Practice Standards requirements
4. Use Australian English

Format the response as JSON:
{
  "title": "Document Title (Corrected)",
  "sections": [
    { "heading": "Section Name", "content": "Full paragraph text..." }
  ]
}

Include all necessary sections to satisfy the auditor. Be specific to Plan Management (financial administration, invoice processing, monthly statements).`

    const result = await generateText(prompt, undefined, { temperature: 0.3, maxOutputTokens: 4096 })

    let docContent: { title: string; sections: DocSection[] } = { title: `${ruleCode || 'Corrected Document'}`, sections: [] }
    if (!result.isMock) {
      try {
        const cleaned = result.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        docContent = JSON.parse(cleaned)
      } catch {
        docContent = { title: ruleCode || 'Corrected Document', sections: [{ heading: 'Content', content: result.text }] }
      }
    } else {
      docContent = {
        title: `${ruleCode || 'Document'} — Corrected Version`,
        sections: [
          { heading: 'Issue Addressed', content: issue || ruleInfo || 'Compliance gap identified during audit preparation.' },
          { heading: 'Corrected Content', content: '[AI was unavailable — add corrected content here.]' },
        ],
      }
    }

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: docContent.title,
            heading: HeadingLevel.TITLE,
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: '24 Seven Plan Management', italics: true, size: 20, color: '666666' }),
              new TextRun({ text: `  |  Corrected: ${new Date().toLocaleDateString('en-AU')}`, italics: true, size: 20, color: '666666' }),
            ],
            spacing: { after: 400 },
          }),
          ...docContent.sections.flatMap((section: DocSection) => [
            new Paragraph({
              text: section.heading,
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 300, after: 100 },
            }),
            ...section.content.split('\n').filter(Boolean).map(para =>
              new Paragraph({
                text: para,
                spacing: { after: 120 },
              })
            ),
          ]),
        ],
      }],
    })

    const buffer = await Packer.toBuffer(doc)
    const filename = docContent.title.replace(/[^a-zA-Z0-9 ]/g, '').trim()

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}.docx"`,
      },
    })
  } catch (error) {
    console.error('[POST /api/documents/fix]', error)
    return NextResponse.json({ error: 'Fix generation failed' }, { status: 500 })
  }
}
