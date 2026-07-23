'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileUp, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

// ponytail: category detection from filename heuristic — avoids per-file form inputs
function detectCategory(filename: string): string {
  const lower = filename.toLowerCase()
  if (lower.includes('insurance') || lower.includes('liability') || lower.includes('indemnity') || lower.includes('workers comp')) return 'GOVERNANCE'
  if (lower.includes('screening') || lower.includes('worker') || lower.includes('police') || lower.includes('wwcc')) return 'WORKER'
  if (lower.includes('agreement') || lower.includes('participant') || lower.includes('consent') || lower.includes('statement')) return 'PARTICIPANT'
  if (lower.includes('incident') || lower.includes('complaint')) return 'INCIDENT'
  if (lower.includes('registration') || lower.includes('certificate') || lower.includes('rego')) return 'GOVERNANCE'
  return 'POLICY'
}

export default function OnboardingPage() {
  const router = useRouter()
  const [participantCount, setParticipantCount] = useState('')
  const [staffCount, setStaffCount] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState({ uploaded: 0, total: 0 })
  const inputRef = useRef<HTMLInputElement>(null)

  const canContinue = participantCount && staffCount && files.length > 0 && !uploading

  async function handleContinue() {
    if (!canContinue) return
    setUploading(true)
    setProgress({ uploaded: 0, total: files.length })

    // 1. Save org details
    try {
      await fetch('/api/organisation', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantCount: parseInt(participantCount),
          staffCount: parseInt(staffCount),
        }),
      })
    } catch {
      // Non-fatal
    }

    // 2. Upload all files in parallel
    let uploaded = 0
    const uploadPromises = files.map(async (file) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '))
      formData.append('category', detectCategory(file.name))
      try {
        await fetch('/api/evidence', { method: 'POST', body: formData })
      } catch {
        // Individual upload failures don't block
      }
      uploaded++
      setProgress({ uploaded, total: files.length })
    })

    await Promise.all(uploadPromises)

    // 3. Set flag and redirect to results
    localStorage.setItem('onboarding_complete', 'true')
    router.push('/onboarding/results')
  }

  function handleStartFresh() {
    // Save counts if provided, then go to checklist
    if (participantCount || staffCount) {
      fetch('/api/organisation', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantCount: participantCount ? parseInt(participantCount) : undefined,
          staffCount: staffCount ? parseInt(staffCount) : undefined,
        }),
      }).catch(() => {})
    }
    localStorage.setItem('onboarding_complete', 'true')
    router.push('/evidence')
  }

  function handleFilesAdded(newFiles: File[]) {
    setFiles(prev => [...prev, ...newFiles])
  }

  function removeFile(index: number) {
    setFiles(files.filter((_, i) => i !== index))
  }

  // --- Uploading state ---
  if (uploading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="w-full max-w-[600px] bg-white rounded-lg border border-slate-200 p-10 text-center space-y-4">
          <Loader2 className="h-8 w-8 text-[#1a2332] animate-spin mx-auto" />
          <div>
            <p className="text-sm font-medium text-slate-900">Analysing your documents...</p>
            <p className="text-sm text-slate-500 mt-1">
              Uploading: {progress.uploaded}/{progress.total} complete {progress.uploaded === progress.total && '✓'}
            </p>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-[#1a2332] rounded-full transition-all"
              style={{ width: `${progress.total ? (progress.uploaded / progress.total) * 100 : 0}%` }}
            />
          </div>
          <p className="text-xs text-slate-400">This takes 30–60 seconds for large document sets.</p>
        </div>
      </div>
    )
  }

  // --- Main form ---
  return (
    <div className="min-h-[calc(100vh-64px)] flex items-start justify-center py-12">
      <div className="w-full max-w-[600px] space-y-8">
        {/* Header */}
        <div>
          <h1 className="font-heading text-2xl font-bold text-[#1a2332]">Let&apos;s get you audit-ready.</h1>
        </div>

        {/* Counts */}
        <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              How many participants do you currently manage?
            </label>
            <input
              type="number"
              value={participantCount}
              onChange={e => setParticipantCount(e.target.value)}
              placeholder="e.g. 150"
              min="0"
              className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1a2332]/10"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              How many staff (including yourself)?
            </label>
            <input
              type="number"
              value={staffCount}
              onChange={e => setStaffCount(e.target.value)}
              placeholder="e.g. 5"
              min="1"
              className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1a2332]/10"
            />
          </div>
        </div>

        {/* Upload zone */}
        <div>
          <p className="text-sm font-medium text-slate-700 mb-1">Upload your compliance documents</p>
          <p className="text-xs text-slate-500 mb-3">
            Policies, certificates, staff records, previous audit evidence — whatever you have. Upload as many files as you like.
          </p>

          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); e.stopPropagation() }}
            onDrop={e => {
              e.preventDefault()
              handleFilesAdded(Array.from(e.dataTransfer.files))
            }}
            className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-12 cursor-pointer hover:border-slate-400 hover:bg-slate-100 transition-colors"
          >
            <FileUp className="h-6 w-6 text-slate-400" />
            <p className="text-sm font-medium text-slate-700">Drop files here or click to browse</p>
            <p className="text-xs text-slate-400">PDF, DOCX, PNG, JPG, XLSX — upload multiple files</p>
            <input
              ref={inputRef}
              type="file"
              multiple
              className="hidden"
              accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.xlsx,.xls"
              onChange={e => {
                handleFilesAdded(Array.from(e.target.files || []))
                e.target.value = '' // allow re-selecting same files
              }}
            />
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="mt-3 space-y-1">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-2 py-1">
                  <span className="text-[#059669] text-sm">✓</span>
                  <span className="text-sm text-slate-700 truncate flex-1">{f.name}</span>
                  <span className="text-xs text-slate-400">{(f.size / 1024).toFixed(0)}KB</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFile(i) }}
                    className="text-slate-400 hover:text-red-500 p-0.5"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={handleContinue}
            disabled={!canContinue}
            className="w-full h-10 bg-[#1a2332] text-white hover:bg-[#243447] disabled:opacity-50"
          >
            Continue →
          </Button>
          <div className="text-center">
            <span className="text-xs text-slate-400">— or —</span>
          </div>
          <button
            onClick={handleStartFresh}
            className="w-full text-sm text-slate-500 underline hover:text-slate-700"
          >
            I don&apos;t have any documents yet — start fresh
          </button>
        </div>
      </div>
    </div>
  )
}
