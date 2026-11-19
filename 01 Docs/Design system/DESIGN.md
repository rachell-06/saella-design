# DESIGN.md: Saella Platform

UI rules and patterns for the Saella app: **how to do it**. Why, and for whom: `PRODUCT.md`. Color, size and shadow values: `tokens.css` (this file records roles only, it does not copy values). The full map of docs: `CLAUDE.md`.

**Scope relative to Studio Admin** (CLAUDE.md step 4): screens built from Studio Admin keep its layout and the way it presents elements; the presentation patterns in this file and in `PATTERNS.md` apply to the parts Studio Admin does not cover. Color, font, corner radius and metric logic (§2 "Metrics", "Tables") always follow this file.

Section numbers in this file are cited by code and docs (`DESIGN.md §2`, `PATTERNS.md §9.7`…): **number new sections onward, never renumber**.

**Quick reference: what you are doing → which section to read.** "PATTERNS 9.x" is a section in `PATTERNS.md`.

| Doing | Read |
|---|---|
| Any screen | §2, then §10 before reporting done |
| Tables, lists, filters | §2 "Tables", PATTERNS 9.1 |
| Metrics, rates, charts | §2 "Metrics", PATTERNS 9.7 |
| Opening details, creating new: page, sheet or dialog | PATTERNS 9.9 |
| Save, delete, report success or error | PATTERNS 9.10 |
| Forms, input fields | PATTERNS 9.11 (single step), 9.2 (multi-step) |
| Buttons the user may not press, plan limits | PATTERNS 9.12 |
| Actions that cost credits (unlock, export), out of credits | PATTERNS 9.18 |
| Dates and times, numbers, long text, language | PATTERNS 9.8, 9.13 |
| Import, domain verification, batch sending, export | PATTERNS 9.14 |
| Slow-loading pages or data blocks | PATTERNS 9.17 |
| Empty screens | PATTERNS 9.5 |
| Writing text on screen: titles, descriptions, labels, cell content | PATTERNS 9.15 |
| Agent | PATTERNS 9.4 |
| Density, page header, pagination, forms, charts: details not recorded elsewhere | PATTERNS 9.16 (following Studio Admin) |

## 1. Spirit

Saella Platform is the "tool" version of saella.ai: **bright, clean, systematic, friendly without showing off**. Product principles (review before running, honest metrics, hide the technical but never the truth, one main job per screen, dense yet easy to scan) are in `PRODUCT.md` §6. This section adds only two visual principles:

| Principle | Meaning | Why |
|---|---|---|
| **One accent** | One orange family, one solid orange button per page | The eye sees the main job at once; orange keeps its value when it is rare |
| **Layer with lines, not shadows** | Hairlines separate areas; shadows only for things floating above the page | Data-dense screens need calm; shadows are reserved to signal a "temporary layer" |

Inherited from the LP: ink-blue text (not pure black), one orange family, Geist, medium corner radius, hairlines instead of shadows, orange focus ring. Different from the LP: smaller and denser text, less motion, no marketing decoration.

**Scope.** Next.js + Tailwind 4 + shadcn/ui (`radix-nova`). Light and dark (the `.dark` block in `tokens.css`), light by default. Desktop; mobile postponed.

## 2. Settled rules

Decisions that have been approved. Do not change them unless the change is recorded here.

**Layout**
- No shadows on in-page backgrounds, cards, frames or tables; separate layers with hairlines. Shadows only for floating elements: popover, menu, toast, dialog, sheet, floating button.
- Each page has **one** solid orange button; every other button is `outline` or `ghost`. Dialogs, sheets and the agent panel are separate surfaces and may have their own orange primary button (designer 2026-11-18). Second exception: the "Write with Saella" button in the editor toolbar stays solid orange as in the live app, with an animated ✨ icon (designer 2026-11-18); other AI buttons still use the `ai` variant.
- Content max width 1536px, centered. The header bar and the line below it span the full width (only the inner content is constrained).
- The top of every page is a `PageHeader`; new screens go in `code/src/app/(app)/<screen>/`.
- Parent–child data (campaign → template) uses master–detail (`PATTERNS.md` 9.6).
- Action bars stuck to the bottom of the screen (Save in Settings › Company, the Review footer in New batch) carry `data-sticky-actions`: the floating "Ask the agent" button lifts itself just above the bar when the bar sits below its position, so it does not cover Save / Send (designer 2026-11-18, `components/layout/app-shell.tsx`).

