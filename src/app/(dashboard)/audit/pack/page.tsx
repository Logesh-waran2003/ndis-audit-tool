'use client'

import { useCallback, useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Copy, ExternalLink } from 'lucide-react'

interface AuditPack {
  id: string
  name: string
  token: string
  generatedAt: string
  expiresAt: string
}

export default function AuditPackPage() {
  const [packs, setPacks] = useState<AuditPack[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  // Form
  const [name, setName] = useState('Verification Audit Pack')
  const [expiryDays, setExpiryDays] = useState('30')

  const fetchPacks = useCallback(async () => {
    try {
      const res = await fetch('/api/audit/pack')
      if (res.ok) setPacks(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPacks() }, [fetchPacks])

  async function generatePack() {
    setGenerating(true)
    try {
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + parseInt(expiryDays))
      const res = await fetch('/api/audit/pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, expiresAt: expiresAt.toISOString() }),
      })
      if (res.ok) fetchPacks()
    } finally {
      setGenerating(false)
    }
  }

  function copyUrl(token: string) {
    const url = `${window.location.origin}/portal/${token}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const latestPack = packs[0]

  if (loading) {
    return <div className="py-12 text-center"><p className="text-sm text-slate-400">Loading...</p></div>
  }

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-[#1a2332]">Audit Pack</h1>

      {/* Generate form */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="font-heading text-base font-semibold text-[#1a2332]">
          {latestPack ? 'Generate New Pack' : 'Generate Your First Audit Pack'}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Creates a read-only portal link for your auditor with a snapshot of current compliance.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Pack Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="h-9 w-64 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1a2332]/10"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Expires in</label>
            <select
              value={expiryDays}
              onChange={e => setExpiryDays(e.target.value)}
              className="h-9 rounded-md border border-slate-300 bg-white px-3 pr-8 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1a2332]/10"
            >
              <option value="7">7 days</option>
              <option value="14">14 days</option>
              <option value="30">30 days</option>
              <option value="60">60 days</option>
              <option value="90">90 days</option>
            </select>
          </div>
          <Button
            className="bg-[#1a2332] text-white hover:bg-[#2a3a4f]"
            disabled={!name || generating}
            onClick={generatePack}
          >
            {generating ? 'Generating...' : 'Generate Pack'}
          </Button>
        </div>
      </div>

      {/* Latest pack */}
      {latestPack && (
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="font-heading text-base font-semibold text-[#1a2332]">Latest Pack</h2>
          <div className="mt-3 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-900">{latestPack.name}</p>
                <p className="text-xs text-slate-500">
                  Generated {format(new Date(latestPack.generatedAt), 'd MMM yyyy HH:mm')}
                  {' · '}Expires {format(new Date(latestPack.expiresAt), 'd MMM yyyy')}
                </p>
              </div>
            </div>

            {/* URL */}
            <div className="flex items-center gap-2 rounded-md bg-slate-50 border border-slate-200 px-3 py-2">
              <code className="flex-1 text-xs text-slate-700 font-mono truncate">
                {typeof window !== 'undefined' ? `${window.location.origin}/portal/${latestPack.token}` : `/portal/${latestPack.token}`}
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyUrl(latestPack.token)}
                className="shrink-0 text-slate-600"
              >
                <Copy className="h-3.5 w-3.5 mr-1" />
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <a
                href={`/portal/${latestPack.token}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-[#1a2332] underline underline-offset-2"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Preview Portal
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Pack history */}
      {packs.length > 1 && (
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-200">
            <h2 className="text-sm font-medium text-slate-700">Previous Packs</h2>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {packs.slice(1).map(pack => (
                <tr key={pack.id} className="border-b border-slate-100">
                  <td className="px-4 py-3 text-slate-900">{pack.name}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {format(new Date(pack.generatedAt), 'd MMM yyyy')}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    Expires {format(new Date(pack.expiresAt), 'd MMM yyyy')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => copyUrl(pack.token)} className="text-slate-600">
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
