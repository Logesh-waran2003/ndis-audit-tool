# BUILD: Onboarding Rebuild — Smart 2-Screen Flow

Working directory: ~/Projects/ndis-audit-tool

Read UI-SYSTEM.md for design rules.

## What to build:

Replace the current 4-step onboarding wizard with a smart 2-screen flow that works for ALL provider scenarios (pre-first audit, renewal, mid-cycle). 

Delete or replace: src/app/(dashboard)/onboarding/page.tsx (the old 4-step wizard)

## Screen 1: Input (same for everyone)

Route: /onboarding

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                   │
│  AuditReady                                                       │
│                                                                   │
│  Let's get you audit-ready.                                       │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  How many participants do you currently manage?              │ │
│  │  [ 1100          ]                                          │ │
│  │                                                              │ │
│  │  How many staff (including yourself)?                        │ │
│  │  [ 3             ]                                          │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  Upload your compliance documents                                 │
│  Policies, certificates, staff records, previous audit evidence   │
│  — whatever you have. Upload as many files as you like.           │
│                                                                   │
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐ │
│  │                                                              │ │
│  │   Drop files here or click to browse                         │ │
│  │   PDF, DOCX, PNG, JPG, XLSX — upload multiple files          │ │
│  │                                                              │ │
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘ │
│                                                                   │
│  Uploaded: (shows list as files are added)                        │
│    ✓ NDIS_Policy_Manual_R3.docx                                  │
│    ✓ Public_Liability_Insurance.pdf                               │
│    ✓ Worker_Screening_Logesh.pdf                                  │
│    ✓ Audit_Certificate_2024.pdf                                   │
│                                                                   │
│  [Continue →]                                                     │
│                                                                   │
│  ─── or ───                                                       │
│  [I don't have any documents yet — start fresh]                   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Screen 1 Implementation:

```tsx
'use client'

// State:
const [participantCount, setParticipantCount] = useState('')
const [staffCount, setStaffCount] = useState('')
const [files, setFiles] = useState<File[]>([])
const [uploading, setUploading] = useState(false)

// Multi-file drop zone (accepts multiple)
// As files are added, show them in a list below the drop zone with ✓ icon
// "Continue" button disabled until participantCount + staffCount filled + at least 1 file
// "Start fresh" link skips upload, just saves the counts and goes to checklist

// On "Continue →":
async function handleContinue() {
  setUploading(true)
  
  // 1. Save org details (participant count, staff count)
  await fetch('/api/organisation', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      participantCount: parseInt(participantCount),
      staffCount: parseInt(staffCount)
    })
  })
  
  // 2. Upload ALL files in parallel
  const uploadPromises = files.map(file => {
    const formData = new FormData()
    formData.append('file', file)
    // Auto-set title from filename (cleaned)
    formData.append('title', file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '))
    // Auto-detect category from filename/extension
    formData.append('category', detectCategory(file.name))
    return fetch('/api/evidence', { method: 'POST', body: formData })
  })
  
  await Promise.all(uploadPromises)
  
  // 3. Redirect to Screen 2 (scenario detection)
  router.push('/onboarding/results')
}

// Category detection helper:
function detectCategory(filename: string): string {
  const lower = filename.toLowerCase()
  if (lower.includes('insurance') || lower.includes('liability') || lower.includes('indemnity')) return 'GOVERNANCE'
  if (lower.includes('screening') || lower.includes('worker') || lower.includes('police')) return 'WORKER'
  if (lower.includes('agreement') || lower.includes('participant') || lower.includes('consent')) return 'PARTICIPANT'
  if (lower.includes('incident') || lower.includes('complaint')) return 'INCIDENT'
  return 'POLICY' // default
}
```

### "Start fresh" path:
- Saves participant + staff count
- Sets localStorage onboarding_complete = 'true'
- Redirects to /checklist
- Shows empty checklist: "Upload documents from the Checklist page when ready"

---

## Screen 2: Results (AI-determined scenario)

Route: /onboarding/results

This page:
1. Shows a loading state while AI processes ("Analysing X documents...")
2. AI determines scenario (A, B, or C)
3. Shows scenario-specific results

### Implementation:

```tsx
'use client'

// On mount: fetch evidence + checklist status, call AI to determine scenario
useEffect(() => {
  async function analyse() {
    // Get all evidence just uploaded
    const evidence = await fetch('/api/evidence').then(r => r.json())
    
    // Get checklist status (background evaluation should be completing)
    const checklist = await fetch('/api/checklist').then(r => r.json())
    
    // Get organisation details
    const org = await fetch('/api/organisation').then(r => r.json())
    
    // Call AI to determine scenario
    const scenario = await fetch('/api/onboarding/detect-scenario', {
      method: 'POST'
    }).then(r => r.json())
    
    setResults({ evidence, checklist, org, scenario })
  }
  analyse()
}, [])
```

### API: POST /api/onboarding/detect-scenario

Create: src/app/api/onboarding/detect-scenario/route.ts

```typescript
// Fetches all evidence, looks for audit reports/certificates
// Uses AI to determine scenario from document titles and dates
// Returns: { scenario: 'A'|'B'|'C', lastAuditDate, registrationExpiry, reasoning }

const prompt = `Based on these uploaded documents for an NDIS Plan Management provider, determine their audit status:

Documents uploaded:
${evidence.map(e => `- "${e.title}" (${e.category}, uploaded ${e.uploadedAt})`).join('\n')}

Organisation: ${org.participantCount} participants, ${org.staffCount} staff

Determine:
1. SCENARIO:
   - "A" (PRE_FIRST_AUDIT): Has registration but no previous audit evidence
   - "B" (RENEWAL): Has evidence of a previous audit (audit certificate, audit report, or reverification report with a date)
   - "C" (MID_CYCLE): Has recent audit (within last 18 months) + actively maintained documents

2. Extract if found:
   - lastAuditDate (from audit certificate/report)
   - registrationExpiry (from registration certificate)
   - previousParticipantCount (if mentioned in any doc)

Return ONLY JSON:
{"scenario": "B", "lastAuditDate": "2024-04-05", "registrationExpiry": "2027-09-11", "previousParticipantCount": 137, "reasoning": "Found audit certificate dated April 2024"}`
```

### Screen 2 Display — Scenario A:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                   │
│  Your first verification audit                                    │
│                                                                   │
│  Based on your documents, you haven't completed a                 │
│  verification audit yet.                                          │
│                                                                   │
│  Registration expires: 11 September 2027                          │
│  Audit should be completed by: ~March 2027                        │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │  Checklist: 14/28 items ready                              │   │
│  │  ████████████░░░░░░░░░░░░░  50%                           │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                   │
│  To focus on first:                                               │
│  • Upload worker screening certificates (CRITICAL)                │
│  • Upload insurance certificates (CRITICAL)                       │
│  • Ensure incident register is maintained                         │
│                                                                   │
│  [Go to Checklist →]                                              │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Screen 2 Display — Scenario B:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                   │
│  Preparing for your next audit                                    │
│                                                                   │
│  Last audit: 5 April 2024 (full compliance ✓)                     │
│  Next audit due by: ~March 2027 (14 months)                       │
│                                                                   │
│  What's changed since your last audit:                            │
│                                                                   │
│  ⚠ Participants: 137 → 1,100 (8x growth)                         │
│  ⚠ Staff: 1 → 3 (2 new workers need full files)                  │
│  ⚠ 5 policies not reviewed in 2+ years                           │
│  ⚠ Legislation changes: 3 new Acts since Apr 2024                │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │  Checklist: 21/28 items ready                              │   │
│  │  ████████████████████████░░░  75%                          │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                   │
│  Priority actions:                                                │
│  1. Update org chart for current team (you had 1, now 3)          │
│  2. Complete staff files for 2 new workers                        │
│  3. Review and date-stamp all policies                            │
│  4. Add data sovereignty clause (offshore contractor)             │
│                                                                   │
│  [Go to Checklist →]                                              │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Screen 2 Display — Scenario C:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                   │
│  You're in good shape                                             │
│                                                                   │
│  Last audit: 12 January 2026 (full compliance ✓)                  │
│  Next audit: ~July 2028 (25 months away)                          │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │  Checklist: 26/28 items ready                              │   │
│  │  █████████████████████████████░  93%                       │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                   │
│  Keep an eye on:                                                  │
│  • Worker screening expires in 58 days                            │
│  • Insurance renewal in 4 months                                  │
│                                                                   │
│  Recommendation: Set up the daily 10-minute check                 │
│  to maintain compliance effortlessly.                             │
│                                                                   │
│  [Go to Checklist →]    [Set up Daily Check →]                    │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## API Changes Needed:

### 1. PATCH /api/organisation — add participantCount + staffCount fields

Update prisma schema:
```prisma
model Organisation {
  // ... existing fields ...
  participantCount  Int?
  staffCount        Int?
}
```

Run migration: `npx prisma migrate dev --name add_org_counts`

Create/update route at src/app/api/organisation/route.ts:
- GET: returns organisation record
- PATCH: updates participantCount, staffCount (and any other fields passed)

### 2. POST /api/onboarding/detect-scenario

New route at src/app/api/onboarding/detect-scenario/route.ts
- Fetches all evidence + organisation
- Calls AI with the prompt above
- Returns scenario + delta data

### 3. Update auto-redirect logic

In src/app/(dashboard)/page.tsx (or the onboarding-redirect component):
- If no evidence AND no localStorage flag → redirect to /onboarding
- Keep existing logic, just point to new onboarding page

---

## Multi-file Upload Implementation:

The drop zone must accept MULTIPLE files. Key change from current single-file upload:

```tsx
// Drop zone accepts multiple
<input
  type="file"
  multiple
  accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.xlsx"
  onChange={(e) => {
    const newFiles = Array.from(e.target.files || [])
    setFiles(prev => [...prev, ...newFiles])
  }}
/>

// Also handle drag+drop with multiple files
onDrop={(e) => {
  e.preventDefault()
  const newFiles = Array.from(e.dataTransfer.files)
  setFiles(prev => [...prev, ...newFiles])
}}
```

Show uploaded files as a list:
```tsx
{files.map((f, i) => (
  <div key={i} className="flex items-center gap-2 py-1">
    <span className="text-[#059669]">✓</span>
    <span className="text-sm text-slate-700 truncate">{f.name}</span>
    <span className="text-xs text-slate-400">{(f.size/1024).toFixed(0)}KB</span>
    <button onClick={() => setFiles(files.filter((_, j) => j !== i))} className="text-xs text-slate-400 hover:text-red-500">✕</button>
  </div>
))}
```

---

## Loading State (between Screen 1 and Screen 2):

While files are being uploaded and AI is processing, show:

```
Analysing your documents...

Uploading: 4/4 complete ✓
Processing: ████████░░ 3 of 4 analysed

This takes 30-60 seconds for large document sets.
```

Use a simple progress state:
```tsx
const [progress, setProgress] = useState({ uploaded: 0, total: 0, analysed: 0 })
```

---

## Style:
- Screen 1: White background, centered, max-width 600px
- Inputs: standard h-10, border-slate-300, bg-white
- Drop zone: dashed border, bg-slate-50, generous padding (p-12)
- File list: simple, tight (py-1 per file)
- Screen 2: White background, centered, max-width 700px
- Delta items: ⚠ icon in amber for changes/concerns
- Progress bar: same as standards page (emerald for done, slate for remaining)
- "Continue" button: bg-[#1a2332] text-white, full width below the drop zone
- "Start fresh" link: text-sm text-slate-500 underline, centered below button

## Do NOT:
- Use a multi-step wizard with sidebar indicators (that's the old design)
- Show category/title inputs per file (AI auto-detects)
- Require specific documents (user uploads whatever they have)
- Use bg-transparent on any input
- Make it feel like a form — it should feel like "drop your stuff here"
