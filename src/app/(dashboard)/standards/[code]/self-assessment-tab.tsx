'use client'

import { useState } from 'react'

type Props = {
  standardCode: string
  selfAssessment: { responseText: string; status: string; generatedAt: string } | null
}

export function SelfAssessmentTab({ standardCode, selfAssessment }: Props) {
  const [response, setResponse] = useState(selfAssessment?.responseText ?? '')
  const [status, setStatus] = useState(selfAssessment?.status ?? '')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const wordCount = response ? response.split(/\s+/).length : 0

  async function generate() {
    setLoading(true)
    try {
      const res = await fetch('/api/ai/self-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ standardCode }),
      })
      if (res.ok) {
        const data = await res.json()
        setResponse(data.response)
        setStatus('DRAFT')
      }
    } finally {
      setLoading(false)
    }
  }

  async function copyToClipboard() {
    await navigator.clipboard.writeText(response)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!response) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-slate-500 mb-4">No self-assessment response yet.</p>
        <button
          onClick={generate}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md bg-navy text-white hover:bg-navy/90 disabled:opacity-50"
        >
          {loading ? 'Generating…' : 'Generate Self-Assessment Response'}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span>{wordCount} words</span>
          {status && <span className="px-2 py-0.5 rounded bg-slate-100 font-medium">{status}</span>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={copyToClipboard}
            className="text-xs px-3 py-1.5 rounded border border-slate-200 hover:bg-slate-50"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            onClick={generate}
            disabled={loading}
            className="text-xs px-3 py-1.5 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
          >
            {loading ? 'Regenerating…' : 'Regenerate'}
          </button>
        </div>
      </div>
      <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap leading-relaxed">
        {response}
      </div>
    </div>
  )
}
