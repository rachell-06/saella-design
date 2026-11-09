// Company registry mock (PRD-04 Company Data Hub + live app src/lib/companies/*, 2026-10-28).
// Industry is the country-independent ISIC class (4-digit), grouped by ISIC section (live app:
// lib/companies/industry-dict.ts ISIC_SECTION_LABELS); country is ISO-2 from the served options
// (lib/companies/serving.ts COMPANY_COUNTRY_OPTIONS); status is one of the 5 normalised buckets (STATUS_BUCKETS).
// Only a subset of ISIC classes is mocked. Companies are fictional and generated deterministically.

import { COUNTRIES, type CountryCode, TODAY, countryLabel } from "@/lib/mock/constants";
export { COUNTRIES, type CountryCode, TODAY, countryLabel };

export const STATUSES = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "suspended", label: "Suspended" },
  { value: "ceased", label: "Ceased" },
  { value: "unknown", label: "Unknown" },
] as const;
export type CompanyStatus = (typeof STATUSES)[number]["value"];

export type IsicGroup = { value: string; label: string; options: { value: string; label: string }[] };

export const ISIC: IsicGroup[] = [
  {
    value: "C",
    label: "Manufacturing",
    options: [
      { value: "1079", label: "Other food products" },
      { value: "1410", label: "Apparel" },
      { value: "2220", label: "Plastics products" },
      { value: "2392", label: "Clay building materials" },
      { value: "2393", label: "Porcelain & ceramic products" },
    ],
  },
  {
    value: "F",
    label: "Construction",
    options: [
      { value: "4100", label: "Building construction" },
      { value: "4330", label: "Building completion & finishing" },
    ],
  },
  {
    value: "G",
    label: "Wholesale & retail trade",
    options: [
      { value: "4649", label: "Wholesale of household goods" },
      { value: "4663", label: "Wholesale of construction materials" },
      { value: "4752", label: "Retail of hardware & paint" },
    ],
  },
  {
    value: "H",
    label: "Transportation & storage",
    options: [
      { value: "5210", label: "Warehousing & storage" },
      { value: "5229", label: "Freight forwarding" },
    ],
  },
  {
    value: "I",
    label: "Accommodation & food service",
    options: [
      { value: "5510", label: "Hotels & resorts" },
      { value: "5610", label: "Restaurants" },
    ],
  },
  { value: "J", label: "Information & communication", options: [{ value: "6201", label: "Software development" }] },
  { value: "L", label: "Real estate", options: [{ value: "6810", label: "Real estate, own property" }] },
  {
    value: "M",
    label: "Professional, scientific & technical",
    options: [
      { value: "7110", label: "Architecture & engineering" },
      { value: "7410", label: "Interior & specialised design" },
    ],
  },
];

const ISIC_BY_CODE = new Map(ISIC.flatMap((g) => g.options.map((o) => [o.value, { ...o, section: g }] as const)));
export const isicLabel = (code: string) => ISIC_BY_CODE.get(code)?.label ?? code;
export const isicSection = (code: string) => ISIC_BY_CODE.get(code)?.section;

export type Company = {
  id: string;
  name: string;
  registrationNo: string;
  country: CountryCode;
  isic: string;
  status: CompanyStatus;
  incorporatedOn: string;
  city: string;
  address: string;
  representative?: string;
  /** The registry has the address; the full value is masked until unlocked (PRD-04 CO-UNLOCK-001). */
  email?: string;
  phone?: string;
  website?: string;
  fdi: boolean;
  branchOf?: string;
};

function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NAME_A = ["Lotus", "Mekong", "Jade", "Golden Palm", "Silver Bay", "Coral", "Orchid", "Harbor", "Sunrise", "Blue Lagoon", "Bamboo", "Pearl River", "Red Clay", "Saffron", "Monsoon", "Evergreen", "Lantern", "Tidewater", "Kampong", "Merlion"];
const NAME_B: Record<string, string[]> = {
  "1079": ["Foods", "Kitchen"],
  "1410": ["Garments", "Apparel"],
  "2220": ["Plastics", "Polymer"],
  "2392": ["Brickworks", "Clay Products"],
  "2393": ["Ceramics", "Porcelain"],
  "4100": ["Builders", "Construction"],
  "4330": ["Fit-out", "Interiors Contracting"],
  "4649": ["Home Goods", "Housewares Trading"],
  "4663": ["Building Supply", "Materials Trading"],
  "4752": ["Hardware", "Home Centre"],
  "5210": ["Warehousing", "Logistics Park"],
  "5229": ["Freight", "Forwarding"],
  "5510": ["Hotel", "Resort"],
  "5610": ["Restaurant Group", "Dining"],
  "6201": ["Software", "Digital"],
  "6810": ["Properties", "Land"],
  "7110": ["Architects", "Engineering"],
  "7410": ["Design Studio", "Interior Design"],
};
const FORM: Record<CountryCode, string> = { SG: "Pte. Ltd.", VN: "Co., Ltd.", MY: "Sdn. Bhd.", ID: "PT", PH: "Inc." };
const CITY: Record<CountryCode, string[]> = {
  SG: ["Singapore"],
  VN: ["Ho Chi Minh City", "Hanoi", "Da Nang", "Hai Phong"],
  MY: ["Kuala Lumpur", "Penang", "Johor Bahru"],
  ID: ["Jakarta", "Surabaya", "Bali"],
  PH: ["Manila", "Cebu", "Davao"],
};
const TLD: Record<CountryCode, string> = { SG: "sg", VN: "vn", MY: "my", ID: "co.id", PH: "ph" };
const PEOPLE = ["Nguyen Van An", "Tran Thi Mai", "Le Quang Huy", "Tan Wei Ming", "Lim Siew Ling", "Ahmad Farid", "Siti Aisyah", "Budi Santoso", "Maria Santos", "Jose Reyes", "Pham Thu Ha", "Ong Kai Wen"];