**Tables**
- **No table spreads its whole list across the page** (user decision 2026-11-14, applies to every table): the table sits in a height-limited area, rows scroll inside, the header row sticks at the top. Default in `components/ui/table.tsx` (max height `max(20rem, 100svh − 14rem)`); a table filling a whole flex column (Leads, New batch) gets the rest of the screen as its area, with pagination/count in the frame footer. Do not hand-write tables outside `Table`/`DataTable`. Recorded exception (designer 2026-11-18): the post list in **Posts** (`social/_components/campaigns-screen.tsx`) keeps a hand-built list in the style of Studio Admin's kanban "List" view (collapsible campaign groups, posts as rows below, expandable per network), not switched to `Table`.
- **Inner scroll area height by area type** (designer 2026-11-19): keep the browser's native scrollbar (no ScrollArea, no scrollbar restyling); whole-page scrolling stays as is. Take the constants in `code/src/lib/scroll.ts`; do not write custom `max-h-*`/`overflow-*` for a new scroll area:

  | Area type | Height | Constant |
  |---|---|---|
  | Table on a page | max `max(20rem, 100svh − 14rem)` (default of `Table`) | `SCROLL_TABLE` |
  | Table filling a whole flex column (Leads, `TableFrame`) | rest of the screen, sticky header, only rows scroll | `SCROLL_TABLE_FILL` (set on the parent of `Table`) |
  | Table in a card on a detail page (Send history, All recipients, batch report tabs) | `min(60vh, 40rem)` | `SCROLL_CARD_TABLE` (parent), `SCROLL_CARD_TABLE_BOX` (self-scrolling frame) |
  | List or table in a dialog | `clamp(18rem, 40vh, 26rem)` | `SCROLL_DIALOG_LIST`, `SCROLL_DIALOG_TABLE` |
  | List in a popover, dropdown, combobox, multi-select, tree-select | max 320px (`max-h-80`) | `SCROLL_POPOVER_LIST` |
  | Sheet body | header, footer fixed; only the body scrolls | `SCROLL_SHEET_BODY` |

  A scroll area inside a page or dialog that is itself scrolling gets `overscroll-contain` (already included in the constant). Does not apply to: the app frame, sidebar, agent message pane, email preview frame and editor canvas.
- At most 2 lines of text per row. One display style per column: do not mix badges with text.
- Row hover: `muted/50` background as in Studio Admin (changed 2026-11-10, previously no background change). The row-select checkbox is always visible (as in Studio Admin, changed 2026-11-10); the row action button ⋯ appears on hover or when tabbed to; compact tables may let actions float over the last column.
- Only one row of underlined tabs per page. Secondary filters with counts below it (e.g. Total / New / Already saved in Find companies) use `ToggleGroup` chips.
- Show a status label only when it differs from the normal state; exception: the template table, the company table (Find companies), the Recipients table of the batch report and the Follow-up table of the Automation card (designer 2026-11-18) always have a Status column, every row has a badge, even when Active.
- A table cell with no number stays empty (no "0%", no "–"). A KPI tile with no number yet shows "–". Neither ever shows "0" in place of "unknown" (PRD Master v1.6.8). Paginate only when longer than one page.

**Metrics**
- Email rates (Delivery, Open, Click, Reply, Unsub, Bounce) are numbers, plain text, no bar, no tier scale. Bars are only for "part of a total", e.g. clicks per link (`PATTERNS.md` 9.7).
- Only two rates have thresholds, taken from the live app (`HEALTH_THRESHOLDS`, Repo `src/lib/email/health.ts`, per AWS SES limits), declared in one place in `RATE_BANDS` (`components/saella/rate-meter.tsx`):

| Rate | Warning | Danger |
|---|---|---|
| Bounce | ≥ 5% | ≥ 10% (auto-pause sending level) |
| Delivery | < 90% | |

  Warning: `warning-soft-foreground` text; danger: `destructive-soft-foreground` text; both with an icon and a tooltip stating the threshold. Open, Click, Reply, Unsub **have no threshold, so they are never colored**.
- Under 20 sends: grey number, no marking, tooltip "too few to judge".
- Wherever a `Progress` bar remains, its length always equals the exact number. The only exception: the estimated loading bar (`PATTERNS.md` 9.17), which always shows "~" before the %.
- All times show in the workspace time zone, default GMT+7; times tied to an action always state the time zone (`PATTERNS.md` 9.8).

