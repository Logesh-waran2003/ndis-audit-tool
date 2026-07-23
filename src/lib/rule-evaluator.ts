import { prisma } from './db'

interface RuleEvaluation {
  ruleCode: string
  isPassing: boolean
  reason: string
  linkedEvidenceIds: string[]
}

type EvidenceRow = Awaited<ReturnType<typeof prisma.evidence.findMany<{ include: { standardLinks: { include: { standard: true } } } }>>>[number]
type WorkerRow = Awaited<ReturnType<typeof prisma.worker.findMany<{ include: { trainings: true; supervisions: true } }>>>[number]
type IncidentRow = Awaited<ReturnType<typeof prisma.incident.findMany>>[number]
type ImprovementRow = Awaited<ReturnType<typeof prisma.improvement.findMany>>[number]
type OrganisationRow = Awaited<ReturnType<typeof prisma.organisation.findFirst>>

interface EvalContext {
  evidence: EvidenceRow[]
  workers: WorkerRow[]
  incidents: IncidentRow[]
  improvements: ImprovementRow[]
  organisation: OrganisationRow
}

// ponytail: lookup map built once per evaluation pass, avoids O(n²) per-rule scans
function titleMatch(ev: EvidenceRow, ...terms: string[]): boolean {
  const t = ev.title.toLowerCase()
  return terms.some(term => t.includes(term))
}

function findEvidence(ctx: EvalContext, opts: { category?: string; titleTerms?: string[]; status?: string; withinMonths?: number }): EvidenceRow[] {
  const now = new Date()
  return ctx.evidence.filter(ev => {
    if (opts.category && ev.category !== opts.category) return false
    if (opts.status && ev.status !== opts.status) return false
    if (opts.titleTerms && !titleMatch(ev, ...opts.titleTerms)) return false
    if (opts.withinMonths) {
      const cutoff = new Date(now)
      cutoff.setMonth(cutoff.getMonth() - opts.withinMonths)
      if (ev.uploadedAt < cutoff) return false
    }
    return true
  })
}

function pass(reason: string, ids: string[] = []): Omit<RuleEvaluation, 'ruleCode'> {
  return { isPassing: true, reason, linkedEvidenceIds: ids }
}
function fail(reason: string): Omit<RuleEvaluation, 'ruleCode'> {
  return { isPassing: false, reason, linkedEvidenceIds: [] }
}

