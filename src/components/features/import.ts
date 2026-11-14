import { type Contact, isInBook } from "@/lib/mock/contacts";

// Contact import logic (PRD Contacts US-CON-I + live app import route, CON-SEQ-004), kept apart from the
// dialog so the rules read in one place:
// - files over 5 MB are refused before parsing (BR-RULE-CON-06, EC-CON-04);
// - only the first 1,000 rows are read, with a note (repo behaviour; AC-CON-I-03 says refuse, see report);
// - headers match case-insensitively; unknown columns are ignored (EC-CON-03); Email is the only required field;
// - blank rows are skipped, bad emails are reported, repeats of email + company inside the file collapse (EC-CON-05);
// - rows already in the contact book update in place instead of duplicating (AC-CON-I-04), or are skipped if the user
//   picks "Skip" (duplicate rule chosen before importing);
// - rows with errors are listed by row number and can be downloaded as a CSV with an Error column.

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_ROWS = 1000;

export type FieldKey = "email" | "firstName" | "lastName" | "fullName" | "company" | "position" | "phone" | "skip";

export const FIELDS: { key: FieldKey; label: string }[] = [
  { key: "email", label: "Email" },
  { key: "firstName", label: "First name" },
  { key: "lastName", label: "Last name" },
  { key: "fullName", label: "Full name" },
  { key: "company", label: "Company" },
  { key: "position", label: "Position" },
  { key: "phone", label: "Phone" },
  { key: "skip", label: "Don't import" },
];

const ALIASES: Record<Exclude<FieldKey, "skip">, string[]> = {
  email: ["email", "e-mail", "email address", "mail"],
  firstName: ["first name", "firstname", "given name"],
  lastName: ["last name", "lastname", "surname", "family name"],
  fullName: ["name", "full name", "contact name", "contact"],
  company: ["company", "company name", "organization", "organisation", "business"],
  position: ["position", "title", "job title", "role"],
  phone: ["phone", "phone number", "mobile", "tel"],
};

export function guessField(header: string): FieldKey {
  const h = header.trim().toLowerCase();
  for (const [key, names] of Object.entries(ALIASES)) if (names.includes(h)) return key as FieldKey;
  return "skip";
}

