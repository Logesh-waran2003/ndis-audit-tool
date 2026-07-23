# Frontend Design Guide — NDIS Audit Readiness Tool

## Subject & Audience
- **Product:** NDIS Compliance/Audit Readiness Tool for Plan Management providers
- **Primary user:** Plan Manager (single user, time-constrained, 10-min daily use)
- **Secondary user:** External auditor (read-only portal, needs trust and clarity)
- **Page's job:** Make compliance evidence organised, discoverable, and linked

## Visual Identity
- **Palette:**
  - Primary: Deep navy `#1a2332`
  - Background: White `#ffffff`, subtle gray `#f8fafc`
  - Text: Slate `#334155` (body), `#0f172a` (headings)
  - Met/Success: Emerald `#10b981`
  - Partial/Warning: Amber `#f59e0b`
  - Gap/Error: Rose `#f43f5e`
  - Info: Blue `#3b82f6`
  - Muted: Slate `#94a3b8`
- **Typography:**
  - Display/Headings: Space Grotesk (600, 700 weights)
  - Body/UI: Inter (400, 500, 600 weights)
  - Mono (data): JetBrains Mono (for codes, IDs)
- **Spacing:** Generous. Cards breathe. Never cramped. Minimum 24px gap between sections.
- **Borders:** Subtle `border-slate-200`. Cards with `shadow-sm` only. No heavy borders.
- **Border radius:** `rounded-lg` (8px) for cards, `rounded-md` (6px) for buttons/inputs.

## Signature Element
The **linked traceability breadcrumb trail**. When you click any item, a subtle breadcrumb appears showing its relationship: `Standard VM-1.5 → Evidence: Complaints Policy → Linked Incident #2 → Improvement Action #1`. This is the one memorable design element. Make it a horizontally scrollable pill-trail with subtle connecting lines between items.

## Layout Principles
- Sidebar navigation (240px, collapsible)
- Main content area with max-width 1200px, centered
- Cards for distinct content blocks
- Tables for lists of records
- Sheets (slide-over panels) for detail views
- Modals only for creation forms

## Motion
- Page transitions: none (instant navigation)
- Card appearance: subtle fade-in (`animate-in fade-in-0 duration-200`)
- Status changes: color transition (`transition-colors duration-150`)
- Nothing else. No scroll animations. No parallax. No bouncing.

## Writing Style
- Speak to the user: "Your compliance snapshot", "Needs your attention"
- Verb-led buttons: "Log Incident", "Upload Evidence", "Generate Pack"
- Status language: "Met", "Partial", "Gap" (not "Complete", "Incomplete", "Missing")
- Empty states: helpful and directive, not apologetic
- Error states: what went wrong + what to do next

## Don't
- Use gradient backgrounds
- Use decorative icons that add no information
- Use numbered markers (01 / 02 / 03) unless content is actually sequential
- Use more than 2 font families
- Use shadows heavier than `shadow-sm`
- Animate anything the user didn't trigger
