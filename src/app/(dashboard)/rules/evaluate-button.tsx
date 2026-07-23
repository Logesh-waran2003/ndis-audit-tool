'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function EvaluateButton() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleEvaluate() {
    setLoading(true)
    await fetch('/api/rules/evaluate', { method: 'POST' })
    router.refresh()
    setLoading(false)
  }

  return (
    <button
      onClick={handleEvaluate}
      disabled={loading}
      className="shrink-0 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? 'Evaluating...' : 'Re-evaluate Rules'}
    </button>
  )
}
