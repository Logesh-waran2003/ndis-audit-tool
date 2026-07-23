import { prisma } from './db'
import { differenceInDays } from 'date-fns'

interface ScanResult {
  scanned: number
  transitioned: number
  alertsGenerated: number
  details: { evidenceId: string; title: string; from: string; to: string; daysUntilExpiry?: number }[]
}

export async function runExpiryScan(): Promise<ScanResult> {
  const now = new Date()
  const allEvidence = await prisma.evidence.findMany({
    where: { expiryDate: { not: null } }
  })

  const result: ScanResult = { scanned: allEvidence.length, transitioned: 0, alertsGenerated: 0, details: [] }

  for (const ev of allEvidence) {
    if (!ev.expiryDate) continue
    const daysUntil = differenceInDays(ev.expiryDate, now)
    let newStatus: string | null = null
    let alertSeverity: string | null = null

    if (daysUntil <= 0 && ev.status !== 'EXPIRED') {
      newStatus = 'EXPIRED'
      alertSeverity = 'CRITICAL'
    } else if (daysUntil <= 30 && daysUntil > 0 && ev.status !== 'EXPIRING') {
      newStatus = 'EXPIRING'
      alertSeverity = 'CRITICAL'
    } else if (daysUntil <= 60 && daysUntil > 30 && ev.status !== 'EXPIRING') {
      newStatus = 'EXPIRING'
      alertSeverity = 'WARNING'
    } else if (daysUntil <= 90 && daysUntil > 60 && ev.status !== 'EXPIRING') {
      newStatus = 'EXPIRING'
      alertSeverity = 'INFO'
    }

    if (newStatus) {
      const oldStatus = ev.status
      await prisma.evidence.update({
        where: { id: ev.id },
        data: { status: newStatus as any }
      })
      result.transitioned++
      result.details.push({
        evidenceId: ev.id,
        title: ev.title,
        from: oldStatus,
        to: newStatus,
        daysUntilExpiry: daysUntil
      })

      if (alertSeverity) {
        await prisma.alert.create({
          data: {
            type: 'EXPIRY',
            entityType: 'evidence',
            entityId: ev.id,
            title: `${ev.title} ${daysUntil <= 0 ? 'has expired' : `expires in ${daysUntil} days`}`,
            message: `Evidence "${ev.title}" ${daysUntil <= 0 ? 'expired on' : 'will expire on'} ${ev.expiryDate.toLocaleDateString()}. ${daysUntil <= 0 ? 'Upload a replacement immediately.' : 'Plan to renew before expiry.'}`,
            severity: alertSeverity as any,
            dueDate: ev.expiryDate,
          }
        })
        result.alertsGenerated++
      }
    }
  }

  // Scan for stale evidence (uploaded > 12 months ago, no expiry, not verified)
  const staleEvidence = await prisma.evidence.findMany({
    where: {
      expiryDate: null,
      status: { in: ['CURRENT', 'UPLOADED'] },
      uploadedAt: { lt: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000) }
    }
  })

  for (const ev of staleEvidence) {
    await prisma.evidence.update({
      where: { id: ev.id },
      data: { status: 'OUTDATED' }
    })
    result.transitioned++
    result.details.push({
      evidenceId: ev.id,
      title: ev.title,
      from: ev.status,
      to: 'OUTDATED',
    })

    await prisma.alert.create({
      data: {
        type: 'REVIEW_DUE',
        entityType: 'evidence',
        entityId: ev.id,
        title: `${ev.title} needs review`,
        message: `Evidence "${ev.title}" was uploaded over 12 months ago and has not been reviewed. Mark as verified or upload an updated version.`,
        severity: 'WARNING',
      }
    })
    result.alertsGenerated++
  }

  return result
}
