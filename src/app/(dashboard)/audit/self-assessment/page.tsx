'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronRight, Copy, RefreshCw } from 'lucide-react'

interface Standard {
  id: string
  code: string
  name: string
  status: string
  selfAssessment: { responseText: string; generatedAt: string } | null
}

export default function SelfAssessmentPage() {
  const [standards, setStandards] = useState<Standard[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [generatingFor, setGeneratingFor] = useState<string | null>(null)
  const [generatingAll, setGeneratingAll] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const fetchStandards = useCallback(async () => {
    try {
      const res = await fetch('/api/standards')
      if (res.ok) {
        const data = await res.json()
        // Fetch self-assessment data for each standard
        const withAssessments = await Promise.all(
          data.map(async (s: Standard) => {
            try {
              const detailRes = await fetch(`/api/standards/${s.code}`)
              if (detailRes.ok) {
                const detail = await detailRes.json()
                return { ...s, selfAssessment: detail.selfAssessment }
              }
            } catch { /* ignore */ }
            return { ...s, selfAssessment: null }
          })
        )
        setStandards(withAssessments)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchStandards() }, [fetchStandards])

  async function generateForStandard(code: string) {
    setGeneratingFor(code)
    try {
      const res = await fetch('/api/ai/self-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ standardCode: code }),
      })
      if (res.ok) {
        const data = await res.json()
        setStandards(prev =>
          prev.map(s =>
            s.code === code
              ? { ...s, selfAssessment: { responseText: data.response, generatedAt: new Date().toISOString() } }
              : s
          )
        )
      }
    } finally {
      setGeneratingFor(null)
    }
  }

  async function generateAll() {
    setGeneratingAll(true)
    for (const s of standards) {
      if (!s.selfAssessment) {
        await generateForStandard(s.code)
      }
    }
    setGeneratingAll(false)
  }

  function copyToClipboard(code: string, text: string) {
    navigator.clipboard.writeText(text)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  const generated = standards.filter(s => s.selfAssessment).length
  const total = standards.length

  if (loading) {
    return <div className="py-12 text-center"><p className="text-sm text-slate-400">Loading...</p></div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[#1a2332]">Self-Assessment Responses</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {generated} of {total} standards have responses
          </p>
        </div>
        {generated < total && (
          <Button
            className="bg-[#1a2332] text-white hover:bg-[#2a3a4f]"
            disabled={generatingAll}
            onClick={generateAll}
          >
            {generatingAll ? 'Generating...' : `Generate All (${total - generated} remaining)`}
          </Button>
        )}
      </div>

      {/* Standards list */}
      <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
        {standards.map(s => {
          const wordCount = s.selfAssessment?.responseText.split(/\s+/).length || 0
          const hasAssessment = !!s.selfAssessment
          return (
            <div key={s.id}>
              <div
                onClick={() => setExpanded(expanded === s.code ? null : s.code)}
                className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors"
              >
                <span className="text-slate-400">
                  {expanded === s.code ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </span>
                <span className="font-mono text-xs text-slate-400 w-14 shrink-0">{s.code}</span>
                <span className="flex-1 text-sm text-slate-900 font-medium">{s.name}</span>
                <span className="text-xs text-slate-500 shrink-0">
                  {hasAssessment ? `${wordCount} words` : '—'}
                </span>
                <span className={`text-xs font-medium shrink-0 ${hasAssessment ? 'text-[#059669]' : 'text-slate-400'}`}>
                  {hasAssessment ? 'Generated' : 'Empty'}
                </span>
              </div>

              {expanded === s.code && (
                <div className="border-t border-slate-100 bg-slate-50 px-8 py-4">
                  {hasAssessment ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-slate-500">{wordCount} words</p>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(s.code, s.selfAssessment!.responseText)}
                            className="text-slate-600"
                          >
                            <Copy className="mr-1 h-3.5 w-3.5" />
                            {copied === s.code ? 'Copied' : 'Copy'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => generateForStandard(s.code)}
                            disabled={generatingFor === s.code}
                            className="text-slate-600"
                          >
                            <RefreshCw className={`mr-1 h-3.5 w-3.5 ${generatingFor === s.code ? 'animate-spin' : ''}`} />
                            Regenerate
                          </Button>
                        </div>
                      </div>
                      <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {s.selfAssessment!.responseText}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-slate-500">No response generated yet.</p>
                      <Button
                        className="mt-3 bg-[#1a2332] text-white hover:bg-[#2a3a4f]"
                        size="sm"
                        onClick={() => generateForStandard(s.code)}
                        disabled={generatingFor === s.code}
                      >
                        {generatingFor === s.code ? 'Generating...' : 'Generate'}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
