# NDIS Audit Readiness Tool — User Stories

**Product:** AuditReady (NDIS Plan Management Verification Audit Tool)
**First Customer:** 24Seven Plan Management
**User:** Plan Manager (single user, Logesh)
**Secondary User:** External Auditor (read-only portal access)

---

## Epic 1: Evidence Management

### US-1.1: Upload Evidence
**As a** Plan Manager
**I want to** upload documents (PDF, DOCX, images) into the tool
**So that** all my compliance evidence is centralised in one place

**Acceptance Criteria:**
- [ ] Drag-and-drop or click-to-upload interface
- [ ] Files stored in S3 (ap-southeast-2)
- [ ] Metadata captured: title, category, notes, expiry date (optional)
- [ ] File size limit: 50MB per file
- [ ] Supported formats: PDF, DOCX, DOC, PNG, JPG, XLSX
- [ ] Upload timestamp recorded automatically
- [ ] File versioning: can upload a new version of an existing document

### US-1.2: Categorise Evidence
**As a** Plan Manager
**I want to** categorise each piece of evidence by type
**So that** I can quickly find evidence relevant to each audit area

**Acceptance Criteria:**
- [ ] Categories: Policy, Participant, Worker, Incident, Service Delivery, Governance, Other
- [ ] Category assigned at upload time
- [ ] Can be changed after upload
- [ ] Filter evidence list by category

### US-1.3: Link Evidence to Standards
**As a** Plan Manager
**I want to** link evidence to one or more Practice Standards
**So that** the auditor can see which evidence supports each standard

**Acceptance Criteria:**
- [ ] Can link evidence to multiple standards (many-to-many)
- [ ] AI suggests relevant standards on upload (confidence score shown)
- [ ] User confirms or rejects AI suggestions
- [ ] Can manually add/remove standard links after upload
- [ ] Linking evidence updates the gap analysis for that standard

### US-1.4: AI-Assisted Evidence Classification
**As a** Plan Manager
**I want** the AI to suggest which standards a document supports when I upload it
**So that** I don't have to manually map every document

**Acceptance Criteria:**
- [ ] On upload, AI analyses document content (via Vertex AI Gemini)
- [ ] Returns 1-3 suggested standards with confidence percentage
- [ ] User can accept/reject each suggestion
- [ ] Accepted suggestions create the evidence-standard link
- [ ] Uses RAG corpus (162 NDIS docs) for context

### US-1.5: Track Evidence Status
**As a** Plan Manager
**I want to** see whether each piece of evidence is current, outdated, or expiring
**So that** I know what needs updating before the audit

**Acceptance Criteria:**
- [ ] Status values: Current, Outdated, Expiring, Draft
- [ ] Expiry date triggers automatic status change to "Expiring" (60 days before) and "Outdated" (past expiry)
- [ ] Manual override: can mark as outdated even without expiry date (e.g., policy not reviewed in 12+ months)
- [ ] Dashboard alert generated for expiring/outdated evidence

---

## Epic 2: Practice Standards Mapping & Gap Analysis

### US-2.1: View Standards Compliance Map
**As a** Plan Manager
**I want to** see a traffic-light overview of my compliance against all 15 Plan Management verification standards
**So that** I know exactly where I stand

**Acceptance Criteria:**
- [ ] All 15 standards displayed, grouped by division
- [ ] Status per standard: Met (green), Partial (amber), Gap (red)
- [ ] Status calculated based on: evidence linked, evidence current, quality indicators covered
- [ ] Overall compliance percentage shown
- [ ] Click through to standard detail

### US-2.2: View Standard Detail with Quality Indicators
**As a** Plan Manager
**I want to** drill into each standard and see its quality indicators, linked evidence, and guidance
**So that** I know exactly what's needed to be compliant

