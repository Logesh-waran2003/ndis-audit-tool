# BUILD: Auditor Checklist with One-Upload-Satisfies-Many

Working directory: ~/Projects/ndis-audit-tool

Read these files first:
- UI-SYSTEM.md (design rules)
- RULE-ENGINE-ADOPTION.md (rule context)
- src/app/api/evidence/route.ts (current upload + background classify logic)

## What to build:

Replace the current Evidence page with a **Checklist-first** page. The auditor told us exactly what they need. The tool presents that list, and when the user uploads ONE document, AI reads it and auto-ticks every checklist item it satisfies.

## The Auditor's Checklist (hardcode these as the master list):

```typescript
// src/lib/audit-checklist.ts

export interface ChecklistItem {
  id: string
  category: string
  name: string
  description: string
  type: 'upload' | 'in_tool' | 'export_external'
  canGenerate: boolean  // AI can generate this document
  perWorker?: boolean   // needs one per worker
  perParticipant?: boolean  // needs sample per participant
  satisfied: boolean
  satisfiedBy?: string  // evidence ID or 'TOOL_INCIDENTS' etc.
  satisfiedFrom?: string  // "Chapter 6 of Policy Manual" — how AI found it
}

export const AUDIT_CHECKLIST: Omit<ChecklistItem, 'satisfied' | 'satisfiedBy' | 'satisfiedFrom'>[] = [
  // Governance & Business
  { id: 'GOV-POLICY', category: 'Governance & Business', name: 'Policies and procedures manual', description: 'Complete policy manual covering operations', type: 'upload', canGenerate: false },
  { id: 'GOV-BIZPLAN', category: 'Governance & Business', name: 'Business plan', description: 'Current business plan reflecting organisational structure and goals', type: 'upload', canGenerate: true },
  { id: 'GOV-ORGCHART', category: 'Governance & Business', name: 'Organisation chart', description: 'Current organisational structure showing roles and reporting lines', type: 'upload', canGenerate: true },
  { id: 'GOV-DELEGATION', category: 'Governance & Business', name: 'Delegation of authority register', description: 'Who can approve invoices, payments, communications', type: 'upload', canGenerate: true },
  { id: 'GOV-COI', category: 'Governance & Business', name: 'Conflict of interest register and forms', description: 'COI declarations from all staff', type: 'upload', canGenerate: true },
  { id: 'GOV-LEGISLATIVE', category: 'Governance & Business', name: 'Legislative compliance register', description: 'List of all legislation the organisation complies with', type: 'upload', canGenerate: true },
  { id: 'GOV-MINUTES', category: 'Governance & Business', name: 'Recent meeting minutes', description: 'Evidence of governance meetings', type: 'upload', canGenerate: false },

  // Registers
  { id: 'REG-CI', category: 'Registers', name: 'Continuous improvement register', description: 'Record of improvements identified and actioned', type: 'in_tool', canGenerate: false },
  { id: 'REG-RISK', category: 'Registers', name: 'Risk register', description: 'Identified risks with treatments, reviewed within 12 months', type: 'upload', canGenerate: true },
  { id: 'REG-INCIDENT', category: 'Registers', name: 'Incident register + sample incident forms', description: 'Record of incidents with investigation trail', type: 'in_tool', canGenerate: false },
  { id: 'REG-COMPLAINT', category: 'Registers', name: 'Complaints register and feedback records', description: 'Record of complaints with resolution', type: 'in_tool', canGenerate: false },

  // Insurance & Compliance
  { id: 'INS-PL', category: 'Insurance & Compliance', name: 'Public liability insurance certificate', description: 'Current certificate of currency', type: 'upload', canGenerate: false },
  { id: 'INS-PI', category: 'Insurance & Compliance', name: 'Professional indemnity insurance certificate', description: 'Current certificate of currency', type: 'upload', canGenerate: false },
  { id: 'INS-WC', category: 'Insurance & Compliance', name: 'Workers compensation insurance', description: 'Current certificate of currency', type: 'upload', canGenerate: false },
  { id: 'INS-REGO', category: 'Insurance & Compliance', name: 'NDIS certificate of registration', description: 'Current registration certificate from Commission', type: 'upload', canGenerate: false },

  // Staff Files (per worker)
  { id: 'STAFF-ID', category: 'Staff Files', name: '100 Points of ID', description: 'Passport, birth certificate, drivers licence', type: 'upload', canGenerate: false, perWorker: true },
  { id: 'STAFF-SCREENING', category: 'Staff Files', name: 'NDIS Worker Screening Clearance', description: 'Current clearance certificate', type: 'upload', canGenerate: false, perWorker: true },
  { id: 'STAFF-POLICE', category: 'Staff Files', name: 'National Police Check', description: 'Current within 3 years', type: 'upload', canGenerate: false, perWorker: true },
  { id: 'STAFF-CONTRACT', category: 'Staff Files', name: 'Signed employment contract', description: 'Current signed contract', type: 'upload', canGenerate: false, perWorker: true },
  { id: 'STAFF-PD', category: 'Staff Files', name: 'Position description', description: 'Current role description with responsibilities', type: 'upload', canGenerate: true, perWorker: true },
  { id: 'STAFF-RESUME', category: 'Staff Files', name: 'Resume / CV', description: 'On file for each worker', type: 'upload', canGenerate: false, perWorker: true },
  { id: 'STAFF-INDUCTION', category: 'Staff Files', name: 'Induction checklist (completed)', description: 'Signed induction covering policies, WHS, Code of Conduct', type: 'upload', canGenerate: true, perWorker: true },
  { id: 'STAFF-ORIENTATION', category: 'Staff Files', name: 'NDIS Worker Orientation Module (4 modules)', description: 'Quality Safety and You, New Worker, Communication, Safe Meals', type: 'upload', canGenerate: false, perWorker: true },
  { id: 'STAFF-COC', category: 'Staff Files', name: 'Code of Conduct signed', description: 'Signed acknowledgement per worker', type: 'upload', canGenerate: true, perWorker: true },
  { id: 'STAFF-COI', category: 'Staff Files', name: 'Conflict of Interest declaration', description: 'Signed declaration per worker', type: 'upload', canGenerate: true, perWorker: true },
  { id: 'STAFF-FIRSTAID', category: 'Staff Files', name: 'First Aid & CPR certificate', description: 'First Aid 3yr expiry, CPR 1yr expiry', type: 'upload', canGenerate: false, perWorker: true },

  // Participant Files (5 samples)
  { id: 'PART-SA', category: 'Participant Files (5 samples)', name: 'Service agreements', description: 'Signed or accepted service agreements', type: 'export_external', canGenerate: false, perParticipant: true },
  { id: 'PART-STATEMENTS', category: 'Participant Files (5 samples)', name: 'Monthly financial statements', description: 'Evidence of monthly statements sent', type: 'export_external', canGenerate: false, perParticipant: true },
]
```

