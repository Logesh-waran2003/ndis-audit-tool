# NDIS Audit Tool — Frontend Rebuild Specification

## Context
The current frontend is AI slop: mock data, placeholder pages, generic card layouts, non-functional forms. The backend APIs work, the DB is seeded, AI proxy is live. We need to rebuild the frontend properly — every page fetches real data, every form submits to real APIs, zero mock imports.

## Knowledge Base
The tool should use `~/Documents/PM_AI_Knowledge_Base/` as its authoritative source. The `Document_Register.csv` is the metadata index. When AI features reference documents, they cite by Doc ID (e.g., "PM-LEG-003, Part 9").

Key audit documents:
- PM-LEG-002 Schedule 8 = Practice Standards (what you must achieve)
- PM-LEG-003 Part 9 = Quality Indicators (how auditors measure)
- PM-COMP-001 = Verification Module Required Documentation (the checklist)

## Design Principles (from frontend-design skill)

### Ground it in the subject
This is a **compliance and trust tool** for a Plan Manager preparing for an NDIS verification audit. The subject's world: financial administration, participant safety, evidence-based compliance, government regulation. NOT a startup dashboard. NOT a SaaS landing page.

### What makes it NOT slop:
1. **No decorative elements** — every visual element communicates information
2. **No numbered markers (01/02/03)** unless content is actually sequential
3. **No gradient backgrounds, no heavy shadows, no rounded corners on everything**
4. **No generic "Welcome back!" greetings** — the PM knows who they are
5. **No card-grid-for-everything layout** — use tables for tabular data, prose for guidance
6. **Typography does the work** — clear hierarchy with Space Grotesk (headings) and Inter (body), weight/size differences create structure without decorative borders
7. **Status colours are information, not decoration** — green/amber/red ONLY on compliance status indicators
8. **White space is intentional** — sections breathe, but empty space isn't filler

### The signature:
**Linked traceability trail** — a horizontal breadcrumb-like pill chain showing relationships: `Standard VM-1.5 → Complaints Policy → Incident #3 → Improvement #2`. This appears contextually when viewing any linked entity.

### Palette (strict):
- `--navy: #1a2332` (sidebar, headings)
- `--bg: #ffffff` (main content), `--bg-subtle: #f8fafc` (page background)
- `--text: #334155` (body), `--text-muted: #64748b` (secondary)
- `--met: #059669` (dark emerald — not bright green)
- `--partial: #d97706` (dark amber)
- `--gap: #dc2626` (dark red)
- `--border: #e2e8f0`

### Font stack:
```css
--font-heading: 'Space Grotesk', system-ui;
--font-body: 'Inter', system-ui;
--font-mono: 'JetBrains Mono', monospace; /* for doc IDs, codes */
```

## Architecture

### Data fetching pattern:
All pages are **server components** that fetch from internal API routes. Interactive parts (filters, forms) are extracted into client components.

