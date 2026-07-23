import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { evaluateAllRules } from '@/lib/rule-evaluator'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    if (searchParams.get('evaluate') === 'true') {
      await evaluateAllRules()
    }

    const rules = await prisma.rule.findMany({ orderBy: [{ severity: 'asc' }, { code: 'asc' }] })

    const failingRules = rules.filter((r) => !r.isPassing)
    const score = Math.max(0, 100 + failingRules.reduce((sum, r) => sum + r.weight, 0))

    let threshold: 'AUDIT_READY' | 'GAPS_PRESENT' | 'NOT_READY'
    if (score >= 80 && !failingRules.some((r) => r.severity === 'CRITICAL')) {
      threshold = 'AUDIT_READY'
    } else if (score >= 50) {
      threshold = 'GAPS_PRESENT'
    } else {
      threshold = 'NOT_READY'
    }

    // Group by domain
    const domainMap = new Map<string, { domain: string; total: number; passing: number; weight: number }>()
    for (const rule of rules) {
      const entry = domainMap.get(rule.domain) ?? { domain: rule.domain, total: 0, passing: 0, weight: 0 }
      entry.total++
      if (rule.isPassing) entry.passing++
      else entry.weight += rule.weight
      domainMap.set(rule.domain, entry)
    }
    const domainScores = [...domainMap.values()].map((d) => ({
      ...d,
      score: Math.max(0, 100 + d.weight),
    }))

    return NextResponse.json({ score, threshold, rules, domainScores })
  } catch (error) {
    console.error('[GET /api/rules]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