## The Page Layout:

```
┌─────────────────────────────────────────────────────────┐
│ Audit Checklist                           14/28 ready   │
│ Based on your auditor's requirements.                   │
│ Upload documents — AI maps them to checklist items.     │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │  [  Upload Document  ]                              │ │
│ │  Drop any file — AI will figure out what it covers  │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ━━━ Governance & Business (5/7) ━━━━━━━━━━━━━━━━━━━━━  │
│  ✓ Policies and procedures manual                       │
│    └ Satisfied by: "NDIS Policy Manual R3" (Ch 1-10)   │
│  ✓ Risk management                                      │
│    └ Satisfied by: "NDIS Policy Manual R3" (Chapter 8)  │
│  ✕ Business plan                     [Generate]         │
│  ✕ Organisation chart                [Generate]         │
│  ✓ Conflict of interest register                        │
│    └ Satisfied by: "NDIS Policy Manual R3" (Ch 4)      │
│  ...                                                    │
│                                                         │
│ ━━━ Insurance & Compliance (1/4) ━━━━━━━━━━━━━━━━━━━━  │
│  ✕ Public liability insurance         [Upload]          │
│  ✕ Professional indemnity insurance   [Upload]          │
│  ✕ Workers compensation              [Upload]           │
│  ✓ NDIS registration certificate     Already issued     │
│                                                         │
│ ━━━ Registers (3/4) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  ✓ Continuous improvement register   [View in tool →]   │
│  ✕ Risk register                     [Upload][Generate] │
│  ✓ Incident register                 [View in tool →]   │
│  ✓ Complaints register               [View in tool →]   │
│                                                         │
│ ━━━ Staff Files (2/11 per worker) ━━━━━━━━━━━━━━━━━━━  │
│  ...                                                    │
└─────────────────────────────────────────────────────────┘
```

