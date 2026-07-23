import { NextResponse } from 'next/server'
import { runExpiryScan } from '@/lib/expiry-scanner'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const result = await runExpiryScan()
    return NextResponse.json(result)
  } catch (error) {
    console.error('[POST /api/scan/expiry]', error)
    return NextResponse.json({ error: 'Scan failed' }, { status: 500 })
  }
}
