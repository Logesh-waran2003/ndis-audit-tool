'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Download, Trash2, Loader2, Sparkles } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { DatePicker } from '@/components/ui/date-picker'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'

interface EvidenceStandardLink {
  id: string
  standardId: string
  confidence: number | null
  standard: { id: string; code: string; name: string }
}

interface Evidence {
  id: string
  title: string
  category: string
  status: string
  fileName: string
  fileUrl: string
  fileType: string
  fileSize: number
  notes: string | null
  uploadedAt: string
  expiryDate: string | null
  standardLinks: EvidenceStandardLink[]
}

interface AIReviewResult {
  evidenceId: string
  issues: { section: string; issue: string; suggestion: string; severity: string }[]
  overallStatus: string
  isMock?: boolean
}

interface EvidenceDetailSheetProps {
  evidence: Evidence | null
  open: boolean
  onClose: () => void
  onUpdate: () => void
}

const STATUS_COLORS: Record<string, string> = {
  CURRENT: 'text-[#059669]',
  OUTDATED: 'text-[#d97706]',
  EXPIRING: 'text-[#dc2626]',
  DRAFT: 'text-gray-500',
}

export function EvidenceDetailSheet({ evidence, open, onClose, onUpdate }: EvidenceDetailSheetProps) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [reviewResult, setReviewResult] = useState<AIReviewResult | null>(null)

  // Sync local state when evidence changes
  const [lastId, setLastId] = useState<string | null>(null)
  if (evidence && evidence.id !== lastId) {
    setLastId(evidence.id)
    setTitle(evidence.title)
    setNotes(evidence.notes || '')
    setExpiryDate(evidence.expiryDate ? evidence.expiryDate.split('T')[0] : '')
    setConfirmDelete(false)
    setReviewResult(null)
  }

  if (!evidence) return null

  async function handleSave() {
    if (!evidence) return
    setSaving(true)
    const res = await fetch(`/api/evidence/${evidence.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        notes: notes || undefined,
        expiryDate: expiryDate || null,
      }),
    })
    if (res.ok) {
      toast.success('Saved')
      onUpdate()
    } else {
      toast.error('Save failed')
    }
    setSaving(false)
  }

  async function handleDelete() {
    if (!evidence) return
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeleting(true)
    const res = await fetch(`/api/evidence/${evidence.id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Deleted')
      onClose()
      onUpdate()
    } else {
      toast.error('Delete failed')
    }
    setDeleting(false)
    setConfirmDelete(false)
  }

  async function handleAIReview() {
    if (!evidence) return
    setReviewing(true)
    setReviewResult(null)
    try {
      const res = await fetch('/api/ai/document-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evidenceId: evidence.id }),
      })
      if (res.ok) {
        setReviewResult(await res.json())
      } else {
        toast.error('AI review failed')
      }
    } catch {
      toast.error('AI review failed')
    }
    setReviewing(false)
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="sr-only">Evidence Details</SheetTitle>
          <SheetDescription className="sr-only">View and edit evidence details</SheetDescription>
        </SheetHeader>

        <div className="space-y-5 mt-4 px-1">
          {/* Title */}
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-navy/10"
            />
          </div>

          {/* Status + Category */}
          <div className="flex gap-6">
            <div>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide block">Status</span>
              <span className={`text-sm font-medium ${STATUS_COLORS[evidence.status] || ''}`}>
                {evidence.status.toLowerCase()}
              </span>
            </div>
            <div>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide block">Category</span>
              <span className="text-sm">{evidence.category.toLowerCase().replace('_', ' ')}</span>
            </div>
          </div>

          {/* File info */}
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide block">File</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm truncate">{evidence.fileName}</span>
              <span className="text-xs text-slate-500">({formatSize(evidence.fileSize)})</span>
              <a
                href={evidence.fileUrl}
                download
                className="ml-auto text-slate-500 hover:text-foreground"
              >
                <Download className="size-4" />
              </a>
            </div>
          </div>

          {/* Dates */}
          <div className="flex gap-6">
            <div>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide block">Uploaded</span>
              <span className="text-sm">{formatDistanceToNow(new Date(evidence.uploadedAt), { addSuffix: true })}</span>
            </div>
            <div>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide block">Expiry</span>
              <DatePicker value={expiryDate} onChange={setExpiryDate} placeholder="Set expiry" />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-navy/10 resize-none"
            />
          </div>

          {/* Linked Standards */}
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide block">Linked Standards</span>
            {evidence.standardLinks.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {evidence.standardLinks.map((link) => (
                  <button
                    key={link.id}
                    onClick={() => router.push(`/standards/${link.standard.code}`)}
                    className="font-mono text-xs px-2 py-1 border rounded hover:bg-slate-50"
                  >
                    {link.standard.code}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 mt-1">No linked standards</p>
            )}
          </div>

          {/* AI Review */}
          <div>
            <Button variant="outline" size="sm" onClick={handleAIReview} disabled={reviewing}>
              {reviewing ? <Loader2 className="size-4 animate-spin mr-1.5" /> : <Sparkles className="size-4 mr-1.5" />}
              Run AI Review
            </Button>
            {reviewResult && (
              <div className="mt-3 space-y-2 text-sm">
                <p className="text-xs text-slate-500 uppercase tracking-wide">
                  Review result: <span className={STATUS_COLORS[reviewResult.overallStatus] || ''}>{reviewResult.overallStatus.toLowerCase()}</span>
                  {reviewResult.isMock && <span className="ml-1 text-slate-500">(mock)</span>}
                </p>
                {reviewResult.issues.length > 0 ? (
                  <ul className="space-y-1.5">
                    {reviewResult.issues.map((issue, i) => (
                      <li key={i} className="border rounded p-2">
                        <p className="font-medium">{issue.issue}</p>
                        <p className="text-slate-500 text-xs mt-0.5">{issue.suggestion}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-500">No issues found.</p>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t">
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin mr-1.5" /> : null}
              Save Changes
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={confirmDelete ? 'border-red-300 text-red-600 hover:bg-red-50' : ''}
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="size-4 animate-spin mr-1.5" /> : <Trash2 className="size-4 mr-1.5" />}
              {confirmDelete ? 'Confirm delete' : 'Delete'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
