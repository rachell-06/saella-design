# Saella Platform: new UI

The redesigned Saella app UI (Next.js + shadcn/ui + Tailwind 4), running on mock data. This file is for developers bringing the new UI into the current app (Next 14 + antd 5). It collects the rules you need to build screens correctly without reading the design docs.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run typecheck
npm run lint       # includes Saella's own rules, see "Controls"
npm run build
```

- Next 16.4, React 19.3, Tailwind 4, shadcn `radix-nova`, TanStack Table v9, Recharts 3, TipTap 3.34.0 (pinned).
- `next.config.ts`: `cacheComponents` is on in dev and off when building on Vercel or with `SAELLA_DEMO_BUILD=1 npm run build`, because several screens read the URL (`useSearchParams`) outside `<Suspense>`. When you wire real APIs, wrap those reads in `<Suspense>` and turn it back on.

## Structure

| Folder | Contains | Rule |
|---|---|---|
| `src/styles/tokens.css` | Every colour, type, radius and shadow value (light + `.dark`) | **Single source.** No colour values anywhere else |
| `src/app/globals.css` | Wires tokens into Tailwind, base styles | |
| `src/components/ui/` | shadcn components, adjusted for Saella | Only change classes to match tokens; keep the API |
| `src/components/saella/` | Saella's own components, built from `ui/` | |
| `src/components/layout/` | App frame: sidebar, top bar, PageHeader, agent | |
| `src/components/features/` | Dialogs and blocks used by two or more screens | |
| `src/app/(app)/<screen>/` | `page.tsx` + `_components/` used only by that screen | Never import another screen's `_components/` |
| `src/lib/mock/` | Mock data **and the data types** | When migrating: keep the types, replace the data with API calls |
| `src/lib/` | `leave-guard.ts`, `period.ts`, `time.ts`, `utils.ts` (`cn`) | |

**`*.meta.ts` files** next to a component (template in `components/meta.ts`) say which variant to use when and which combinations are not allowed. Read them before using the component. Available for: button, badge, alert, status-badge, data-table, date-picker, kpi-strip, rate-meter, section-loader, page-header.

**`cn`** lives in `src/lib/utils.ts` (`import { cn } from "cn"` points there). When you add a non-colour token (radius, shadow, font size, easing), register it in `utils.ts` too, or `cn` will drop the wrong class.

## Tokens

Named by **role**, not by colour.

| Token | Use |
|---|---|
| `background`, `card`, `popover` | Page, card, floating layer backgrounds |
| `foreground` / `muted-foreground` / `subtle-foreground` | Main text / secondary text / placeholder, timestamps (lightest level that still passes AA) |
| `primary`, `primary-hover` | Main button, links, active controls |
| `brand` | Accent icons, big numbers, accent lines, focus. Never as the background of a button with text |
| `primary-soft` + `primary-soft-foreground` | Light accent background, selected item, orange badge |
| `primary-subtle` | Selected table row, filter value chip |
| `border` / `input` / `ring` | Dividers / input borders (3:1) / focus |
| `destructive`, `success`, `warning`, `info` | Status. Each has `-foreground`, `-soft`, `-soft-foreground` |
| `status-{draft,scheduled,sending,sent,paused,failed}` | Batch status badges |
| `chart-1..6` | Charts: orange, teal, blue, plum, gold, rose (bounce) |
| `table-head` | Table header row background |
| `rounded-lg` 8px · `rounded-md` · `rounded-card` 12px · `rounded-full` | Buttons, inputs · menu items, chips · cards, dialogs, frames on the page · badges, avatars |
| `shadow-card` / `shadow-float` | Popover, menu, toast / dialog, sheet, floating button |

- Text on an `X-soft` background always uses `X-soft-foreground`. Warning text is always `warning-soft-foreground`, never `warning`.
- Don't use: hex values, default Tailwind colours (`gray-*`, `red-*`…), `text-[..px]`, `rounded-[..]`, `shadow-[..]`, gradients, glow, emoji as icons. If a token is missing, add it to `tokens.css`.
- Allowed exceptions with their own colours: Google/Microsoft logos on the sign-in buttons, social network logos (`social/_components/network-icon.tsx`).
- Never run `shadcn apply` or `shadcn init --preset` (they overwrite the tokens). Add components with `npx shadcn@latest add <name>`, then align their classes with the tokens.

## Type, spacing, icons

- Font **Geist**. Body 14px. Dense table cells 13px (`text-dense`). 12px only for badges, kbd, chart axes, counters. Page title 24px, weight 500. Numbers in tables and KPIs use `tabular-nums`.
- 4px scale. 16px between form fields. Between blocks and page padding: `gap-4 md:gap-6`, `p-4 md:p-6`. Content max width 1536px, centred.
- Buttons and inputs 32px high (`h-8`); small buttons 28px. Table rows ~48px, header row 40px, header text 14px weight 500.
- Lucide icons, stroke 1.75–2: 16px in controls, 20px in navigation.
- Animations 150–300ms, all off under `prefers-reduced-motion`. No infinite animation on controls.

## Required rules

**Layout**
- **One** solid orange button per page; every other button is `outline` or `ghost`. Exception: the template editor (Write with Saella + Mark active).
- No shadows on cards, tables or frames inside the page; separate layers with 1px lines. Shadows only for things that float: popovers, menus, toasts, dialogs, sheets, floating buttons.
- Nested frames: the outer frame has the larger radius (frames on the page `rounded-card`, frames inside a dialog/card `rounded-lg`).
- Every page starts with `PageHeader`. Right-side actions: secondary buttons first, the orange main button last, the ⋯ menu after it.
- One underlined tab row per page.

**Tables**
- **No table shows its whole list on the page.** Every table sits in a bounded area, rows scroll inside it, the header row is sticky. This is the default in `components/ui/table.tsx`. Tables that fill the rest of the screen (Leads, New batch) use a flex frame with the count and pager in its footer. Don't build tables outside `Table`/`DataTable`.
- At most 2 lines of text per row. One display style per column.
- A cell with no number stays **empty** (no "0%", no "–"). A KPI with no number shows "–". Never show "0" for "unknown".
- Multi-select: actions live in the floating `SelectionBar` under the table (`N selected | actions | ✕`). When results span pages, offer "Select all N matching".
- Filters: `FilterPopover` + `FilterChips` (chips grouped by label, with "Clear all"). Filters live in the URL and survive a reload.

**Numbers**
- Email rates use `RateCell` / `RateValue` / `rateKpi` (`components/saella/rate-meter.tsx`), shown as "38.3% (466)" with the denominator in a tooltip.
- Only two rates are coloured by threshold (`RATE_BANDS`): Bounce warning from 5%, danger from 10%; Delivery warning below 90%. Open, Click, Reply and Unsub are never coloured.
- Under 20 sends: grey number, tooltip "too few to judge".
- Times are shown in the workspace time zone (default GMT+7); a time tied to an action always shows the zone.

**Controls**
- No native controls: no `<input type="date|time">` (use `DatePicker`, `DateRangePicker`, `TimePicker`, `PeriodPicker`), no raw `<select>`, no raw `<button>`/`<input>` outside `components/ui/`. Clickable text uses `Button variant="link"`. ESLint enforces this (`saella/no-raw-control`, `saella/no-native-title`).
- Tooltips use `Hint`, never `title=`. Icon-only buttons need an `aria-label` and a `Hint`.
- A vertical `Separator` with a fixed height also needs `data-vertical:self-center`.
- Focus: 2px orange ring, shown on keyboard focus only (`focus-visible`).
- Choice cards (radio as card): hide the radio dot (`sr-only`); the selected card gets a 2px orange border and a light orange background.

**On-screen copy**
- Only show text the user **does something with**. No paragraphs explaining business logic; extra info goes in a tooltip, 1–2 sentences max.
- Call it the **agent**, never "assistant".
- Don't repeat numbers (if the select reads "Everyone · 280", don't also show "280 people").

## States and feedback

Every component and every data block covers these states:

| State | How |
|---|---|
| Loading | `SectionLoader` + `useSectionLoad`: a skeleton shaped like the real block → after 1s a status box with a progress bar and percent (countable work shows real progress "1,500 / 4,675 contacts"; otherwise an estimate marked "~" that never reaches 100% before the data arrives) → after 15s an Alert with Retry. Each block loads on its own. Route changes show `RouteProgress` |
| Empty | One sentence saying why it's empty + one next action |
| Error | A `destructive` Alert in place of that block + Retry; other blocks stay |
| Saved, deleted | Short toast; reversible actions get Undo in the toast |
| Delete, hard-to-undo actions | `AlertDialog` to confirm |
| Leaving with unsaved work | `useLeaveGuard` (`lib/leave-guard.ts`) + `UnsavedDialog`: catches links, the top-bar ← button, the browser Back button and closing the tab. Button order: **Discard** alone on the left; **Keep editing** + **Save** on the right |
| Costs credits (unlock, export) | Show the price first: the button says it ("Unlock · 5 credits"), the confirm dialog shows only **Cost**. Not enough credits: "Not enough credits" + Top up link, nothing charged |
| Long jobs (import, send batch, export) | Show progress; the dialog can't be closed while running; summarise the result when done |

## Dialogs and forms

- `Dialog` radius 12px with a dimmed backdrop. Footer: Cancel (`outline`) left of the main button. Dialogs must fit a 1366×768 screen; long content scrolls inside.
- Multi-step dialogs (New campaign, New template → pick a Design): the main button names the next step ("Choose design →"), there is a ← Back, and entered data is kept.
- Forms: label above the input; errors show a `destructive` border + a sentence right under the field saying how to fix it; validate on submit. Optional fields say "(optional)".
- Inputs are transparent on the page or card background with an `input` border. No heavy grey fills on inputs or status blocks.

## Differences from the current app (know these when migrating)

- **Sending starts only from a template** (Template → Send batch). Leads › Unlocked has **Export**, not Send batch.
- **New batch › Recipients:** the "Unlocked companies | Self-upload" tabs share a row with search and Filter; no filters pre-filled from the campaign; no Sent / Not sent split (note: the current app's server skips companies that already got this template); quota and send time are on the Review step.
- **Template editor:** the email is visible on the first screen; Design edits text directly on the email, no inspector column; drag to reorder blocks, "+" between blocks; Letter uses TipTap. "Write with Saella" is a dialog (replaces the Agent button).
- **Top up credits:** only 4 packs, 500 / 1,000 / 2,000 / 5,000, priced per plan (Free $0.10, Starter $0.09, Business $0.08, Expansion $0.07 per credit); Free has no 5,000 pack.
- **Agent:** a floating chat window at the bottom right, resizable, size remembered per browser.

## Before merging a screen

- [ ] Only token classes; dark mode correct.
- [ ] All states: loading, empty, error, disabled.
- [ ] No horizontal scroll at 1440 and 1366; dialogs fit 1366×768.
- [ ] Every table scrolls inside its frame with a sticky header.
- [ ] One solid orange button per page.
- [ ] Keyboard focus visible; icon buttons have an `aria-label`.
- [ ] `npm run typecheck` and `npm run lint` clean; no console errors or hydration warnings.