**Acceptance Criteria:**
- [ ] Standard description, Plan Management-specific interpretation
- [ ] List of quality indicators with per-indicator evidence status
- [ ] Common gaps to avoid (pre-loaded guidance)
- [ ] Gold standard description (what excellence looks like)
- [ ] Linked evidence listed with status
- [ ] "What's missing" section showing unmet indicators

### US-2.3: AI Gap Detection
**As a** Plan Manager
**I want** the AI to tell me exactly what evidence is missing for each standard
**So that** I can prioritise what to upload or create next

**Acceptance Criteria:**
- [ ] For each standard with status "Gap" or "Partial": AI generates specific guidance on what's missing
- [ ] Suggestions are actionable: "Upload your Risk Management Framework" not "You need risk management evidence"
- [ ] Considers what's already uploaded to avoid duplicate suggestions
- [ ] Prioritised by audit risk (critical gaps first)

### US-2.4: AI Gold Standard Guidance
**As a** Plan Manager
**I want to** know where I'm exceeding the standard (especially in technology adoption)
**So that** I can highlight strengths to the auditor

**Acceptance Criteria:**
- [ ] AI identifies areas where evidence demonstrates above-minimum compliance
- [ ] Highlights technology-enabled compliance (automated financial statements, digital records, etc.)
- [ ] Can be included in self-assessment responses

---

## Epic 3: Worker Compliance Tracking

### US-3.1: Manage Worker Records
**As a** Plan Manager
**I want to** maintain a register of all workers with their compliance status
**So that** I can demonstrate worker screening compliance at any time

**Acceptance Criteria:**
- [ ] Add workers: name, role, email, screening check number, screening expiry
- [ ] Track: orientation date, police check expiry, WWCC expiry
- [ ] Show overall compliance status per worker (all checks current = compliant)
- [ ] Active/inactive toggle

### US-3.2: Track Training Records
**As a** Plan Manager
**I want to** log training completions for each worker
**So that** I can demonstrate ongoing professional development

**Acceptance Criteria:**
- [ ] Log training: title, date completed, expiry date (if applicable), upload evidence
- [ ] Training linked to worker profile
- [ ] Training evidence linked to standards (VM-1.7 Human Resource Management)

### US-3.3: Track Supervision
**As a** Plan Manager
**I want to** log supervision sessions
**So that** I can demonstrate regular supervision occurs

**Acceptance Criteria:**
- [ ] Log: date, supervisor name, notes, upload evidence
- [ ] Linked to worker profile
- [ ] Visible in worker compliance view

### US-3.4: Expiry Alerts
**As a** Plan Manager
**I want to** be alerted when a worker's screening check or insurance is about to expire
**So that** I can renew before it lapses

**Acceptance Criteria:**
- [ ] Alert generated 60 days before expiry
- [ ] Alert severity escalates: Warning (60 days), Critical (30 days), Overdue (past expiry)
- [ ] Appears on daily dashboard
- [ ] Covers: worker screening, police checks, WWCC, insurance documents

---

## Epic 4: Incident & Complaints Management

### US-4.1: Log Incidents and Complaints
**As a** Plan Manager
**I want to** quickly log incidents, complaints, near-misses, and feedback
**So that** I maintain a complete register for audit purposes

**Acceptance Criteria:**
- [ ] Types: Incident, Complaint, Near Miss, Feedback
- [ ] Fields: title, description, date occurred, reported by, severity (Low/Medium/High/Critical)
- [ ] Reportable incident flag with Commission notification tracking
- [ ] Quick entry (< 2 minutes to log)
- [ ] Timestamp automatically recorded

### US-4.2: Investigate and Resolve Incidents
**As a** Plan Manager
**I want to** record investigation notes, root cause, and corrective actions for each incident
**So that** I can demonstrate a complete investigation trail to the auditor

**Acceptance Criteria:**
- [ ] Add investigation notes (append-only, timestamped)
- [ ] Record root cause
- [ ] Record corrective action taken
- [ ] Link evidence of corrective action (from evidence vault)
- [ ] Mark as resolved with resolution date
- [ ] Status flow: Open → Investigating → Resolved → Closed

