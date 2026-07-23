import Link from 'next/link'

interface TrailItem {
  label: string
  title: string
  href?: string
}

export function TraceabilityTrail({ items }: { items: TrailItem[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {items.map((item, i) => (
        <span key={i} className="contents">
          {i > 0 && <span className="text-xs text-slate-400">→</span>}
          {item.href ? (
            <Link
              href={item.href}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <span className="text-slate-400">{item.label}:</span> {item.title}
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
              <span className="text-slate-400">{item.label}:</span> {item.title}
            </span>
          )}
        </span>
      ))}
    </div>
  )
}
