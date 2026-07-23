interface EvidenceRow {
  id: string
  title: string
  category: string
  uploadDate: string
  status: string
}

export function StandardEvidenceTable({ evidence }: { evidence: EvidenceRow[] }) {
  if (evidence.length === 0) {
    return <p className="text-sm text-slate-500 italic">No evidence uploaded for this standard.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left">
            <th className="py-2 pr-4 font-medium text-slate-700">Document</th>
            <th className="py-2 pr-4 font-medium text-slate-700">Category</th>
            <th className="py-2 pr-4 font-medium text-slate-700">Upload Date</th>
            <th className="py-2 pr-4 font-medium text-slate-700">Status</th>
            <th className="py-2 font-medium text-slate-700"></th>
          </tr>
        </thead>
        <tbody>
          {evidence.map((ev) => (
            <tr key={ev.id} className="border-b border-slate-100">
              <td className="py-3 pr-4 font-medium">{ev.title}</td>
              <td className="py-3 pr-4">
                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs capitalize">
                  {ev.category}
                </span>
              </td>
              <td className="py-3 pr-4 text-slate-600">{ev.uploadDate}</td>
              <td className="py-3 pr-4">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  ev.status === "CURRENT"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}>
                  {ev.status.replace("_", " ")}
                </span>
              </td>
              <td className="py-3">
                <a href="#" className="text-blue-600 hover:underline text-xs">View</a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
