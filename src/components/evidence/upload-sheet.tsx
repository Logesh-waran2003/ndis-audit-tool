'use client'

import { useState, useRef } from 'react'
import { FileUp, Loader2, Check, X, Upload } from 'lucide-react'
import { DatePicker } from '@/components/ui/date-picker'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

interface AISuggestion {
  code: string
  name: string
  confidence: number
}

interface UploadSheetProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function UploadSheet({ open, onClose, onSuccess }: UploadSheetProps) {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('POLICY')
  const [notes, setNotes] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [uploading, setUploading] = useState(false)
  const [classifying, setClassifying] = useState(false)
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([])
  const [acceptedStandards, setAcceptedStandards] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setFile(null)
    setTitle('')
    setCategory('POLICY')
    setNotes('')
    setExpiryDate('')
    setSuggestions([])
    setAcceptedStandards([])
  }

  const handleFileSelect = (f: File) => {
    setFile(f)
    // Auto-fill title from filename
    const name = f.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')
    setTitle(name.charAt(0).toUpperCase() + name.slice(1))
    // Trigger AI classification
    classifyFile(f)
  }

  const classifyFile = async (f: File) => {
    setClassifying(true)
    try {
      const formData = new FormData()
      formData.append('file', f)
      const res = await fetch('/api/ai/classify', { method: 'POST', body: formData })
      if (res.ok) {
        const data = await res.json()
        if (data.suggestions) setSuggestions(data.suggestions)
      }
    } catch { /* ignore classification errors */ }
    setClassifying(false)
  }

  const handleUpload = async () => {
    if (!file || !title || !category) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', title)
      formData.append('category', category)
      if (notes) formData.append('notes', notes)
      if (expiryDate) formData.append('expiryDate', expiryDate)

      const res = await fetch('/api/evidence', { method: 'POST', body: formData })
      if (res.ok) {
        const evidence = await res.json()
        // Link accepted standards
        if (acceptedStandards.length > 0) {
          await fetch(`/api/evidence/${evidence.id}/standards`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ standardIds: acceptedStandards }),
          })
        }
        reset()
        onSuccess()
        onClose()
      }
    } catch { /* error handling */ }
    setUploading(false)
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) { reset(); onClose() } }}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto p-0">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-6 py-4">
          <SheetHeader className="p-0">
            <SheetTitle className="text-lg font-heading font-semibold text-[#1a2332]">
              Upload Evidence
            </SheetTitle>
          </SheetHeader>
          <p className="text-sm text-slate-500 mt-1">
            Upload a document and map it to the relevant Practice Standards.
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* File drop zone */}
          {!file ? (
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
              onDrop={(e) => {
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
                onChange={(e) => {
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
                onClick={() => { setFile(null); setSuggestions([]) }}
                className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Form fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Document title"
                className="w-full h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1a2332]/10"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1a2332]/10"
              >
                <option value="POLICY">Policy</option>
                <option value="WORKER">Worker Record</option>
                <option value="PARTICIPANT">Participant Record</option>
                <option value="INCIDENT">Incident Record</option>
                <option value="SERVICE_DELIVERY">Service Delivery</option>
                <option value="GOVERNANCE">Governance</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes <span className="text-slate-400 font-normal">(optional)</span></label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any context about this document..."
                rows={3}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1a2332]/10 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Expiry Date <span className="text-slate-400 font-normal">(optional)</span></label>
              <DatePicker value={expiryDate} onChange={setExpiryDate} placeholder="Select expiry date" />
            </div>
          </div>

          {/* AI Standard Suggestions */}
          {(classifying || suggestions.length > 0) && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm font-medium text-blue-900 mb-2">
                {classifying ? 'Analysing document...' : 'Suggested Standards'}
              </p>
              {classifying ? (
                <div className="flex items-center gap-2 text-sm text-blue-700">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>AI is identifying which standards this document supports</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {suggestions.map((s) => (
                    <div
                      key={s.code}
                      className="flex items-center justify-between py-1.5"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-xs text-blue-600">{s.code}</span>
                        <span className="text-sm text-blue-900 truncate">{s.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-blue-500">{Math.round(s.confidence * 100)}%</span>
                        <button
                          onClick={() => {
                            if (acceptedStandards.includes(s.code)) {
                              setAcceptedStandards(acceptedStandards.filter(c => c !== s.code))
                            } else {
                              setAcceptedStandards([...acceptedStandards, s.code])
                            }
                          }}
                          className={`p-1 rounded-full transition-colors ${
                            acceptedStandards.includes(s.code)
                              ? 'bg-blue-600 text-white'
                              : 'bg-white border border-blue-300 text-blue-400 hover:border-blue-500'
                          }`}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <p className="text-xs text-blue-600 mt-2">
                    Click ✓ to accept suggestions. You can change these later.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer - sticky at bottom */}
        <div className="sticky bottom-0 border-t border-slate-200 bg-white px-6 py-4">
          <Button
            onClick={handleUpload}
            disabled={!file || !title || !category || uploading}
            className="w-full h-10 bg-[#1a2332] text-white hover:bg-[#243447] disabled:opacity-50"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload Document
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
