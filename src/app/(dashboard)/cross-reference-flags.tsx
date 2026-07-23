'use client'

import { useEffect, useState } from 'react'

interface Flag {
  severity: 'CRITICAL' | 'MAJOR' | 'MINOR'
  description: string
  recommendation?: string
}

const SEVERITY_ICON: Record<string, string> = {
  CRITICAL: '🔴',
  MAJOR: '🟡',
  MINOR: '🔵',
}

const SEVERITY_ORDER: Record<string, number> = { CRITICAL: 0, MAJOR: 1, MINOR: 2 }

export function CrossReferenceFlags() {
  const [flags, setFlags] = useState<Flag[]>([])
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/cross-reference', { method: 'POST' })
      .then(r => r.ok ? r.json() : { flags: [] })
      .then(d => setFlags((d.flags || []).sort((a: Flag, b: Flag) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9))))
      .catch(() => {})
  }, [])

  if (flags.length === 0) return null

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <h2 className="font-heading text-lg font-semibold text-[#1a2332]">Issues Found</h2>
      <ul className="mt-3 space-y-2">
        {flags.map((flag, i) => (
          <li key={i}>
            <button
              onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
              className="flex items-start gap-2 text-sm text-left w-full"
            >
              <span className="shrink-0">{SEVERITY_ICON[flag.severity] || '🔵'}</span>
              <span className="text-slate-700">
                <span className="font-medium">{flag.severity}:</span> {flag.description}
              </span>
            </button>
            {expandedIdx === i && flag.recommendation && (
              <p className="mt-1 ml-6 text-xs text-slate-500">{flag.recommendation}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