### US-4.3: Link Incidents to Improvements
**As a** Plan Manager
**I want to** create an improvement action directly from an incident
**So that** the auditor can trace the thread from incident → learning → change

**Acceptance Criteria:**
- [ ] "Create Improvement" button on incident detail
- [ ] Pre-fills improvement form with incident context
- [ ] Bidirectional link: incident shows linked improvement, improvement shows source incident
- [ ] One-click navigation between them

### US-4.4: Commission Notification Tracking
**As a** Plan Manager
**I want to** track whether reportable incidents were notified to the Commission within required timeframes
**So that** I can demonstrate compliance with notification requirements

**Acceptance Criteria:**
- [ ] If incident marked as reportable: prompt for Commission notification date
- [ ] Calculate if notification was within 24 hours (or 5 business days for restrictive practices)
- [ ] Store evidence of notification
- [ ] Flag overdue notifications

---

## Epic 5: Continuous Improvement Register

### US-5.1: Log Improvements
**As a** Plan Manager
**I want to** record improvement actions identified from any source
**So that** I maintain a continuous improvement register

**Acceptance Criteria:**
- [ ] Sources: Incident, Complaint, Feedback, Audit, Internal Review, Risk Assessment
- [ ] Fields: title, description, source reference, action required, responsible person, due date
- [ ] Link to source incident/complaint if applicable
- [ ] Status tracking: Identified → In Progress → Completed → Verified

### US-5.2: Track Improvement Actions to Completion
**As a** Plan Manager
**I want to** record what action was taken and link the evidence proving it was done
**So that** the auditor sees a complete chain from finding to fix

**Acceptance Criteria:**
- [ ] Record "action taken" when completing an improvement
- [ ] Link evidence proving the action (e.g., updated policy document)
- [ ] Due date tracking with overdue alerts on dashboard
- [ ] Completion date recorded

### US-5.3: Linked Traceability (NON-NEGOTIABLE)
**As an** Auditor viewing the portal
**I want to** click from any improvement entry and immediately see its source AND its evidence
**So that** I can verify the complete chain without navigating through folders

**Acceptance Criteria:**
- [ ] From improvement → one click to source incident/complaint
- [ ] From improvement → one click to evidence of action taken
- [ ] From incident → one click to linked improvement
- [ ] From incident → one click to corrective action evidence
- [ ] No dead ends — every link resolves to viewable content
- [ ] Works in both PM dashboard AND auditor portal

---

## Epic 6: Self-Assessment Generation

### US-6.1: Generate Self-Assessment Responses
**As a** Plan Manager
**I want** the AI to generate ~300 word self-assessment responses for each standard based on my uploaded evidence
**So that** I can copy them into the NDIS Commission portal

**Acceptance Criteria:**
- [ ] AI generates response per standard using: uploaded evidence, standards data, RAG corpus
- [ ] Response references specific evidence by name
- [ ] Target length: ~300 words (shown with word count)
- [ ] Cites which evidence supports each claim
- [ ] Tone: professional, factual, specific to Plan Management

### US-6.2: Review and Edit Responses
**As a** Plan Manager
**I want to** review, edit, and finalise AI-generated responses
**So that** I can ensure accuracy before submitting to the Commission

**Acceptance Criteria:**
- [ ] Edit response text inline
- [ ] Status workflow: Draft → Reviewed → Final
- [ ] "Regenerate" button to get a fresh AI response
- [ ] Copy individual response to clipboard
- [ ] Export all responses as PDF or DOCX

### US-6.3: Evidence-Backed Claims
**As a** Plan Manager
**I want** each self-assessment response to show which evidence items it references
**So that** I can verify every claim is substantiated

