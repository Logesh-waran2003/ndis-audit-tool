import { NextResponse } from 'next/server'
import { runCrossReferenceCheck } from '@/lib/cross-reference-engine'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const flags = await runCrossReferenceCheck()
    return NextResponse.json({ flags, total: flags.length })
  } catch (error) {
    console.error('[cross-reference]', error)
    return NextResponse.json({ error: 'Cross-reference check failed' }, { status: 500 })
  }
}
