# NDIS Audit Readiness Tool — Architecture

## Product
A standalone SaaS tool for NDIS Plan Management providers to centralise evidence, map to Practice Standards, detect gaps, track compliance, and generate audit-ready packs with an auditor-facing portal.

## Tech Stack
- **Frontend:** Next.js 15 (App Router) + Tailwind CSS + shadcn/ui
- **Backend:** Next.js API routes + Server Actions
- **Database:** PostgreSQL (RDS) with pgvector extension (reuse existing)
- **AI:** Google Vertex AI (Gemini 2.5 Flash) via existing WIF setup
- **File Storage:** AWS S3 (ap-southeast-2)
- **Auth:** Simple password-based for v1 (single user) + read-only auditor link with token
- **Hosting:** AWS EC2 (existing) or Vercel (evaluate)

## Project Structure
```
ndis-audit-tool/
├── src/
│   ├── app/
│   │   ├── (dashboard)/          # PM daily view
│   │   │   ├── page.tsx          # Daily dashboard ("close the shop")
│   │   │   ├── evidence/         # Evidence vault
│   │   │   ├── standards/        # Practice Standards map
│   │   │   ├── workers/          # Worker compliance
│   │   │   ├── incidents/        # Incident & complaints register
│   │   │   ├── improvements/     # Continuous improvement register
│   │   │   └── settings/         # Organisation settings
│   │   ├── audit/                # Audit pack & self-assessment
│   │   │   ├── pack/             # Generated audit pack
│   │   │   └── self-assessment/  # AI-generated responses
│   │   ├── portal/[token]/       # Read-only auditor portal
│   │   ├── api/                  # API routes
│   │   │   ├── evidence/
│   │   │   ├── standards/
│   │   │   ├── workers/
│   │   │   ├── incidents/
│   │   │   ├── ai/
│   │   │   └── audit/
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/                   # shadcn components
│   │   ├── dashboard/
│   │   ├── evidence/
│   │   ├── standards/
│   │   ├── workers/
│   │   ├── incidents/
│   │   └── portal/
│   ├── lib/
│   │   ├── db.ts                 # Database connection
│   │   ├── ai.ts                 # Vertex AI client
│   │   ├── s3.ts                 # S3 file operations
│   │   └── standards-data.ts     # Seeded standards & indicators
│   └── types/
│       └── index.ts              # TypeScript types
├── prisma/
│   └── schema.prisma             # Database schema
├── public/
├── package.json
├── tailwind.config.ts
├── next.config.ts
└── tsconfig.json
```

## Database Schema (Core Tables)

### organisation
- id, name, abn, registration_groups[], registration_expiry, audit_pathway

### standards
- id, code, name, module (verification), division, description, quality_indicators[]

### evidence
- id, title, file_url (S3), file_type, upload_date, category (policy|participant|worker|incident|service_delivery)
- linked_standard_ids[], linked_worker_id?, linked_incident_id?, linked_improvement_id?
- status (current|outdated|expiring), expiry_date?, version, notes

### workers
- id, name, role, screening_check_number, screening_expiry, screening_status
- orientation_date, training_records[], supervision_logs[]
- police_check_expiry?, wwcc_expiry?

### incidents
- id, type (incident|complaint|near_miss|feedback), title, description
- date_occurred, date_reported, reported_by
- is_reportable, commission_notified, commission_notification_date
- investigation_notes, root_cause, corrective_action, corrective_action_evidence_id?
- status (open|investigating|resolved|closed), resolved_date
- linked_improvement_id?

### improvements
- id, title, description, source (incident|complaint|feedback|audit|internal_review)
- source_id?, identified_date, action_required, action_taken
- evidence_id?, responsible_person, due_date, completed_date
- status (identified|in_progress|completed|verified)

### self_assessments
- id, standard_id, response_text (AI generated ~300 words), evidence_ids[]
- status (draft|reviewed|final), generated_at, reviewed_at

### audit_packs
- id, generated_at, token (for auditor portal), expires_at
- standards_snapshot (JSON), evidence_snapshot (JSON)

### alerts
- id, type (expiry|gap|overdue), entity_type, entity_id
- message, due_date, acknowledged, acknowledged_at

## Key Flows

### Daily Dashboard ("Close the Shop")
1. Show today's alerts (expiring docs, overdue actions, gaps)
2. Quick-entry: log incident/complaint/feedback
3. Quick-entry: log improvement action
4. Compliance score per standard (traffic light)
5. Days until audit

### Evidence Upload
1. Upload file → S3
2. AI classifies: suggests category + relevant standard(s)
3. User confirms/adjusts mapping
4. Evidence linked to standard → gap status updates

### Gap Analysis
1. For each standard + quality indicator: check if evidence exists, is current, is sufficient
2. Traffic light: ✅ Met (evidence current) / ⚠️ Partial (evidence exists but outdated/incomplete) / ❌ Gap (no evidence)
3. AI suggests what's needed to close each gap

### Auditor Portal
1. PM generates audit pack → creates unique token URL
2. Auditor opens link → sees read-only view
3. Navigation: by standard → evidence → linked actions
4. Security info displayed prominently (data sovereignty, hosting, access controls)
5. One-click from any register entry to its supporting evidence

## Design Direction

### Visual Identity
- **Subject:** Compliance & trust for healthcare/disability sector
- **Audience:** NDIS auditors and Plan Managers (professional, clear, no-nonsense)
- **Palette:** Deep navy (#1a2332) primary, white/light backgrounds, emerald green (#10b981) for "met", amber (#f59e0b) for "partial", rose (#f43f5e) for "gap", slate grays for text
- **Typography:** Inter (body/UI) + Space Grotesk (headings/display) — professional, modern, not templated
- **Signature:** The linked traceability — click any item and a smooth breadcrumb trail shows its relationship chain (standard → evidence → action → outcome)
- **Layout:** Clean dashboard with generous white space. Cards with subtle shadows. No clutter. Feels like a premium legal/compliance tool, not a generic SaaS.
- **Motion:** Minimal — smooth transitions on navigation, subtle fade-in on card load. Nothing flashy. Confidence, not theatre.

### UX Principles
- 10-minute daily use: everything important visible on first screen
- One click from any entry to its evidence (non-negotiable)
- Auditor portal: feels safe, professional, trustworthy — security info upfront
- Mobile-responsive but desktop-primary (PM uses laptop)
- Accessibility: WCAG 2.1 AA minimum