**Content**
- Show only text the user **uses to do something**; business logic is expressed through how the UI behaves, not written out as explanatory text. Details: `PATTERNS.md` 9.15.
- Secondary information goes in ⓘ or a tooltip, at most 1–2 sentences. No methodology footnote paragraph at the end of a page.
- Call it **agent**, never "assistant". Voice: `PRODUCT.md` §4.
- The full-body chibi character appears **only** on the sign-in / sign-up screens (standing beside the form in the left column, pointing at the form, animated) and the onboarding welcome screen (waving above the title) (user decision 2026-11-12). Component: `(auth)/_components/saella-character.tsx`. Brand panel on auth screens: dark `deep` background (dark mode `deep-2`) + `WarpBackground` (faint white grid, `brand` beams, each beam with a light-colored envelope at its head, the beam being its trailing streak: prop `beamHead`; reduced motion: grid only), with a welcome card in the middle of the panel (translucent Card). The agent uses Saella mini. Empty screens use icons.
- Sample data: fictional people and company names, no real customers (FTK, Vinex, VMA, Exquee, Aegis); numbers are illustrative only, not marketing claims; enough to show every state that needs review.

**Controls**
- Components come from `components/ui/` or `components/saella/`; if missing, `npx shadcn@latest add`, do not draw your own.
- No native controls: no `<input type="date|time">` (use `DatePicker`, `DateRangePicker`, `TimePicker`), no raw `<select>`.
- No raw `<button>`, `<input>` outside `components/ui/`: buttons use `Button` (clickable text inside a sentence or table: `variant="link"` + `h-auto border-0 p-0`), clickable rows use `Item` or `ListRow`. Wrapping a raw tag in a shadcn component via `asChild` is fine. Two exceptions: a hidden `<input type="file">` opened by a `Button`; the selectable content blocks in the email editor (`email-body.tsx`). `npm run lint` blocks these automatically: rules `saella/no-raw-control` (raw tags) and `saella/no-native-title` (`title=` outside truncated text) in `code/eslint.config.mjs`. Any other exception needs `eslint-disable-next-line` with a reason.

**Don't**

| Don't | Use instead |
|---|---|
| Color codes, `text-[..px]`, `rounded-[..]`, `shadow-[..]`, Tailwind default colors (`gray-*`, `red-*`) | Tokens. If missing, add to `tokens.css` |
| A second accent color, gradients, glow, pure black, multi-color icons, emoji as icons | One orange family, ink, single-color Lucide icons |
| `primary` as text on `primary-soft`; `warning` or `chart-5` as text | `primary-soft-foreground`, `warning-soft-foreground`, label/legend |
| Conveying meaning by color alone | Color + text or icon |
| Infinitely looping animation on controls; animation that does not turn off under reduced motion | §7 |
| `shadcn apply` / `init --preset` (overwrites Saella tokens) | Edit `tokens.css` |

The only exception for color codes and multi-color icons: provider logos on sign-in buttons (Google, Microsoft) and social network logos (§7 "Icons") keep their official colors, in both light and dark (designer 2026-11-18).

## 3. Tokens

Named by **role**, not by color: changing a value does not mean changing code.

| Token | Role |
|---|---|
| `background`, `card`, `popover` | Page, card, floating-layer background |
| `foreground` | Primary text |
| `muted-foreground` | Secondary text, descriptions, labels |
| `subtle-foreground` | Placeholder, timestamp, caption: the faintest level that still passes AA |
| `muted` / `secondary` / `accent` | Secondary background, table header, menu and ghost button hover |
| `primary` / `primary-foreground` / `primary-hover` | Primary button, link, active control |
| `brand` | Accent icons, big numbers, accent lines. Not a background for buttons with small text |
| `primary-soft` / `primary-soft-foreground` | Light accent background, selected item, orange badge |
| `primary-subtle` | Selected table row, filter value chip |
| `border` / `input` / `ring` | Hairline / input border / focus |
| `destructive`, `success`, `warning`, `info` (+ `-foreground`, `-soft`, `-soft-foreground`) | Status semantics (§4.1) |
| `status-{draft,scheduled,sending,sent,paused,failed}` | Batch status badges (§4.2) |
| `chart-1..6` | Charts (§4.3) |
| `sidebar*`, `sidebar-hover` | Sidebar |
| `cream`, `peach`, `deep` | Light accent background (currently unused; formerly the sign-in page panel) / text highlight / dialog overlay |
| `rounded-lg`, `rounded-md`, `rounded-sm`, `rounded-card`, `rounded-full` | Corner radius (§6) |
| `shadow-card` / `shadow-float` | Elevation (§6) |
| `text-dense`, `tracking-title`, `tracking-display` | Dense table 13px / titles 18–24px / numbers ≥ 30px |
| `ease-standard`, `ease-emphasized`, `--motion-fast/base/slow` | Motion (§7) |
| `--email-*` (`.email-canvas`) | Email preview frame, light only (`PATTERNS.md` 9.3) |

