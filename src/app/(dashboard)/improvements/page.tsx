'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format, isPast } from 'date-fns'
import { DatePicker } from '@/components/ui/date-picker'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ChevronDown, ChevronRight, Plus } from 'lucide-react'
import Link from 'next/link'

interface LinkedIncident {
  id: string
  title: string
  type: string
}

interface Improvement {
  id: string
  title: string
  description: string
  source: string
  sourceId: string | null
  actionRequired: string
  actionTaken: string | null
  responsiblePerson: string
  status: string
  dueDate: string
  identifiedDate: string
  incidents: LinkedIncident[]
}

const STATUS_COLOR: Record<string, string> = {
  OPEN: 'text-[#d97706]',
  IN_PROGRESS: 'text-[#d97706]',
  COMPLETED: 'text-[#059669]',
  OVERDUE: 'text-[#dc2626]',
}

const SOURCES = ['INCIDENT', 'COMPLAINT', 'FEEDBACK', 'AUDIT', 'INTERNAL_REVIEW', 'RISK_ASSESSMENT'] as const

export default function ImprovementsPage() {
  const router = useRouter()
  const [improvements, setImprovements] = useState<Improvement[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  // Form
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [source, setSource] = useState<string>('INTERNAL_REVIEW')
  const [actionRequired, setActionRequired] = useState('')
  const [responsiblePerson, setResponsiblePerson] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchImprovements = useCallback(async () => {
    try {
      const res = await fetch('/api/improvements')
      if (res.ok) setImprovements(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchImprovements() }, [fetchImprovements])

  async function recordImprovement() {
    if (!title || !description || !actionRequired || !responsiblePerson || !dueDate) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/improvements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, source, actionRequired, responsiblePerson, dueDate }),
      })
      if (res.ok) {
        setDialogOpen(false)
        setTitle(''); setDescription(''); setActionRequired(''); setResponsiblePerson(''); setDueDate('')
        setSource('INTERNAL_REVIEW')
        fetchImprovements()
        router.refresh()
      }
    } finally {
      setSubmitting(false)
    }
  }

  const inProgress = improvements.filter(i => i.status === 'OPEN' || i.status === 'IN_PROGRESS').length
  const overdue = improvements.filter(i => (i.status === 'OPEN' || i.status === 'IN_PROGRESS') && isPast(new Date(i.dueDate))).length

  if (loading) {
    return <div className="py-12 text-center"><p className="text-sm text-slate-400">Loading...</p></div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[#1a2332]">Continuous Improvement</h1>
          {improvements.length > 0 && (
            <p className="text-sm text-slate-500 mt-0.5">
              {inProgress} action{inProgress !== 1 ? 's' : ''} in progress
              {overdue > 0 && <span className="text-[#dc2626]">, {overdue} overdue</span>}
            </p>
          )}
        </div>
        <Button className="bg-[#1a2332] text-white hover:bg-[#2a3a4f]" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Record Improvement
        </Button>
      </div>

      {/* Table */}
      {improvements.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white py-12 text-center">
          <p className="text-slate-500">No improvements recorded yet.</p>
          <Button variant="outline" size="sm" className="mt-4 border-slate-300" onClick={() => setDialogOpen(true)}>
            Record your first improvement
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="w-8 px-2 py-3"></th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Title</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Source</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Due</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Responsible</th>
              </tr>
            </thead>
            <tbody>
              {improvements.map(imp => {
                const isOverdue = (imp.status === 'OPEN' || imp.status === 'IN_PROGRESS') && isPast(new Date(imp.dueDate))
                return (
                  <>
                    <tr
                      key={imp.id}
                      onClick={() => setExpanded(expanded === imp.id ? null : imp.id)}
                      className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors ${isOverdue ? 'border-l-2 border-l-[#dc2626]' : ''}`}
                    >
                      <td className="px-2 py-3 text-slate-400">
                        {expanded === imp.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {format(new Date(imp.identifiedDate), 'd MMM yyyy')}
                      </td>
                      <td className="px-4 py-3 text-slate-900 font-medium">{imp.title}</td>
                      <td className="px-4 py-3 text-slate-600">{imp.source.replace(/_/g, ' ')}</td>
                      <td className={`px-4 py-3 font-medium ${isOverdue ? 'text-[#dc2626]' : STATUS_COLOR[imp.status] || 'text-slate-600'}`}>
                        {isOverdue ? 'overdue' : imp.status.toLowerCase().replace(/_/g, ' ')}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {format(new Date(imp.dueDate), 'd MMM yyyy')}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{imp.responsiblePerson}</td>
                    </tr>
                    {expanded === imp.id && (
                      <tr key={`${imp.id}-detail`}>
                        <td colSpan={7} className="bg-slate-50 px-8 py-4">
                          <div className="space-y-3 text-sm">
                            <div>
                              <span className="text-xs font-medium uppercase text-slate-500">Description</span>
                              <p className="mt-1 text-slate-700">{imp.description}</p>
                            </div>
                            <div>
                              <span className="text-xs font-medium uppercase text-slate-500">Action Required</span>
                              <p className="mt-1 text-slate-700">{imp.actionRequired}</p>
                            </div>
                            {imp.actionTaken && (
                              <div>
                                <span className="text-xs font-medium uppercase text-slate-500">Action Taken</span>
                                <p className="mt-1 text-slate-700">{imp.actionTaken}</p>
                              </div>
                            )}
                            {imp.incidents.length > 0 && (
                              <div className="pt-2 border-t border-slate-200">
                                <span className="text-xs font-medium uppercase text-slate-500">Source Incident</span>
                                {imp.incidents.map(inc => (
                                  <Link
                                    key={inc.id}
                                    href="/incidents"
                                    className="mt-1 block text-sm text-slate-700 hover:text-[#1a2332] underline underline-offset-2"
                                  >
                                    {inc.title} ({inc.type.replace(/_/g, ' ').toLowerCase()})
                                  </Link>
                                ))}
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

      {/* Record Improvement Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading">Record Improvement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1a2332]/10" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1a2332]/10" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Source</label>
              <select value={source} onChange={e => setSource(e.target.value)}
                className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 pr-8 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1a2332]/10">
                {SOURCES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Action Required</label>
              <textarea value={actionRequired} onChange={e => setActionRequired(e.target.value)} rows={2}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1a2332]/10" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Responsible Person</label>
                <input type="text" value={responsiblePerson} onChange={e => setResponsiblePerson(e.target.value)}
                  className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1a2332]/10" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                <DatePicker value={dueDate} onChange={setDueDate} placeholder="Select due date" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" className="border-slate-300 text-slate-700" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button className="bg-[#1a2332] text-white hover:bg-[#2a3a4f]"
                disabled={!title || !description || !actionRequired || !responsiblePerson || !dueDate || submitting}
                onClick={recordImprovement}>
                {submitting ? 'Saving...' : 'Record Improvement'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
