'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileUp, X, Loader2, Upload, Download, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { toast } from 'sonner'
import Link from 'next/link'

// ponytail: all state in one page component, no unnecessary abstractions

interface ChecklistItemState {
  id: string
  category: string
  name: string
  description: string
  type: 'upload' | 'in_tool' | 'export_external'
  canGenerate: boolean
  perWorker?: boolean
  perParticipant?: boolean
  satisfied: boolean
  evidenceId: string | null
  satisfiedFrom: string | null
  confidence?: string | null
  concerns?: string | null
}

interface UploadAnalysis {
  extractedTitle: string
  documentType: string
  qualityScore: number
  sections: string[]
  concerns: string[]
}

type UploadStep = 'idle' | 'uploading' | 'analysing' | 'done'

const CATEGORIES = ['POLICY', 'PARTICIPANT', 'WORKER', 'INCIDENT', 'SERVICE_DELIVERY', 'GOVERNANCE', 'OTHER'] as const

const TOOL_LINKS: Record<string, { label: string; href: string }> = {
  'REG-CI': { label: 'View improvements', href: '/improvements' },
  'REG-INCIDENT': { label: 'View incidents', href: '/incidents' },
  'REG-COMPLAINT': { label: 'View incidents', href: '/incidents' },
}

export default function EvidencePage() {
  const router = useRouter()
  const [checklist, setChecklist] = useState<ChecklistItemState[]>([])
  const [loading, setLoading] = useState(true)

  // Upload state
  const [uploadStep, setUploadStep] = useState<UploadStep>('idle')
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<string>('POLICY')
  const [expiryDate, setExpiryDate] = useState('')
  const [progress, setProgress] = useState('')
  const [generating, setGenerating] = useState<string | null>(null)
  const [lastUploadAnalysis, setLastUploadAnalysis] = useState<UploadAnalysis | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const fetchChecklist = useCallback(async () => {
    try {
      const res = await fetch('/api/checklist')
      if (res.ok) {
        const data = await res.json()
        setChecklist(data.items)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchChecklist() }, [fetchChecklist])

  // Group by category
  const categories = checklist.reduce<Record<string, ChecklistItemState[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {})

  const satisfiedCount = checklist.filter(i => i.satisfied).length
  const totalCount = checklist.length

  function resetUpload() {
    setUploadStep('idle')
    setFile(null)
    setTitle('')
    setCategory('POLICY')
    setExpiryDate('')
    setProgress('')
  }

  function handleFileSelect(f: File) {
    setFile(f)
    setTitle(f.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '))
  }

  async function handleUploadAndAnalyse() {
    if (!file || !title) return

    setUploadStep('uploading')
    setProgress('Saving document...')
    setLastUploadAnalysis(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('title', title)
    formData.append('category', category)
    if (expiryDate) formData.append('expiryDate', expiryDate)

    let evidenceId: string
    try {
      const res = await fetch('/api/evidence', { method: 'POST', body: formData })
      if (!res.ok) throw new Error('Upload failed')
      const evidence = await res.json()
      evidenceId = evidence.id
    } catch {
      toast.error('Upload failed')
      setUploadStep('idle')
      return
    }

    // Synchronous checklist evaluation
    setUploadStep('analysing')
    setProgress('Analysing against auditor checklist...')

    try {
      const evalRes = await fetch('/api/checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evidenceId }),
      })
      if (evalRes.ok) {
        const data = await evalRes.json()
        const count = data.satisfied?.length ?? 0
        toast.success(`Mapped to ${count} checklist item${count !== 1 ? 's' : ''}`)
      }
    } catch {
      // Non-fatal
    }

    // Also fetch full analysis if available (may have been triggered by upload)
    try {
      const analysisRes = await fetch(`/api/evidence/${evidenceId}/analysis`)
      if (analysisRes.ok) {
        const data = await analysisRes.json()
        setLastUploadAnalysis({
          extractedTitle: data.extractedTitle,
          documentType: data.documentType,
          qualityScore: data.qualityScore,
          sections: data.sections || [],
          concerns: data.concerns || [],
        })
      }
    } catch {
      // Non-fatal
    }

    setUploadStep('done')
    setProgress('')
    await fetchChecklist()
    router.refresh()
    setTimeout(resetUpload, 3000)
  }

  async function handleGenerate(item: ChecklistItemState) {
    setGenerating(item.id)
    try {
      const res = await fetch('/api/documents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checklistId: item.id,
          itemName: item.name,
          context: item.description,
        }),
      })
      if (!res.ok) throw new Error('Generation failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${item.name}.docx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success(`Generated: ${item.name}`)
    } catch {
      toast.error('Document generation failed')
    }
    setGenerating(null)
  }

  function handleUploadFor(item: ChecklistItemState) {
    setTitle(item.name)
    setCategory(getCategoryForItem(item))
    inputRef.current?.click()
  }

  function getCategoryForItem(item: ChecklistItemState): string {
    if (item.id.startsWith('STAFF-')) return 'WORKER'
    if (item.id.startsWith('INS-')) return 'GOVERNANCE'
    if (item.id.startsWith('PART-')) return 'PARTICIPANT'
    if (item.id.startsWith('GOV-') || item.id.startsWith('REG-')) return 'POLICY'
    return 'OTHER'
  }

  if (loading) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-slate-400">Loading...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[#1a2332]">Audit Checklist</h1>
          <p className="text-sm text-slate-500 mt-1">
            Based on your auditor&apos;s requirements. Upload documents — AI maps them to checklist items.
          </p>
        </div>
        <span className="text-sm font-medium text-slate-700">
          {satisfiedCount}/{totalCount} ready
        </span>
      </div>

      {/* Upload zone */}
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        {uploadStep === 'idle' && (
          <>
            {!file ? (
              <div
                onClick={() => inputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); e.stopPropagation() }}
                onDrop={e => {
                  e.preventDefault()
                  const f = e.dataTransfer.files[0]
                  if (f) handleFileSelect(f)
                }}
                className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-8 cursor-pointer hover:border-slate-400 hover:bg-slate-100 transition-colors"
              >
                <FileUp className="h-6 w-6 text-slate-400" />
                <p className="text-sm font-medium text-slate-700">Drop any file — AI will figure out what it covers</p>
                <p className="text-xs text-slate-400">PDF, DOCX, PNG, JPG, XLSX — max 25MB</p>
                <input
                  ref={inputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.xlsx,.xls"
                  onChange={e => {
                    const f = e.target.files?.[0]
                    if (f) handleFileSelect(f)
                  }}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                  <FileUp className="h-5 w-5 text-slate-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
                    <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(0)} KB</p>
                  </div>
                  <button
                    onClick={() => { setFile(null); setTitle('') }}
                    className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Title</label>
                    <input
                      type="text"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1a2332]/10"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
                    <select
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                      className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 pr-8 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1a2332]/10"
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Expiry <span className="text-slate-400">(opt)</span></label>
                    <DatePicker value={expiryDate} onChange={setExpiryDate} placeholder="Select date" />
                  </div>
                </div>
                <Button
                  onClick={handleUploadAndAnalyse}
                  disabled={!title}
                  className="w-full h-9 bg-[#1a2332] text-white hover:bg-[#243447]"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload &amp; Analyse
                </Button>
              </div>
            )}
          </>
        )}

        {(uploadStep === 'uploading' || uploadStep === 'analysing') && (
          <div className="flex items-center gap-3 py-4 justify-center">
            <Loader2 className="h-5 w-5 text-[#1a2332] animate-spin" />
            <p className="text-sm text-slate-700">{progress}</p>
          </div>
        )}

        {uploadStep === 'done' && (
          <div className="flex items-center gap-2 py-4 justify-center text-[#059669]">
            <span className="h-2 w-2 rounded-full bg-[#059669]" />
            <p className="text-sm font-medium">Document uploaded and analysed</p>
          </div>
        )}
      </div>

      {/* Last upload analysis results */}
      {lastUploadAnalysis && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-900 mb-2">
            Analysis: {lastUploadAnalysis.extractedTitle}
          </h3>
          <div className="flex gap-4 text-xs text-slate-500 mb-3">
            <span>Type: {lastUploadAnalysis.documentType?.replace(/_/g, ' ')}</span>
            <span>Quality: <span className={lastUploadAnalysis.qualityScore >= 70 ? 'text-[#059669] font-medium' : 'text-[#d97706] font-medium'}>{lastUploadAnalysis.qualityScore}/100</span></span>
            <span>Sections: {lastUploadAnalysis.sections?.length}</span>
          </div>
          {lastUploadAnalysis.concerns?.length > 0 && (
            <div className="space-y-1">
              {lastUploadAnalysis.concerns.map((c, i) => (
                <p key={i} className="text-xs text-[#d97706]">⚠ {c}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Checklist by category */}
      <div className="space-y-4">
        {Object.entries(categories).map(([cat, items]) => {
          const catSatisfied = items.filter(i => i.satisfied).length
          return (
            <div key={cat} className="rounded-lg border border-slate-200 bg-white overflow-hidden">
              {/* Category header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                <h2 className="font-heading text-base font-semibold text-[#1a2332]">{cat}</h2>
                <span className="text-xs font-medium text-slate-500">{catSatisfied}/{items.length}</span>
              </div>
              {/* Items */}
              <div className="divide-y divide-slate-100">
                {items.map(item => (
                  <div key={item.id} className="px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {item.satisfied ? (
                          <span className="h-2 w-2 rounded-full bg-[#059669] shrink-0" />
                        ) : item.confidence === 'PARTIAL' ? (
                          <span className="h-2 w-2 rounded-full bg-[#d97706] shrink-0" />
                        ) : (
                          <span className="h-2 w-2 rounded-full bg-slate-300 shrink-0" />
                        )}
                        <span className={`text-sm ${item.satisfied ? 'text-[#059669]' : item.confidence === 'PARTIAL' ? 'text-[#d97706]' : 'text-slate-700'}`}>
                          {item.name}
                        </span>
                        {item.perWorker && (
                          <span className="text-[10px] text-slate-400 uppercase">per worker</span>
                        )}
                        {item.perParticipant && (
                          <span className="text-[10px] text-slate-400 uppercase">per participant</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Confidence indicator */}
                        {item.satisfied && item.confidence === 'VERIFIED' && (
                          <span className="text-xs font-medium text-[#059669]">Verified</span>
                        )}
                        {item.confidence === 'PARTIAL' && (
                          <span className="text-xs font-medium text-[#d97706]">Partial</span>
                        )}
                        {item.satisfied && item.confidence === 'TITLE_MATCH_ONLY' && (
                          <span className="text-xs text-slate-400">Title match</span>
                        )}
                        {/* in_tool items: show link */}
                        {item.type === 'in_tool' && TOOL_LINKS[item.id] && (
                          <Link
                            href={TOOL_LINKS[item.id].href}
                            className="text-xs text-slate-500 hover:text-[#1a2332] flex items-center gap-1"
                          >
                            {TOOL_LINKS[item.id].label}
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        )}
                        {/* Generate button for canGenerate items that aren't satisfied */}
                        {item.canGenerate && !item.satisfied && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs border-slate-300"
                            disabled={generating === item.id}
                            onClick={() => handleGenerate(item)}
                          >
                            {generating === item.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <Download className="h-3 w-3 mr-1" />
                                Generate
                              </>
                            )}
                          </Button>
                        )}
                        {/* Upload button for non-generate upload items that aren't satisfied */}
                        {!item.satisfied && !item.canGenerate && item.type === 'upload' && (
                          <button
                            onClick={() => handleUploadFor(item)}
                            className="text-xs text-slate-500 hover:text-[#1a2332]"
                          >
                            Upload
                          </button>
                        )}
                        {/* External items: hint */}
                        {!item.satisfied && item.type === 'export_external' && (
                          <span className="text-xs text-slate-400">Export from portal</span>
                        )}
                      </div>
                    </div>
                    {/* Satisfied by line with confidence detail */}
                    {item.satisfied && item.satisfiedFrom && (
                      <p className="mt-1 ml-[18px] text-xs text-slate-400 italic">
                        &ldquo;{item.satisfiedFrom}&rdquo;
                      </p>
                    )}
                    {item.confidence === 'PARTIAL' && item.satisfiedFrom && !item.satisfied && (
                      <p className="mt-1 ml-[18px] text-xs text-[#d97706]">
                        &ldquo;{item.satisfiedFrom}&rdquo; — needs update
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

    </div>
  )
}
