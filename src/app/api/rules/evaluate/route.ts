import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { evaluateAllRules } from '@/lib/rule-evaluator'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const { evaluations, score } = await evaluateAllRules()

    // Enrich evaluations with rule metadata for the frontend
    const rules = await prisma.rule.findMany()
    const ruleMap = new Map(rules.map(r => [r.code, r]))

    const enriched = evaluations.map(e => {
      const rule = ruleMap.get(e.ruleCode)
      return {
        ...e,
        displayName: rule?.displayName ?? e.ruleCode,
        severity: rule?.severity ?? 'MEDIUM',
        weight: rule?.weight ?? 0,
        evidenceRequired: rule?.evidenceRequired ?? '',
        remediation: rule?.remediation ?? '',
      }
    })

    const criticalFailing = enriched.filter(e => !e.isPassing && (e.severity === 'CRITICAL' || e.ruleCode.startsWith('REG')))

    let threshold: 'AUDIT_READY' | 'GAPS_PRESENT' | 'NOT_READY'
    if (score >= 80 && criticalFailing.length === 0) {
      threshold = 'AUDIT_READY'
    } else if (score >= 50) {
      threshold = 'GAPS_PRESENT'
    } else {
      threshold = 'NOT_READY'
    }

    const summary = {
      passing: enriched.filter(e => e.isPassing).length,
      failing: enriched.filter(e => !e.isPassing).length,
      critical_failing: criticalFailing.length,
    }

    return NextResponse.json({ score, threshold, evaluations: enriched, summary })
  } catch (error) {
    console.error('[POST /api/rules/evaluate]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
