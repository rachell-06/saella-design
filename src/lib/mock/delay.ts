// Simulated slow mode for the loading demo. The mock data is computed at once; a page reads
// ?slow= and hands each section a delay so the waiting stages can be seen and tried:
//   ?slow=1     every section waits (KPIs ~1.5s, chart ~4s, table ~8s): skeleton, then the status line after 3s.
//   ?slow=fail  as ?slow=1, but one section fails or never answers on the first try; Retry then succeeds.
// No ?slow: no delay, the page loads as before.

export type SlowMode = "off" | "slow" | "fail";

export function slowModeOf(value: string | null): SlowMode {
  if (value === "fail") return "fail";
  return value ? "slow" : "off";
}

/** Realistic waits per kind of section in slow mode, in ms. */
export const SLOW_DELAY = {
  /** Counts and KPIs: one aggregate query. */
  quick: 1500,
  /** A chart: aggregated per day or week. */
  chart: 4000,
  /** A table of rows: the heaviest read. */
  table: 8000,
} as const;

export type SlowKind = keyof typeof SLOW_DELAY;

/** The delay for one section, 0 when slow mode is off. */
export function slowDelay(mode: SlowMode, kind: SlowKind): number {
  return mode === "off" ? 0 : SLOW_DELAY[kind];
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
