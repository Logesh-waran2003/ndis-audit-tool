'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ChevronDown, ChevronRight, Plus } from 'lucide-react'
import { DatePicker } from '@/components/ui/date-picker'

interface Training {
  id: string
  title: string
  completedDate: string
  expiryDate: string | null
  notes: string | null
}

interface Supervision {
  id: string
  date: string
  supervisorName: string
  notes: string
}

interface Worker {
  id: string
  name: string
  role: string
  email: string | null
  screeningStatus: string
  screeningExpiry: string | null
  policeCheckExpiry: string | null
  wwccExpiry: string | null
  complianceStatus: string
  daysUntilExpiry: number | null
  trainings: Training[]
  supervisions: Supervision[]
}

const COMPLIANCE_COLOR: Record<string, string> = {
  CURRENT: 'text-[#059669]',
  EXPIRING: 'text-[#d97706]',
  EXPIRED: 'text-[#dc2626]',
  PENDING: 'text-slate-500',
}

export default function WorkersPage() {
  const router = useRouter()
  const [workers, setWorkers] = useState<Worker[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [trainingDialogFor, setTrainingDialogFor] = useState<string | null>(null)
  const [supervisionDialogFor, setSupervisionDialogFor] = useState<string | null>(null)

  // Add worker form
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [email, setEmail] = useState('')
  const [screeningExpiry, setScreeningExpiry] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Training form
  const [trainingTitle, setTrainingTitle] = useState('')
  const [trainingDate, setTrainingDate] = useState('')

  // Supervision form
  const [supervisionDate, setSupervisionDate] = useState('')
  const [supervisorName, setSupervisorName] = useState('')
  const [supervisionNotes, setSupervisionNotes] = useState('')

  const fetchWorkers = useCallback(async () => {
    try {
      const res = await fetch('/api/workers')
      if (res.ok) setWorkers(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchWorkers() }, [fetchWorkers])

  async function addWorker() {
    if (!name || !role) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/workers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, role, email: email || undefined, screeningExpiry: screeningExpiry || undefined }),
      })
      if (res.ok) {
        setDialogOpen(false)
        setName(''); setRole(''); setEmail(''); setScreeningExpiry('')
        fetchWorkers()
        router.refresh()
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function addTraining(workerId: string) {
    if (!trainingTitle || !trainingDate) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/workers/${workerId}/training`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trainingTitle, completedDate: trainingDate }),
      })
      if (res.ok) {
        setTrainingDialogFor(null)
        setTrainingTitle(''); setTrainingDate('')
        fetchWorkers()
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function addSupervision(workerId: string) {
    if (!supervisionDate || !supervisorName || !supervisionNotes) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/workers/${workerId}/supervision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: supervisionDate, supervisorName, notes: supervisionNotes }),
      })
      if (res.ok) {
        setSupervisionDialogFor(null)
        setSupervisionDate(''); setSupervisorName(''); setSupervisionNotes('')
        fetchWorkers()
      }
    } finally {
      setSubmitting(false)
    }
  }

  const expiring = workers.filter(w => w.complianceStatus === 'EXPIRING' || w.complianceStatus === 'EXPIRED')

  if (loading) {
    return <div className="py-12 text-center"><p className="text-sm text-slate-400">Loading...</p></div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[#1a2332]">Workers</h1>
          {expiring.length === 0 && workers.length > 0 && (
            <p className="text-sm text-[#059669] mt-0.5">All screening current ✓</p>
          )}
          {expiring.length > 0 && (
            <p className="text-sm text-[#d97706] mt-0.5">⚠ {expiring.length} screening{expiring.length > 1 ? 's' : ''} need attention</p>
          )}
        </div>
        <Button className="bg-[#1a2332] text-white hover:bg-[#2a3a4f]" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Worker
        </Button>
      </div>

      {/* Table */}
      {workers.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white py-12 text-center">
          <p className="text-slate-500">No workers added yet.</p>
          <Button variant="outline" size="sm" className="mt-4 border-slate-300" onClick={() => setDialogOpen(true)}>
            Add your first worker
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="w-8 px-2 py-3"></th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Screening</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Expiry</th>
              </tr>
            </thead>
            <tbody>
              {workers.map(worker => (
                <>
                  <tr
                    key={worker.id}
                    onClick={() => setExpanded(expanded === worker.id ? null : worker.id)}
                    className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="px-2 py-3 text-slate-400">
                      {expanded === worker.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </td>
                    <td className="px-4 py-3 text-slate-900 font-medium">{worker.name}</td>
                    <td className="px-4 py-3 text-slate-600">{worker.role}</td>
                    <td className={`px-4 py-3 font-medium ${COMPLIANCE_COLOR[worker.complianceStatus]}`}>
                      {worker.complianceStatus.toLowerCase()}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {worker.screeningExpiry
                        ? format(new Date(worker.screeningExpiry), 'd MMM yyyy')
                        : '—'}
                    </td>
                  </tr>
                  {expanded === worker.id && (
                    <tr key={`${worker.id}-detail`}>
                      <td colSpan={5} className="bg-slate-50 px-8 py-4">
                        <div className="space-y-4">
                          {/* Training Records */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">Training Records</h3>
                              <button
                                onClick={e => { e.stopPropagation(); setTrainingDialogFor(worker.id) }}
                                className="text-xs text-slate-600 hover:text-[#1a2332] underline underline-offset-2"
                              >
                                + Add training
                              </button>
                            </div>
                            {worker.trainings.length === 0 ? (
                              <p className="text-xs text-slate-400">No training records.</p>
                            ) : (
                              <ul className="space-y-1">
                                {worker.trainings.map(t => (
                                  <li key={t.id} className="text-xs text-slate-700">
                                    {t.title} — {format(new Date(t.completedDate), 'd MMM yyyy')}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>

                          {/* Supervision Logs */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">Supervision Logs</h3>
                              <button
                                onClick={e => { e.stopPropagation(); setSupervisionDialogFor(worker.id) }}
                                className="text-xs text-slate-600 hover:text-[#1a2332] underline underline-offset-2"
                              >
                                + Add supervision
                              </button>
                            </div>
                            {worker.supervisions.length === 0 ? (
                              <p className="text-xs text-slate-400">No supervision logs.</p>
                            ) : (
                              <ul className="space-y-1">
                                {worker.supervisions.map(s => (
                                  <li key={s.id} className="text-xs text-slate-700">
                                    {format(new Date(s.date), 'd MMM yyyy')} — {s.supervisorName}: {s.notes}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
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

      {/* Add Worker Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading">Add Worker</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1a2332]/10" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
              <input type="text" value={role} onChange={e => setRole(e.target.value)}
                className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1a2332]/10" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1a2332]/10" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Screening Expiry</label>
              <DatePicker value={screeningExpiry} onChange={setScreeningExpiry} placeholder="Select expiry date" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" className="border-slate-300 text-slate-700" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button className="bg-[#1a2332] text-white hover:bg-[#2a3a4f]" disabled={!name || !role || submitting} onClick={addWorker}>
                {submitting ? 'Saving...' : 'Add Worker'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Training Dialog */}
      <Dialog open={!!trainingDialogFor} onOpenChange={() => setTrainingDialogFor(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading">Add Training Record</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Training Title</label>
              <input type="text" value={trainingTitle} onChange={e => setTrainingTitle(e.target.value)}
                className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1a2332]/10" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Completed Date</label>
              <DatePicker value={trainingDate} onChange={setTrainingDate} placeholder="Select date" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" className="border-slate-300 text-slate-700" onClick={() => setTrainingDialogFor(null)}>Cancel</Button>
              <Button className="bg-[#1a2332] text-white hover:bg-[#2a3a4f]" disabled={!trainingTitle || !trainingDate || submitting}
                onClick={() => trainingDialogFor && addTraining(trainingDialogFor)}>
                {submitting ? 'Saving...' : 'Add Training'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Supervision Dialog */}
      <Dialog open={!!supervisionDialogFor} onOpenChange={() => setSupervisionDialogFor(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading">Add Supervision Log</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
              <DatePicker value={supervisionDate} onChange={setSupervisionDate} placeholder="Select date" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Supervisor Name</label>
              <input type="text" value={supervisorName} onChange={e => setSupervisorName(e.target.value)}
                className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1a2332]/10" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <textarea value={supervisionNotes} onChange={e => setSupervisionNotes(e.target.value)} rows={3}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1a2332]/10" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" className="border-slate-300 text-slate-700" onClick={() => setSupervisionDialogFor(null)}>Cancel</Button>
              <Button className="bg-[#1a2332] text-white hover:bg-[#2a3a4f]" disabled={!supervisionDate || !supervisorName || !supervisionNotes || submitting}
                onClick={() => supervisionDialogFor && addSupervision(supervisionDialogFor)}>
                {submitting ? 'Saving...' : 'Add Supervision'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
