'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ScenarioResult {
  scenario: 'A' | 'B' | 'C'
  lastAuditDate: string | null
  registrationExpiry: string | null
  previousParticipantCount: number | null
  reasoning: string
  priorities: string[]
}

interface ChecklistData {
  satisfiedCount: number
  totalCount: number
}

interface OrgData {
  participantCount: number | null
  staffCount: number | null
  registrationExpiry: string | null
}

export default function OnboardingResultsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [scenario, setScenario] = useState<ScenarioResult | null>(null)
  const [checklist, setChecklist] = useState<ChecklistData | null>(null)
  const [org, setOrg] = useState<OrgData | null>(null)

  useEffect(() => {
    async function analyse() {
      try {
        // Wait a moment for background classifyAndLink to complete
        await new Promise(r => setTimeout(r, 3000))

        const [checklistRes, orgRes, scenarioRes] = await Promise.all([
          fetch('/api/checklist').then(r => r.json()),
          fetch('/api/organisation').then(r => r.json()),
          fetch('/api/onboarding/detect-scenario', { method: 'POST' }).then(r => r.json()),
        ])

        setChecklist({ satisfiedCount: checklistRes.satisfiedCount, totalCount: checklistRes.totalCount })
        setOrg(orgRes)
        setScenario(scenarioRes)
      } catch {
        // If something fails, still show what we can
        setScenario({ scenario: 'A', lastAuditDate: null, registrationExpiry: null, previousParticipantCount: null, reasoning: 'Analysis incomplete', priorities: ['Check your Checklist for current status'] })
      }
      setLoading(false)
    }
    analyse()
  }, [])

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 text-[#1a2332] animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-900">Analysing your documents...</p>
          <p className="text-xs text-slate-400">Determining your audit scenario and checklist coverage.</p>
        </div>
      </div>
    )
  }

  const satisfied = checklist?.satisfiedCount ?? 0
  const total = checklist?.totalCount ?? 28
  const pct = Math.round((satisfied / total) * 100)

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-start justify-center py-12">
      <div className="w-full max-w-[700px] bg-white rounded-lg border border-slate-200 p-8 space-y-6">

        {/* Header based on scenario */}
        {scenario?.scenario === 'A' && (
          <div>
            <h1 className="font-heading text-2xl font-bold text-[#1a2332]">Your first verification audit</h1>
            <p className="text-sm text-slate-600 mt-2">
              Based on your documents, you haven&apos;t completed a verification audit yet.
            </p>
          </div>
        )}
        {scenario?.scenario === 'B' && (
          <div>
            <h1 className="font-heading text-2xl font-bold text-[#1a2332]">Preparing for your next audit</h1>
            {scenario.lastAuditDate && (
              <p className="text-sm text-slate-600 mt-2">
                Last audit: {formatDate(scenario.lastAuditDate)}
              </p>
            )}
          </div>
        )}
        {scenario?.scenario === 'C' && (
          <div>
            <h1 className="font-heading text-2xl font-bold text-[#1a2332]">You&apos;re in good shape</h1>
            {scenario.lastAuditDate && (
              <p className="text-sm text-slate-600 mt-2">
                Last audit: {formatDate(scenario.lastAuditDate)} (full compliance ✓)
              </p>
            )}
          </div>
        )}

        {/* Registration expiry */}
        {scenario?.registrationExpiry && (
          <p className="text-sm text-slate-600">
            Registration expires: <span className="font-medium text-slate-900">{formatDate(scenario.registrationExpiry)}</span>
          </p>
        )}

        {/* Delta: previous → current (Scenario B) */}
        {scenario?.scenario === 'B' && scenario.previousParticipantCount && org?.participantCount && (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">What&apos;s changed</p>
            <div className="space-y-1.5">
              {scenario.previousParticipantCount !== org.participantCount && (
                <div className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <span className="text-slate-700">
                    Participants: {scenario.previousParticipantCount.toLocaleString()} → {org.participantCount.toLocaleString()}
                    {org.participantCount > scenario.previousParticipantCount && (
                      <span className="text-amber-600 ml-1">
                        ({Math.round(org.participantCount / scenario.previousParticipantCount)}x growth)
                      </span>
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Progress bar */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">Checklist: {satisfied}/{total} items ready</span>
            <span className="text-sm font-medium text-slate-700">{pct}%</span>
          </div>
          <div className="h-3 w-full rounded-full bg-slate-200 overflow-hidden">
            <div
              className="h-full bg-[#059669] rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Priority actions */}
        {scenario?.priorities && scenario.priorities.length > 0 && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-2">
              {scenario.scenario === 'C' ? 'Keep an eye on' : 'To focus on first'}
            </p>
            <ul className="space-y-2">
              {scenario.priorities.map((p, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="text-slate-400 mt-0.5">•</span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* CTA */}
        <Button
          onClick={() => router.push('/evidence')}
          className="w-full h-10 bg-[#1a2332] text-white hover:bg-[#243447]"
        >
          Go to Checklist →
        </Button>
      </div>
    </div>
  )
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return dateStr
  }
}
