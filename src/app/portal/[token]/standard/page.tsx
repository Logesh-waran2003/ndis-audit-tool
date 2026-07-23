import { notFound } from 'next/navigation'
import Link from 'next/link'

async function getPortalData(token: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  try {
    const res = await fetch(`${baseUrl}/api/portal/${token}`, { cache: 'no-store' })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export default async function PortalStandardsPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const data = await getPortalData(token)
  if (!data) notFound()

  const { standards } = data

  // Group by division
  const divisions: Record<string, typeof standards> = {}
  for (const s of standards) {
    if (!divisions[s.division]) divisions[s.division] = []
    divisions[s.division].push(s)
  }

  const STATUS_DOT: Record<string, string> = {
    MET: 'bg-[#059669]',
    PARTIAL: 'bg-[#d97706]',
    GAP: 'bg-[#dc2626]',
  }

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-[#1a2332]">Standards</h1>

      {Object.entries(divisions).map(([division, items]) => (
        <div key={division}>
          <h2 className="font-heading text-base font-semibold text-[#1a2332] mb-2">{division}</h2>
          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden divide-y divide-slate-100">
            {items.map((s: { code: string; name: string; status: string; evidence: Array<{ id: string }> }) => (
              <Link
                key={s.code}
                href={`/portal/${token}/standard/${s.code}`}
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors"
              >
                <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${STATUS_DOT[s.status] || 'bg-slate-300'}`} />
                <span className="font-mono text-xs text-slate-400 w-14 shrink-0">{s.code}</span>
                <span className="flex-1 text-sm font-medium text-slate-900">{s.name}</span>
                <span className="text-xs text-slate-500">{s.evidence.length} doc{s.evidence.length !== 1 ? 's' : ''}</span>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