**New non-color tokens** (radius, shadow, font size, letter spacing, easing, font family) must also be declared in `src/lib/utils.ts`, so `cn` knows which classes they conflict with. Without this step, `cn` keeps both conflicting classes or removes the wrong one (this once made every table column header lose its `text-dense` size). `tsconfig.json` points shadcn components' `import { cn } from "cn"` to this file.

## 4. Color

### 4.1 Principles
- **One accent family.** White background, fog secondary frames, ink-blue text, one orange family.
- **Two shades of orange, two jobs.** `brand` (the LP orange) for accent icons, big numbers, focus. The primary button uses the darker `primary` because white text on `brand` does not pass AA. Primary button hover gets darker in light, lighter in dark: always "away from the background".
- **The faintest text level still passes AA.** `subtle-foreground` replaces the LP's ink-3 (3.77:1, fails AA). `input` is darker than the hairline so input borders reach 3:1.
- **Semantic families** (applied the same way to `destructive`, `success`, `warning`, `info`, `primary`):

| Token | Used for |
|---|---|
| `X` | Solid background, icon, border |
| `X-foreground` | Text on solid background |
| `X-soft` | Light background |
| `X-soft-foreground` | Text and icons on light background **and on white** |

  Warning text is always `warning-soft-foreground`, never `warning`.

### 4.2 Status

| Batch | Token | Color family |
|---|---|---|
| Draft | `status-draft` | neutral |
| Scheduled | `status-scheduled` | info-soft |
| Sending | `status-sending` | primary-soft |
| Sent | `status-sent` | success-soft |
| Paused | `status-paused` | warning-soft (includes auto-pause due to bounce/complaint, label "Auto-paused") |
| Failed | `status-failed` | destructive-soft |

Campaign (Not started / Active / Ended / Archived) and template (Active / Inactive) use the `-soft` family via `StatusBadge`. Badges always have a dot + text; the dot is **static**, even for Sending (orange is enough to say "running", no looping animation on controls).

### 4.3 Charts

| Token | Color | Note |
|---|---|---|
| `chart-1` | orange | |
| `chart-2` | teal | Closest pair to orange under color blindness |
| `chart-3` | blue | |
| `chart-4` | plum | |
| `chart-5` | gold | 2.16:1 on white: always with a label or legend |
| `chart-6` | rose | Bounce |

Each metric keeps one color in both light and dark, on every chart: metric → color table declared in one place, `src/lib/metric-colors.ts` (Sent orange, Delivered blue, Opens teal, Clicks gold, Replies plum, Bounce rose; 2026-11-18). Charts do not pick metric colors themselves. Checked for color-blind distinguishability (OKLab, deutan/protan simulation).

### 4.4 Dark mode
- Background, text, borders take shadcn's "neutral" dark palette; lightness increases: page < card, popover, sidebar < muted.
- Keep Saella's identity: orange primary button (lighter orange, dark text), orange focus, input borders at 3:1, chart colors, hand-picked `-soft` backgrounds. `status-*` points to the color families, so it switches automatically.
- Every text/background pair passes AA on **both** the page background and cards.

### 4.5 Contrast of key pairs

Each token's contrast figure is recorded in `tokens.css`, next to its value. This section only records pairs that are **forbidden or conditional**:

| Pair | Rule |
|---|---|
| `subtle-foreground` on `primary-soft` | Don't use: fails AA |
| `primary` as text on `primary-soft` | Don't use; use `primary-soft-foreground` instead |
| `warning`, `chart-5` as standalone text or icon | Don't use: under 3:1 on white |
| `border` as a control's only boundary | Don't use: for dividing areas only; control borders use `input` (passes 3:1) |
| Soft text on soft background (every family), text on solid background | Passes AA in both light and dark, use freely |

## 5. Type

