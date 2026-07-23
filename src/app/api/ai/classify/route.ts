import { NextRequest } from 'next/server'
import { generateText, analyseDocument } from '@/lib/ai'
import { CLASSIFY_SYSTEM_PROMPT } from '@/lib/ai-prompts'
import { standardsData } from '@/lib/standards-data'

const STANDARDS_LIST = standardsData
  .map((s) => `${s.code} — ${s.name}: ${s.description}`)
  .join('\n')

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || ''

    let result: { text: string; isMock: boolean }

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const file = formData.get('file') as File | null
      if (!file) {
        return Response.json({ error: 'No file provided' }, { status: 400 })
      }
      const buffer = Buffer.from(await file.arrayBuffer())
      const prompt = `Here are the NDIS Practice Standards (verification module):\n\n${STANDARDS_LIST}\n\nAnalyse the uploaded document and identify which standards it provides evidence for. Return ONLY valid JSON array.`
      result = await analyseDocument(buffer, file.name, file.type, prompt, CLASSIFY_SYSTEM_PROMPT)
    } else {
      const body = await request.json()
      const { text, fileName } = body
      if (!text && !fileName) {
        return Response.json({ error: 'Provide either "text" content or upload a file' }, { status: 400 })
      }
      const prompt = `Here are the NDIS Practice Standards (verification module):\n\n${STANDARDS_LIST}\n\nDocument title: ${fileName || 'Unknown'}\nDocument content:\n${text}\n\nIdentify which standards this document provides evidence for. Return ONLY valid JSON array.`
      result = await generateText(prompt, CLASSIFY_SYSTEM_PROMPT)
    }

    if (result.isMock) {
      // ponytail: mock response when AI unavailable — returns plausible shape
      return Response.json({
        suggestions: [
          { code: 'VM-1.1', name: 'Governance and Operational Management', confidence: 0.5, reason: '[AI Unavailable - Mock Response]' },
        ],
        isMock: true,
      })
    }

    // Parse AI response — expect JSON array
    const suggestions = parseClassifyResponse(result.text)
    return Response.json({ suggestions, isMock: false })
  } catch (error) {
    console.error('[AI Classify]', error)
    return Response.json({ error: 'Classification failed' }, { status: 500 })
  }
}

function parseClassifyResponse(text: string) {
  try {
    // Strip markdown code fences — handle all variations
    let cleaned = text.trim()
    // Remove opening fence (```json or ```)
    if (cleaned.startsWith('```')) {
      const firstNewline = cleaned.indexOf('\n')
      if (firstNewline !== -1) {
        cleaned = cleaned.substring(firstNewline + 1)
      }
    }
    // Remove closing fence
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.substring(0, cleaned.lastIndexOf('```'))
    }
    cleaned = cleaned.trim()
    
    const parsed = JSON.parse(cleaned)
    if (Array.isArray(parsed)) {
      return parsed
        .filter(
          (item: { confidence?: number }) => typeof item.confidence === 'number' && item.confidence >= 0.3
        )
        .map((item: { code?: string; name?: string; confidence?: number; reason?: string }) => ({
          ...item,
          // Normalise code: prepend VM- if missing
          code: item.code?.startsWith('VM-') ? item.code : `VM-${item.code}`,
        }))
    }
    return []
  } catch (e) {
    console.warn('[AI Classify] Could not parse response as JSON:', text?.substring(0, 200))
    return []
  }
}
