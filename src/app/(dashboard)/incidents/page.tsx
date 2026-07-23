'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
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

interface Improvement {
  id: string
  title: string
  status: string
}

interface Incident {
  id: string
  type: string
  title: string
  description: string
  dateOccurred: string
  reportedBy: string
  severity: string
  status: string
  isReportable: boolean
  correctiveAction: string | null
  investigationNotes: string | null
  linkedImprovement: Improvement | null
  createdAt: string
}

const SEVERITY_COLOR: Record<string, string> = {
  LOW: 'text-[#059669]',
  MEDIUM: 'text-[#d97706]',
  HIGH: 'text-[#dc2626]',
  CRITICAL: 'text-[#dc2626]',
}

const TYPES = ['INCIDENT', 'COMPLAINT', 'NEAR_MISS', 'FEEDBACK'] as const
const STATUSES = ['OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED'] as const
const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const

export default function IncidentsPage() {
  const router = useRouter()
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  // Filters
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // Form
  const [type, setType] = useState<string>('INCIDENT')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dateOccurred, setDateOccurred] = useState('')
  const [reportedBy, setReportedBy] = useState('')
  const [severity, setSeverity] = useState<string>('MEDIUM')
  const [submitting, setSubmitting] = useState(false)

  const fetchIncidents = useCallback(async () => {
    const params = new URLSearchParams()
    if (typeFilter) params.set('type', typeFilter)
    if (statusFilter) params.set('status', statusFilter)
    try {
      const res = await fetch(`/api/incidents?${params}`)
      if (res.ok) setIncidents(await res.json())
    } finally {
      setLoading(false)
    }
  }, [typeFilter, statusFilter])

  useEffect(() => { fetchIncidents() }, [fetchIncidents])

  async function logIncident() {
    if (!title || !description || !dateOccurred || !reportedBy) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, title, description, dateOccurred, reportedBy, severity }),
      })
      if (res.ok) {
        setDialogOpen(false)
        setTitle(''); setDescription(''); setDateOccurred(''); setReportedBy('')
        setType('INCIDENT'); setSeverity('MEDIUM')
        fetchIncidents()
        router.refresh()
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="py-12 text-center"><p className="text-sm text-slate-400">Loading...</p></div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-[#1a2332]">Incidents &amp; Complaints</h1>
        <Button className="bg-[#1a2332] text-white hover:bg-[#2a3a4f]" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Log Incident
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="h-9 rounded-md border border-slate-300 bg-white px-3 pr-8 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1a2332]/10"
        >
          <option value="">All types</option>
          {TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="h-9 rounded-md border border-slate-300 bg-white px-3 pr-8 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1a2332]/10"
        >
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      {incidents.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white py-12 text-center">
          <p className="text-slate-500">No incidents recorded.</p>
          <Button variant="outline" size="sm" className="mt-4 border-slate-300" onClick={() => setDialogOpen(true)}>
            Log your first incident
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="w-8 px-2 py-3"></th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Title</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Severity</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map(incident => (
                <>
                  <tr
                    key={incident.id}
                    onClick={() => setExpanded(expanded === incident.id ? null : incident.id)}
                    className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="px-2 py-3 text-slate-400">
                      {expanded === incident.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {format(new Date(incident.dateOccurred), 'd MMM yyyy')}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{incident.type.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 text-slate-900 font-medium">{incident.title}</td>
                    <td className={`px-4 py-3 font-medium ${SEVERITY_COLOR[incident.severity]}`}>
                      {incident.severity.toLowerCase()}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{incident.status.toLowerCase()}</td>
                  </tr>
                  {expanded === incident.id && (
                    <tr key={`${incident.id}-detail`}>
                      <td colSpan={6} className="bg-slate-50 px-8 py-4">
                        <div className="space-y-3 text-sm">
                          <div>
                            <span className="text-xs font-medium uppercase text-slate-500">Description</span>
                            <p className="mt-1 text-slate-700">{incident.description}</p>
                          </div>
                          <div className="flex gap-6 text-xs text-slate-500">
                            <span>Reported by: {incident.reportedBy}</span>
                            {incident.isReportable && <span className="text-[#dc2626] font-medium">Reportable incident</span>}
                          </div>
                          {incident.investigationNotes && (
                            <div>
                              <span className="text-xs font-medium uppercase text-slate-500">Investigation Notes</span>
                              <p className="mt-1 text-slate-700">{incident.investigationNotes}</p>
                            </div>
                          )}
                          {incident.correctiveAction && (
                            <div>
                              <span className="text-xs font-medium uppercase text-slate-500">Corrective Action</span>
                              <p className="mt-1 text-slate-700">{incident.correctiveAction}</p>
                            </div>
                          )}
                          {incident.linkedImprovement && (
                            <div className="pt-2 border-t border-slate-200">
                              <span className="text-xs font-medium uppercase text-slate-500">Linked Improvement</span>
                              <Link
                                href="/improvements"
                                className="mt-1 block text-sm text-slate-700 hover:text-[#1a2332] underline underline-offset-2"
                              >
                                {incident.linkedImprovement.title} ({incident.linkedImprovement.status.toLowerCase()})
                              </Link>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Log Incident Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading">Log Incident</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
              <select value={type} onChange={e => setType(e.target.value)}
                className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 pr-8 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1a2332]/10">
                {TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1a2332]/10" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1a2332]/10" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date Occurred</label>
                <DatePicker value={dateOccurred} onChange={setDateOccurred} placeholder="Select date" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Severity</label>
                <select value={severity} onChange={e => setSeverity(e.target.value)}
                  className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 pr-8 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1a2332]/10">
                  {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Reported By</label>
              <input type="text" value={reportedBy} onChange={e => setReportedBy(e.target.value)}
                className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1a2332]/10" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" className="border-slate-300 text-slate-700" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button className="bg-[#1a2332] text-white hover:bg-[#2a3a4f]"
                disabled={!title || !description || !dateOccurred || !reportedBy || submitting}
                onClick={logIncident}>
                {submitting ? 'Saving...' : 'Log Incident'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
