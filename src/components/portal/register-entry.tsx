"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronDown, ChevronRight } from "lucide-react"

interface RegisterEntryProps {
  entry: {
    id: string
    type: "COMPLAINT" | "INCIDENT" | "FEEDBACK"
    title: string
    description: string
    dateOccurred: string
    status: string
    investigationNotes?: string
    rootCause?: string
    correctiveAction?: string
    correctiveActionEvidenceId?: string
    correctiveActionEvidenceTitle?: string
    linkedImprovementId?: string
    linkedImprovementTitle?: string
  }
  portalToken: string
  highlighted?: boolean
}

const typeBadgeClass: Record<string, string> = {
  COMPLAINT: "bg-amber-100 text-amber-700",
  INCIDENT: "bg-rose-100 text-rose-700",
  FEEDBACK: "bg-blue-100 text-blue-700",
}

export function RegisterEntry({ entry, portalToken, highlighted }: RegisterEntryProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={`border border-slate-200 rounded-lg bg-white ${highlighted ? "ring-2 ring-blue-500" : ""}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 text-left"
        aria-expanded={expanded}
      >
        {expanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeBadgeClass[entry.type]}`}>
          {entry.type}
        </span>
        <span className="font-medium flex-1">{entry.title}</span>
        <span className="text-xs text-slate-500">{entry.dateOccurred}</span>
        <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600">{entry.status}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-0 space-y-3 text-sm border-t border-slate-100 ml-7">
          <div className="pt-3">
            <p className="font-medium text-slate-700">Description</p>
            <p className="text-slate-600">{entry.description}</p>
          </div>
          {entry.investigationNotes && (
            <div>
              <p className="font-medium text-slate-700">Investigation Notes</p>
              <p className="text-slate-600">{entry.investigationNotes}</p>
            </div>
          )}
          {entry.rootCause && (
            <div>
              <p className="font-medium text-slate-700">Root Cause</p>
              <p className="text-slate-600">{entry.rootCause}</p>
            </div>
          )}
          {entry.correctiveAction && (
            <div>
              <p className="font-medium text-slate-700">Corrective Action</p>
              <p className="text-slate-600">{entry.correctiveAction}</p>
            </div>
          )}
          {entry.correctiveActionEvidenceId && (
            <div>
              <a href="#" className="text-blue-600 hover:underline text-sm">
                Evidence: {entry.correctiveActionEvidenceTitle}
              </a>
            </div>
          )}
          {entry.linkedImprovementId && (
            <div>
              <Link
                href={`/portal/${portalToken}/registers?tab=improvements&highlight=${entry.linkedImprovementId}`}
                className="text-blue-600 hover:underline text-sm"
              >
                Linked Improvement: {entry.linkedImprovementTitle}
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