```tsx
// Page (server component)
async function getData() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/endpoint`, { cache: 'no-store' })
  return res.ok ? res.json() : []
}
export default async function Page() {
  const data = await getData()
  return <ClientComponent initialData={data} />
}
```

### Form submission pattern:
```tsx
// Client component with form
async function onSubmit(formData: FormData) {
  const res = await fetch('/api/endpoint', { method: 'POST', body: formData })
  if (res.ok) { router.refresh() } // revalidate server data
}
```

## Pages to Rebuild (Priority Order)

### 1. Dashboard (/) — "End of Day"
NOT a card grid. This is a **status board**.

Layout:
- Top line: `AuditReady` left, `416 days to audit` right (plain text, no card)
- Section: **Compliance** — single horizontal bar showing 15 standards as coloured segments (green/amber/red). Hover any segment → tooltip with standard name. Below bar: "2 met · 3 partial · 10 gaps"
- Section: **Attention Required** — plain list (no cards), max 5 items. Each: severity dot + message + entity link. If empty: "Nothing requires attention today."
- Section: **Quick Entry** — 3 text links: "Log incident" · "Upload evidence" · "Record improvement". Not big buttons. Just links.
- Section: **Recent Activity** — last 5 actions taken (created incident, uploaded document, etc.) with timestamps. Auto-populated from DB.

### 2. Evidence (/evidence) — Document Library
A **table**, not a card grid. Plan managers deal with documents — tables are the natural format.

Layout:
- Header: "Evidence" (no subtitle)
- Upload button (top right) → opens sheet with drag-drop + metadata form + AI classification
- Filter row: search input + category dropdown + status dropdown
- Table columns: Title | Category | Status | Linked Standards | Uploaded | Expiry
- Click row → opens detail sheet (right panel)
- Detail sheet: full metadata, file download, linked standards (add/remove), linked incidents/improvements, "Run AI Review" button
- Status column: coloured text (not badges). "Current" in green, "Outdated" in amber, "Expiring" in red.

### 3. Standards (/standards) — Compliance Map
NOT a card grid. A **structured list grouped by division**.

Layout:
- Header: "Standards" + overall compliance fraction "2 of 15 met"
- Grouped by division (collapsible):
  - Division 1: Governance & Operational Management
  - Division 2: Provision of Supports  
  - Division 3: Participant Outcomes
  - Division 4: Safeguarding
  - Division 5: Worker Screening
- Each standard: status dot + code (mono) + name + evidence count. Click → detail page.
- No boxes around each standard. Just rows with clear typography hierarchy.

### 4. Standard Detail (/standards/[code]) — Single Standard Deep Dive
Layout:
- Header: status dot + code + name
- Tabs: Overview | Evidence | Quality Indicators | Self-Assessment
- **Overview tab**: description, PM-specific interpretation, common gaps, gold standard
- **Evidence tab**: table of linked evidence. "Link evidence" button.
- **Quality Indicators tab**: list of indicators with per-indicator status
- **Self-Assessment tab**: generated response (or empty with "Generate" button). Word count. Copy button. Edit inline.

### 5. Workers (/workers)
Simple table. Only 3 workers.

Layout:
- Header: "Workers" + "All screening current ✓" or "⚠ 1 expiring"
- Table: Name | Role | Screening Status | Screening Expiry | Last Training | Last Supervision
- Click row → expandable detail showing: all training records, all supervision logs, all linked evidence
- "Add worker" button → form
- "Add training" / "Add supervision" buttons within expanded row

### 6. Incidents (/incidents) — Register
A **register** — like a log book.

Layout:
- Header: "Incidents & Complaints" + filter row (type, status)
- Table: Date | Type | Title | Severity | Status | Linked
- Click row → expand inline showing: full description, investigation notes, corrective action, linked improvement (clickable), linked evidence (clickable)
- "Log incident" button → form (type, title, description, date, severity, reported by)
- Traceability: if incident has linked improvement, show the trail inline

### 7. Improvements (/improvements) — Register
Layout:
- Header: "Continuous Improvement" + summary text "3 actions in progress, 1 overdue"
- Table: Date | Title | Source | Status | Due | Responsible
- Click row → expand showing: description, source incident (clickable link), action required, action taken, evidence (clickable), status progression dots
- "Record improvement" button → form
- Overdue rows highlighted with left red border (subtle, not garish)

### 8. Audit Pack (/audit/pack)
Layout:
- Header: "Audit Pack"
- If no pack exists: "Generate your first audit pack" + button
- If pack exists: show token URL (copy button), expiry, creation date
- "Preview portal" link → opens /portal/[token] in new tab
- "Regenerate" / "Revoke" buttons

### 9. Self-Assessment (/audit/self-assessment)
Layout:
- Header: "Self-Assessment Responses"
- List of all 15 standards. For each: code + name + status (Draft/Final/Empty) + word count
- Click → expand showing the response text, evidence cited, edit button, regenerate button, copy button
- "Generate All" button at top

### 10. Portal (/portal/[token]) — Auditor View
Completely separate layout. No sidebar from the PM view.

- Top: security banner (data sovereignty, encryption, expiry date)
- Left nav: standards grouped by division + "Registers" + "Self-Assessment"
- Main content: whatever's selected
- Every linked entity is clickable — the trail pill shows relationships
- Print-friendly (hide nav on print)

## Files to Delete
- `src/lib/mock-data.ts`
- `src/lib/evidence-data.ts`

## Validation Criteria
After rebuild, the following must be true:
1. `grep -r "mock\|Mock" src/ --include="*.tsx" --include="*.ts" | grep -v "isMock\|node_modules"` returns ZERO results
2. `bun run build` passes with no errors
3. Every page fetches from `/api/` routes
4. Every form POSTs to `/api/` routes and data appears in PostgreSQL
5. The dashboard shows real compliance status from the DB
6. Upload evidence → file saved to `public/uploads/` → record in DB → appears in evidence list
7. AI self-assessment returns real Gemini response (not mock) via proxy
8. Portal renders real data from audit pack snapshot
