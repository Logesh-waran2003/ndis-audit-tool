import { notFound } from 'next/navigation'
import { format } from 'date-fns'

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

export default async function PortalRegistersPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const data = await getPortalData(token)
  if (!data) notFound()

  const { incidents, improvements, workers } = data

  return (
    <div className="space-y-8">
      <h1 className="font-heading text-2xl font-bold text-[#1a2332]">Registers</h1>

      {/* Workers */}
      <div>
        <h2 className="font-heading text-lg font-semibold text-[#1a2332] mb-3">Workers</h2>
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Screening</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Screening Expiry</th>
              </tr>
            </thead>
            <tbody>
              {workers.map((w: { id: string; name: string; role: string; screeningStatus: string; screeningExpiry: string | null }) => (
                <tr key={w.id} className="border-b border-slate-100">
                  <td className="px-4 py-3 text-slate-900 font-medium">{w.name}</td>
                  <td className="px-4 py-3 text-slate-600">{w.role}</td>
                  <td className={`px-4 py-3 font-medium ${
                    w.screeningStatus === 'CURRENT' ? 'text-[#059669]' :
                    w.screeningStatus === 'EXPIRING' ? 'text-[#d97706]' :
                    w.screeningStatus === 'EXPIRED' ? 'text-[#dc2626]' : 'text-slate-500'
                  }`}>
                    {w.screeningStatus?.toLowerCase() || 'pending'}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {w.screeningExpiry ? format(new Date(w.screeningExpiry), 'd MMM yyyy') : '—'}
                  </td>
                </tr>
              ))}
              {workers.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">No workers registered.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Incidents */}
      <div>
        <h2 className="font-heading text-lg font-semibold text-[#1a2332] mb-3">Incidents &amp; Complaints</h2>
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Title</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Severity</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((i: { id: string; dateOccurred: string; type: string; title: string; severity: string; status: string }) => (
                <tr key={i.id} className="border-b border-slate-100">
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {format(new Date(i.dateOccurred), 'd MMM yyyy')}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{i.type.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 text-slate-900">{i.title}</td>
                  <td className={`px-4 py-3 font-medium ${
                    i.severity === 'HIGH' || i.severity === 'CRITICAL' ? 'text-[#dc2626]' :
                    i.severity === 'MEDIUM' ? 'text-[#d97706]' : 'text-[#059669]'
                  }`}>
                    {i.severity.toLowerCase()}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{i.status.toLowerCase()}</td>
                </tr>
              ))}
              {incidents.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No incidents recorded.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Improvements */}
      <div>
        <h2 className="font-heading text-lg font-semibold text-[#1a2332] mb-3">Continuous Improvement</h2>
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Title</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Source</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Due</th>
              </tr>
            </thead>
            <tbody>
              {improvements.map((imp: { id: string; identifiedDate: string; title: string; source: string; status: string; dueDate: string }) => (
                <tr key={imp.id} className="border-b border-slate-100">
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {format(new Date(imp.identifiedDate), 'd MMM yyyy')}
                  </td>
                  <td className="px-4 py-3 text-slate-900">{imp.title}</td>
                  <td className="px-4 py-3 text-slate-600">{imp.source.replace(/_/g, ' ')}</td>
                  <td className={`px-4 py-3 font-medium ${
                    imp.status === 'COMPLETED' ? 'text-[#059669]' : 'text-[#d97706]'
                  }`}>
                    {imp.status.toLowerCase().replace(/_/g, ' ')}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {format(new Date(imp.dueDate), 'd MMM yyyy')}
                  </td>
                </tr>
              ))}
              {improvements.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No improvements recorded.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