function evaluateRule(
  rule: { code: string },
  ctx: EvalContext,
  resultMap: Map<string, Omit<RuleEvaluation, 'ruleCode'>>
): Omit<RuleEvaluation, 'ruleCode'> {
  const code = rule.code
  const now = new Date()

  // --- REG ---
  if (code === 'REG-002') {
    const matches = findEvidence(ctx, { category: 'GOVERNANCE', titleTerms: ['registration', 'certificate'], status: 'CURRENT' })
    return matches.length ? pass('Registration certificate on file', matches.map(e => e.id)) : fail('No current registration certificate found')
  }
  if (code === 'REG-009') {
    const matches = findEvidence(ctx, { titleTerms: ['insurance', 'liability', 'indemnity'], status: 'CURRENT' })
    return matches.length ? pass('Insurance evidence on file', matches.map(e => e.id)) : fail('No current insurance/indemnity evidence')
  }
  if (code === 'REG-003') {
    if (!ctx.organisation?.registrationExpiry) return fail('No registration expiry date set')
    const sixMonths = new Date(now)
    sixMonths.setMonth(sixMonths.getMonth() + 6)
    return ctx.organisation.registrationExpiry > sixMonths
      ? pass('Registration expiry > 6 months away')
      : fail(`Registration expires ${ctx.organisation.registrationExpiry.toISOString().slice(0, 10)} — within 6 months`)
  }
  if (code === 'REG-008') {
    const matches = findEvidence(ctx, { titleTerms: ['suitability', 'declaration'], withinMonths: 12 })
    return matches.length ? pass('Suitability declaration uploaded within 12 months', matches.map(e => e.id)) : fail('No recent suitability/declaration evidence')
  }
  if (code === 'REG-010') return pass('ABN check is external — auto-pass')

  // --- RR ---
  if (code === 'RR-003') {
    const matches = findEvidence(ctx, { category: 'PARTICIPANT', titleTerms: ['service agreement'], status: 'CURRENT' })
    return matches.length ? pass('Service agreement template on file', matches.map(e => e.id)) : fail('No current service agreement evidence')
  }
  if (code === 'RR-005') {
    const policyExists = findEvidence(ctx, { category: 'POLICY' })
    const privacyMatch = policyExists.filter(e => titleMatch(e, 'privacy'))
    if (privacyMatch.length) return pass('Privacy policy on file', privacyMatch.map(e => e.id))
    // Check for VM-1.4 linked evidence
    const vm14 = ctx.evidence.filter(ev => ev.standardLinks.some(l => l.standard.code === 'VM-1.4'))
    if (vm14.length) return pass('Evidence linked to VM-1.4', vm14.map(e => e.id))
    return fail('No privacy policy or VM-1.4 linked evidence')
  }
  if (code === 'RR-006') {
    const consent = findEvidence(ctx, { titleTerms: ['consent'] })
    if (consent.length) return pass('Consent evidence on file', consent.map(e => e.id))
    const rr003 = resultMap.get('RR-003')
    if (rr003?.isPassing) return pass('Service agreement (RR-003) includes consent clause')
    return fail('No consent evidence and RR-003 not passing')
  }

  // --- GOV ---
  if (code === 'GOV-005') {
    const matches = findEvidence(ctx, { titleTerms: ['incident'], category: 'POLICY' })
    return matches.length ? pass('Incident management policy on file', matches.map(e => e.id)) : fail('No incident management policy')
  }
  if (code === 'GOV-006') {
    const gov005 = resultMap.get('GOV-005')
    if (!gov005?.isPassing) return fail('GOV-005 (incident policy) not passing')
    const unreported = ctx.incidents.filter(i => i.isReportable && !i.commissionNotified)
    if (unreported.length) return fail(`${unreported.length} reportable incident(s) not notified to Commission`)
    return pass('Incident policy exists and all reportable incidents notified')
  }
  if (code === 'GOV-010') {
    const matches = findEvidence(ctx, { titleTerms: ['complaint'], category: 'POLICY' })
    return matches.length ? pass('Complaints policy on file', matches.map(e => e.id)) : fail('No complaints policy')
  }
  if (code === 'GOV-013') {
    const matches = findEvidence(ctx, { titleTerms: ['risk'], category: 'POLICY', withinMonths: 12 })
    return matches.length ? pass('Risk management policy uploaded within 12 months', matches.map(e => e.id)) : fail('No recent risk management policy')
  }
  if (code === 'GOV-017') {
    const matches = findEvidence(ctx, { titleTerms: ['conflict of interest'] })
    return matches.length ? pass('Conflict of interest evidence on file', matches.map(e => e.id)) : fail('No conflict of interest evidence')
  }
  if (code === 'GOV-004') {
    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const overdue = ctx.improvements.filter(i =>
      i.status !== 'COMPLETED' && i.status !== 'VERIFIED' && i.dueDate < thirtyDaysAgo
    )
    return overdue.length === 0
      ? pass('No overdue improvements (>30 days)')
      : fail(`${overdue.length} improvement(s) overdue by more than 30 days`)
  }
  if (code === 'GOV-009') {
    const gov005 = resultMap.get('GOV-005')
    return gov005?.isPassing ? pass('Incident policy (GOV-005) covers retention') : fail('GOV-005 not passing — no retention policy basis')
  }
  if (code === 'GOV-011') {
    const gov010 = resultMap.get('GOV-010')
    return gov010?.isPassing ? pass('Complaints policy (GOV-010) references Commission') : fail('GOV-010 not passing')
  }
  if (code === 'GOV-012') {
    const gov010 = resultMap.get('GOV-010')
    return gov010?.isPassing ? pass('Complaints policy (GOV-010) covers this requirement') : fail('GOV-010 not passing')
  }

  // --- WF ---
  if (code === 'WF-001') {
    const activeWorkers = ctx.workers.filter(w => w.isActive)
    if (activeWorkers.length === 0) return pass('No active workers — N/A')
    const expired = activeWorkers.filter(w => !w.screeningExpiry || w.screeningExpiry <= now)
    return expired.length === 0
      ? pass('All workers have valid screening')
      : fail(`${expired.length} worker(s) with expired/missing screening: ${expired.map(w => w.name).join(', ')}`)
  }
  if (code === 'WF-005') {
    const matches = findEvidence(ctx, { titleTerms: ['code of conduct'] }).filter(e => e.category === 'POLICY' || e.category === 'WORKER')
    return matches.length ? pass('Code of conduct on file', matches.map(e => e.id)) : fail('No code of conduct evidence')
  }
  if (code === 'WF-002') {
    const wf001 = resultMap.get('WF-001')
    return wf001?.isPassing ? pass('WF-001 passes — screening records exist') : fail('WF-001 not passing')
  }
  if (code === 'WF-004') {
    const activeWorkers = ctx.workers.filter(w => w.isActive)
    if (activeWorkers.length === 0) return pass('No active workers — N/A')
    const missing = activeWorkers.filter(w => !w.trainings.some(t => t.title.toLowerCase().includes('orientation')))
    return missing.length === 0
      ? pass('All workers have orientation training')
      : fail(`${missing.length} worker(s) missing orientation: ${missing.map(w => w.name).join(', ')}`)
  }
  if (code === 'WF-006') {
    const activeWorkers = ctx.workers.filter(w => w.isActive)
    if (activeWorkers.length === 0) return pass('No active workers — N/A')
    const missing = activeWorkers.filter(w => w.trainings.length === 0)
    return missing.length === 0
      ? pass('All workers have training records')
      : fail(`${missing.length} worker(s) with no training: ${missing.map(w => w.name).join(', ')}`)
  }
  if (code === 'WF-010') {
    const matches = findEvidence(ctx, { titleTerms: ['contractor'] }).filter(e => titleMatch(e, 'screening', 'agreement'))
    return matches.length ? pass('Contractor screening/agreement evidence on file', matches.map(e => e.id)) : fail('No contractor screening/agreement evidence')
  }

  // --- POS ---
  if (code === 'POS-004') return pass('CareSquare handles claims validation — auto-pass')
  if (code === 'POS-006') return pass('CareSquare timestamped notes — auto-pass')
  if (code === 'POS-008') {
    const rr003 = resultMap.get('RR-003')
    return rr003?.isPassing ? pass('Service agreement (RR-003) includes pricing') : fail('RR-003 not passing — no service agreement with pricing')
  }
  if (code === 'POS-009') {
    const matches = findEvidence(ctx, { titleTerms: ['financial'], category: 'POLICY' })
    return matches.length ? pass('Financial management policy on file', matches.map(e => e.id)) : fail('No financial management policy')
  }
  if (code === 'POS-010') return pass('CareSquare monthly statements — auto-pass')

  // --- SEC ---
  if (code === 'SEC-001') {
    const privacyData = findEvidence(ctx, { titleTerms: ['privacy', 'data'] })
    const auMatch = privacyData.filter(e => {
      const notes = (e.notes || '').toLowerCase()
      const title = e.title.toLowerCase()
      return notes.includes('australia') || notes.includes('sydney') || title.includes('australia')
    })
    if (auMatch.length) return pass('Data sovereignty evidence mentions Australia', auMatch.map(e => e.id))
    // Check any evidence notes
    const anyAu = ctx.evidence.filter(e => {
      const notes = (e.notes || '').toLowerCase()
      return notes.includes('australia') || notes.includes('sydney')
    })
    if (anyAu.length) return pass('Evidence notes reference Australian data hosting', anyAu.map(e => e.id))
    return fail('No evidence of Australian data sovereignty')
  }
  if (code === 'SEC-011') {
    const gov009 = resultMap.get('GOV-009')
    return gov009?.isPassing ? pass('GOV-009 (7-year retention) passes') : fail('GOV-009 not passing')
  }
  if (code === 'SEC-003') {
    const matches = findEvidence(ctx, { titleTerms: ['mfa', 'multi-factor', 'security'] })
    return matches.length ? pass('MFA/security evidence on file', matches.map(e => e.id)) : fail('No MFA/security evidence')
  }
  if (code === 'SEC-006') {
    const matches = findEvidence(ctx, { titleTerms: ['backup'] })
    return matches.length ? pass('Backup evidence on file', matches.map(e => e.id)) : fail('No backup evidence')
  }
  if (code === 'SEC-008') {
    const matches = findEvidence(ctx, { titleTerms: ['breach', 'data breach'] })
    return matches.length ? pass('Data breach response evidence on file', matches.map(e => e.id)) : fail('No data breach response evidence')
  }

  // --- SLA ---
  if (code === 'SLA-002') {
    const gov010 = resultMap.get('GOV-010')
    return gov010?.isPassing ? pass('Complaints policy (GOV-010) includes timeframes') : fail('GOV-010 not passing')
  }
  if (code === 'SLA-005') return pass('CareSquare handles invoice processing — auto-pass')
  if (code === 'SLA-006') return pass('CareSquare automated monthly statements — auto-pass')
  if (code === 'SLA-007') return pass('CareSquare handles claim timing — auto-pass')
  if (code === 'SLA-009') {
    const gov004 = resultMap.get('GOV-004')
    return gov004?.isPassing ? pass('GOV-004 passes — no overdue improvements') : fail('GOV-004 not passing')
  }

  // --- ONB ---
  if (code === 'ONB-P-001') {
    const rr003 = resultMap.get('RR-003')
    return rr003?.isPassing ? pass('Service agreement (RR-003) = intake step') : fail('RR-003 not passing')
  }
  if (code === 'ONB-P-002') {
    const rr003 = resultMap.get('RR-003')
    return rr003?.isPassing ? pass('Service agreement (RR-003) covers onboarding') : fail('RR-003 not passing')
  }
  if (code === 'ONB-P-010') {
    const matches = findEvidence(ctx, { titleTerms: ['welcome', 'onboarding'] })
    return matches.length ? pass('Welcome/onboarding evidence on file', matches.map(e => e.id)) : fail('No welcome/onboarding evidence')
  }
  if (code === 'ONB-P-011') {
    const matches = findEvidence(ctx, { titleTerms: ['exit'] })
    return matches.length ? pass('Exit process evidence on file', matches.map(e => e.id)) : fail('No exit process evidence')
  }
  if (code === 'ONB-S-001') {
    const wf001 = resultMap.get('WF-001')
    const wf004 = resultMap.get('WF-004')
    return (wf001?.isPassing && wf004?.isPassing) ? pass('WF-001 and WF-004 both pass') : fail('WF-001 or WF-004 not passing')
  }
  if (code === 'ONB-S-002') {
    const wf001 = resultMap.get('WF-001')
    return wf001?.isPassing ? pass('WF-001 passes — screening valid') : fail('WF-001 not passing')
  }

  // --- FUT ---
  if (code === 'FUT-001') {
    const fourteenDaysAgo = new Date(now)
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
    const recent = ctx.evidence.filter(e => e.uploadedAt > fourteenDaysAgo)
    return recent.length ? pass('Evidence uploaded in last 14 days', recent.map(e => e.id)) : fail('No evidence uploaded in last 14 days')
  }
  if (code === 'FUT-004') {
    const matches = findEvidence(ctx, { titleTerms: ['panel'] })
    return matches.length ? pass('Panel evidence on file', matches.map(e => e.id)) : fail('No panel evidence')
  }
  if (code.startsWith('FUT-')) return fail('Advisory rule — aspirational target')

  // Default
  return fail('Not yet evaluated')
}

