# NEXT SESSION: Rebuild Upload UX (Upload → Analyse → Report → Fix)

## The Pattern (from the other team's CertificateUpload component):
- Upload triggers SYNCHRONOUS analysis (user sees spinner)  
- Results appear INLINE immediately after processing
- Clear states: idle → uploading → analysing → results

## What to Build:

### Replace the current evidence upload flow with a 3-step inline experience:

```
STEP 1: Upload (instant)
┌─────────────────────────────────────────────┐
│ [Drop zone / file selected]                 │
│ Title: [auto-filled]  Category: [POLICY ▾]  │
│ [Upload Document]                           │
└─────────────────────────────────────────────┘
          ↓ (user clicks upload)
          
STEP 2: Analysing (5-15 seconds, visible)
┌─────────────────────────────────────────────┐
│ 🔄 Analysing "Policy Manual" against        │
│    NDIS Practice Standards...                │
│                                             │
│ ████████░░░░ Reading document content       │
└─────────────────────────────────────────────┘
          ↓ (AI returns)
          
STEP 3: Results (shown inline, actionable)
┌─────────────────────────────────────────────┐
│ ✓ Document analysed — mapped to 7 standards │
│                                             │
│ Standards satisfied:                         │
│   ● VM-1.1 Governance          (+25 pts)    │
│   ● VM-1.2 Risk Management     (+10 pts)    │
│   ● VM-1.5 Complaints          (+25 pts)    │
│   ● VM-1.6 Incident Mgmt       (+25 pts)    │
│   ● VM-1.7 HR Management       (+10 pts)    │
│                                             │
│ Score: 42 → 67 🟡 (+25 points)              │
│                                             │
│ Still missing (next uploads needed):         │
│   ✕ Worker Screening Certs (CRITICAL)       │
│   ✕ Insurance Certificates (CRITICAL)       │
│   ✕ Registration Certificate (CRITICAL)     │
│                                             │
│ [Upload Another] [View Standards] [Close]    │
└─────────────────────────────────────────────┘
```

### Implementation approach:
1. Upload saves file immediately (POST /api/evidence) - KEEP THIS
2. Then call POST /api/ai/classify SYNCHRONOUSLY (wait for result)
3. Then call POST /api/evidence/[id]/standards to link
4. Then call POST /api/rules/evaluate to get new score
5. Show results panel with before/after score + what's still missing

### Key: Make the classification FAST
- Use title + category heuristic (already working in background classify)
- Don't send the actual file to AI for classification (too slow for DOCX)
- The generate text endpoint with title/category takes ~3-5s vs 20-30s for file

### Also build: Generate corrected documents
- For each failing rule with evidenceRequired field
- Button: "Generate [document name]" 
- Calls AI to produce a DOCX template
- User downloads, reviews, uploads back

### Reference code (from other team):
- /tmp/24sevenauditlog_Frontend/src/features/onboarding/components/CertificateUpload.tsx
- Shows the idle → loading → success state pattern perfectly

## Dev server: 
cd ~/Projects/ndis-audit-tool && bun dev
