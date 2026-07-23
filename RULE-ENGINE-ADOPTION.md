# Rule Engine Adoption Plan

**Source:** NDIS Regulatory Rule Engine v2.0
**Scope:** Adopt the 3 highest-value concepts into AuditReady for Plan Management verification.

---

## What We're Adopting

### 1. Weighted Audit Readiness Score
### 2. PM-Specific Rule Set (~55 rules filtered from the full engine)
### 3. Evidence State Machine with Expiry Ladder

## Important: Internal vs Auditor-Facing Language

The rule codes (RR-003, GOV-005, WF-001, etc.) are **internal engine codes only**. They come from the Rule Engine specification document — NOT from the NDIS Commission.

### What's official (NDIS Commission):
- Practice Standards (outcome statements) — in PM-LEG-002, Schedule 8
- Quality Indicators (how auditors measure) — in PM-LEG-003, Part 9
- Verification Module sections 73-77

### How we handle this:

| Context | What to show |
|---------|-------------|
| Internal engine logic | Rule codes: `GOV-005`, `WF-001`, etc. |
| PM-facing dashboard | Plain English: "Incident register", "Worker screening" |
| Auditor portal | Official references: "Practice Standards, Verification Module, Section 77 — Human Resource Management" |
| AI self-assessment responses | Cite by official standard: "Per the Quality Indicators (Part 9, Section 75)..." |
| Knowledge Base citations | Doc IDs: "Per PM-LEG-003, Part 9..." |

### Rule-to-Official Mapping (stored in DB):

Each rule stores:
- `code`: internal (e.g., `WF-001`)
- `officialRef`: the actual NDIS standard reference (e.g., "Practice Standards Rules 2018, Schedule 8, Clause 6 — Worker Screening")
- `qualityIndicatorRef`: the QI section (e.g., "Quality Indicators Guidelines 2018, Part 9, Section 77")
- `displayName`: plain English (e.g., "All workers must have current NDIS Worker Screening Checks")

The PM sees `displayName`. The auditor sees `officialRef`. The engine uses `code`.

---

### Current state:
- Simple percentage: "X of 15 standards met" → 0%/20%/100%
- All standards weighted equally (a missing policy = same weight as missing worker screening)
- No urgency differentiation

### After adoption:
- Score = 100 + Σ(weights of failing rules), floored at 0
- Severity weights: CRITICAL = -25, MAJOR = -10, MINOR = -3, ADVISORY = -1
- Thresholds:
  - 🟢 90-100: **Audit-Ready** (green)
  - 🟡 70-89: **Gaps Present** (amber)
  - 🔴 <70: **Not Audit-Ready** (red)
- Score computed ONLY over PM-visible rules (not full engine)

### Why this is better:
- A PM with all screening current but missing a COI register sees 75 (amber), not 80% (misleading green)
- Missing a CRITICAL item (worker screening) tanks the score by 25 — creates urgency
- An ADVISORY item (PM panel readiness for 2027) only deducts 1 — doesn't panic the user
- The auditor cares about CRITICAL items. This score reflects that priority.

### Implementation:
- Add `severity` field to each rule/standard in DB
- Dashboard shows the 100-based score instead of percentage
- Colour band changes based on threshold
- Drill-down: "Your score is 62. Here's what's pulling it down:" → sorted by weight

---

## 2. PM-Specific Rule Set

### Current state:
- 15 generic standards (VM-1.1 through VM-5.1) with broad descriptions
- Don't tell you specifically what to check — just "Governance and Operational Management"
- Gap analysis relies on AI interpretation each time

### After adoption:
- Replace 15 broad standards with ~55 specific, checkable rules
- Each rule has: ID, condition (what must be true), severity, evidence required, remediation steps
- Rules filtered to: `applies_to = PM` AND `audit_pathway = BOTH` (verification-applicable)

### The PM rules (extracted from the document):

**CRITICAL (each = -25 if failing):**
- REG-002: Registration certificate uploaded and current
- REG-009: Public liability + professional indemnity insurance current
- RR-003: Service agreement per participant
- RR-005: Privacy policy referencing Privacy Act + NDIS Act
- RR-006: Signed consent per participant
- GOV-005: Incident register with required fields
- GOV-010: Complaints register (acknowledged → assessed → resolved)
- GOV-017: COI register (every related-party referral declared)
- WF-001: NDIS Worker Screening Check per worker (90/60/30 expiry alerts)
- WF-005: Code of Conduct signed by all workers + key personnel
- POS-004: Claims match plan budget categories
- POS-006: Every billable contact has timestamped note
- POS-009: Participant money/property policy
- SEC-001: Australian data residency for all records
- SEC-011: 7-year retention lock
- ONB-P-001: Participant can't be active until intake checklist = 100%
- ONB-P-002: Agreement signed before first service date
- ONB-S-001: Worker gate — no assignment until onboarding = 100%
- ONB-S-002: Screening clearance before first shift
- ONB-S-009: Access revoked within 24hrs of end date