const r = rng(20261027);
const pick = <T,>(xs: readonly T[]) => xs[Math.floor(r() * xs.length)];
const codes = ISIC.flatMap((g) => g.options.map((o) => o.value));
// Hotels and ceramics-related industries are weighted up: they are what the demo workspace sells to.
const weighted = [...codes, "5510", "5510", "5510", "4663", "4663", "7110", "7410", "4330", "5610"];

export const companies: Company[] = Array.from({ length: 240 }, (_, i) => {
  const country = pick(COUNTRIES).code;
  const isic = pick(weighted);
  const base = `${pick(NAME_A)} ${pick(NAME_B[isic] ?? ["Trading"])}`;
  const name = country === "ID" ? `PT ${base}` : `${base} ${FORM[country]}`;
  const year = 1996 + Math.floor(r() * 30);
  const month = 1 + Math.floor(r() * 12);
  const domain = `${base.toLowerCase().replace(/[^a-z]+/g, "")}.${TLD[country]}`;
  // Email coverage differs a lot by country (PRD Master overview, problem 1): SG/MY registries publish none.
  const emailChance = country === "VN" ? 0.6 : country === "SG" || country === "MY" ? 0.25 : 0.4;
  const statusRoll = r();
  const city = pick(CITY[country]);
  return {
    id: `co${i + 1}`,
    name,
    registrationNo: country === "SG" ? `20${String(year).slice(2)}${Math.floor(10000 + r() * 89999)}K` : `${Math.floor(100000000 + r() * 899999999)}`,
    country,
    isic,
    status: statusRoll < 0.78 ? "active" : statusRoll < 0.86 ? "inactive" : statusRoll < 0.9 ? "suspended" : statusRoll < 0.97 ? "ceased" : "unknown",
    incorporatedOn: `${year}-${String(month).padStart(2, "0")}-${String(1 + Math.floor(r() * 27)).padStart(2, "0")}`,
    city,
    address: `${1 + Math.floor(r() * 220)} ${pick(["Riverside Road", "Le Loi Street", "Orchard Link", "Jalan Ampang", "Jalan Sudirman", "Ayala Avenue", "Nguyen Hue Boulevard", "Harbour Drive"])}, ${city}`,
    representative: r() < 0.8 ? pick(PEOPLE) : undefined,
    email: r() < emailChance ? `${pick(["info", "sales", "contact", "purchasing"])}@${domain}` : undefined,
    phone: r() < 0.55 ? `+${country === "SG" ? "65" : country === "VN" ? "84" : country === "MY" ? "60" : country === "ID" ? "62" : "63"} ${Math.floor(1000000 + r() * 8999999)}` : undefined,
    website: r() < 0.45 ? `www.${domain}` : undefined,
    fdi: r() < 0.12,
    branchOf: country === "VN" && r() < 0.06 ? "Head office in Ho Chi Minh City" : undefined,
  };
});

/**
 * Registry companies the demo workspace already saved to a list (companyId → listId), for the New / In your
 * lists split (R11, 2026-10-29). The contacts mock uses other company names, so the match is seeded here;
 * companies saved from this screen later match by name. Backend: flag each row (or count) against the workspace's lists.
 */
export const SEEDED_IN_LIST: ReadonlyMap<string, string> = new Map(
  companies.flatMap((c, i): [string, string][] => {
    const list =
      c.country === "VN" && c.isic === "5510"
        ? "l1"
        : c.country !== "VN" && c.country !== "SG" && ["4663", "4649", "4752"].includes(c.isic)
          ? "l3"
          : c.country === "SG" && ["7110", "7410"].includes(c.isic)
            ? "l4"
            : undefined;
    return list && c.email && i % 3 !== 0 ? [[c.id, list]] : [];
  })
);

/** Founded presets (the live app uses a date range; presets read faster, see report). */
export const FOUNDED = [
  { value: "1y", label: "In the last year", min: 0, max: 1 },
  { value: "1-5y", label: "1–5 years ago", min: 1, max: 5 },
  { value: "5-10y", label: "5–10 years ago", min: 5, max: 10 },
  { value: "10y+", label: "Over 10 years ago", min: 10, max: 999 },
] as const;

export function ageYears(iso: string) {
  return (new Date(`${TODAY}T00:00:00`).getTime() - new Date(`${iso}T00:00:00`).getTime()) / (365.25 * 864e5);
}

export { maskEmail } from "@/lib/format";
/** Masked like the registry API does before unlock: last 3 digits. */
export function maskPhone(p: string) {
  return `${p.slice(0, 4)} ••• ••${p.slice(-3)}`;
}

export function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Live app lib/constants.ts EXPORT_MAX_ROWS. */
export const EXPORT_MAX_ROWS = 10_000;
