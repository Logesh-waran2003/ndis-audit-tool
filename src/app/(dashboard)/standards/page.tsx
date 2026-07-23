import Link from 'next/link'

interface Standard {
  id: string
  code: string
  name: string
  division: string
  status: 'MET' | 'PARTIAL' | 'GAP'
  evidenceCount: number
  evidenceGuidance?: string
  description?: string
}

const STATUS_DOT: Record<string, string> = {
  MET: 'bg-[#059669]',
  PARTIAL: 'bg-[#d97706]',
  GAP: 'bg-[#dc2626]',
}

const STATUS_LABEL: Record<string, { text: string; color: string }> = {
  MET: { text: 'Met', color: 'text-[#059669]' },
  PARTIAL: { text: 'Partial', color: 'text-[#d97706]' },
  GAP: { text: 'Gap', color: 'text-[#dc2626]' },
}

async function getStandards(): Promise<Standard[]> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  try {
    const res = await fetch(`${baseUrl}/api/standards`, { cache: 'no-store' })
    return res.ok ? res.json() : []
  } catch {
    return []
  }
}

export default async function StandardsPage() {
  const standards = await getStandards()

  const met = standards.filter(s => s.status === 'MET').length
  const partial = standards.filter(s => s.status === 'PARTIAL').length
  const gap = standards.filter(s => s.status === 'GAP').length
  const total = standards.length
  const pct = total > 0 ? Math.round((met / total) * 100) : 0

  // Group by division
  const divisions: Record<string, Standard[]> = {}
  for (const s of standards) {
    if (!divisions[s.division]) divisions[s.division] = []
    divisions[s.division].push(s)
  }

  return (
    <div className="space-y-8">
      {/* Header with context */}
      <div>
        <h1 className="font-heading text-2xl font-bold text-[#1a2332]">Standards Compliance</h1>
        <p className="mt-1 text-sm text-slate-600">
          Your evidence is assessed against {total} NDIS Practice Standards for Plan Management verification.
          {gap > 0 && ` Upload evidence to address the ${gap} gap${gap > 1 ? 's' : ''} below.`}
          {gap === 0 && met === total && ' All standards are met — you are audit ready.'}
        </p>
      </div>

      {/* Progress card */}
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-medium text-slate-900">Audit Readiness</p>
            <p className="text-xs text-slate-500 mt-0.5">Based on evidence uploaded and mapped to standards</p>
          </div>
          <span className="text-2xl font-heading font-bold text-[#1a2332]">{pct}%</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="flex h-full">
            {met > 0 && <div className="bg-[#059669] transition-all" style={{ width: `${(met / total) * 100}%` }} />}
            {partial > 0 && <div className="bg-[#d97706] transition-all" style={{ width: `${(partial / total) * 100}%` }} />}
          </div>
        </div>
        <div className="flex gap-4 mt-3 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#059669]" />
            <span className="text-slate-600">{met} met</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#d97706]" />
            <span className="text-slate-600">{partial} partial</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#dc2626]" />
            <span className="text-slate-600">{gap} gaps</span>
          </span>
        </div>
      </div>

      {/* Standards by division */}
      <div className="space-y-6">
        {Object.entries(divisions).map(([division, items]) => {
          const divMet = items.filter(s => s.status === 'MET').length
          return (
            <div key={division}>
              <div className="flex items-baseline justify-between mb-2">
                <h2 className="font-heading text-base font-semibold text-[#1a2332]">{division}</h2>
                <span className="text-xs text-slate-400">{divMet}/{items.length} met</span>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white overflow-hidden divide-y divide-slate-100">
                {items.map(standard => (
                  <Link
                    key={standard.id}
                    href={`/standards/${standard.code}`}
                    className="group flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors"
                  >
                    {/* Status dot */}
                    <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${STATUS_DOT[standard.status] || 'bg-slate-300'}`} />
                    
                    {/* Code */}
                    <span className="font-mono text-xs text-slate-400 w-14 shrink-0">{standard.code}</span>
                    
                    {/* Name + guidance hint */}
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-slate-900 block">{standard.name}</span>
                      {standard.status === 'GAP' && standard.evidenceGuidance && (
                        <span className="text-xs text-slate-400 block mt-0.5 truncate">
                          Needs: {standard.evidenceGuidance.split('\n')[0]}
                        </span>
                      )}
                    </div>

                    {/* Status + evidence count */}
                    <div className="flex items-center gap-3 shrink-0">
                      {standard.evidenceCount > 0 && (
                        <span className="text-xs text-slate-500">{standard.evidenceCount} doc{standard.evidenceCount > 1 ? 's' : ''}</span>
                      )}
                      <span className={`text-xs font-medium ${STATUS_LABEL[standard.status]?.color || 'text-slate-400'}`}>
                        {STATUS_LABEL[standard.status]?.text || 'Unknown'}
                      </span>
                      <svg className="h-4 w-4 text-slate-300 group-hover:text-slate-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
