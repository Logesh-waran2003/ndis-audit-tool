'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Copy, RefreshCw } from 'lucide-react'
import Link from 'next/link'

interface QualityIndicator {
  id: string
  description: string
  evidenced: boolean
  linkedEvidenceIds: string[]
  evidence: Array<{ id: string; title: string; status: string }>
}

interface EvidenceItem {
  id: string
  title: string
  category: string
  status: string
  uploadedAt: string
  fileName: string
}

interface SelfAssessment {
  id: string
  responseText: string
  generatedAt: string
}

interface StandardDetail {
  id: string
  code: string
  name: string
  description: string
  division: string
  status: 'MET' | 'PARTIAL' | 'GAP'
  goldStandard: string | null
  auditorLooksFor: string | null
  planManagementSpecific: string[]
  qualityIndicators: QualityIndicator[]
  evidence: EvidenceItem[]
  selfAssessment: SelfAssessment | null
}

const STATUS_COLOR: Record<string, string> = {
  MET: 'text-[#059669]',
  PARTIAL: 'text-[#d97706]',
  GAP: 'text-[#dc2626]',
}
const STATUS_DOT: Record<string, string> = {
  MET: 'bg-[#059669]',
  PARTIAL: 'bg-[#d97706]',
  GAP: 'bg-[#dc2626]',
}
const EVIDENCE_STATUS_COLOR: Record<string, string> = {
  CURRENT: 'text-[#059669]',
  OUTDATED: 'text-[#d97706]',
  EXPIRING: 'text-[#dc2626]',
}

type Tab = 'overview' | 'evidence' | 'indicators' | 'assessment'

