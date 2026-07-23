import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [organisation, standards, alerts, evidenceCount, rules] = await Promise.all([
      prisma.organisation.findFirst(),
      prisma.standard.findMany({
        include: { evidenceLinks: { include: { evidence: true } } },
        orderBy: { order: 'asc' },
      }),
      prisma.alert.findMany({ where: { acknowledged: false }, orderBy: { createdAt: 'desc' } }),
      prisma.evidence.count(),
      prisma.rule.findMany(),
    ])

    const now = new Date()

    // Weighted rule-based compliance score
    const failingRules = rules.filter((r) => !r.isPassing)
    const complianceScore = Math.max(0, 100 + failingRules.reduce((sum, r) => sum + r.weight, 0))

    let threshold: 'AUDIT_READY' | 'GAPS_PRESENT' | 'NOT_READY'
    if (complianceScore >= 80 && !failingRules.some((r) => r.severity === 'CRITICAL')) {
      threshold = 'AUDIT_READY'
    } else if (complianceScore >= 50) {
      threshold = 'GAPS_PRESENT'
    } else {
      threshold = 'NOT_READY'
    }

    // Standards summary (kept for UI compatibility)
    const standardsSummary = standards.map((s) => {
      const currentEvidence = s.evidenceLinks.filter(
        (l) => l.evidence.status === 'CURRENT' && (!l.evidence.expiryDate || l.evidence.expiryDate > now)
      )
      let status: 'MET' | 'PARTIAL' | 'GAP'
      if (currentEvidence.length >= 2) status = 'MET'
      else if (currentEvidence.length === 1) status = 'PARTIAL'
      else status = 'GAP'

      const { evidenceLinks: _, ...rest } = s
      return { ...rest, status, evidenceCount: s.evidenceLinks.length }
    })

    // Days until audit
    const daysUntilAudit = organisation?.registrationExpiry
      ? Math.ceil((organisation.registrationExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null

    return NextResponse.json({
      complianceScore,
      threshold,
      daysUntilAudit,
      activeAlerts: alerts.length,
      totalEvidence: evidenceCount,
      recentAlerts: alerts.slice(0, 5),
      standards: standardsSummary,
    })
  } catch (error) {
    console.error('[GET /api/dashboard]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
