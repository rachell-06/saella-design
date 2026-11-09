import { type Campaign, COUNTRIES, INDUSTRIES, type Template, CURRENT_USER } from "@/lib/mock/campaigns";

// 60 fictional campaigns for the long-list preview (?state=many): 18 active, 5 not started, 37 ended.
// Generated from fixed formulas (no randomness) so screenshots stay stable. Numbers are illustrative.

const SEGMENTS = [
  "Hotel buyers",
  "Restaurant groups",
  "Distributors",
  "Architects",
  "Interior designers",
  "Retail chains",
  "Property developers",
  "Coffee shops",
  "Spa and wellness",
  "Event venues",
];

// Deterministic 0..1 value per (a, b).
const seeded = (a: number, b: number) => (((a + 1) * 9301 + (b + 1) * 49297) % 233280) / 233280;

const pad = (n: number) => String(n).padStart(2, "0");

function templatesFor(i: number, ended: boolean, notStarted: boolean): Template[] {
  const count = i === 2 ? 12 : 1 + Math.floor(seeded(i, 0) * 4);
  return Array.from({ length: count }, (_, j) => {
    const id = `m${i}t${j}`;
    const sent = !notStarted && seeded(i, j + 1) > 0.15;
    const recipients = sent ? 40 + Math.floor(seeded(i, j + 2) * 2400) : 0;
    const delivered = Math.round(recipients * (0.95 + seeded(i, j + 3) * 0.04));
    const day = ended ? 1 + Math.floor(seeded(i, j + 4) * 27) : 10 + Math.floor(seeded(i, j + 4) * 17);
    const month = ended ? 3 + (i % 6) : 10;
    // Every third template is the follow-up of the one before it.
    const followUp: Template["followUp"] =
      j % 3 === 1 ? { of: `m${i}t${j - 1}`, trigger: j % 2 ? "no_engagement" : "opened", delayHours: 72 } : undefined;
    return {
      id,
      name: followUp ? `Follow-up – ${SEGMENTS[i % SEGMENTS.length].toLowerCase()} ${j}` : `Intro ${j + 1} – catalog`,
      owner: j % 4 === 3 ? "minh@northwind-ceramics.com" : CURRENT_USER,
      shared: j % 8 === 3,
      status: ended || notStarted || seeded(i, j + 5) < 0.2 ? "inactive" : "active",
      followUp,
      recipients,
      delivered,
      opens: Math.round(delivered * (0.2 + seeded(i, j + 6) * 0.35)),
      clicks: Math.round(delivered * (0.02 + seeded(i, j + 7) * 0.08)),
      bounces: recipients - delivered,
      unsubs: Math.round(delivered * seeded(i, j + 8) * 0.01),
      lastSent: sent ? `2026-${pad(month)}-${pad(day)}T02:00:00Z` : undefined,
    } satisfies Template;
  });
}

export const manyCampaigns: Campaign[] = Array.from({ length: 60 }, (_, i) => {
  const notStarted = i >= 18 && i < 23;
  const ended = i >= 23;
  const country = COUNTRIES[i % COUNTRIES.length];
  const round = Math.floor(i / (SEGMENTS.length * 1)) + 1;
  return {
    id: `m${i}`,
    name: `${SEGMENTS[i % SEGMENTS.length]} – ${country}${round > 1 ? ` (${round})` : ""}`,
    startsOn: notStarted ? `2027-${pad(1 + (i % 3))}-01` : ended ? `2026-${pad(2 + (i % 6))}-01` : "2026-09-01",
    endsOn: notStarted ? `2027-${pad(4 + (i % 3))}-30` : ended ? `2026-${pad(3 + (i % 6))}-28` : i % 3 ? "2026-12-31" : undefined,
    countries: [country],
    industries: [INDUSTRIES[i % INDUSTRIES.length]],
    templates: templatesFor(i, ended, notStarted),
  };
});
