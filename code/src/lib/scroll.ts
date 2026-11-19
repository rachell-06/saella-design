// Inner scroll heights by region type (DESIGN.md "Vùng cuộn bên trong"). One place for every
// inner scroller so tables, dialog lists, popover lists and sheets stay the same height across screens. The browser's
// own scrollbar stays: no ScrollArea, no restyled scrollbars. The page itself keeps scrolling as before.
// Full literal strings on purpose: Tailwind only generates classes it can read whole in the source.

/** Table on a page: never taller than the viewport minus the page frame, never under 20rem. The Table primitive
 *  applies it to its own container, so a plain <Table> already follows it. */
export const SCROLL_TABLE = "max-h-[max(20rem,calc(100svh-14rem))]";

/** On the parent of a <Table> in a full-height flex column (Leads, TableFrame): the table's container takes the
 *  space left in the viewport; only the rows scroll, under the sticky header. */
export const SCROLL_TABLE_FILL =
  "*:data-[slot=table-container]:min-h-0 *:data-[slot=table-container]:flex-1 *:data-[slot=table-container]:overflow-auto";

/** On the parent of a <Table> inside a card on a detail page (report tabs, other batches): one height tied to the
 *  viewport; the table's own container scrolls under its sticky header. */
export const SCROLL_CARD_TABLE = "*:data-[slot=table-container]:max-h-[min(60vh,40rem)]";

/** Same height as SCROLL_CARD_TABLE, for a box that scrolls the table itself (sticky first column, load-more on
 *  scroll): the box scrolls both ways and the table's container stops scrolling so the header sticks to the box. */
export const SCROLL_CARD_TABLE_BOX =
  "max-h-[min(60vh,40rem)] overflow-auto overscroll-contain *:data-[slot=table-container]:max-h-none *:data-[slot=table-container]:overflow-visible";

/** A list inside a dialog (people left out, resend, schedule runs): about 40% of the viewport, clamped. */
export const SCROLL_DIALOG_LIST = "max-h-[clamp(18rem,40vh,26rem)] overflow-y-auto overscroll-contain";

/** On the parent of a <Table> inside a dialog: same height as SCROLL_DIALOG_LIST on the table's container. */
export const SCROLL_DIALOG_TABLE =
  "*:data-[slot=table-container]:max-h-[clamp(18rem,40vh,26rem)] *:data-[slot=table-container]:overscroll-contain";

/** The scrolling list of a popover, dropdown, combobox, multi-select or tree-select: at most 320px. */
export const SCROLL_POPOVER_LIST = "max-h-80 overflow-y-auto overscroll-contain";

/** Sheet body between a fixed header and footer (SheetContent is a flex column): only the body scrolls. */
export const SCROLL_SHEET_BODY = "min-h-0 flex-1 overflow-y-auto";
