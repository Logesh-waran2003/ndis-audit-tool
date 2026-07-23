import { notFound } from 'next/navigation'
import Link from 'next/link'

interface PortalData {
  pack: { name: string; generatedAt: string; expiresAt: string }
  organisation: { name: string; ndisNumber: string } | null
  standards: Array<{
    code: string
    name: string
    division: string
    status: string
    evidence: Array<{ id: string; title: string; status: string }>
  }>
  incidents: Array<{ id: string; title: string; type: string; status: string }>
  improvements: Array<{ id: string; title: string; status: string }>
  workers: Array<{ id: string; name: string; role: string }>
  selfAssessments: Array<{ id: string; standard: { code: string; name: string }; responseText: string }>
}

async function getPortalData(token: string): Promise<PortalData | null> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  try {
    const res = await fetch(`${baseUrl}/api/portal/${token}`, { cache: 'no-store' })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export default async function PortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const data = await getPortalData(token)
  if (!data) notFound()

  const { pack, organisation, standards, incidents, improvements, workers } = data
  const met = standards.filter(s => s.status === 'MET').length
  const partial = standards.filter(s => s.status === 'PARTIAL').length
  const gap = standards.filter(s => s.status === 'GAP').length
  const total = standards.length

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold text-[#1a2332]">{pack.name}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {organisation?.name || 'Organisation'}{organisation?.ndisNumber ? ` · NDIS ${organisation.ndisNumber}` : ''}
        </p>
      </div>

      {/* Compliance summary */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="font-heading text-lg font-semibold text-[#1a2332]">Compliance Status</h2>
        <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="flex h-full">
            {met > 0 && <div className="bg-[#059669]" style={{ width: `${(met / total) * 100}%` }} />}
            {partial > 0 && <div className="bg-[#d97706]" style={{ width: `${(partial / total) * 100}%` }} />}
            {gap > 0 && <div className="bg-[#dc2626]" style={{ width: `${(gap / total) * 100}%` }} />}
          </div>
        </div>
        <div className="mt-3 flex gap-6 text-sm">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#059669]" />
            <span className="text-slate-700">{met} met</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#d97706]" />
            <span className="text-slate-700">{partial} partial</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#dc2626]" />
            <span className="text-slate-700">{gap} gaps</span>
          </span>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium uppercase text-slate-500">Standards</p>
          <p className="mt-1 text-2xl font-heading font-bold text-[#1a2332]">{total}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium uppercase text-slate-500">Evidence Items</p>
          <p className="mt-1 text-2xl font-heading font-bold text-[#1a2332]">
            {standards.reduce((acc, s) => acc + s.evidence.length, 0)}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium uppercase text-slate-500">Workers</p>
          <p className="mt-1 text-2xl font-heading font-bold text-[#1a2332]">{workers.length}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium uppercase text-slate-500">Incidents</p>
          <p className="mt-1 text-2xl font-heading font-bold text-[#1a2332]">{incidents.length}</p>
        </div>
      </div>

      {/* Standards list */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/80">
          <h2 className="text-sm font-medium text-slate-700">Standards Overview</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Code</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Standard</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Evidence</th>
            </tr>
          </thead>
          <tbody>
            {standards.map(s => (
              <tr key={s.code} className="border-b border-slate-100">
                <td className="px-4 py-3 font-mono text-xs text-slate-500">
                  <Link href={`/portal/${token}/standard/${s.code}`} className="hover:text-[#1a2332]">{s.code}</Link>
                </td>
                <td className="px-4 py-3 text-slate-900">
                  <Link href={`/portal/${token}/standard/${s.code}`} className="hover:text-[#1a2332]">{s.name}</Link>
                </td>
                <td className={`px-4 py-3 font-medium ${
                  s.status === 'MET' ? 'text-[#059669]' : s.status === 'PARTIAL' ? 'text-[#d97706]' : 'text-[#dc2626]'
                }`}>
                  {s.status.toLowerCase()}
                </td>
                <td className="px-4 py-3 text-slate-600">{s.evidence.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
