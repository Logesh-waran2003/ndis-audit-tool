# UI System — AuditReady

This is the single source of truth for all UI decisions. No deviation.

## Stack (locked)
- **Next.js 16** (App Router)
- **Tailwind CSS 4** (utility-first, no custom CSS unless unavoidable)
- **shadcn/ui** components (already installed: button, card, dialog, input, label, select, textarea, badge, tabs, table, sheet, separator, dropdown-menu, progress)
- **Lucide React** icons (only)
- **date-fns** for date formatting
- **No other UI libraries.** No Recharts, no Framer Motion, no Radix directly.

## Colours (CSS variables, already in globals.css)

| Token | Value | Usage |
|-------|-------|-------|
| `--color-navy` | `#1a2332` | Sidebar bg, headings, primary actions |
| `--color-background` | `#ffffff` | Card/table/input backgrounds |
| Page bg | `#f8fafc` | Body background (the subtle gray) |
| `--color-border` | `#e2e8f0` | All borders |
| `--color-met` | `#059669` | Compliance "met" status |
| `--color-partial` | `#d97706` | Compliance "partial" status |
| `--color-gap` | `#dc2626` | Compliance "gap" status |
| Text primary | `#1a2332` | Headings, important text |
| Text body | `#334155` (slate-700) | Body text |
| Text muted | `#64748b` (slate-500) | Secondary text, timestamps |
| Text faint | `#94a3b8` (slate-400) | Placeholder text only |

### Rule: Never use `bg-transparent` on inputs/selects. Always `bg-white`.
### Rule: Never use `text-muted-foreground` without checking it's visible on the background.
### Rule: Every data container (table, list) sits on a white card with `border border-slate-200 rounded-lg`.

## Typography

| Element | Font | Weight | Size | Colour |
|---------|------|--------|------|--------|
| Page title (h1) | Space Grotesk | 700 | text-2xl (24px) | navy |
| Section heading (h2) | Space Grotesk | 600 | text-lg (18px) | navy |
| Table header | Inter | 500 | text-xs uppercase | slate-500 |
| Body text | Inter | 400 | text-sm (14px) | slate-700 |
| Small/meta | Inter | 400 | text-xs (12px) | slate-500 |
| Mono (codes, IDs) | JetBrains Mono | 400 | text-xs | slate-600 |

### Rule: `font-heading` class = Space Grotesk. All `<h1>`, `<h2>`, `<h3>` use it.
### Rule: Body never goes below `text-slate-700` for readable text. `text-slate-500` only for secondary info.

## Layout

```
┌──────────────────────────────────────────────────────────┐
│ [Sidebar 220px, navy bg]  │  [Main content, #f8fafc bg]  │
│                           │                              │
│  AuditReady               │  ┌─── max-w-[1200px] ─────┐ │
│                           │  │  px-6 py-8              │ │
│  Dashboard                │  │                         │ │
│  Evidence                 │  │  [Page content]         │ │
│  Standards                │  │                         │ │
│  Workers                  │  │                         │ │
│  Incidents                │  └─────────────────────────┘ │
│  Improvements             │                              │
│  ───────────              │                              │
│  Audit Pack               │                              │
│  Self-Assessment          │                              │
│                           │                              │
└──────────────────────────────────────────────────────────┘
```

### Sidebar rules:
- Fixed width 220px, full height
- `bg-navy text-white`
- Nav items: `text-white/70` default, `bg-white/10 text-white` active
- Separated with visual gap between main nav and audit section
- Mobile: slide-in sheet

### Main content rules:
- `bg-[#f8fafc]` page background
- Content wrapper: `max-w-[1200px] mx-auto px-6 py-8`
- Data sits in white containers (cards/tables) with borders
- Generous spacing between sections: `space-y-6`

## Component Patterns

### Tables (primary data display)
```tsx
<div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
  <table className="w-full text-sm">
    <thead>
      <tr className="border-b border-slate-200 bg-slate-50/80">
        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
          Column
        </th>
      </tr>
    </thead>
    <tbody>
      <tr className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors">
        <td className="px-4 py-3 text-slate-900">Content</td>
      </tr>
    </tbody>
  </table>
</div>
```