export default function StandardDetailPage() {
  const params = useParams()
  const code = params.code as string
  const [standard, setStandard] = useState<StandardDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('overview')
  const [generating, setGenerating] = useState(false)
  const [assessmentText, setAssessmentText] = useState('')
  const [wordCount, setWordCount] = useState(0)
  const [copied, setCopied] = useState(false)

  const fetchStandard = useCallback(async () => {
    try {
      const res = await fetch(`/api/standards/${code}`)
      if (res.ok) {
        const data = await res.json()
        setStandard(data)
        if (data.selfAssessment?.responseText) {
          setAssessmentText(data.selfAssessment.responseText)
          setWordCount(data.selfAssessment.responseText.split(/\s+/).length)
        }
      }
    } finally {
      setLoading(false)
    }
  }, [code])

  useEffect(() => { fetchStandard() }, [fetchStandard])

  async function generateAssessment() {
    setGenerating(true)
    try {
      const res = await fetch('/api/ai/self-assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ standardCode: code }),
      })
      if (res.ok) {
        const data = await res.json()
        setAssessmentText(data.response)
        setWordCount(data.wordCount)
        fetchStandard()
      }
    } finally {
      setGenerating(false)
    }
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(assessmentText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return <div className="py-12 text-center"><p className="text-sm text-slate-400">Loading...</p></div>
  }
  if (!standard) {
    return <div className="py-12 text-center"><p className="text-slate-500">Standard not found.</p></div>
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'evidence', label: `Evidence (${standard.evidence.length})` },
    { key: 'indicators', label: `Quality Indicators (${standard.qualityIndicators.length})` },
    { key: 'assessment', label: 'Self-Assessment' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/standards" className="text-xs text-slate-500 hover:text-slate-700">← Standards</Link>
        <div className="mt-2 flex items-center gap-3">
          <span className={`h-3 w-3 rounded-full ${STATUS_DOT[standard.status]}`} />
          <h1 className="font-heading text-2xl font-bold text-[#1a2332]">
            <span className="font-mono text-lg text-slate-400">{standard.code}</span>{' '}
            {standard.name}
          </h1>
        </div>
        <p className={`mt-1 text-sm font-medium ${STATUS_COLOR[standard.status]}`}>
          {standard.status === 'MET' ? 'Met' : standard.status === 'PARTIAL' ? 'Partial' : 'Gap'}
          {' · '}<span className="text-slate-500 font-normal">{standard.division}</span>
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'border-b-2 border-[#1a2332] text-[#1a2332]'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="font-heading text-base font-semibold text-[#1a2332]">Description</h2>
            <p className="mt-2 text-sm text-slate-700 leading-relaxed">{standard.description}</p>
          </div>

          {standard.auditorLooksFor && (
            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <h2 className="font-heading text-base font-semibold text-[#1a2332]">What the Auditor Looks For</h2>
              <p className="mt-2 text-sm text-slate-700 leading-relaxed">{standard.auditorLooksFor}</p>
            </div>
          )}

          {standard.goldStandard && (
            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <h2 className="font-heading text-base font-semibold text-[#1a2332]">Gold Standard</h2>
              <p className="mt-2 text-sm text-slate-700 leading-relaxed">{standard.goldStandard}</p>
            </div>
          )}

          {standard.planManagementSpecific?.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <h2 className="font-heading text-base font-semibold text-[#1a2332]">Plan Management Specific</h2>
              <ul className="mt-2 space-y-1.5">
                {standard.planManagementSpecific.map((item, i) => (
                  <li key={i} className="text-sm text-slate-700">• {item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {tab === 'evidence' && (
        <div>
          {standard.evidence.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white py-12 text-center">
              <p className="text-slate-500">No evidence linked to this standard.</p>
              <Link href="/evidence">
                <Button variant="outline" size="sm" className="mt-4 border-slate-300">
                  Upload Evidence
                </Button>
              </Link>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Title</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Uploaded</th>
                  </tr>
                </thead>
                <tbody>
                  {standard.evidence.map(doc => (
                    <tr key={doc.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-slate-900 font-medium">{doc.title}</td>
                      <td className="px-4 py-3 text-slate-600">{doc.category.replace(/_/g, ' ')}</td>
                      <td className={`px-4 py-3 font-medium ${EVIDENCE_STATUS_COLOR[doc.status] || 'text-slate-600'}`}>
                        {doc.status.toLowerCase()}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {format(new Date(doc.uploadedAt), 'd MMM yyyy')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'indicators' && (
        <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
          {standard.qualityIndicators.map(qi => (
            <div key={qi.id} className="px-5 py-4">
              <div className="flex items-start gap-3">
                <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${qi.evidenced ? 'bg-[#059669]' : 'bg-[#dc2626]'}`} />
                <div className="flex-1">
                  <p className="text-sm text-slate-900">{qi.description}</p>
                  {qi.evidence.length > 0 && (
                    <p className="mt-1 text-xs text-slate-500">
                      Evidence: {qi.evidence.map(e => e.title).join(', ')}
                    </p>
                  )}
                  {!qi.evidenced && (
                    <p className="mt-1 text-xs text-[#dc2626]">No evidence linked</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'assessment' && (
        <div className="space-y-4">
          {assessmentText ? (
            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-slate-500">{wordCount} words</p>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyToClipboard}
                    className="text-slate-600"
                  >
                    <Copy className="mr-1 h-3.5 w-3.5" />
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={generateAssessment}
                    disabled={generating}
                    className="text-slate-600"
                  >
                    <RefreshCw className={`mr-1 h-3.5 w-3.5 ${generating ? 'animate-spin' : ''}`} />
                    Regenerate
                  </Button>
                </div>
              </div>
              <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap">
                {assessmentText}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-white py-12 text-center">
              <p className="text-slate-500">No self-assessment generated yet.</p>
              <p className="mt-1 text-xs text-slate-400">
                AI will write a ~300 word response referencing your uploaded evidence.
              </p>
              <Button
                className="mt-4 bg-[#1a2332] text-white hover:bg-[#2a3a4f]"
                onClick={generateAssessment}
                disabled={generating}
              >
                {generating ? 'Generating...' : 'Generate Self-Assessment'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
