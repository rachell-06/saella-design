// Company registry mock (PRD-04 Company Data Hub + live app src/lib/companies/*).
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
  /** Branch office addresses, folded under the head office row (PRD Master v1.6.8: branches are not listed as
   *  companies of their own; live app shows them on the HQ row). */
  branches?: string[];
  /** Other business lines registered besides the main one (live app CompaniesTable "Sub industries"). Plain
   *  names; not part of the industry filter. */
  subIndustries: string[];
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
// Registries list many secondary business lines; Vietnamese companies often register dozens.
const SUB_INDUSTRIES = [
  "Wholesale of food", "Wholesale of beverages", "Retail of furniture", "Retail of lighting", "Retail of textiles",
  "Retail of household appliances", "Wholesale of machinery", "Wholesale of electrical equipment",
  "Wholesale of metals", "Wholesale of timber", "Wholesale of paint & glass", "Wholesale of sanitary ware",
  "Freight transport by road", "Warehousing & storage", "Cargo handling", "Courier activities",
  "Short-term accommodation", "Event catering", "Beverage serving", "Travel agency",
  "Advertising", "Market research", "Management consultancy", "Engineering consultancy",
  "Landscape care", "Building cleaning", "Electrical installation", "Plumbing & heating installation",
  "Plastering", "Joinery installation", "Floor & wall covering", "Painting & glazing",
  "Manufacture of ceramic tiles", "Manufacture of glass products", "Manufacture of furniture",
  "Manufacture of textiles", "Printing", "Computer programming", "Data processing & hosting",
  "Renting of machinery", "Renting of vehicles", "Real estate agency", "Training & tutoring",
  "Repair of machinery", "Import & export trading",
];
/** Own seed per company so adding this field leaves every other generated value unchanged. */
function subIndustriesFor(i: number) {
  const s = rng(7000 + i);
  const roll = s();
  const n = roll < 0.55 ? 0 : roll < 0.85 ? 1 + Math.floor(s() * 5) : roll < 0.95 ? 6 + Math.floor(s() * 10) : 20 + Math.floor(s() * 23);
  const pool = [...SUB_INDUSTRIES];
  const out: string[] = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(s() * pool.length), 1)[0]);
  return out;
}
const pick = <T,>(xs: readonly T[]) => xs[Math.floor(r() * xs.length)];
const codes = ISIC.flatMap((g) => g.options.map((o) => o.value));
// Hotels and ceramics-related industries are weighted up: they are what the demo workspace sells to.
const weighted = [...codes, "5510", "5510", "5510", "4663", "4663", "7110", "7410", "4330", "5610"];

const generated: Company[] = Array.from({ length: 240 }, (_, i) => {
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
    branches:
      country === "VN" && r() < 0.06
        ? CITY.VN.filter((c) => c !== city).slice(0, 1 + (i % 3)).map((c, j) => `${12 + j * 31} ${j % 2 ? "Le Duan Street" : "Tran Phu Street"}, ${c}`)
        : undefined,
    subIndustries: subIndustriesFor(i),
  };
});

