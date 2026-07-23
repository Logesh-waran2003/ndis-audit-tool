'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface RuleFixActionsProps {
  ruleCode: string
  displayName: string
  evidenceRequired: string
  remediation: string
}

export function RuleFixActions({ ruleCode, displayName, evidenceRequired, remediation }: RuleFixActionsProps) {
  const router = useRouter()
  const [generating, setGenerating] = useState(false)

  async function handleGenerateFix() {
    setGenerating(true)
    try {
      const res = await fetch('/api/documents/fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ruleCode, issue: `${evidenceRequired}. ${remediation}` }),
      })
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${displayName} - Fix.docx`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Document generated')
    } catch {
      toast.error('Generation failed')
    }
    setGenerating(false)
  }

  return (
    <div className="flex gap-3 mt-3 pt-3 border-t border-slate-100">
      <button
        onClick={() => router.push('/evidence')}
        className="text-sm font-medium text-[#1a2332] underline underline-offset-2"
      >
        Upload evidence →
      </button>
      <button
        onClick={handleGenerateFix}
        disabled={generating}
        className="text-sm font-medium text-blue-600 underline underline-offset-2 disabled:opacity-50"
      >
        {generating ? (
          <span className="flex items-center gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin" />
            Generating...
          </span>
        ) : (
          'Generate fix (DOCX) →'
        )}
      </button>
    </div>
  )
}