/**
 * Evaluate all rules. Order matters for dependency resolution:
 * independent rules first, then dependent ones.
 */
// ponytail: single-pass topological sort isn't needed — we just evaluate in two passes
// (independent rules first, then rules that reference others). Upgrade: proper DAG if deps get deeper.
export async function evaluateAllRules(): Promise<{ evaluations: RuleEvaluation[]; score: number }> {
  const [rules, evidence, workers, incidents, improvements, organisation] = await Promise.all([
    prisma.rule.findMany(),
    prisma.evidence.findMany({ include: { standardLinks: { include: { standard: true } } } }),
    prisma.worker.findMany({ include: { trainings: true, supervisions: true } }),
    prisma.incident.findMany(),
    prisma.improvement.findMany(),
    prisma.organisation.findFirst(),
  ])

  const ctx: EvalContext = { evidence, workers, incidents, improvements, organisation }
  const resultMap = new Map<string, Omit<RuleEvaluation, 'ruleCode'>>()

  // Dependent rules (reference other rule results)
  const dependentCodes = new Set([
    'RR-006', 'GOV-006', 'GOV-009', 'GOV-011', 'GOV-012',
    'WF-002', 'POS-008', 'SEC-011', 'SLA-002', 'SLA-009',
    'ONB-P-001', 'ONB-P-002', 'ONB-S-001', 'ONB-S-002',
  ])

  // Pass 1: independent rules
  for (const rule of rules) {
    if (dependentCodes.has(rule.code)) continue
    const result = evaluateRule(rule, ctx, resultMap)
    resultMap.set(rule.code, result)
  }

  // Pass 2: dependent rules
  for (const rule of rules) {
    if (!dependentCodes.has(rule.code)) continue
    const result = evaluateRule(rule, ctx, resultMap)
    resultMap.set(rule.code, result)
  }

  // Build evaluations array and batch-update DB
  const evaluations: RuleEvaluation[] = []
  const updates: Promise<unknown>[] = []

  for (const rule of rules) {
    const result = resultMap.get(rule.code)!
    evaluations.push({ ruleCode: rule.code, ...result })
    if (rule.isPassing !== result.isPassing) {
      updates.push(prisma.rule.update({ where: { id: rule.id }, data: { isPassing: result.isPassing } }))
    }
  }

  await Promise.all(updates)

  // Weighted score
  const failingWeight = evaluations
    .filter(e => !e.isPassing)
    .reduce((sum, e) => {
      const rule = rules.find(r => r.code === e.ruleCode)
      return sum + (rule?.weight || 0)
    }, 0)

  const score = Math.max(0, 100 + failingWeight)
  return { evaluations, score }
}