## Upload Flow (the key logic):

When user uploads a file, call the AI with this prompt:

```
You are analysing a document for an NDIS Plan Management provider's verification audit.

The auditor needs these items (checklist):
[FULL CHECKLIST AS JSON]

The uploaded document is titled: "[title]"
Category: [category]
Filename: [filename]

Based on the document title and category, determine which checklist items this SINGLE document satisfies. A policy manual can satisfy multiple items. An insurance certificate only satisfies one.

Consider:
- A "Policies & Procedures Manual" typically contains chapters on: governance, risk, incidents, complaints, HR, WHS, code of conduct, disaster management — each chapter satisfies its respective checklist item
- An insurance certificate satisfies only its specific type (PL, PI, or WC)
- A worker screening certificate satisfies only STAFF-SCREENING for that worker
- A service agreement satisfies PART-SA

Return ONLY a JSON array of objects:
[{"checklistId": "GOV-POLICY", "satisfiedFrom": "This is the complete policy manual"}, {"checklistId": "REG-RISK", "satisfiedFrom": "Chapter 8 covers risk management procedures"}]
```

## API Endpoint: POST /api/checklist/evaluate

- Takes an evidence ID (just uploaded)
- Calls AI with the prompt above  
- Saves which checklist items are satisfied by which evidence
- Returns: { satisfied: [...], stillMissing: [...], progress: "14/28" }

## Database: Add ChecklistStatus model

```prisma
model ChecklistStatus {
  id            String   @id @default(uuid())
  checklistId   String   // e.g., "GOV-POLICY"
  satisfied     Boolean  @default(false)
  evidenceId    String?  // which evidence satisfies it
  satisfiedFrom String?  // "Chapter 8 covers risk management"
  updatedAt     DateTime @updatedAt
  
  @@unique([checklistId])
}
```

## Integration with upload:

In POST /api/evidence (after the background classifyAndLink runs), also call the checklist evaluator:
```typescript
// After evidence is saved + classified:
evaluateChecklist(evidence.id, evidence.title, evidence.category).catch(...)
```

## The "Generate" button:

For items with `canGenerate: true`, the [Generate] button calls:
POST /api/ai/generate-document with body: { checklistId, itemName, itemDescription }

AI generates a template document (markdown) that the user can download as DOCX.

## Style:
- Follow UI-SYSTEM.md
- White card containers with border
- ✓ items: text-[#059669] with green dot
- ✕ items: text-slate-600 (not red — these are "todo" not "failed")
- "Satisfied by" line under each ✓: text-xs text-slate-400 italic
- Category headers: font-heading text-base font-semibold
- Progress: "5/7" right-aligned per category
- Upload zone at TOP of page (prominent, the primary action)
- [Generate] buttons: small outline buttons
- [View in tool →] : text links to /incidents, /improvements

## Do NOT:
- Keep the old Evidence table as the primary view (checklist IS the evidence page now)
- Show the old evidence table below the checklist as "All Documents" section (secondary, collapsed by default)
- Use mock data
- Break existing API routes
