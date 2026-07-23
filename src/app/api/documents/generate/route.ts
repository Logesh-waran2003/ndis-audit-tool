import { NextRequest, NextResponse } from 'next/server'
import { generateText } from '@/lib/ai'
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'

export const dynamic = 'force-dynamic'

interface DocSection {
  heading: string
  content: string
}

export async function POST(request: NextRequest) {
  try {
    const { checklistId, itemName, context } = await request.json()

    if (!itemName) {
      return NextResponse.json({ error: 'itemName is required' }, { status: 400 })
    }

    const prompt = `Generate a complete "${itemName}" document for an NDIS Plan Management provider called "24 Seven Plan Management".

Context: This provider manages 1100+ participants, has 3 staff, is registered under group 0127 (Plan Management), and is preparing for a verification audit.

${context || ''}

Format the response as JSON with this structure:
{
  "title": "Document Title",
  "sections": [
    { "heading": "Section Name", "content": "Full paragraph text..." },
    { "heading": "Section 2", "content": "..." }
  ]
}

Make it professional, compliant with NDIS Practice Standards, and ready to use with minimal editing. Include specific details relevant to Plan Management (financial administration, invoice processing, monthly statements, etc.). Use Australian English.`

    const result = await generateText(prompt, undefined, { temperature: 0.3, maxOutputTokens: 4096 })

    // Parse AI response
    let docContent: { title: string; sections: DocSection[] } = { title: itemName, sections: [] }
    if (!result.isMock) {
      try {
        const cleaned = result.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        docContent = JSON.parse(cleaned)
      } catch {
        // Fallback: use raw text as single section
        docContent = { title: itemName, sections: [{ heading: 'Content', content: result.text }] }
      }
    } else {
      docContent = {
        title: itemName,
        sections: [
          { heading: 'Purpose', content: `This document provides the ${itemName} for 24 Seven Plan Management as required for NDIS verification audit compliance.` },
          { heading: 'Scope', content: 'This document applies to all operations of 24 Seven Plan Management.' },
          { heading: 'Content', content: '[AI was unavailable — add your content here to satisfy this audit requirement.]' },
          { heading: 'Review', content: 'This document will be reviewed annually or when significant changes occur.' },
        ],
      }
    }

    // Build DOCX
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
              new TextRun({ text: `  |  Generated: ${new Date().toLocaleDateString('en-AU')}`, italics: true, size: 20, color: '666666' }),
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
    const filename = itemName.replace(/[^a-zA-Z0-9 ]/g, '').trim()

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}.docx"`,
      },
    })
  } catch (error) {
    console.error('[POST /api/documents/generate]', error)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}
