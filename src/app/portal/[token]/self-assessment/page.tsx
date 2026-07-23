import { notFound } from 'next/navigation'

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

export default async function PortalSelfAssessmentPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const data = await getPortalData(token)
  if (!data) notFound()

  const { selfAssessments, standards } = data

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-[#1a2332]">Self-Assessment Responses</h1>

      {selfAssessments.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white py-12 text-center">
          <p className="text-slate-500">No self-assessment responses generated.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {selfAssessments.map((sa: { id: string; standard: { code: string; name: string }; responseText: string }) => {
            const standard = standards.find((s: { code: string }) => s.code === sa.standard.code)
            const wordCount = sa.responseText.split(/\s+/).length
            return (
              <div key={sa.id} className="rounded-lg border border-slate-200 bg-white p-5">
                <div className="flex items-baseline justify-between">
                  <h2 className="font-heading text-base font-semibold text-[#1a2332]">
                    <span className="font-mono text-sm text-slate-400">{sa.standard.code}</span>{' '}
                    {sa.standard.name}
                  </h2>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">{wordCount} words</span>
                    {standard && (
                      <span className={`text-xs font-medium ${
                        standard.status === 'MET' ? 'text-[#059669]' :
                        standard.status === 'PARTIAL' ? 'text-[#d97706]' : 'text-[#dc2626]'
                      }`}>
                        {standard.status.toLowerCase()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-3 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {sa.responseText}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
