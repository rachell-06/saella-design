import { cn } from "@/lib/utils";

// Domain health score, ported from the live app (Repo origin/development src/lib/email/health.ts scoreHealth +
// HEALTH_THRESHOLDS, src/components/email/EmailDomainHealth.tsx HealthCircle). One rule for the ring, the status
// badge and every coloured number on Settings › Sending / Domain.
// - Bounce: warning from 5%, danger from 10% (bounced / sends). Complaints: warning from 0.1%, danger from 0.3%
//   (complained / delivered). Danger is 0.3% here, the pause level in the PRD batch report; the live app has 0.5%. Delivery: warning under 90%, never danger. Under 20 sends the rates are "unknown".
// - Score starts at 100; with enough sends: bounce danger -45 / warning -20, complaint danger -45 / warning -25,
//   delivery warning -10; config: unverified -40, no SPF -8, DMARC missing -8. Clamped 0-100.
// - Level = worst of bounce, complaint, delivery, config; ring colour: good success, warning warning, danger
//   destructive, unknown neutral.
// Candidate to move to components/saella if another screen shows a health ring.

export const HEALTH_THRESHOLDS = {
  bounce: { warn: 0.05, danger: 0.1 },
  complaint: { warn: 0.001, danger: 0.003 },
  delivery: { warn: 0.9 },
  minSample: 20,
} as const;

export type HealthLevel = "good" | "warning" | "danger" | "unknown";
export type HealthMetrics = { sends: number; delivered: number; bounced: number; complained: number };
export type HealthConfig = { verified: boolean; spf: boolean; dmarc: boolean | null };

export type HealthReport = {
  level: HealthLevel;
  score: number;
  enough: boolean;
  rates: { bounce: number; complaint: number; delivery: number };
  dimensions: { bounce: HealthLevel; complaint: HealthLevel; delivery: HealthLevel; config: HealthLevel };
};

const RANK: Record<HealthLevel, number> = { unknown: 0, good: 1, warning: 2, danger: 3 };
const worst = (levels: HealthLevel[]) => levels.reduce((a, l) => (RANK[l] > RANK[a] ? l : a), "unknown" as HealthLevel);

function assess(rate: number, enough: boolean, warn: number, danger?: number): HealthLevel {
  if (!enough) return "unknown";
  if (danger !== undefined && rate >= danger) return "danger";
  return rate >= warn ? "warning" : "good";
}

export function scoreHealth(m: HealthMetrics, cfg: HealthConfig): HealthReport {
  const sends = Math.max(m.sends, 0);
  const deliveredDenom = m.delivered || sends || 1;
  const bounceRate = sends > 0 ? m.bounced / sends : 0;
  const complaintRate = m.complained / deliveredDenom;
  const deliveryRate = sends > 0 ? m.delivered / sends : 0;
  const enough = sends >= HEALTH_THRESHOLDS.minSample;

  const bounce = assess(bounceRate, enough, HEALTH_THRESHOLDS.bounce.warn, HEALTH_THRESHOLDS.bounce.danger);
  const complaint = assess(complaintRate, enough, HEALTH_THRESHOLDS.complaint.warn, HEALTH_THRESHOLDS.complaint.danger);
  const delivery: HealthLevel = !enough ? "unknown" : deliveryRate < HEALTH_THRESHOLDS.delivery.warn ? "warning" : "good";
  const config: HealthLevel = !cfg.verified ? "danger" : !cfg.spf || cfg.dmarc === false ? "warning" : "good";

  let score = 100;
  if (enough) {
    if (bounce === "danger") score -= 45;
    else if (bounce === "warning") score -= 20;
    if (complaint === "danger") score -= 45;
    else if (complaint === "warning") score -= 25;
    if (delivery === "warning") score -= 10;
  }
  if (!cfg.verified) score -= 40;
  if (!cfg.spf) score -= 8;
  if (cfg.dmarc === false) score -= 8;
  score = Math.max(0, Math.min(100, score));

  return {
    level: worst([bounce, complaint, delivery, config]),
    score,
    enough,
    rates: { bounce: bounceRate, complaint: complaintRate, delivery: deliveryRate },
    dimensions: { bounce, complaint, delivery, config },
  };
}

const ARC: Record<HealthLevel, string> = {
  good: "stroke-success",
  warning: "stroke-warning",
  danger: "stroke-destructive",
  unknown: "stroke-muted-foreground",
};
const LABEL: Record<HealthLevel, string> = { good: "Healthy", warning: "At risk", danger: "Critical", unknown: "Not enough sends to score" };

/** The score as a ring (live app HealthCircle): arc drawn to the exact score, number centred. */
export function HealthRing({ report, size = 56, className }: { report: HealthReport; size?: number; className?: string }) {
  const stroke = Math.max(3, Math.round(size / 11));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const none = report.level === "unknown";
  return (
    <span
      role="img"
      aria-label={none ? LABEL.unknown : `Health score ${report.score} of 100, ${LABEL[report.level].toLowerCase()}`}
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-muted" />
        {!none && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - report.score / 100)}
            className={ARC[report.level]}
          />
        )}
      </svg>
      <span
        className="absolute font-medium tabular-nums"
        style={{ fontSize: size * 0.32 }}
        aria-hidden
      >
        {none ? "–" : report.score}
      </span>
    </span>
  );
}

/** DNS posture of a domain row for the score: verified, SPF and DMARC records found (a record not listed counts as fine). */
export function configOf(d: { status: string; records: { purpose: string; ok: boolean }[] } | null): HealthConfig {
  if (!d) return { verified: true, spf: true, dmarc: true };
  const ok = (purpose: string) => d.records.find((x) => x.purpose === purpose)?.ok ?? true;
  return { verified: d.status === "verified", spf: ok("SPF"), dmarc: ok("DMARC") };
}
