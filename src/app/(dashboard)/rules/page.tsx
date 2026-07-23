import { EvaluateButton } from './evaluate-button'
import { RuleFixActions } from './rule-fix-actions'

interface Rule {
  id: string
  code: string
  domain: string
  displayName: string
  officialRef: string
  severity: 'CRITICAL' | 'MAJOR' | 'MINOR' | 'ADVISORY'
  weight: number
  isPassing: boolean
  condition: string
  evidenceRequired: string
  remediation: string
}

interface DomainScore {
  domain: string
  total: number
  passing: number
}

interface RulesData {
  score: number
  threshold: 'AUDIT_READY' | 'GAPS_PRESENT' | 'NOT_READY'
  rules: Rule[]
  domainScores: DomainScore[]
}

const DOMAIN_ORDER = [
  'Registration',
  'Rights & Responsibilities',
  'Governance',
  'Workforce',
  'Provision of Supports',
  'Participant Onboarding',
  'Staff Onboarding',
  'Data Security',
  'Service Levels',
  'Future Readiness',
]

const SEVERITY_ORDER: Record<string, number> = { CRITICAL: 0, MAJOR: 1, MINOR: 2, ADVISORY: 3 }

const SEVERITY_COLOR: Record<string, string> = {
  CRITICAL: 'text-red-600',
  MAJOR: 'text-amber-600',
  MINOR: 'text-slate-500',
  ADVISORY: 'text-blue-600',
}

const THRESHOLD_BADGE: Record<string, { label: string; className: string }> = {
  AUDIT_READY: { label: 'Audit-Ready', className: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  GAPS_PRESENT: { label: 'Gaps Present', className: 'bg-amber-50 text-amber-700 border border-amber-200' },
  NOT_READY: { label: 'Not Audit-Ready', className: 'bg-red-50 text-red-700 border border-red-200' },
}

async function getRules(): Promise<RulesData> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  try {
    const res = await fetch(`${baseUrl}/api/rules`, { cache: 'no-store' })
    return res.ok ? res.json() : { score: 0, threshold: 'NOT_READY', rules: [], domainScores: [] }
  } catch {
    return { score: 0, threshold: 'NOT_READY', rules: [], domainScores: [] }
  }
}

function sortRules(rules: Rule[]): Rule[] {
  return [...rules].sort((a, b) => {
    // Failing first
    if (a.isPassing !== b.isPassing) return a.isPassing ? 1 : -1
    // Among failing, sort by severity
    if (!a.isPassing && !b.isPassing) {
      return (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9)
    }
    return 0
  })
}

