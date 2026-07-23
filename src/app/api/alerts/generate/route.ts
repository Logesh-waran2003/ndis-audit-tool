import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { runExpiryScan } from '@/lib/expiry-scanner'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const now = new Date()
    const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)
    const twelveMonthsAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
    let newAlerts = 0

    // Run expiry state machine scan first
    const scanResult = await runExpiryScan()

    // 1. Worker screening expiring in < 60 days
    const workers = await prisma.worker.findMany({ where: { isActive: true } })
    for (const w of workers) {
      const expiryDates = [
        { date: w.screeningExpiry, label: 'NDIS Worker Screening' },
        { date: w.policeCheckExpiry, label: 'Police Check' },
        { date: w.wwccExpiry, label: 'WWCC' },
      ]
      for (const { date, label } of expiryDates) {
        if (date && date < sixtyDaysFromNow) {
          const existing = await prisma.alert.findFirst({
            where: { entityType: 'worker', entityId: w.id, type: 'EXPIRY', title: { contains: label }, acknowledged: false },
          })
          if (!existing) {
            await prisma.alert.create({
              data: {
                type: 'EXPIRY',
                entityType: 'worker',
                entityId: w.id,
                title: `${w.name}: ${label} expiring`,
                message: `${label} for ${w.name} expires on ${date.toISOString().split('T')[0]}`,
                severity: date < now ? 'CRITICAL' : 'WARNING',
                dueDate: date,
              },
            })
            newAlerts++
          }
        }
      }
    }

    // 2. Evidence with expiry date approaching
    const expiringEvidence = await prisma.evidence.findMany({
      where: { expiryDate: { lte: sixtyDaysFromNow }, status: { not: 'OUTDATED' } },
    })
    for (const e of expiringEvidence) {
      const existing = await prisma.alert.findFirst({
        where: { entityType: 'evidence', entityId: e.id, type: 'EXPIRY', acknowledged: false },
      })
      if (!existing) {
        await prisma.alert.create({
          data: {
            type: 'EXPIRY',
            entityType: 'evidence',
            entityId: e.id,
            title: `Evidence expiring: ${e.title}`,
            message: `"${e.title}" expires on ${e.expiryDate!.toISOString().split('T')[0]}`,
            severity: e.expiryDate! < now ? 'CRITICAL' : 'WARNING',
            dueDate: e.expiryDate,
          },
        })
        newAlerts++
      }
    }

    // 3. Standards with no linked evidence (GAP)
    const standards = await prisma.standard.findMany({
      include: { evidenceLinks: true },
    })
    for (const s of standards) {
      if (s.evidenceLinks.length === 0) {
        const existing = await prisma.alert.findFirst({
          where: { entityType: 'evidence', entityId: s.id, type: 'GAP', acknowledged: false },
        })
        if (!existing) {
          await prisma.alert.create({
            data: {
              type: 'GAP',
              entityType: 'evidence',
              entityId: s.id,
              title: `No evidence for ${s.code}`,
              message: `Standard "${s.name}" has no linked evidence`,
              severity: 'WARNING',
            },
          })
          newAlerts++
        }
      }
    }

    // 4. Improvements past due date
    const overdueImprovements = await prisma.improvement.findMany({
      where: { dueDate: { lt: now }, status: { in: ['IDENTIFIED', 'IN_PROGRESS'] } },
    })
    for (const imp of overdueImprovements) {
      const existing = await prisma.alert.findFirst({
        where: { entityType: 'improvement', entityId: imp.id, type: 'IMPROVEMENT_DUE', acknowledged: false },
      })
      if (!existing) {
        await prisma.alert.create({
          data: {
            type: 'IMPROVEMENT_DUE',
            entityType: 'improvement',
            entityId: imp.id,
            title: `Overdue: ${imp.title}`,
            message: `Improvement action was due on ${imp.dueDate.toISOString().split('T')[0]}`,
            severity: 'CRITICAL',
            dueDate: imp.dueDate,
          },
        })
        newAlerts++
      }
    }

    // 5. Evidence older than 12 months without review
    const staleEvidence = await prisma.evidence.findMany({
      where: { uploadedAt: { lt: twelveMonthsAgo }, status: 'CURRENT' },
    })
    for (const e of staleEvidence) {
      const existing = await prisma.alert.findFirst({
        where: { entityType: 'evidence', entityId: e.id, type: 'REVIEW_DUE', acknowledged: false },
      })
      if (!existing) {
        await prisma.alert.create({
          data: {
            type: 'REVIEW_DUE',
            entityType: 'evidence',
            entityId: e.id,
            title: `Review due: ${e.title}`,
            message: `"${e.title}" was uploaded over 12 months ago and hasn't been reviewed`,
            severity: 'INFO',
          },
        })
        newAlerts++
      }
    }

    return NextResponse.json({ generated: newAlerts, expiryScan: scanResult })
  } catch (error) {
    console.error('[POST /api/alerts/generate]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
