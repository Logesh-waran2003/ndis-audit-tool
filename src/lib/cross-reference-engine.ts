import { prisma } from './db'

interface CrossRefFlag {
  type: 'inconsistency' | 'gap' | 'outdated' | 'missing_practice'
  severity: 'critical' | 'major' | 'minor'
  description: string
  sourceDocId: string
  relatedDocId?: string
  recommendation: string
}

export async function runCrossReferenceCheck(): Promise<CrossRefFlag[]> {
  const flags: CrossRefFlag[] = []

  const analyses = await prisma.documentAnalysis.findMany()
  const evidence = await prisma.evidence.findMany()
  const incidents = await prisma.incident.findMany()
  const improvements = await prisma.improvement.findMany()
  const workers = await prisma.worker.findMany()
  const org = await prisma.organisation.findFirst()

  // CHECK 1: Date currency — any doc with dates > 12 months old
  for (const analysis of analyses) {
    const dates = analysis.dates as any
    if (dates?.lastReviewed) {
      const reviewDate = new Date(dates.lastReviewed)
      const monthsAgo = (Date.now() - reviewDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
      if (monthsAgo > 12) {
        flags.push({
          type: 'outdated',
          severity: 'major',
          description: `Document "${analysis.extractedTitle}" was last reviewed ${Math.round(monthsAgo)} months ago (${dates.lastReviewed}). Policy requires review within 12 months.`,
          sourceDocId: analysis.evidenceId,
          recommendation: 'Review the document and update the review date. If content is still accurate, add "Reviewed [today], no changes required" to the cover page.',
        })
      }
    }

    // CHECK 2: Outdated legislation references
    const legRefs = (analysis.legislationRefs as string[]) || []
    const outdatedRefs = legRefs.filter(ref =>
      ref.includes('2020') || ref.includes('2019') || (ref.includes('2018') && !ref.includes('Rules 2018'))
    )
    if (outdatedRefs.length > 0) {
      flags.push({
        type: 'outdated',
        severity: 'minor',
        description: `Document "${analysis.extractedTitle}" references potentially outdated legislation: ${outdatedRefs.join(', ')}. Current compilations are from 2026.`,
        sourceDocId: analysis.evidenceId,
        recommendation: 'Update legislation references to current compilation numbers (PM-LEG-001 through PM-LEG-009 in the Knowledge Base have current versions).',
      })
    }
  }

  // CHECK 3: Policy says incidents are logged, but register is empty
  const hasPolicyManual = analyses.some(a => (a.documentType as string) === 'policy_manual')
  if (hasPolicyManual && incidents.length === 0 && org?.participantCount && org.participantCount > 100) {
    flags.push({
      type: 'inconsistency',
      severity: 'critical',
      description: `Policy manual states incidents are reported and managed, but incident register has 0 entries despite managing ${org.participantCount}+ participants. This is statistically unlikely and an auditor will question it.`,
      sourceDocId: analyses.find(a => a.documentType === 'policy_manual')?.evidenceId || '',
      recommendation: 'Reconstruct incident/complaint history from email records. Log at least the known billing errors, late payments, and participant complaints that occurred since last audit.',
    })
  }

  // CHECK 4: Policy says risk register reviewed annually, but no evidence of review
  const riskAnalysis = analyses.find(a =>
    ((a.sections as string[]) || []).some(s => s.toLowerCase().includes('risk'))
  )
  if (riskAnalysis) {
    const riskDates = riskAnalysis.dates as any
    if (!riskDates?.lastReviewed || new Date(riskDates.lastReviewed) < new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)) {
      flags.push({
        type: 'inconsistency',
        severity: 'major',
        description: 'Risk management policy requires annual review of risk register, but no evidence of review within the last 12 months.',
        sourceDocId: riskAnalysis.evidenceId,
        recommendation: 'Conduct a risk register review. Document the review date. Add new risks relevant to current scale (1100+ participants, offshore contractor, key-person dependency).',
      })
    }
  }

  // CHECK 5: Worker count mismatch
  if (org?.staffCount && workers.length > 0 && workers.length < org.staffCount) {
    flags.push({
      type: 'gap',
      severity: 'critical',
      description: `Organisation has ${org.staffCount} staff but only ${workers.length} worker records in the system. ${org.staffCount - workers.length} worker(s) missing screening/training records.`,
      sourceDocId: '',
      recommendation: `Add the missing ${org.staffCount - workers.length} worker(s) to the Workers page with their screening certificates and training records.`,
    })
  }

  // CHECK 6: Improvements register empty despite complaints existing
  if (incidents.filter(i => i.type === 'COMPLAINT').length > 0 && improvements.length === 0) {
    flags.push({
      type: 'missing_practice',
      severity: 'major',
      description: 'Complaints have been logged but no continuous improvement actions recorded. Auditors expect every complaint to generate an improvement entry.',
      sourceDocId: '',
      recommendation: 'For each complaint, create a linked improvement action showing what was learned and what changed.',
    })
  }

  // CHECK 7: Scale mismatch in documents
  for (const analysis of analyses) {
    const concerns = (analysis.concerns as string[]) || []
    const keyFindings = (analysis.keyFindings as string[]) || []
    const sections = (analysis.sections as string[]) || []
    if (org?.participantCount && org.participantCount > 500) {
      const allText = [...keyFindings, ...concerns, ...sections].join(' ').toLowerCase()
      if (allText.includes('sole trader') || allText.includes('one person')) {
        flags.push({
          type: 'inconsistency',
          severity: 'major',
          description: `Document "${analysis.extractedTitle}" references "sole trader" or single-person operation, but organisation now has ${org.staffCount} staff and ${org.participantCount} participants.`,
          sourceDocId: analysis.evidenceId,
          recommendation: 'Update organisational references to reflect current team structure.',
        })
      }
    }
  }

  return flags
}