Font **Geist** (`next/font`). The UI has three languages: **English, Tiếng Việt, 简体中文** (PRD Language BR-RULE-LNG-03; live app `lib/i18n/messages.ts`); Thai and Indonesian are not UI languages. Chinese uses a CJK fallback (PingFang SC, Hiragino Sans GB, Microsoft YaHei, Noto Sans SC). Vietnamese diacritics must render in Geist itself, not fall back to another font (not yet checked, see "Not settled" in `decisions.md`). Body enables `font-feature-settings: "ss01"` as in the LP. Numbers in tables and KPIs: `tabular-nums`.

| Class | Size / line | Weight | Used for |
|---|---|---|---|
| `text-xs` | 12 / 16 | 500–600 | Only badges, kbd, chart axes, group labels and short non-clickable metadata (12px rule below the table) |
| `text-dense` | 13 / 18 | 400 | Dense table cells |
| `text-sm` | 14 / 20 | 400; buttons, labels 500 | **Default body**, inputs, buttons, menus |
| `text-base` | 16 / 24 | 400 | Long reading text (agent chat, descriptions) |
| `text-lg`, `text-xl` | 18, 20 | 600, `tracking-title` | Block titles, dialogs, large cards |
| `text-2xl` | 24 / 32 | 500, `tracking-tight` | **Page title** (`PageHeader`; user decision 2026-11-13: 30px at weight 400 looked like a landing page; keep Geist, no switch to Inter since the two fonts look nearly the same at the same size), large block titles |
| `text-3xl` | 30 / 36 | 500, `tracking-title` | Sign-in / onboarding screen titles |
| `text-3xl`+ | ≥ 30 | 400, `tracking-display` | KPI numbers, onboarding |

- Build hierarchy with size and color first, weight second; limit 700.
- No all-caps sentences. Group labels: 12px, 600, `muted-foreground`.
- **12px rule** (designer 2026-11-18): 12px only for badges, kbd, chart axes, group labels and **short non-clickable metadata** (times, counters, "3 credits used", "+600 on Dec 12"), at most ~8 words, color `muted-foreground` (≥ 4.5:1), never `subtle-foreground`. Never 12px for clickable text (links, buttons), titles, explanatory sentences or errors, or information used to decide (prices, credits to top up): those are at least 14px. **Exception: tooltips** (`Hint`, `LockedTip`) keep 12px as in shadcn: high-contrast dark background, short sentences (designer 2026-11-18).

## 6. Spacing, radius, borders

**Spacing.** 4px scale.

| Position | Value |
|---|---|
| Inside controls | 8 / 12px |
| Between form fields | 16px |
| Between blocks on a page | 16px; from `md` 24px (`gap-4 md:gap-6`, following Studio Admin) |
| Content padding | 16px; from `md` 24px (`p-4 md:p-6`) |

**Sizes.**

| Element | Height |
|---|---|
| Buttons, inputs (default `h-8`) | 32px; small 28px; large 36px |
| Table row | ~48px (cell `px-4 py-3.5`); column header row 40px. Following Studio Admin |
| Minimum hit area | 24×24px |

`sm` / `xs` buttons have text < 14px: only for icon buttons or inside tables.

**Radius.**

| Token | Value | Used for |
|---|---|---|
| `rounded-lg` (`--radius`) | 8px | Buttons, inputs, popovers, dropdowns |
| `rounded-md` | 6.4px | Menu items, filter chips, small icon buttons |
| `rounded-sm` | 4.8px | Checkbox, kbd |
| `rounded-card` | 12px | Card (`card.tsx`), dialog, Saella blocks |
| `rounded-full` | pill | Badge, tag, avatar, status dot |

**Nested frames: outer radius larger than inner.** A bordered block standing directly on the page (table frame, info block, panel) uses `rounded-card` like Card. A bordered block **inside** another frame (dialog, card, wizard step, detail panel, agent message) uses `rounded-lg`. Two table frames may differ: radius follows position, not content.

**Borders and elevation.**

| Layer | How it is separated |
|---|---|
| Card, table, panel, sidebar | 1px `border` hairline, **no shadow** |
| Input, checkbox, select | `input` border; solid 2px orange focus ring; error: `destructive` border + error sentence below the field |
| Popover, menu, toast | `shadow-card` |
| Dialog, sheet, command palette | `shadow-float`; `deep` overlay at 40% |

No glow, no colored shadows.

## 7. Motion and icons

**Motion** only explains state changes, never decorates.

| Action | Duration | Easing |
|---|---|---|
| Hover, color change | 150–200ms | `ease-standard` |
| Opening popover, dialog, sheet | 200–300ms | `ease-emphasized` |
| Loading | skeleton or spinner | |

