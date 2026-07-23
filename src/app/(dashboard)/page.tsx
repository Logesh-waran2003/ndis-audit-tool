import Link from 'next/link'
import { OnboardingRedirect } from './onboarding-redirect'
import { CrossReferenceFlags } from './cross-reference-flags'

interface Standard {
  code: string
  name: string
  status: 'MET' | 'PARTIAL' | 'GAP'
  evidenceCount: number
}

interface Alert {
  id: string
  type: string
  message: string
  severity: 'INFO' | 'WARNING' | 'CRITICAL'
  entityType?: string
  entityId?: string
  createdAt: string
}

interface DashboardData {
  complianceScore: number
  daysUntilAudit: number | null
  activeAlerts: number
  totalEvidence: number
  recentAlerts: Alert[]
  standards: Standard[]
}

async function getDashboard(): Promise<DashboardData | null> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  try {
    const res = await fetch(`${baseUrl}/api/dashboard`, { cache: 'no-store' })
    return res.ok ? res.json() : null
  } catch {
    return null
  }
}

export default async function DashboardPage() {
  const data = await getDashboard()

  if (!data) {
    return (
      <div className="py-12 text-center">
        <p className="text-slate-500">Unable to load dashboard data. Check your database connection.</p>
      </div>
    )
  }

  const { complianceScore, daysUntilAudit, recentAlerts, standards, totalEvidence } = data
  const met = standards.filter(s => s.status === 'MET').length
  const partial = standards.filter(s => s.status === 'PARTIAL').length
  const gap = standards.filter(s => s.status === 'GAP').length
  const total = standards.length

  const isOnboarding = complianceScore === 0 && totalEvidence === 0

  return (
    <div className="space-y-8">
      {/* Auto-redirect to onboarding if no evidence */}
      <OnboardingRedirect totalEvidence={totalEvidence} />

      {/* Header */}
      <div className="flex items-baseline justify-between">
        <h1 className="font-heading text-2xl font-bold text-[#1a2332]">Dashboard</h1>
        {daysUntilAudit !== null && (
          <p className="text-sm text-slate-500">
            <span className="font-medium text-slate-700">{daysUntilAudit} days</span> until audit
          </p>
        )}
      </div>

      {/* Onboarding guidance for 0% */}
      {isOnboarding && (
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="font-heading text-lg font-semibold text-[#1a2332]">Get Started</h2>
          <p className="mt-2 text-sm text-slate-700">
            Your audit readiness tool is empty. Start by uploading your policies and worker records
            — the system will map them to NDIS Practice Standards automatically.
          </p>
          <div className="mt-4 flex gap-3">
            <Link
              href="/evidence"
              className="inline-flex h-9 items-center rounded-md bg-[#1a2332] px-4 text-sm font-medium text-white hover:bg-[#2a3a4f]"
            >
              Upload Evidence
            </Link>
            <Link
              href="/workers"
              className="inline-flex h-9 items-center rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Add Workers
            </Link>
          </div>
        </div>
      )}

      {/* Compliance score + bar */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading text-lg font-semibold text-[#1a2332]">Compliance</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {met} met · {partial} partial · {gap} gap{gap !== 1 ? 's' : ''} of {total} standards
            </p>
          </div>
          <span className="font-heading text-4xl font-bold text-[#1a2332]">{complianceScore}%</span>
        </div>

        {/* Compliance bar — coloured segments */}
        <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="flex h-full">
            {met > 0 && (
              <div
                className="bg-[#059669] transition-all"
                style={{ width: `${(met / total) * 100}%` }}
                title={`${met} met`}
              />
            )}
            {partial > 0 && (
              <div
                className="bg-[#d97706] transition-all"
                style={{ width: `${(partial / total) * 100}%` }}
                title={`${partial} partial`}
              />
            )}
            {gap > 0 && (
              <div
                className="bg-[#dc2626] transition-all"
                style={{ width: `${(gap / total) * 100}%` }}
                title={`${gap} gaps`}
              />
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-3 flex gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#059669]" />
            <span className="text-slate-600">{met} met</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#d97706]" />
            <span className="text-slate-600">{partial} partial</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#dc2626]" />
            <span className="text-slate-600">{gap} gaps</span>
          </span>
        </div>
      </div>

      {/* Cross-reference flags (client component) */}
      {!isOnboarding && <CrossReferenceFlags />}

      {/* Attention Required */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="font-heading text-lg font-semibold text-[#1a2332]">Attention Required</h2>
        {recentAlerts.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Nothing requires attention today.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {recentAlerts.slice(0, 5).map(alert => (
              <li key={alert.id} className="flex items-start gap-2 text-sm">
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    alert.severity === 'CRITICAL' ? 'bg-[#dc2626]' :
                    alert.severity === 'WARNING' ? 'bg-[#d97706]' : 'bg-[#059669]'
                  }`}
                />
                <span className="text-slate-700">{alert.message}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Quick links */}
      <div className="flex gap-4 text-sm">
        <Link href="/incidents" className="text-slate-600 underline underline-offset-2 hover:text-[#1a2332]">
          Log incident
        </Link>
        <Link href="/evidence" className="text-slate-600 underline underline-offset-2 hover:text-[#1a2332]">
          Upload evidence
        </Link>
        <Link href="/improvements" className="text-slate-600 underline underline-offset-2 hover:text-[#1a2332]">
          Record improvement
        </Link>
      </div>

      {/* Standards needing attention — quick view of gaps */}
      {gap > 0 && !isOnboarding && (
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="font-heading text-lg font-semibold text-[#1a2332]">Standards with Gaps</h2>
          <p className="mt-1 text-xs text-slate-500">Upload evidence for these standards to improve your score</p>
          <ul className="mt-3 space-y-2">
            {standards
              .filter(s => s.status === 'GAP')
              .slice(0, 5)
              .map(s => (
                <li key={s.code}>
                  <Link
                    href={`/standards/${s.code}`}
                    className="flex items-center gap-2 text-sm text-slate-700 hover:text-[#1a2332]"
                  >
                    <span className="h-2 w-2 shrink-0 rounded-full bg-[#dc2626]" />
                    <span className="font-mono text-xs text-slate-400">{s.code}</span>
                    <span>{s.name}</span>
                  </Link>
                </li>
              ))}
          </ul>
          {gap > 5 && (
            <Link href="/standards" className="mt-3 block text-xs text-slate-500 hover:text-slate-700">
              View all {gap} gaps →
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
