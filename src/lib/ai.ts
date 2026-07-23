/**
 * AI Client — calls Vertex AI Gemini via the 24seven Flask backend proxy.
 * The proxy handles WIF authentication to GCP.
 */

import { logAICall } from './ai-logger'

// ponytail: single proxy URL — the 24seven backend already has Vertex AI auth via WIF
const GENAI_PROXY_URL = process.env.GENAI_PROXY_URL || 'https://d2yns7aqpsk9tu.cloudfront.net/24seven-api/api/genai'

export async function generateText(
  prompt: string,
  systemInstruction?: string,
  opts?: { temperature?: number; maxOutputTokens?: number; context?: string }
): Promise<{ text: string; isMock: boolean }> {
  const startTime = Date.now()
  try {
    const res = await fetch(`${GENAI_PROXY_URL}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        system_instruction: systemInstruction,
        temperature: opts?.temperature ?? 0.3,
        max_output_tokens: opts?.maxOutputTokens ?? 2048,
        model: 'gemini-2.5-flash',
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      console.warn('[AI] Proxy error:', res.status, err.substring(0, 200))
      logAICall({
        endpoint: `${GENAI_PROXY_URL}/generate`,
        prompt, promptLength: prompt.length,
        temperature: opts?.temperature ?? 0.3,
        maxTokens: opts?.maxOutputTokens ?? 2048,
        responseStatus: res.status,
        responseText: err,
        isMock: true,
        durationMs: Date.now() - startTime,
        error: `Proxy error ${res.status}`,
        context: opts?.context || 'generateText',
      })
      return { text: `[AI Proxy Error ${res.status}]\n\nFallback: ${prompt.substring(0, 100)}...`, isMock: true }
    }
    const data = await res.json()
    logAICall({
      endpoint: `${GENAI_PROXY_URL}/generate`,
      prompt, promptLength: prompt.length,
      temperature: opts?.temperature ?? 0.3,
      maxTokens: opts?.maxOutputTokens ?? 2048,
      responseStatus: res.status,
      responseText: data.text || '',
      responseLength: data.text?.length || 0,
      isMock: false,
      durationMs: Date.now() - startTime,
      context: opts?.context || 'generateText',
    })
    return { text: data.text || '', isMock: false }
  } catch (error) {
    logAICall({
      endpoint: `${GENAI_PROXY_URL}/generate`,
      prompt, promptLength: prompt.length,
      temperature: opts?.temperature ?? 0.3,
      maxTokens: opts?.maxOutputTokens ?? 2048,
      responseStatus: null,
      isMock: true,
      durationMs: Date.now() - startTime,
      error: String(error),
      context: opts?.context || 'generateText',
    })
    console.warn('[AI] Proxy unreachable:', error)
    return { text: `[AI Unavailable - Proxy unreachable]\n\nEnsure the 24seven backend is running on EC2.`, isMock: true }
  }
}

export async function analyseDocument(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  prompt?: string,
  systemInstruction?: string,
): Promise<{ text: string; isMock: boolean }> {
  try {
    // ponytail: use /generate endpoint with base64-encoded file content in prompt
    // Node.js FormData+Blob is unreliable for server-side file uploads to external APIs
    const base64 = fileBuffer.toString('base64')
    const fileContext = `[Document: ${fileName}, type: ${mimeType}, size: ${fileBuffer.length} bytes, base64-encoded content provided below]\n\nBase64 content (first 50000 chars): ${base64.substring(0, 50000)}`
    
    const fullPrompt = systemInstruction 
      ? `${systemInstruction}\n\n${fileContext}\n\n${prompt || 'Analyse this document.'}` 
      : `${fileContext}\n\n${prompt || 'Analyse this document.'}`

    // Use the text generation endpoint instead of multipart
    const res = await fetch(`${GENAI_PROXY_URL}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: fullPrompt,
        temperature: 0.2,
        max_output_tokens: 2048,
        model: 'gemini-2.5-flash',
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      console.warn('[AI] Document analysis proxy error:', res.status, err.substring(0, 200))
      return { text: `[AI Error] Could not analyse ${fileName}`, isMock: true }
    }
    const data = await res.json()
    return { text: data.text || '', isMock: false }
  } catch (error) {
    console.warn('[AI] Document analysis proxy unreachable:', error)
    return { text: `[AI Unavailable] Cannot analyse ${fileName}`, isMock: true }
  }
}
