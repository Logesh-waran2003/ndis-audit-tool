interface ComplianceChartProps {
  standards: Array<{ code: string; name: string; status: "MET" | "PARTIAL" | "GAP" }>
}

export function ComplianceChart({ standards }: ComplianceChartProps) {
  const total = standards.length
  const met = standards.filter((s) => s.status === "MET").length
  const partial = standards.filter((s) => s.status === "PARTIAL").length
  const gap = standards.filter((s) => s.status === "GAP").length

  const pctMet = (met / total) * 100
  const pctPartial = (partial / total) * 100
  const pctGap = (gap / total) * 100

  return (
    <div className="space-y-3">
      <div className="h-8 rounded-full overflow-hidden flex" role="img" aria-label={`Compliance: ${met} met, ${partial} partial, ${gap} gap`}>
        {pctMet > 0 && <div className="bg-emerald-500 transition-all" style={{ width: `${pctMet}%` }} />}
        {pctPartial > 0 && <div className="bg-amber-500 transition-all" style={{ width: `${pctPartial}%` }} />}
        {pctGap > 0 && <div className="bg-rose-500 transition-all" style={{ width: `${pctGap}%` }} />}
      </div>
      <div className="flex gap-6 text-sm">
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500" />
          {met} Met
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-amber-500" />
          {partial} Partial
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-rose-500" />
          {gap} Gap
        </span>
      </div>
    </div>
  )
}
