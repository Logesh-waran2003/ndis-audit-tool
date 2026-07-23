import { format } from 'date-fns'

export function SecurityBanner({ expiresAt }: { expiresAt: string }) {
  return (
    <div className="bg-emerald-50 border border-emerald-200 px-4 py-2 text-sm text-emerald-800">
      🔒 All data hosted in Australia (AWS Sydney). Encrypted at rest and in transit. This link expires {format(new Date(expiresAt), 'd MMM yyyy')}.
    </div>
  )
}