**Acceptance Criteria:**
- [ ] Each response lists "Evidence cited" with links to evidence items
- [ ] If a claim in the response has no evidence, it's flagged
- [ ] Regeneration considers newly uploaded evidence

---

## Epic 7: Audit Pack & Auditor Portal

### US-7.1: Generate Audit Pack
**As a** Plan Manager
**I want to** generate a shareable audit pack with a unique URL
**So that** I can give the auditor a single link to access all evidence

**Acceptance Criteria:**
- [ ] Generate pack with: name, expiry date (default 30 days)
- [ ] Unique token URL generated (e.g., /portal/abc123...)
- [ ] Copy link to clipboard
- [ ] Can revoke or extend expiry
- [ ] Preview (PM can see what auditor sees)

### US-7.2: Auditor Portal — Security First
**As an** Auditor accessing the portal
**I want to** immediately see that the data is secure and Australian-hosted
**So that** I have confidence in the system before reviewing evidence

**Acceptance Criteria:**
- [ ] Security/data sovereignty banner is the FIRST thing visible
- [ ] Shows: Australian hosting (AWS Sydney), encryption (AES-256, TLS 1.3), access controls
- [ ] Portal expiry date visible
- [ ] Read-only badge prominent
- [ ] No edit capabilities anywhere in portal

### US-7.3: Auditor Portal — Navigate by Standard
**As an** Auditor
**I want to** navigate evidence by Practice Standard
**So that** I can assess compliance per standard efficiently

**Acceptance Criteria:**
- [ ] Sidebar navigation grouped by division
- [ ] Each standard shows: status, self-assessment response, linked evidence, gap analysis
- [ ] Evidence downloadable/viewable from within portal
- [ ] Print-friendly layout

### US-7.4: Auditor Portal — Registers View
**As an** Auditor
**I want to** view the incident register, improvement register, and worker compliance in one place
**So that** I can assess operational compliance

**Acceptance Criteria:**
- [ ] Tabbed view: Incidents, Improvements, Workers
- [ ] Expandable entries showing full detail
- [ ] Cross-references clickable (incident → improvement, improvement → evidence)
- [ ] Worker screening status visible with expiry dates

---

## Epic 8: Document Management & Generation

### US-8.1: Flag Outdated Documents
**As a** Plan Manager
**I want** the tool to tell me which policies/documents are outdated and what needs changing
**So that** I know exactly what to update

**Acceptance Criteria:**
- [ ] Documents older than 12 months without review flagged as "Outdated"
- [ ] AI analyses document against current standards and participant count (1100+)
- [ ] Specific suggestions: "This policy references 137 participants — update to reflect current scale"
- [ ] Priority ranking: which updates are most critical for audit

### US-8.2: AI-Suggested Document Updates
**As a** Plan Manager
**I want** the AI to suggest specific changes to outdated documents
**So that** I know what to fix without re-reading the entire standard

**Acceptance Criteria:**
- [ ] Per flagged document: list of specific sections needing update
- [ ] Suggested new language/content for each section
- [ ] Context: why this change is needed (links to standard requirement)

### US-8.3: Auto-Generate Updated Documents
**As a** Plan Manager
**I want** the AI to generate a complete updated version of outdated documents for my review
**So that** I can approve and replace them quickly

**Acceptance Criteria:**
- [ ] "Generate Updated Version" button on flagged documents
- [ ] AI produces full updated document based on: current version + standards requirements + organisation context
- [ ] Downloadable as DOCX for review
- [ ] User reviews, edits, and uploads as new version (replacing outdated one)
- [ ] Version history maintained

---

## Epic 9: Daily Operations & Alerts

### US-9.1: Daily Dashboard
**As a** Plan Manager
**I want** a 10-minute daily view showing what needs my attention
**So that** I can "close the shop" knowing compliance is on track

**Acceptance Criteria:**
- [ ] Shows: compliance score, days until audit, active alerts, total evidence
- [ ] "Needs Your Attention" section: expiring items, overdue actions, gaps
- [ ] Quick action buttons: Log Incident, Upload Evidence, Log Improvement
- [ ] Standards traffic-light summary
- [ ] Time-appropriate greeting