// Vietnamese hotels and restaurants with a published email: the demo's first campaign targets them, so a
// batch to unlocked companies has a sensible audience. Own seed and ids after the generated ones, so every generated
// row stays unchanged.
// Names never repeat one already in the registry (two "Red Resort" rows read as a duplicate).
const usedNames = new Set(generated.map((c) => c.name));
function uniqueBase(j: number, isic: string) {
  for (let k = 0; k < NAME_A.length * 2; k++) {
    const base = `${NAME_A[(j * 7 + 3 + k) % NAME_A.length]} ${NAME_B[isic][(j + Math.floor(k / NAME_A.length)) % 2]}`;
    if (!usedNames.has(`${base} ${FORM.VN}`)) {
      usedNames.add(`${base} ${FORM.VN}`);
      return base;
    }
  }
  return `${NAME_A[j % NAME_A.length]} ${NAME_B[isic][0]} ${j + 1}`;
}
const HOSPITALITY_VN: Company[] = Array.from({ length: 14 }, (_, j) => {
  const s = rng(9100 + j);
  const isic = j % 3 === 2 ? "5610" : "5510";
  const base = uniqueBase(j, isic);
  const city = CITY.VN[j % CITY.VN.length];
  const domain = `${base.toLowerCase().replace(/[^a-z]+/g, "")}.vn`;
  const year = 2000 + Math.floor(s() * 25);
  return {
    id: `co${241 + j}`,
    name: `${base} ${FORM.VN}`,
    registrationNo: `${Math.floor(100000000 + s() * 899999999)}`,
    country: "VN",
    isic,
    status: j % 7 === 5 ? "inactive" : "active",
    incorporatedOn: `${year}-${String(1 + (j % 12)).padStart(2, "0")}-${String(1 + Math.floor(s() * 27)).padStart(2, "0")}`,
    city,
    address: `${10 + j * 13} ${j % 2 ? "Le Loi Street" : "Nguyen Hue Boulevard"}, ${city}`,
    representative: j % 5 === 1 ? undefined : PEOPLE[(j * 5) % PEOPLE.length],
    email: `${["sales", "info", "purchasing", "contact"][j % 4]}@${domain}`,
    phone: s() < 0.7 ? `+84 ${Math.floor(1000000 + s() * 8999999)}` : undefined,
    website: s() < 0.6 ? `www.${domain}` : undefined,
    fdi: false,
    subIndustries: subIndustriesFor(241 + j),
  };
});

export const companies: Company[] = [...generated, ...HOSPITALITY_VN];

/**
 * Registry companies the demo workspace already saved to Contacts (hotels in Vietnam, distributors, Singapore
 * architects: the tagged groups of the contacts mock), for the New / Already saved split. The
 * contacts mock uses other company names, so the match is seeded here; companies saved from this screen later match
 * by company name or email (PRD Contacts BR-RULE-CON-05). Backend: flag each row (or count) against the contact book.
 */
export const SEEDED_SAVED: ReadonlySet<string> = new Set(
  companies.flatMap((c, i) => {
    const saved =
      (c.country === "VN" && c.isic === "5510") ||
      (c.country !== "VN" && c.country !== "SG" && ["4663", "4649", "4752"].includes(c.isic)) ||
      (c.country === "SG" && ["7110", "7410"].includes(c.isic));
    return saved && c.email && i % 3 !== 0 ? [c.id] : [];
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

// Masking as the registry API does it before unlock (PRD Contacts AC-CON-B-02, BR-RULE-CON-01; live app
// lib/companies/mask.ts): a fixed run of 5 stars whatever the length, so the mask never gives the length away.
// Email keeps the mailbox's first and last letter and the domain; phone keeps the country code and last 2 digits;
// website keeps the first letter and the TLD.
const STARS = "*****";
function maskMiddle(s: string, keepStart = 1, keepEnd = 1) {
  if (s.length <= keepStart + keepEnd) return STARS;
  return s.slice(0, keepStart) + STARS + (keepEnd > 0 ? s.slice(s.length - keepEnd) : "");
}
/** "sales@lotushotel.vn" → "s*****s@lotushotel.vn" */
export function maskEmail(e: string) {
  const at = e.lastIndexOf("@");
  if (at <= 0) return maskMiddle(e);
  return `${maskMiddle(e.slice(0, at))}@${e.slice(at + 1)}`;
}
/** "+84 1234567" → "+84*****67" */
export function maskPhone(p: string) {
  const digits = p.replace(/\D/g, "");
  const body = maskMiddle(digits, 2, 2);
  return p.startsWith("+") ? `+${body}` : body;
}
/** "www.lotushotel.vn" → "l*****.vn" */
export function maskWebsite(w: string) {
  const host = w.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "").split(/[/?#]/)[0].replace(/^www\./i, "").toLowerCase();
  const [name, ...tld] = host.split(".");
  return tld.length ? `${maskMiddle(name, 1, 0)}.${tld.join(".")}` : maskMiddle(host, 1, 0);
}

export function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Deepest row the registry search serves (live app COMPANY_MAX_OFFSET; PRD Contacts BR-RULE-CON-03,
 *  AC-CON-B-03): past it the request is refused, so paging stops there and the user narrows the filters. */
export const MAX_OFFSET = 5_000;
