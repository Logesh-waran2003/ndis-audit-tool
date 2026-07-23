import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateText } from '@/lib/ai'
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'
import { readFileSync } from 'fs'
import { join } from 'path'

export async function POST(request: NextRequest) {
  try {
    const { evidenceId, issues } = await request.json()

    if (!evidenceId) {
      return NextResponse.json({ error: 'evidenceId required' }, { status: 400 })
    }

    const evidence = await prisma.evidence.findUnique({ where: { id: evidenceId } })
    if (!evidence) {
      return NextResponse.json({ error: 'Evidence not found' }, { status: 404 })
    }

    const analysis = await prisma.documentAnalysis.findUnique({ where: { evidenceId } })

    // Try to get text content for context
    let existingContent = ''
    try {
      if (evidence.fileName?.endsWith('.docx')) {
        const mammoth = await import('mammoth')
        const buffer = readFileSync(join(process.cwd(), 'public', evidence.fileUrl || ''))
        const result = await mammoth.extractRawText({ buffer })
        existingContent = result.value?.substring(0, 5000) || ''
      }
    } catch { /* ignore - will work without existing content */ }

    const prompt = `You need to generate a CORRECTED version of an NDIS compliance document.

ORIGINAL DOCUMENT: "${evidence.title}"
TYPE: ${analysis?.documentType || evidence.category}

${existingContent ? `ORIGINAL CONTENT (first 5000 chars):\n${existingContent}\n` : ''}

ISSUES TO FIX:
${issues || ((analysis?.concerns as string[]) || []).join('\n')}

ADDITIONAL CONTEXT:
- Provider: 24 Seven Plan Management (1100+ participants, 3 staff)
- Registration group: 0127 (Plan Management)
- Current legislation: NDIS Act 2013 (compilation May 2026), Privacy Act 1988, NDIS Practice Standards Rules 2018 (compilation July 2026)
- Has offshore invoice processing contractor (needs data sovereignty clause)

Generate the CORRECTED document. Fix all identified issues. Return JSON:
{
  "title": "Corrected document title",
  "sections": [
    { "heading": "Section", "paragraphs": ["text..."] }
  ],
  "changesApplied": ["list of what was fixed/added"]
}

Make the document comprehensive, current, and audit-ready.`

    const result = await generateText(prompt, undefined, { temperature: 0.3, maxOutputTokens: 4096 })

    if (result.isMock) {
      return NextResponse.json({ error: 'AI unavailable' }, { status: 503 })
    }

    let docContent: any
    try {
      let cleaned = result.text.trim()
      if (cleaned.startsWith('```')) cleaned = cleaned.substring(cleaned.indexOf('\n') + 1)
      if (cleaned.endsWith('```')) cleaned = cleaned.substring(0, cleaned.lastIndexOf('```'))
      docContent = JSON.parse(cleaned.trim())
    } catch {
      return NextResponse.json({ error: 'Failed to generate corrected document' }, { status: 500 })
    }

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            children: [new TextRun({ text: docContent.title || evidence.title, bold: true, size: 48, font: 'Calibri' })],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [new TextRun({ text: '24 Seven Plan Management — CORRECTED VERSION', italics: true, size: 22, color: '059669' })],
            spacing: { after: 50 },
          }),
          new Paragraph({
            children: [new TextRun({ text: `Generated: ${new Date().toLocaleDateString('en-AU')} | Changes: ${(docContent.changesApplied || []).length} corrections applied`, size: 18, color: '666666' })],
            spacing: { after: 400 },
          }),
          ...(docContent.sections || []).flatMap((section: any) => [
            new Paragraph({
              children: [new TextRun({ text: section.heading, bold: true, size: 28, font: 'Calibri' })],
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 300, after: 120 },
            }),
            ...(section.paragraphs || []).map((para: string) =>
              new Paragraph({
                children: [new TextRun({ text: para, size: 22, font: 'Calibri' })],
                spacing: { after: 120 },
              })
            ),
          ]),
        ],
      }],
    })

    const buffer = await Packer.toBuffer(doc)
    const filename = `CORRECTED_${evidence.title?.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_')}.docx`

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Changes-Applied': JSON.stringify(docContent.changesApplied || []),
      },
    })
  } catch (error) {
    console.error('[documents/fix]', error)
    return NextResponse.json({ error: 'Document fix failed' }, { status: 500 })
  }
}
