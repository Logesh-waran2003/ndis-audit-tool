'use client'

import { useState, useRef } from 'react'
import { FileUp, Loader2, X, Upload, CheckCircle2, AlertTriangle, Download, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { toast } from 'sonner'

// ponytail: single component, three visual states — no router, no modals

type Step = 'idle' | 'uploading' | 'analysing' | 'results'

interface StandardResult {
  code: string
  name: string
  confidence: number
}

interface RuleResult {
  ruleCode: string
  displayName: string
  isPassing: boolean
  severity: string
  weight: number
  evidenceRequired: string
  remediation: string
}

interface AnalysisResult {
  evidenceId: string
  standards: StandardResult[]
  scoreBefore: number
  scoreAfter: number
  passing: number
  failing: number
  criticalFailing: RuleResult[]
  allFailing: RuleResult[]
}

interface UploadAnalyseReportProps {
  onComplete: () => void
  /** Current score fetched before upload starts */
  currentScore: number | null
}

const CATEGORIES = ['POLICY', 'PARTICIPANT', 'WORKER', 'INCIDENT', 'SERVICE_DELIVERY', 'GOVERNANCE', 'OTHER'] as const

export function UploadAnalyseReport({ onComplete, currentScore }: UploadAnalyseReportProps) {
  const [step, setStep] = useState<Step>('idle')
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<string>('POLICY')
  const [expiryDate, setExpiryDate] = useState('')
  const [progress, setProgress] = useState('')
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [generating, setGenerating] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function reset() {
    setStep('idle')
    setFile(null)
    setTitle('')
    setCategory('POLICY')
    setExpiryDate('')
    setProgress('')
    setResult(null)
  }

  function handleFileSelect(f: File) {
    setFile(f)
    setTitle(f.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '))
  }

  async function handleUploadAndAnalyse() {
    if (!file || !title) return

    const scoreBefore = currentScore ?? 0

    // Step 1: Upload
    setStep('uploading')
    setProgress('Saving document...')

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
      setStep('idle')
      return
    }

    // Step 2: Classify (synchronous — user sees spinner)
    setStep('analysing')
    setProgress('Analysing document against NDIS Practice Standards...')

    let standards: StandardResult[] = []
    try {
      // ponytail: use title+category heuristic endpoint (fast, 3-5s) not file upload (slow, 20-30s)
      const classifyRes = await fetch('/api/ai/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: title, fileName: file.name }),
      })
      if (classifyRes.ok) {
        const data = await classifyRes.json()
        standards = data.suggestions || []
      }
    } catch {
      // Classification failed — continue without standards
    }

    // Step 3: Link standards
    if (standards.length > 0) {
      setProgress(`Mapping to ${standards.length} standards...`)
      try {
        await fetch(`/api/evidence/${evidenceId}/standards`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ standardIds: standards.map(s => s.code) }),
        })
      } catch {
        // Link failed — continue
      }
    }

    // Step 4: Evaluate rules → get new score
    setProgress('Calculating compliance score...')
    let scoreAfter = scoreBefore
    let passing = 0
    let failing = 0
    let allFailing: RuleResult[] = []
    let criticalFailing: RuleResult[] = []

    try {
      const evalRes = await fetch('/api/rules/evaluate', { method: 'POST' })
      if (evalRes.ok) {
        const evalData = await evalRes.json()
        scoreAfter = evalData.score ?? scoreBefore
        passing = evalData.summary?.passing ?? 0
        failing = evalData.summary?.failing ?? 0

        allFailing = (evalData.evaluations || [])
          .filter((e: { isPassing: boolean }) => !e.isPassing)
          .map((e: RuleResult & { ruleCode: string }) => ({
            ruleCode: e.ruleCode,
            displayName: e.displayName || e.ruleCode,
            isPassing: false,
            severity: e.severity || 'MEDIUM',
            weight: e.weight || 0,
            evidenceRequired: e.evidenceRequired || '',
            remediation: e.remediation || '',
          }))

        criticalFailing = allFailing.filter(r =>
          r.severity === 'CRITICAL' || r.ruleCode.startsWith('REG')
        )
      }
    } catch {
      // Eval failed — show what we have
    }

    // Done → show results
    setResult({
      evidenceId,
      standards,
      scoreBefore,
      scoreAfter,
      passing,
      failing,
      criticalFailing,
      allFailing,
    })
    setStep('results')
  }

  async function handleGenerateDocument(rule: RuleResult) {
    setGenerating(rule.ruleCode)
    try {
      const res = await fetch('/api/ai/generate-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ruleCode: rule.ruleCode,
          displayName: rule.displayName,
          evidenceRequired: rule.evidenceRequired,
          remediation: rule.remediation,
        }),
      })
      if (!res.ok) throw new Error('Generation failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${rule.evidenceRequired || rule.displayName}.md`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`Generated: ${rule.evidenceRequired || rule.displayName}`)
    } catch {
      toast.error('Document generation failed')
    }
    setGenerating(null)
  }

  // --- IDLE STATE: Upload form ---
  if (step === 'idle') {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-5">
        {/* Dropzone */}
        {!file ? (
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); e.stopPropagation() }}
            onDrop={e => {
              e.preventDefault()
              const f = e.dataTransfer.files[0]
              if (f) handleFileSelect(f)
            }}
            className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-10 cursor-pointer hover:border-slate-400 hover:bg-slate-100 transition-colors"
          >
            <FileUp className="h-8 w-8 text-slate-400" />
            <div className="text-center">
              <p className="text-sm font-medium text-slate-700">Drop a file here or click to browse</p>
              <p className="text-xs text-slate-400 mt-1">PDF, DOCX, PNG, JPG, XLSX — max 25MB</p>
            </div>
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
        )}

        {/* Form fields — compact */}
        {file && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1a2332]/10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 pr-8 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1a2332]/10"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Expiry Date <span className="text-slate-400 font-normal">(optional)</span></label>
              <DatePicker value={expiryDate} onChange={setExpiryDate} placeholder="Select expiry date" />
            </div>
            <Button
              onClick={handleUploadAndAnalyse}
              disabled={!title}
              className="w-full h-10 bg-[#1a2332] text-white hover:bg-[#243447] disabled:opacity-50"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload &amp; Analyse
            </Button>
          </>
        )}
      </div>
    )
  }

  // --- UPLOADING / ANALYSING STATE ---
  if (step === 'uploading' || step === 'analysing') {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="h-8 w-8 text-[#1a2332] animate-spin" />
          <div>
            <p className="text-sm font-medium text-slate-900">
              {step === 'uploading' ? 'Uploading' : 'Analysing'} &ldquo;{title}&rdquo;
            </p>
            <p className="text-sm text-slate-500 mt-1">{progress}</p>
          </div>
          {step === 'analysing' && (
            <div className="w-full max-w-xs mt-2">
              <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                <div className="h-full bg-[#1a2332] rounded-full animate-pulse" style={{ width: '60%' }} />
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // --- RESULTS STATE ---
  if (step === 'results' && result) {
    const delta = result.scoreAfter - result.scoreBefore
    const scoreColor = result.scoreAfter >= 80 ? 'text-emerald-600' : result.scoreAfter >= 50 ? 'text-amber-600' : 'text-red-600'
    const deltaColor = delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-red-600' : 'text-slate-500'

    return (
      <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
        {/* Header */}
        <div className="px-6 py-4 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
          <p className="text-sm font-medium text-slate-900">
            Document analysed — mapped to {result.standards.length} standard{result.standards.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Standards satisfied */}
        {result.standards.length > 0 && (
          <div className="px-6 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-3">Standards satisfied</p>
            <div className="space-y-2">
              {result.standards.map(s => (
                <div key={s.code} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-emerald-600">{s.code}</span>
                    <span className="text-slate-700">{s.name}</span>
                  </div>
                  <span className="text-xs text-slate-400">{Math.round(s.confidence * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Score delta */}
        <div className="px-6 py-4">
          <div className="flex items-center gap-4">
            <p className="text-sm text-slate-600">Score:</p>
            <span className="text-sm text-slate-500">{result.scoreBefore}</span>
            <span className="text-slate-400">→</span>
            <span className={`text-lg font-semibold ${scoreColor}`}>{result.scoreAfter}</span>
            {delta !== 0 && (
              <span className={`text-sm font-medium ${deltaColor}`}>
                ({delta > 0 ? '+' : ''}{delta} pts)
              </span>
            )}
          </div>
        </div>

        {/* Still missing (critical first) */}
        {result.criticalFailing.length > 0 && (
          <div className="px-6 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-3">Still missing</p>
            <div className="space-y-3">
              {result.criticalFailing.slice(0, 8).map(rule => (
                <div key={rule.ruleCode} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                    <span className="text-sm text-slate-700 truncate">
                      {rule.evidenceRequired || rule.displayName}
                    </span>
                    {rule.severity === 'CRITICAL' && (
                      <span className="text-[10px] uppercase font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                        critical
                      </span>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs shrink-0"
                    disabled={generating === rule.ruleCode}
                    onClick={() => handleGenerateDocument(rule)}
                  >
                    {generating === rule.ruleCode ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <>
                        <Download className="h-3 w-3 mr-1" />
                        Generate
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="px-6 py-4 flex gap-3">
          <Button
            onClick={() => { reset(); onComplete() }}
            variant="outline"
            className="flex-1"
          >
            <Plus className="h-4 w-4 mr-2" />
            Upload Another
          </Button>
          <Button
            onClick={() => { reset(); onComplete() }}
            className="flex-1 bg-[#1a2332] text-white hover:bg-[#243447]"
          >
            Done
          </Button>
        </div>
      </div>
    )
  }

  return null
}