### US-9.2: Automated Alerts
**As a** Plan Manager
**I want** the system to automatically generate alerts for compliance risks
**So that** I don't have to remember every deadline

**Acceptance Criteria:**
- [ ] Expiry alerts: worker screening (60/30/0 days), insurance, evidence with expiry dates
- [ ] Gap alerts: standards with no evidence linked
- [ ] Overdue alerts: improvement actions past due date
- [ ] Review alerts: policies not reviewed in 12+ months
- [ ] Severity levels: Info, Warning, Critical
- [ ] Acknowledge/dismiss with timestamp

### US-9.3: Advisory Recommendations
**As a** Plan Manager
**I want** the tool to surface process improvement suggestions it discovers during evidence mapping
**So that** I can improve operations beyond just audit compliance

**Acceptance Criteria:**
- [ ] AI identifies operational gaps during evidence analysis (e.g., "No documented onboarding procedure found")
- [ ] Suggestions categorised: Compliance (must fix), Operational (should fix), Advisory (nice to have)
- [ ] Can be converted into improvement register entries
- [ ] Based on Plan Management best practices from RAG corpus

---

## Epic 10: Data Security & Privacy

### US-10.1: Australian Data Sovereignty
**As a** Plan Manager
**I want** all participant data stored exclusively in Australia
**So that** I comply with the Privacy Act and can demonstrate data sovereignty to the auditor

**Acceptance Criteria:**
- [ ] All data stored in AWS ap-southeast-2 (Sydney)
- [ ] S3 bucket region: ap-southeast-2
- [ ] Database: RDS ap-southeast-2
- [ ] No data leaves Australian jurisdiction
- [ ] Documented in auditor portal security banner

### US-10.2: Access Controls
**As a** Plan Manager
**I want** appropriate access controls on the system
**So that** only authorised persons can access participant data

**Acceptance Criteria:**
- [ ] PM login (password-based for v1)
- [ ] Auditor portal: token-based, read-only, time-limited
- [ ] Auditor tokens can be revoked
- [ ] No public access to any data without authentication/token

---

## What's Built vs What's Needed

| Epic | UI Built | Backend Wired | Status |
|------|----------|---------------|--------|
| 1. Evidence Management | ✅ | ❌ | **UI only** |
| 2. Standards Mapping | ✅ | ❌ | **UI only** |
| 3. Worker Compliance | ✅ | ❌ | **UI only** |
| 4. Incidents & Complaints | ✅ | ❌ | **UI only** |
| 5. Continuous Improvement | ✅ | ❌ | **UI only** |
| 6. Self-Assessment | ✅ | ❌ | **UI only** |
| 7. Audit Pack & Portal | ✅ | ❌ | **UI only** |
| 8. Document Generation | ❌ | ❌ | **Not started** |
| 9. Daily Operations & Alerts | ✅ (UI) | ❌ | **UI only** |
| 10. Data Security | Partial | ❌ | **Architecture only** |

---

## Priority Order for Backend Implementation

1. **Database setup** — Connect Prisma to RDS, run migrations, seed standards
2. **Evidence CRUD** — Upload to S3, save metadata to DB, list/filter/view
3. **Standards mapping** — Link evidence to standards, calculate compliance status
4. **Workers CRUD** — Add/edit workers, track expiry, generate alerts
5. **Incidents CRUD** — Log, investigate, resolve, link to improvements
6. **Improvements CRUD** — Log, track, link to incidents + evidence
7. **Alert engine** — Scheduled job checking expiry dates, gaps, overdue items
8. **AI layer** — Evidence classification, gap detection, self-assessment generation
9. **Audit pack** — Snapshot generation, token creation, portal data serving
10. **Auth** — PM login, auditor token validation
