'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ChevronRight, Upload, FileUp, X, Loader2, Download, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { toast } from 'sonner'

interface Evidence {
  id: string
  title: string
  category: string
  status: string
  fileName: string
  fileUrl: string
  fileType: string
  uploadedAt: string
  expiryDate: string | null
  standardLinks: Array<{ standard: { code: string; name: string } }>
}

interface ChecklistItemState {
  id: string
  name: string
  category: string
  satisfied: boolean
  evidenceId: string | null
  satisfiedFrom: string | null
  confidence?: string | null
}

interface DocumentAnalysis {
  documentType: string
  extractedTitle: string
  sections: string[]
  concerns: string[]
  qualityScore: number | null
  checklistMapping: Array<{ checklistId: string; confidence: string; evidenceQuote: string }>
  analysedAt: string
}

const STATUS_COLOR: Record<string, string> = {
  CURRENT: 'text-[#059669]',
  OUTDATED: 'text-[#d97706]',
  EXPIRING: 'text-[#dc2626]',
}

const CATEGORIES = ['POLICY', 'PARTICIPANT', 'WORKER', 'INCIDENT', 'SERVICE_DELIVERY', 'GOVERNANCE', 'OTHER'] as const

function QualityBadge({ score }: { score: number }) {
  const color = score >= 70 ? 'bg-emerald-50 text-[#059669]' : score >= 50 ? 'bg-amber-50 text-[#d97706]' : 'bg-red-50 text-[#dc2626]'
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${color}`}>{score}/100</span>
}

export default function DocumentsPage() {
  const router = useRouter()
  const [evidence, setEvidence] = useState<Evidence[]>([])
  const [checklist, setChecklist] = useState<ChecklistItemState[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Analysis state per document
  const [analyses, setAnalyses] = useState<Record<string, DocumentAnalysis | null>>({})
  const [analysisLoading, setAnalysisLoading] = useState<string | null>(null)

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [saving, setSaving] = useState(false)

  // Re-evaluate / re-analyse state
  const [evaluatingId, setEvaluatingId] = useState<string | null>(null)
  const [reanalysingId, setReanalysingId] = useState<string | null>(null)

  // Generate fix state
  const [generatingFix, setGeneratingFix] = useState<string | null>(null)

  // Upload state
  const [showUpload, setShowUpload] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadCategory, setUploadCategory] = useState<string>('POLICY')
  const [uploadExpiry, setUploadExpiry] = useState('')
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const fetchData = useCallback(async () => {
    try {
      const [evRes, clRes] = await Promise.all([
        fetch('/api/evidence'),
        fetch('/api/checklist'),
      ])
      if (evRes.ok) setEvidence(await evRes.json())
      if (clRes.ok) {
        const data = await clRes.json()
        setChecklist(data.items)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Fetch analysis when a row is expanded
  useEffect(() => {
    if (!expandedId) return
    if (analyses[expandedId] !== undefined) return // already fetched (or null = no analysis)
    setAnalysisLoading(expandedId)
    fetch(`/api/evidence/${expandedId}/analysis`)
      .then(r => r.ok ? r.json() : null)
      .then(data => setAnalyses(prev => ({ ...prev, [expandedId]: data })))
      .catch(() => setAnalyses(prev => ({ ...prev, [expandedId]: null })))
      .finally(() => setAnalysisLoading(null))
  }, [expandedId, analyses])

  function getChecklistItemsForEvidence(evidenceId: string) {
    return checklist.filter(i => i.satisfied && i.evidenceId === evidenceId)
  }

  // --- DELETE ---
  async function handleDelete(id: string) {
    if (!confirm('Delete this document? This cannot be undone.')) return
    try {
      const res = await fetch(`/api/evidence/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Document deleted')
        if (expandedId === id) setExpandedId(null)
        await fetchData()
      } else {
        toast.error('Delete failed')
      }
    } catch {
      toast.error('Delete failed')
    }
  }

  // --- EDIT ---
  function startEditing(doc: Evidence) {
    setEditingId(doc.id)
    setEditTitle(doc.title)
    setEditCategory(doc.category)
  }

  function cancelEditing() {
    setEditingId(null)
    setEditTitle('')
    setEditCategory('')
  }

  async function handleSaveEdit(id: string) {
    setSaving(true)
    try {
      const res = await fetch(`/api/evidence/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle, category: editCategory }),
      })
      if (res.ok) {
        toast.success('Saved')
        setEditingId(null)
        await fetchData()
      } else {
        toast.error('Save failed')
      }
    } catch {
      toast.error('Save failed')
    }
    setSaving(false)
  }

  // --- RE-EVALUATE ---
  async function handleReEvaluate(id: string) {
    setEvaluatingId(id)
    try {
      const res = await fetch('/api/checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evidenceId: id }),
      })
      if (res.ok) {
        const data = await res.json()
        const count = data.satisfied?.length ?? 0
        toast.success(`Mapped to ${count} checklist item${count !== 1 ? 's' : ''}`)
        await fetchData()
      } else {
        toast.error('Evaluation failed')
      }
    } catch {
      toast.error('Evaluation failed')
    }
    setEvaluatingId(null)
  }

  // --- RE-ANALYSE (full Level 6 analysis) ---
  async function handleReAnalyse(id: string) {
    setReanalysingId(id)
    try {
      const res = await fetch(`/api/evidence/${id}/analysis`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setAnalyses(prev => ({ ...prev, [id]: data }))
        toast.success('Analysis complete')
        await fetchData()
      } else {
        toast.error('Analysis failed')
      }
    } catch {
      toast.error('Analysis failed')
    }
    setReanalysingId(null)
  }

  // --- GENERATE FIX ---
  async function handleGenerateFix(evidenceId: string, concerns: string[]) {
    setGeneratingFix(evidenceId)
    try {
      const res = await fetch('/api/documents/fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evidenceId, issue: concerns.join('; ') }),
      })
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'Document Fix.docx'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        toast.success('Fix document downloaded')
      } else {
        toast.error('Generation failed')
      }
    } catch {
      toast.error('Generation failed')
    }
    setGeneratingFix(null)
  }

  // --- UPLOAD ---
  function handleFileSelect(f: File) {
    setFile(f)
    setUploadTitle(f.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '))
  }

  async function handleUpload() {
    if (!file || !uploadTitle) return
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('title', uploadTitle)
    formData.append('category', uploadCategory)
    if (uploadExpiry) formData.append('expiryDate', uploadExpiry)

    try {
      const res = await fetch('/api/evidence', { method: 'POST', body: formData })
      if (res.ok) {
        const ev = await res.json()
        toast.success('Uploaded')
        setShowUpload(false)
        setFile(null)
        setUploadTitle('')
        setUploadCategory('POLICY')
        setUploadExpiry('')
        // Also evaluate checklist
        fetch('/api/checklist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ evidenceId: ev.id }),
        }).catch(() => {})
        await fetchData()
        router.refresh()
      } else {
        toast.error('Upload failed')
      }
    } catch {
      toast.error('Upload failed')
    }
    setUploading(false)
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
          <h1 className="font-heading text-2xl font-bold text-[#1a2332]">Documents</h1>
          <p className="text-sm text-slate-500 mt-1">{evidence.length} uploaded document{evidence.length !== 1 ? 's' : ''}</p>
        </div>
        <Button
          className="bg-[#1a2332] text-white hover:bg-[#2a3a4f]"
          onClick={() => setShowUpload(!showUpload)}
        >
          <Upload className="mr-2 h-4 w-4" />
          Upload
        </Button>
      </div>

      {/* Upload panel */}
      {showUpload && (
        <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-4">
          {!file ? (
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); e.stopPropagation() }}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFileSelect(f) }}
              className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-8 cursor-pointer hover:border-slate-400 hover:bg-slate-100 transition-colors"
            >
              <FileUp className="h-6 w-6 text-slate-400" />
              <p className="text-sm font-medium text-slate-700">Drop a file or click to browse</p>
              <p className="text-xs text-slate-400">PDF, DOCX, PNG, JPG, XLSX — max 25MB</p>
              <input ref={inputRef} type="file" className="hidden" accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.xlsx,.xls" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f) }} />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <FileUp className="h-5 w-5 text-slate-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
                  <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(0)} KB</p>
                </div>
                <button onClick={() => { setFile(null); setUploadTitle('') }} className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Title</label>
                  <input type="text" value={uploadTitle} onChange={e => setUploadTitle(e.target.value)} className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1a2332]/10" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
                  <select value={uploadCategory} onChange={e => setUploadCategory(e.target.value)} className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 pr-8 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1a2332]/10">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Expiry <span className="text-slate-400">(opt)</span></label>
                  <DatePicker value={uploadExpiry} onChange={setUploadExpiry} placeholder="Select date" />
                </div>
              </div>
              <Button onClick={handleUpload} disabled={!uploadTitle || uploading} className="w-full h-9 bg-[#1a2332] text-white hover:bg-[#243447]">
                {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading...</> : <><Upload className="h-4 w-4 mr-2" />Upload</>}
              </Button>
            </>
          )}
        </div>
      )}

      {/* Table */}
      {evidence.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white py-12 text-center">
          <p className="text-slate-500">No documents uploaded yet.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="w-8 px-2 py-3" />
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Title</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Standards</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Uploaded</th>
              </tr>
            </thead>
            <tbody>
              {evidence.map(doc => {
                const isExpanded = expandedId === doc.id
                const isEditing = editingId === doc.id
                const checklistItems = getChecklistItemsForEvidence(doc.id)
                const analysis = analyses[doc.id]
                const isLoadingAnalysis = analysisLoading === doc.id
                return (
                  <>
                    {/* Data row */}
                    <tr
                      key={doc.id}
                      onClick={() => setExpandedId(isExpanded ? null : doc.id)}
                      className={`cursor-pointer transition-colors ${isExpanded ? 'bg-slate-50' : 'border-b border-slate-100 hover:bg-slate-50'}`}
                    >
                      <td className="w-8 px-2 py-3 text-center">
                        <ChevronRight className={`h-3.5 w-3.5 text-slate-400 inline-block transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </td>
                      <td className="px-4 py-3 text-slate-900 font-medium">{doc.title}</td>
                      <td className="px-4 py-3 text-slate-600">{doc.category.replace(/_/g, ' ')}</td>
                      <td className={`px-4 py-3 font-medium ${STATUS_COLOR[doc.status] || 'text-slate-600'}`}>
                        {doc.status.toLowerCase()}
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs">
                        {doc.standardLinks.length > 0
                          ? doc.standardLinks.map(l => l.standard.code).join(', ')
                          : <span className="text-slate-400">—</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {format(new Date(doc.uploadedAt), 'd MMM yyyy')}
                      </td>
                    </tr>

                    {/* Expanded detail row */}
                    {isExpanded && (
                      <tr key={`${doc.id}-detail`} className="border-b border-slate-200">
                        <td colSpan={6} className="bg-slate-50/50 px-10 py-4">
                          <div className="space-y-4">
                            {/* Title + metadata row */}
                            {analysis && (
                              <div className="flex items-center gap-3 text-xs text-slate-500">
                                <span>Type: {analysis.documentType?.replace(/_/g, ' ')}</span>
                                {analysis.qualityScore != null && (
                                  <span className="flex items-center gap-1">Quality: <QualityBadge score={analysis.qualityScore} /></span>
                                )}
                                <span>Analysed: {format(new Date(analysis.analysedAt), 'd MMM')}</span>
                              </div>
                            )}

                            {/* Action bar */}
                            <div className="flex items-center gap-3">
                              <a href={doc.fileUrl} download={doc.fileName} className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1">
                                <Download className="h-3.5 w-3.5" />
                                Download
                              </a>
                              {analysis && (analysis.concerns as string[])?.length > 0 && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleGenerateFix(doc.id, analysis.concerns as string[]) }}
                                  disabled={generatingFix === doc.id}
                                  className="text-sm font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50 flex items-center gap-1"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                  {generatingFix === doc.id ? 'Generating...' : 'Generate Fix'}
                                </button>
                              )}
                              <button
                                onClick={(e) => { e.stopPropagation(); handleReAnalyse(doc.id) }}
                                disabled={reanalysingId === doc.id}
                                className="text-sm font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50 flex items-center gap-1"
                              >
                                <RefreshCw className={`h-3.5 w-3.5 ${reanalysingId === doc.id ? 'animate-spin' : ''}`} />
                                {reanalysingId === doc.id ? 'Analysing...' : 'Re-analyse'}
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleReEvaluate(doc.id) }}
                                disabled={evaluatingId === doc.id}
                                className="text-sm text-slate-600 hover:text-slate-900 disabled:opacity-50"
                              >
                                {evaluatingId === doc.id ? 'Evaluating...' : 'Re-evaluate'}
                              </button>
                              {!isEditing && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); startEditing(doc) }}
                                  className="text-sm text-slate-600 hover:text-slate-900"
                                >
                                  Edit
                                </button>
                              )}
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDelete(doc.id) }}
                                className="text-sm text-red-500 hover:text-red-700"
                              >
                                Delete
                              </button>
                            </div>

                            {/* Edit form */}
                            {isEditing && (
                              <div className="flex items-end gap-3 rounded-md border border-slate-200 bg-white p-3">
                                <div className="flex-1">
                                  <label className="block text-xs font-medium text-slate-600 mb-1">Title</label>
                                  <input
                                    type="text"
                                    value={editTitle}
                                    onChange={e => setEditTitle(e.target.value)}
                                    onClick={e => e.stopPropagation()}
                                    className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1a2332]/10"
                                  />
                                </div>
                                <div className="w-40">
                                  <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
                                  <select
                                    value={editCategory}
                                    onChange={e => setEditCategory(e.target.value)}
                                    onClick={e => e.stopPropagation()}
                                    className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 pr-8 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1a2332]/10"
                                  >
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
                                  </select>
                                </div>
                                <Button
                                  size="sm"
                                  onClick={(e) => { e.stopPropagation(); handleSaveEdit(doc.id) }}
                                  disabled={saving || (!editTitle)}
                                  className="h-9 bg-[#1a2332] text-white hover:bg-[#243447]"
                                >
                                  {saving ? 'Saving...' : 'Save'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => { e.stopPropagation(); cancelEditing() }}
                                  className="h-9"
                                >
                                  Cancel
                                </Button>
                              </div>
                            )}

                            {/* Analysis loading state */}
                            {isLoadingAnalysis && (
                              <p className="text-xs text-slate-400">Loading analysis...</p>
                            )}

                            {/* Analysis results */}
                            {analysis && (
                              <div className="space-y-4">
                                {/* Sections found */}
                                {(analysis.sections as string[])?.length > 0 && (
                                  <div>
                                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-2">
                                      Sections found ({(analysis.sections as string[]).length})
                                    </p>
                                    <ul className="space-y-1">
                                      {(analysis.sections as string[]).map((s, i) => (
                                        <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                                          <span className="text-slate-400">•</span> {s}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {/* Concerns */}
                                {(analysis.concerns as string[])?.length > 0 && (
                                  <div>
                                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-2">
                                      Concerns ({(analysis.concerns as string[]).length})
                                    </p>
                                    <div className="space-y-1">
                                      {(analysis.concerns as string[]).map((c, i) => (
                                        <p key={i} className="text-sm text-[#d97706]">⚠ {c}</p>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Checklist items VERIFIED */}
                                {(() => {
                                  const verified = (analysis.checklistMapping as Array<{ checklistId: string; confidence: string; evidenceQuote: string }>)?.filter(m => m.confidence === 'VERIFIED') || []
                                  const partial = (analysis.checklistMapping as Array<{ checklistId: string; confidence: string; evidenceQuote: string }>)?.filter(m => m.confidence === 'PARTIAL') || []
                                  return (
                                    <>
                                      {verified.length > 0 && (
                                        <div>
                                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-2">
                                            Checklist items (verified)
                                          </p>
                                          <div className="space-y-1.5">
                                            {verified.map((m, i) => (
                                              <div key={i} className="flex items-start gap-2">
                                                <span className="h-2 w-2 rounded-full bg-[#059669] mt-1.5 shrink-0" />
                                                <div className="min-w-0">
                                                  <span className="text-sm text-slate-700 font-medium">{m.checklistId}</span>
                                                  <span className="text-sm text-slate-500"> — &ldquo;{m.evidenceQuote.length > 80 ? m.evidenceQuote.slice(0, 80) + '...' : m.evidenceQuote}&rdquo;</span>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      {partial.length > 0 && (
                                        <div>
                                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-2">
                                            Checklist items (partial)
                                          </p>
                                          <div className="space-y-1.5">
                                            {partial.map((m, i) => (
                                              <div key={i} className="flex items-start gap-2">
                                                <span className="h-2 w-2 rounded-full bg-[#d97706] mt-1.5 shrink-0" />
                                                <div className="min-w-0">
                                                  <span className="text-sm text-slate-700 font-medium">{m.checklistId}</span>
                                                  <span className="text-sm text-slate-500"> — &ldquo;{m.evidenceQuote.length > 80 ? m.evidenceQuote.slice(0, 80) + '...' : m.evidenceQuote}&rdquo;</span>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </>
                                  )
                                })()}
                              </div>
                            )}

                            {/* Document preview */}
                            {doc.fileType?.includes('pdf') ? (
                              <iframe src={doc.fileUrl} className="w-full h-[500px] rounded-lg border border-slate-200" />
                            ) : doc.fileType?.includes('word') || doc.fileName?.endsWith('.docx') ? (
                              <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
                                <p className="text-sm text-slate-600">DOCX preview not available in local development.</p>
                                <p className="text-xs text-slate-400 mt-1">In production, documents will render inline via Office viewer.</p>
                                <a href={doc.fileUrl} download={doc.fileName} className="inline-block mt-3 text-sm font-medium text-[#1a2332] underline">
                                  Download to view in Word
                                </a>
                              </div>
                            ) : doc.fileType?.startsWith('image/') ? (
                              <img src={doc.fileUrl} alt={doc.title} className="max-w-full max-h-[400px] rounded-lg border border-slate-200" />
                            ) : (
                              <a href={doc.fileUrl} download={doc.fileName} className="inline-block text-sm font-medium text-[#1a2332] underline">
                                Download file
                              </a>
                            )}

                            {/* Checklist items satisfied (from checklist status, not analysis) */}
                            {checklistItems.length > 0 && !analysis && (
                              <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-2">
                                  Checklist items satisfied ({checklistItems.length})
                                </p>
                                <div className="grid grid-cols-1 gap-1.5">
                                  {checklistItems.map(item => (
                                    <div key={item.id} className="flex items-start gap-2">
                                      <span className="h-2 w-2 rounded-full bg-[#059669] mt-1.5 shrink-0" />
                                      <div className="min-w-0">
                                        <span className="text-sm text-slate-700">{item.name}</span>
                                        {item.satisfiedFrom && (
                                          <p className="text-xs text-slate-400 italic truncate">{item.satisfiedFrom}</p>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Standards linked */}
                            {doc.standardLinks.length > 0 && (
                              <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-2">
                                  Standards linked ({doc.standardLinks.length})
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {doc.standardLinks.map(l => (
                                    <span
                                      key={l.standard.code}
                                      className="inline-flex items-center gap-1.5 rounded-md bg-white border border-slate-200 px-2 py-1 text-xs text-slate-700"
                                    >
                                      <span className="font-mono text-[10px] text-slate-500">{l.standard.code}</span>
                                      {l.standard.name}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