**MAJOR (each = -10 if failing):**
- REG-003: Renewal lodged ≥ 6 months before expiry
- REG-008: Key personnel suitability declarations ≤ 12 months
- REG-010: ABN active and matches registration
- GOV-004: Corrective actions have owner + due date, none overdue > 30 days
- GOV-009: Incident records retained 7 years
- GOV-011: Complaints policy tells participants how to complain to Commission
- GOV-012: Complaint records retained 7 years
- GOV-013: Risk register reviewed ≤ 12 months
- WF-002: Screening records retained 7 years
- WF-004: NDIS Worker Orientation Module completed, certificates filed
- WF-006: Role-mapped qualifications + mandatory training ≥ 100%
- WF-010: Volunteers/contractors same screening rules
- POS-008: Agreement prices consistent with current Pricing Arrangements
- POS-010: PM invoices within SLA, monthly statements, payments reconciled
- SLA-002: Complaint acknowledged within 2 business days
- SLA-005: PM invoices paid within 5 business days
- SLA-006: PM monthly statements by the 10th
- SLA-007: Services claimed within 90-day window
- SEC-003: MFA enforced for participant-data access
- SEC-006: Backups verified ≤ 24hrs, restore test ≤ 12 months
- SEC-008: Data breach response plan
- ONB-P-010: PM onboarding includes written advice on invoices, statements, queries
- ONB-P-011: Exit checklist (final statement, handover, records transfer)

**MINOR (each = -3 if failing):**
- RR-007: Consent re-confirmed ≤ 24 months
- SEC-009: Password/secret policy
- SEC-010: Vendor register assessed annually
- SLA-009: Corrective-action SLA (CRITICAL ≤ 7d, MAJOR ≤ 30d, MINOR ≤ 90d)

**ADVISORY (each = -1 if failing):**
- FUT-001: Reform watchlist acknowledged ≤ 14 days
- FUT-004: PM panel readiness ahead of Oct 2027
- POS-007: Plan utilisation projection (flags >20% variance)
- SLA-011: Rolling 90-day SLA breach-rate dashboard
- SLA-012: Agreement promise parser (AI extracts committed timeframes)

### Why this is better:
- Instead of "VM-1.6 Incident Management = GAP" → you see "GOV-005: You don't have an incident register with date, participant, description, severity, actions, closure per record" → specific, actionable
- Each rule tells you exactly what to fix and what evidence the auditor expects
- Score reflects real audit risk, not generic compliance %
- Remediation steps built into each rule — the tool tells you HOW to fix it

### Implementation:
- New DB table `rules` with: id, code, domain, description, severity, condition, evidence_required, remediation, applies_to, audit_pathway
- Seed with ~55 PM rules
- Each rule evaluated against uploaded evidence + system state
- Standards page becomes "Rules" view grouped by domain
- AI uses rule descriptions when generating self-assessment responses

---

## 3. Evidence State Machine

### Current state:
- 4 statuses: CURRENT, OUTDATED, EXPIRING, DRAFT
- No automated transitions
- No expiry countdown alerts

### After adoption:
```
MISSING → UPLOADED → UNDER_REVIEW → VERIFIED → EXPIRING → EXPIRED
                                         ↑                    |
                                         └────── re-upload ───┘
```

**State definitions:**
| State | Meaning | Dashboard |
|-------|---------|-----------|
| MISSING | Rule requires this evidence but nothing uploaded | Red |
| UPLOADED | File exists, not yet confirmed as sufficient | Blue |
| UNDER_REVIEW | Sent for review (to external auditor or PM) | Yellow |
| VERIFIED | PM confirmed this satisfies the requirement | Green |
| EXPIRING | Within 90/60/30 days of expiry date | Amber + alert |
| EXPIRED | Past expiry date | Red + CRITICAL alert |

**Expiry ladder (automated, runs nightly):**
- T-90 days: status → EXPIRING, alert severity = MINOR
- T-60 days: alert severity → MAJOR
- T-30 days: alert severity → CRITICAL
- T-0: status → EXPIRED, score deduction activates

