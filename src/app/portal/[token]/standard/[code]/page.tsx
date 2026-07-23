import { notFound } from 'next/navigation'
import Link from 'next/link'
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

export default async function PortalStandardPage({ params }: { params: Promise<{ token: string; code: string }> }) {
  const { token, code } = await params
  const data = await getPortalData(token)
  if (!data) notFound()

  const standard = data.standards.find((s: { code: string }) => s.code === code)
  if (!standard) notFound()

  const selfAssessment = data.selfAssessments.find(
    (sa: { standard: { code: string } }) => sa.standard.code === code
  )

  const STATUS_COLOR: Record<string, string> = {
    MET: 'text-[#059669]',
    PARTIAL: 'text-[#d97706]',
    GAP: 'text-[#dc2626]',
  }
  const STATUS_DOT: Record<string, string> = {
    MET: 'bg-[#059669]',
    PARTIAL: 'bg-[#d97706]',
    GAP: 'bg-[#dc2626]',
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/portal/${token}`} className="text-xs text-slate-500 hover:text-slate-700">← Back to overview</Link>
        <div className="mt-2 flex items-center gap-3">
          <span className={`h-3 w-3 rounded-full ${STATUS_DOT[standard.status]}`} />
          <h1 className="font-heading text-2xl font-bold text-[#1a2332]">
            <span className="font-mono text-lg text-slate-400">{standard.code}</span>{' '}
            {standard.name}
          </h1>
        </div>
        <p className={`mt-1 text-sm font-medium ${STATUS_COLOR[standard.status]}`}>
          {standard.status.toLowerCase()} · {standard.division}
        </p>
      </div>

      {/* Description */}
      {standard.description && (
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="font-heading text-base font-semibold text-[#1a2332]">Description</h2>
          <p className="mt-2 text-sm text-slate-700 leading-relaxed">{standard.description}</p>
        </div>
      )}

      {/* Evidence */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/80">
          <h2 className="text-sm font-medium text-slate-700">Linked Evidence ({standard.evidence.length})</h2>
        </div>
        {standard.evidence.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-slate-500">No evidence linked to this standard.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Title</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Uploaded</th>
              </tr>
            </thead>
            <tbody>
              {standard.evidence.map((doc: { id: string; title: string; category: string; status: string; uploadedAt: string }) => (
                <tr key={doc.id} className="border-b border-slate-100">
                  <td className="px-4 py-3 text-slate-900 font-medium">{doc.title}</td>
                  <td className="px-4 py-3 text-slate-600">{doc.category.replace(/_/g, ' ')}</td>
                  <td className={`px-4 py-3 font-medium ${
                    doc.status === 'CURRENT' ? 'text-[#059669]' : doc.status === 'OUTDATED' ? 'text-[#d97706]' : 'text-[#dc2626]'
                  }`}>
                    {doc.status.toLowerCase()}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {format(new Date(doc.uploadedAt), 'd MMM yyyy')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Self-assessment */}
      {selfAssessment && (
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="font-heading text-base font-semibold text-[#1a2332]">Self-Assessment Response</h2>
          <p className="mt-1 text-xs text-slate-500">{selfAssessment.responseText.split(/\s+/).length} words</p>
          <div className="mt-3 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
            {selfAssessment.responseText}
          </div>
        </div>
      )}
    </div>
  )
}