/** Small CSV reader: quoted fields, escaped quotes, commas or semicolons, CRLF. */
export function parseCsv(text: string): string[][] {
  const delim = (text.split("\n")[0].match(/;/g)?.length ?? 0) > (text.split("\n")[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delim) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

export const TEMPLATE_HEADERS = ["First name", "Last name", "Email", "Company", "Position", "Phone"];

/** The downloadable template (AC-CON-I-01): headers the parser knows, plus one sample row that is skipped. */
export function templateCsv() {
  return `${TEMPLATE_HEADERS.join(",")}\nSample,Row,sample@example.com,Example Co,Buyer,+84 28 0000000\n`;
}

/** Sample file for the preview, so the flow can be tried without a file at hand. Includes every edge case. */
export const SAMPLE_FILE = {
  name: "bangkok-fair-leads-2026.csv",
  text: [
    "Name,E-mail,Company,Job title,Phone,Booth notes",
    "Ploy Srisuk,ploy@siamhomeliving.co.th,Siam Home Living,Buyer,+66 2 555 0101,Asked for price list",
    "Niran Wongsa,niran@chaoprayatiles.co.th,Chao Praya Tiles,Owner,,",
    "Somchai Rahman,somchai@lotusbaytrading.co.th,Lotus Bay Trading,Sales manager,+66 2 555 0177,",
    "Mei Ling Tan,meiling@orchidinteriors.sg,Orchid Interiors,Interior designer,,Wants samples",
    "Aisyah Putri,aisyah@bluereefsupply,Blue Reef Supply,Buyer,,",
    "Ploy Srisuk,ploy@siamhomeliving.co.th,Siam Home Living,Buyer,+66 2 555 0101,Second visit",
    ",,,,,",
    "Farid Abdullah,farid.abdullah@goldenbamboo.my,Golden Bamboo Building Supply,Purchasing director,+60 3 555 0190,",
    "Joy Santos,joy.santos@harborlight.ph,Harbor Light Interiors,Owner,,",
    "Wei Lim,wei.lim@jadehillmaterials.my,Jade Hill Materials,Category manager,,",
    "Hana Vu,not-an-email,Sunrise Home,Buyer,,",
    "Linh Dao,,Saigon Stone Works,Buyer,,Card only",
    "Carlo Reyes,carlo@coralpointresort.ph,Coral Point Resort,Purchasing manager,+63 2 555 0133,",
    // Already in "Bangkok fair leads" (l2), so uploading there shows the duplicate rule at work.
    "Rizal Srisuk,rizal.srisuk@orchidtrading.co.th,Orchid Trading,Owner,,Met again at the fair",
    "Mai Ong,mai.ong@greenlagoontrading.co.th,Green Lagoon Trading,Showroom manager,+66 2 555 0142,",
  ].join("\n"),
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type RowVerdict = "new" | "update" | "invalid" | "repeat" | "blank";
/** Why an invalid row can't be imported. */
export type RowIssue = "missing_email" | "bad_email";
export const ISSUE_LABEL: Record<RowIssue, string> = {
  missing_email: "Email is missing",
  bad_email: "Not a valid email address",
};
export type PreviewRow = { line: number; contact: Omit<Contact, "id" | "addedOn">; verdict: RowVerdict; issue?: RowIssue };

export function buildPreview(rows: string[][], mapping: FieldKey[], tags: string[]) {
  const body = rows.slice(1);
  const truncated = body.length > MAX_ROWS;
  const seen = new Set<string>();
  const out: PreviewRow[] = body.slice(0, MAX_ROWS).map((cells, i) => {
    const get = (k: FieldKey) => {
      const idx = mapping.indexOf(k);
      return idx >= 0 ? (cells[idx] ?? "").trim() : "";
    };
    const full = get("fullName");
    const [fFirst, ...fRest] = full.split(/\s+/);
    const contact = {
      firstName: get("firstName") || fFirst || "",
      lastName: get("lastName") || fRest.join(" "),
      email: get("email").toLowerCase(),
      company: get("company"),
      position: get("position") || undefined,
      phone: get("phone") || undefined,
      tags,
    };
    const line = i + 2;
    if (cells.every((c) => !c.trim())) return { line, contact, verdict: "blank" as const };
    // The template's sample row is skipped like a blank one.
    if (contact.email === "sample@example.com") return { line, contact, verdict: "blank" as const };
    if (!contact.email) return { line, contact, verdict: "invalid" as const, issue: "missing_email" as const };
    if (!EMAIL_RE.test(contact.email)) return { line, contact, verdict: "invalid" as const, issue: "bad_email" as const };
    const key = `${contact.email}|${contact.company.toLowerCase()}`;
    if (seen.has(key)) return { line, contact, verdict: "repeat" as const };
    seen.add(key);
    return { line, contact, verdict: isInBook(contact) ? ("update" as const) : ("new" as const) };
  });
  const count = (v: RowVerdict) => out.filter((r) => r.verdict === v).length;
  return {
    rows: out,
    truncated,
    totalRows: body.length,
    counts: { new: count("new"), update: count("update"), invalid: count("invalid"), repeat: count("repeat"), blank: count("blank") },
  };
}

export type Preview = ReturnType<typeof buildPreview>;

const csvCell = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** The rows that failed, as they were in the file, plus Row and Error columns, so they can be fixed and re-uploaded. */
export function errorCsv(rows: string[][], preview: Preview) {
  const lines = [["Row", ...rows[0], "Error"]];
  for (const r of preview.rows) if (r.issue) lines.push([String(r.line), ...(rows[r.line - 1] ?? []), ISSUE_LABEL[r.issue]]);
  return `${lines.map((l) => l.map(csvCell).join(",")).join("\n")}\n`;
}