- Not carried over from the LP: shine sweep on buttons, text scrolling on hover, reveal on scroll, parallax.
- Every animation turns off under `prefers-reduced-motion`. No infinitely looping animation on controls.

**Icons.** Lucide, stroke 1.75–2; 16px in controls, 20px in nav. Color follows the accompanying text; accent icons use `brand`. Meaningful icons must reach 3:1. **Exception: social network logos** (Facebook, Instagram, Threads, LinkedIn, TikTok, YouTube, Pinterest…) keep the network's own brand color and must be recognizable in both light and dark; used only to indicate that network, never as decoration. Every network logo is a **circle** of the same size: brand-color background, white glyph in the middle; when stacked, each logo has a 2px border in the background color to separate them. Defined in `code/src/app/(app)/social/_components/network-icon.tsx` (settled 2026-11-11).

## 8. Components

Only records where Saella **differs** from shadcn/ui; everything else follows the shadcn docs.

| Folder | Contains | Rule |
|---|---|---|
| `src/components/ui/` | Original shadcn components | Theme only via tokens; classes may be edited to match the DS, do not change the API |
| `src/components/saella/` | Saella-specific DS components | Composed from `ui/`, tokens only |
| `src/components/layout/` | App frame | |
| `src/components/features/` | Feature components used by two or more screens (dialogs, sub-tables…) | |
| `src/app/(app)/<screen>/` | Product screens: `page.tsx` + `_components/` used only by that screen | Share `AppShell`, page header `PageHeader`. Do not import another screen's `_components/`: if used by two or more screens, move it up to `features/` or `saella/` |
| `src/lib/mock/` | Mock data and shared data types | Shared values (TODAY, NOW, current user, countries) declared only in `constants.ts` |
| `src/lib/format.ts`, `src/lib/time.ts` | Formatting functions, times in the workspace time zone | Do not rewrite them inside screens |

**Libraries beyond shadcn:** the letter editor (Letter) uses **TipTap 3.34.0** (`@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/extension-text-style`, `@tiptap/extension-image`, `@tiptap/extensions`; exact version pinned, approved by designer 2026-11-14), used headless: the toolbar is composed from `ui/` components, letter text follows `EMAIL_PROSE` (`components/features/email-body.tsx`), no TipTap default CSS, no paid extensions. Any other library must be approved.

Components with a `<name>.meta.ts` file (template `components/meta.ts`): read it before use, since it records which variant to use when and forbidden combinations. Write a meta for new components or ones often misused.

