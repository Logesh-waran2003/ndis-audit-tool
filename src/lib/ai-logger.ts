import { appendFileSync, mkdirSync } from 'fs'
import { join } from 'path'

const LOG_DIR = join(process.cwd(), 'logs')
const LOG_FILE = join(LOG_DIR, 'ai-calls.jsonl')

// Ensure logs directory exists
try { mkdirSync(LOG_DIR, { recursive: true }) } catch {}

interface AILogEntry {
  timestamp: string
  callId: string
  endpoint: string
  method: string
  prompt: string  // first 500 chars
  promptLength: number
  temperature: number
  maxTokens: number
  responseStatus: number | null
  responseText: string  // first 1000 chars
  responseLength: number
  isMock: boolean
  durationMs: number
  error: string | null
  context: string  // what triggered this call (e.g., "classifyAndLink", "evaluateChecklist")
}

export function logAICall(entry: Partial<AILogEntry>) {
  const logEntry: AILogEntry = {
    timestamp: new Date().toISOString(),
    callId: Math.random().toString(36).substring(2, 10),
    endpoint: entry.endpoint || 'unknown',
    method: entry.method || 'POST',
    prompt: (entry.prompt || '').substring(0, 500),
    promptLength: entry.promptLength || entry.prompt?.length || 0,
    temperature: entry.temperature || 0,
    maxTokens: entry.maxTokens || 0,
    responseStatus: entry.responseStatus || null,
    responseText: (entry.responseText || '').substring(0, 1000),
    responseLength: entry.responseLength || entry.responseText?.length || 0,
    isMock: entry.isMock || false,
    durationMs: entry.durationMs || 0,
    error: entry.error || null,
    context: entry.context || 'unknown',
  }

  try {
    appendFileSync(LOG_FILE, JSON.stringify(logEntry) + '\n')
  } catch (err) {
    console.warn('[ai-logger] Could not write log:', err)
  }

  // Also console log a summary
  const status = logEntry.error ? '❌' : logEntry.isMock ? '⚠️' : '✅'
  console.log(`[AI ${status}] ${logEntry.context} | ${logEntry.durationMs}ms | prompt=${logEntry.promptLength}c | response=${logEntry.responseLength}c${logEntry.error ? ' | ERROR: ' + logEntry.error : ''}`)
}