export default async function RulesPage() {
  const data = await getRules()
  const { score, threshold, rules } = data

  const failing = rules.filter((r) => !r.isPassing)
  const criticalFailing = failing.filter((r) => r.severity === 'CRITICAL').length
  const majorFailing = failing.filter((r) => r.severity === 'MAJOR').length
  const minorFailing = failing.filter((r) => r.severity === 'MINOR').length
  const passing = rules.filter((r) => r.isPassing).length

  // Weighted progress: sum of passing rule weights (absolute values) vs total
  const totalWeight = rules.reduce((sum, r) => sum + Math.abs(r.weight), 0)
  const passingWeight = rules.filter((r) => r.isPassing).reduce((sum, r) => sum + Math.abs(r.weight), 0)
  const progressPct = totalWeight > 0 ? (passingWeight / totalWeight) * 100 : 0

  // Group by domain
  const domainMap = new Map<string, Rule[]>()
  for (const rule of rules) {
    const arr = domainMap.get(rule.domain) ?? []
    arr.push(rule)
    domainMap.set(rule.domain, arr)
  }

  // Sort domains by DOMAIN_ORDER
  const sortedDomains = [...domainMap.entries()].sort((a, b) => {
    const ai = DOMAIN_ORDER.indexOf(a[0])
    const bi = DOMAIN_ORDER.indexOf(b[0])
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
  })

  const badge = THRESHOLD_BADGE[threshold] ?? THRESHOLD_BADGE.NOT_READY

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[#1a2332]">Compliance Rules</h1>
          <p className="mt-1 text-sm text-slate-600">
            52 rules evaluated against your evidence. Fix CRITICAL items first.
          </p>
        </div>
        <EvaluateButton />
      </div>

      {/* Score card */}
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-heading font-bold text-[#1a2332]">{score}</span>
              <span className="text-xl text-slate-400">/100</span>
            </div>
            <span className={`mt-2 inline-block rounded-md px-2 py-0.5 text-xs font-medium ${badge.className}`}>
              {badge.label}
            </span>
          </div>
          <div className="text-right text-sm space-y-0.5">
            {criticalFailing > 0 && (
              <p className="text-red-600">{criticalFailing} CRITICAL failing</p>
            )}
            {majorFailing > 0 && (
              <p className="text-amber-600">{majorFailing} MAJOR failing</p>
            )}
            {minorFailing > 0 && (
              <p className="text-slate-500">{minorFailing} MINOR failing</p>
            )}
            <p className="text-emerald-600">{passing} passing</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 h-[3px] w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full bg-emerald-500 transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Rules by domain */}
      <div className="space-y-6">
        {sortedDomains.map(([domain, domainRules]) => {
          const domainPassing = domainRules.filter((r) => r.isPassing).length
          const sorted = sortRules(domainRules)
          return (
            <div key={domain}>
              <div className="flex items-baseline justify-between mb-2">
                <h2 className="font-heading text-base font-semibold text-[#1a2332]">{domain}</h2>
                <span className="text-xs text-slate-400">{domainPassing}/{domainRules.length} passing</span>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white overflow-hidden divide-y divide-slate-100">
                {sorted.map((rule) => (
                  <RuleRow key={rule.id} rule={rule} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function RuleRow({ rule }: { rule: Rule }) {
  const icon = rule.isPassing
    ? { symbol: '✓', bg: 'bg-emerald-100 text-emerald-700' }
    : rule.severity === 'CRITICAL'
      ? { symbol: '✕', bg: 'bg-red-100 text-red-700' }
      : rule.severity === 'MAJOR'
        ? { symbol: '✕', bg: 'bg-amber-100 text-amber-700' }
        : rule.severity === 'ADVISORY'
          ? { symbol: '○', bg: 'bg-blue-100 text-blue-700' }
          : { symbol: '○', bg: 'bg-slate-100 text-slate-600' }

  return (
    <details className="group">
      <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors list-none [&::-webkit-details-marker]:hidden">
        {/* Status icon */}
        <span className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold shrink-0 ${icon.bg}`}>
          {icon.symbol}
        </span>
        {/* Name + ref */}
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-slate-900 block">{rule.displayName}</span>
          <span className="text-xs text-slate-400 font-mono">{rule.officialRef}</span>
        </div>
        {/* Severity + weight */}
        <span className={`text-xs font-medium shrink-0 ${SEVERITY_COLOR[rule.severity] ?? 'text-slate-500'}`}>
          {rule.severity}
        </span>
        <span className="text-xs text-slate-400 w-8 text-right shrink-0">{rule.weight}</span>
      </summary>
      {/* Expanded content */}
      <div className="bg-slate-50 px-4 py-3 pl-12 space-y-2 text-sm">
        <div>
          <span className="font-medium text-slate-700">Condition:</span>{' '}
          <span className="text-slate-600">{rule.condition}</span>
        </div>
        <div>
          <span className="font-medium text-slate-700">Evidence required:</span>{' '}
          <span className="text-slate-600">{rule.evidenceRequired}</span>
        </div>
        <div>
          <span className="font-medium text-slate-700">Remediation:</span>{' '}
          <span className="text-slate-600">{rule.remediation}</span>
        </div>
        {!rule.isPassing && (
          <RuleFixActions
            ruleCode={rule.code}
            displayName={rule.displayName}
            evidenceRequired={rule.evidenceRequired}
            remediation={rule.remediation}
          />
        )}
      </div>
    </details>
  )
}
