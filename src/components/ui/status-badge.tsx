import { cn } from "@/lib/utils"

export type ComplianceStatus = "MET" | "PARTIAL" | "GAP"

const statusConfig: Record<ComplianceStatus, { label: string; className: string }> = {
  MET: { label: "Met", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  PARTIAL: { label: "Partial", className: "bg-amber-50 text-amber-700 border-amber-200" },
  GAP: { label: "Gap", className: "bg-rose-50 text-rose-700 border-rose-200" },
}

export function StatusBadge({ status }: { status: ComplianceStatus }) {
  const config = statusConfig[status]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        config.className
      )}
    >
      {status === "MET" && "✅"}
      {status === "PARTIAL" && "⚠️"}
      {status === "GAP" && "❌"}
      {config.label}
    </span>
  )
}