### Status indicators
```tsx
// Dot + text pattern (inline, compact)
<span className="inline-flex items-center gap-1.5">
  <span className="h-2 w-2 rounded-full bg-[var(--color-met)]" />
  <span className="text-sm text-slate-700">Met</span>
</span>

// For table cells — just coloured text, no dot
<td className="text-[var(--color-met)] font-medium">current</td>
<td className="text-[var(--color-partial)] font-medium">outdated</td>
<td className="text-[var(--color-gap)] font-medium">expiring</td>
```

### Forms (inputs, selects)
```tsx
<input
  className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-navy/10"
/>

<select
  className="h-9 rounded-md border border-slate-300 bg-white px-3 pr-8 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-navy/10"
>
```

### Buttons
```tsx
// Primary (navy)
<Button className="bg-navy text-white hover:bg-navy-light">Action</Button>

// Secondary (outline)
<Button variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-50">Action</Button>

// Destructive
<Button variant="destructive">Delete</Button>

// Ghost (for inline actions)
<Button variant="ghost" size="sm">Link</Button>
```

### Empty states
```tsx
<div className="py-12 text-center">
  <p className="text-slate-500">No evidence uploaded yet.</p>
  <Button variant="outline" size="sm" className="mt-4">Upload your first document</Button>
</div>
```
No decorative icons in empty states. Just text + action.

### Loading states
```tsx
<div className="py-12 text-center">
  <p className="text-slate-400 text-sm">Loading...</p>
</div>
```
No spinners. Just text. The page is fast enough.

### Sheets (detail panels)
- Slide from right
- Width: `sm:max-w-md` (448px)
- White background
- Close button top-right
- Content: stack of labelled sections

### Dialogs (forms/confirmation)
- Use for creation forms only
- `sm:max-w-lg` (512px)
- Single column form layout
- "Cancel" + "Save" buttons in footer

## Anti-patterns (DO NOT)

1. ❌ `bg-transparent` on any input or select
2. ❌ Cards wrapping single items — use tables for lists
3. ❌ Gradient backgrounds anywhere
4. ❌ Coloured backgrounds on section containers (only white or slate-50)
5. ❌ Icons larger than 20px (use `size-4` or `size-5` max)
6. ❌ Decorative icons with no information value
7. ❌ Badge components for status (use inline coloured text instead)
8. ❌ Numbered markers (01, 02, 03) on non-sequential content
9. ❌ Multiple font sizes in the same row competing for attention
10. ❌ Shadows heavier than `shadow-sm`
11. ❌ `text-muted-foreground` if it resolves to invisible gray on the background
12. ❌ More than 3 levels of visual hierarchy in one view
13. ❌ Progress rings/donuts (overkill for 15 items — use a bar or count)
14. ❌ Animated anything unless user-triggered

## The 5 Screens

| # | Path | Purpose | Primary element |
|---|------|---------|----------------|
| 1 | `/` | Dashboard — "am I audit ready?" | Compliance status bar + attention list |
| 2 | `/evidence` | Document library | Table + upload sheet |
| 3 | `/standards` | Standards with status | Grouped list with status dots |
| 4 | `/standards/[code]` | Single standard deep-dive | Tabs: overview, evidence, self-assessment |
| 5 | `/workers` | Worker compliance | Simple table (3 rows) |
| 6 | `/incidents` | Incident/complaint register | Table with expandable rows |
| 7 | `/improvements` | Continuous improvement | Table with expandable rows |
| 8 | `/audit/pack` | Generate auditor link | Single action page |
| 9 | `/audit/self-assessment` | AI responses | Expandable list |
| 10 | `/portal/[token]` | Auditor read-only view | Separate layout |

## UX Flow (the actual product)

```
User uploads documents
       ↓
AI classifies them → suggests standard mappings
       ↓
User confirms/adjusts mappings
       ↓
System calculates compliance status per standard
       ↓
Dashboard shows: "You're X% ready. These standards need attention."
       ↓
User addresses gaps (uploads more evidence, logs improvements)
       ↓
When ready: generate audit pack → share with auditor
```

This is the ONLY flow that matters. Every page serves this flow.