### Why this is better:
- Worker screening expiring in 89 days? You see it early, not at deadline.
- Insurance renewal coming up? Alert at 90 days, not when it lapses.
- "UPLOADED" vs "VERIFIED" distinction means you know what's been checked vs just thrown in.
- Nightly scan means the dashboard is always current without you doing anything.

### Implementation:
- Update Evidence model: add `verifiedAt`, `verifiedBy` fields
- Update status enum: add UNDER_REVIEW, VERIFIED, MISSING
- Create nightly cron/scheduled function: scan all evidence expiry dates → update statuses → generate alerts
- Dashboard shows evidence by state (how many verified vs just uploaded)

---

## Combined Impact on the Product

### Before (current):
```
Dashboard: "0% compliant, 15 gaps"
Standards: List of 15 broad standards, all red
Evidence: Upload documents, hope they map correctly
Score: Simple fraction — misleading, no urgency signal
```

### After (with adoption):
```
Dashboard: "Score: 42/100 🔴 Not Audit-Ready"
           "8 CRITICAL items failing — address these first"
           "Next expiry: Worker screening in 67 days"

Rules: 55 specific checks, grouped by domain
       Each tells you: what's wrong, what evidence is needed, how to fix it
       CRITICAL items highlighted at top

Evidence: State machine shows pipeline
          MISSING (12) → UPLOADED (3) → VERIFIED (2)
          "You have 12 evidence gaps. Upload these documents:"

Score: Weighted — fixing one CRITICAL item jumps score by 25 points
       Visible progress as you work through the list
       Auditor-aligned priority (they check CRITICAL first too)
```

---

## Implementation Order

| Phase | What | Effort | Impact |
|-------|------|--------|--------|
| 1 | Seed PM rules (~55) into DB with severity + official references | 2-3 hours | High — unlocks weighted scoring |
| 2 | Replace score calculation (100-based weighted) | 30 min | High — dashboard becomes meaningful |
| 3 | Update evidence states (add VERIFIED, expiry ladder) | 1 hour | Medium — better lifecycle tracking |
| 4 | Nightly expiry scan (scheduled function) | 1 hour | Medium — proactive alerts |
| 5 | Update Standards/Rules page UI (show displayName, link officialRef) | 1-2 hours | High — actionable instead of generic |
| 6 | Update AI prompts to cite official refs (not internal codes) in self-assessment | 30 min | Medium — auditor-appropriate language |

### Rule DB Schema (updated):

```sql
CREATE TABLE rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,          -- Internal: "WF-001"
  domain TEXT NOT NULL,               -- Internal: "Workforce & Screening"
  display_name TEXT NOT NULL,         -- PM sees: "All workers must have current NDIS Worker Screening Checks"
  description TEXT NOT NULL,          -- Full rule description
  official_ref TEXT NOT NULL,         -- Auditor sees: "Practice Standards Rules 2018, Schedule 8, Clause 6"
  quality_indicator_ref TEXT,         -- QI citation: "Quality Indicators 2018, Part 9, Section 77"
  severity TEXT NOT NULL,             -- CRITICAL / MAJOR / MINOR / ADVISORY
  weight INTEGER NOT NULL,            -- -25 / -10 / -3 / -1
  condition TEXT NOT NULL,            -- What must be true to pass
  evidence_required TEXT NOT NULL,    -- What auditor asks to see
  remediation TEXT NOT NULL,          -- Auto-generated fix steps
  applies_to TEXT[] DEFAULT '{PM}',   -- Provider types
  audit_pathway TEXT DEFAULT 'BOTH',  -- BOTH / CERT / MOD
  trigger TEXT DEFAULT 'daily_scan',  -- daily_scan / on_upload / on_event / on_date
  is_passing BOOLEAN DEFAULT FALSE,   -- Current state
  linked_evidence_ids UUID[],         -- Evidence satisfying this rule
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Total: ~7-9 hours of work to transform the tool from a generic checklist into a proper regulatory compliance engine with correct official citations.**

---

## What This Means for the Business

- **For 24Seven:** Tool goes from "nice dashboard" to "tells me exactly what to do to pass my audit"
- **For the product:** This is the differentiator. No other NDIS tool has a PM-specific rule engine with weighted scoring. Competitors (ShiftCare, AuditCore, Willow) do generic checklists.
- **For the auditor:** Sees a provider using a proper compliance engine — signals sophistication and proactive management. The scoring model mirrors how auditors actually assess (CRITICAL items first).
- **FUT-004 (PM panel readiness ~Oct 2027):** The government is moving toward PM panels. Having this tool + evidence of systematic compliance management positions 24Seven ahead of that change.