Applies to every component in `ui/`, including newly added ones:
- Focus `ring-2 ring-ring` (shadcn's `ring-3 ring-ring/50` does not reach 3:1).
- Overlay and card borders `ring-border`; shadows per §6.
- Remove `dark:bg-input/30`… classes since the `.dark` tokens already handle it.

### 8.1 Differences from shadcn

| Component | Saella |
|---|---|
| Button | `default` = `primary`, hover `primary-hover`. `outline` border `input`. `destructive` background `destructive-soft`. `ai` = AI action (✨): solid `peach` background, text and icon `primary-soft-foreground`, no border (designer 2026-11-18: the light-border version was too faint); never solid orange, does not count as the page's single orange button |
| Input, Textarea | `input` border; placeholder `subtle-foreground` |
| Select | Popover `shadow-card`; selected item has a check mark |
| Checkbox, Radio, Switch | On = `primary`, off = `input` border. Checkbox has an "indeterminate" state |
| Badge | 12px pill, weight 500 (user decision 2026-11-13; previously 600). Tones: neutral, `brand`, `success`, `warning`, `info`, `destructive` (`-soft` family) |
| Table | Following Studio Admin: column header row without background, 14px 500 text in the primary text color; 16px cell padding; hover background `muted/50`; selected row `primary-subtle`, grey badges (tags) in a selected row switch to `card` background (white) so they don't sink; status badges stay unchanged (designer 2026-11-18). A header that sticks on scroll gets a `background` fill |
| Tabs | Default underline in `brand`, unselected tabs `muted-foreground`. View switching (Rates / Counts) uses `TabsList variant="default"` |
| Toggle, ToggleGroup | Selected item background `primary-soft`. Multi-select chips (chart series, event filters) |
| Dialog, AlertDialog | 12px radius, `shadow-float`, `deep` overlay at 40%. `DialogContent` has `grid-cols-[minmax(0,1fr)]` so wide content scrolls inside |
| Sheet | `shadow-float`. Contact and company details |
| Alert | Adds `info`, `success`, `warning` tones. Alert for notices that need to stay; toast for short confirmations |
| Toast (`sonner`) | Icon by semantic family; warning uses `warning-soft-foreground`; shown at top center (`top-center`, designer 2026-11-19) |
| Card | `rounded-card` (12px) |
| Message, Bubble, MessageScroller, Trace, Attachment, Marker | shadcn's chat set for the Agent; AI Elements not installed (Vercel, soon merging into shadcn). Attachment uses `rounded-card`, loading state uses shadcn's `shimmer` (turns off under reduced motion). Marker for milestones in the conversation |

### 8.2 Saella components (`components/saella/`)

| Component | Role |
|---|---|
| `StatusBadge` | Campaign / template / batch status: static dot + text (§4.2) |
| `KpiStrip` | The current KPI pattern (Overview, Campaigns, batch report, Billing); screens rebuilt from Studio Admin use the template page's KPI style: one continuous strip divided by hairlines, no decorative icons. Tiles with `href` are clickable; `detail` goes in a tooltip; `warning` / `danger` tone when over threshold |
| `RateCell`, `RateValue`, `rateKpi` | The only way to show email rates (`rate-meter.tsx`): "38.3% (466)", denominator in the tooltip, color per `RATE_BANDS`. `RateCell` for tables, `RateValue` inline, `rateKpi` for `KpiStrip` tiles |
| `DataTable` | TanStack v9 table: sorting, multi-select + action bar above, pagination, loading, empty, row expansion (`renderExpanded`), row-select checkbox always visible (§2); row actions (`…`) always visible, faint (`revealOnRowHover`) |
| `FilterBar` | Search box + filter menu + value chips + Clear all; controllable from outside (URL, agent) |
| `MultiSelect`, `TreeSelect`, `TagInput` | Multi-select (Popover + Command; lists over 7 items have a search box, substring match), tree select, tag input (existing tags show as a dropdown on focus, type to filter, Enter to add; no suggestion chips laid out) |
| `DatePicker`, `DateRangePicker`, `TimePicker` | Date and time pickers replacing native inputs, in the workspace time zone (`PATTERNS.md` 9.8) |
| `ChartCard`, `Sparkline` | Chart frame, small trend line |
| `Stepper` | Multi-step forms (`PATTERNS.md` 9.2) |
| `ApprovalCard`, `AgentSteps` | Proposals awaiting approval, agent steps in progress (`PATTERNS.md` 9.4) |
| `SaellaMini` | The agent's face: round `primary-soft` background, 20–96px, `state` idle / thinking |
| `CopyButton`, `LanguagePicker` | Copy a value (DNS record…), pick a language |
| `Hint` | Short tooltip for any element, replaces native `title=` (`PATTERNS.md` 9.13) |
| `ListRow` | A selectable row in the left list of a master–detail (campaign, agent thread, approval queue), built on `Item` (`PATTERNS.md` 9.6) |
| `ChipRemove` | The × button in a chip or `Badge` to remove it (filter value, tag, attachment) |
| `RouteProgress` | 2px `brand` bar at the top edge during page transitions; the sidebar item just clicked lights up immediately (`data-nav-pending`). Mounted once in `app/layout.tsx` (`PATTERNS.md` 9.17) |
| `SectionLoader`, `useSectionLoad` | A self-loading data block: correctly shaped skeleton → status + % bar after 1s → Alert + Retry after 15s or on error; returning within the session shows the previous version (`PATTERNS.md` 9.17) |
| `LoadingStatus`, `UpdatedIndicator` | Status line during long waits (`aria-live`), "running" tone like the Sending status: `primary-subtle` background, `brand`/25 border, `primary-soft-foreground` text, `brand` spinner; "Updating… · Updated 2 min ago" while refreshing an old version |

**Being retired (not for new screens)**

| Component | Replace with | Note |
|---|---|---|
| `MetricCard` | `KpiStrip` | Deleted; a number that needs emphasis goes in a `KpiStrip` tile |
| `RateMeters` (3-tier scale) | `RateCell` / `RateValue` | Deleted 2026-11-05 |
| `TableFill` | `DataTable`'s `fill` / `stickyHeader` option (not built yet) | Temporarily used for full-page-height tables; technical debt because it adjusts `DataTable` from outside |

### 8.3 App frame (`components/layout/`)

| Component | Role |
|---|---|
| `AppShell` | Sidebar + header + agent panel resizable 320–900px |
| `AppSidebar` | Collapses to icons, labeled groups, account menu with Light / Dark / System |
| `PageHeader` | Breadcrumb (optional), 24px title (§5), one `text-sm` context line, actions on the right: `size="sm"` buttons, secondary buttons (outline) first, main orange button last, ⋯ menu (if any) at the very end |
| `SearchCommand` | Command palette (Ctrl/⌘K) |
| `NotificationsMenu` | Notifications |
| `AgentPanel` + floating "Ask the agent" button | Entry point to the agent (`PATTERNS.md` 9.4). The floating button is a key feature, so it is large and high-contrast: `foreground` (ink) pill 48px tall, Saella mini 30px, `shadow-float`; not solid orange so it does not compete with the page's primary button (2026-11-11) |
| `LeadsTabs` | Tabs of the Leads group |
| `ThemeProvider` | Theme, light by default |

### 8.4 Required states

Every component, original or composed, must be designed with all of:

| State | How it is shown |
|---|---|
| hover | `accent` or `primary-hover` background, 150–200ms |
| focus | `focus-visible` 2px orange ring |
| disabled | 50% opacity, no hover |
| loading | Spinner or skeleton, same size kept, `aria-busy` |
| empty | A sentence saying why it is empty + one next action |
| error | `destructive` border + text, message says how to fix it |

## 9. Patterns

Moved to `PATTERNS.md` (same folder), numbers 9.1–9.15 kept. Which section to read: the "Quick reference" table at the top of this file.

## 10. Checks before reporting done

**Tokens and states**
- [ ] Only token classes; text on `*-soft` backgrounds uses `*-soft-foreground`.
- [ ] All states in §8.4. Loading keeps the layout; empty and error have an explanation + next action.

**Accessibility**
- [ ] Body ≥ 14px, dense tables ≥ 13px. 12px only for badges, kbd, axes, group labels and short non-clickable metadata, color `muted-foreground` (§5 "12px rule"); links, buttons, titles, errors, prices are never 12px. Numbers use `tabular-nums`.
- [ ] Text ≥ 4.5:1; control borders, meaningful icons, focus ≥ 3:1.
- [ ] Focus visible on every interactive element; controls have labels (`aria-label` for icon-only buttons); hit area ≥ 24×24px.

**Display**
- [ ] Screenshot at 1440px light + dark (`scripts/screenshot.mjs`, saved to a temp folder): no horizontal scroll, secondary lines not cut off, name column not squeezed.
- [ ] Small laptops (user decision 2026-11-18): also measure 1280×800 and 1366×768. No whole-page horizontal scroll, and tables fit their frame without horizontal dragging. Below 1440: shrink columns, let the bracketed number in rate cells wrap (`[data-slot=rate-value]`), long names max 2 lines, tags show only 1 + "+N". At 768 height: primary buttons and modals still fully visible.
- [ ] **Text-trimming pass** on the screenshot, per `PATTERNS.md` 9.15: go through every piece of text with the test "what does the user do with it?"; remove raw data, sentences explaining logic, repeated metrics, single-item blocks. You may use the `distill` skill (remove excess elements) and `clarify` (fix wording). Report what was removed.

**Technical**
- [ ] Typecheck and lint clean; console free of errors and warnings (including hydration). After changing many files, restart `npm run dev` and check again.

## 11. References

External sources to learn from (settled 2026-11-10). They do not override Saella rules; each source is used only for the job listed beside it. Saella's foundation is not here: style is `tokens.css` (§3), components are shadcn (§8).

| When | Source | What to learn |
|---|---|---|
| Often, when building screens | **Studio Admin** (read-only clone `D:\Workspace\Saella\Studio Admin`, demo https://studio-admin.arhamkhnz.com) | Layout and how elements are presented. `page.tsx` + `_components/` may be copied, keeping the presentation, changing only color, identity, data, metric logic (CLAUDE.md step 4); do not copy `components/ui/`, `globals.css`, theme presets |
| Often, when building screens | **Competitors** (Mailchimp, Apollo, HubSpot, Clay, Unify, Hunter, Buffer, via Mobbin) | Business flows; recorded in `01 Docs/Research/Competitor.md` |
| Only when needed | **saella.ai** (source `D:\Workspace\Saella\Saella LP`) | New tokens that fit the brand, brand assets (logo, chibi, Saella mini), voice |
| Only when needed | Shopify Polaris | Empty states, UI copy |
| Only when needed | IBM Carbon | Dense tables, AI content labels |
