"use client";

import { SCROLL_DIALOG_TABLE } from "@/lib/scroll";
import { useRef, useState } from "react";
import { ArrowLeftIcon, CircleCheckIcon, DownloadIcon, FileSpreadsheetIcon, TriangleAlertIcon, UploadIcon } from "lucide-react";
import { TagInput } from "@/components/saella/tag-input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { fmt, normalizeTags, tagsOf, upsertContacts, useContactsStore } from "@/lib/mock/contacts";
import {
  FIELDS,
  type FieldKey,
  MAX_FILE_BYTES,
  MAX_ROWS,
  type Preview,
  type RowVerdict,
  SAMPLE_FILE,
  buildPreview,
  errorCsv,
  guessField,
  parseCsv,
  templateCsv,
} from "@/components/features/import";

// Upload contacts: choose file → match columns → review → import. Nothing is written until the review is confirmed
// (PRD Contacts AC-CON-I-02, BR-RULE-CON-06). Tags apply to the whole upload and are never a
// column in the file, so an existing sheet imports unchanged (live app: lib/email/contact-tags.ts).
// Review (PATTERNS 9.15): one summary in the description (new + updated), one warning with the error count + error
// file, then the rows with problems first. People already in the contact book are always
// updated, matched by email + company across the whole book (AC-CON-I-04, BR-RULE-CON-05; live app upserts the
// same way, there is no "skip" choice). Repeats inside the file are merged (EC-CON-05) and marked in the table only.
// The import ends on a result screen New / Updated / Merged / Errors with the error rows as a CSV. Repeats are
// "Merged" on both steps; the error count is said once, in its tile.
// Preview: ?import=review | done opens the dialog on that step with the sample file.
type Step = "file" | "map" | "review" | "done";
/** Rows listed on the review step (problems first); the summary above counts them all. */
const REVIEW_LIMIT = 50;

export type ImportResult = { added: number; updated: number; skipped: number; errors: number };

// Result column: a badge only when the row differs from the normal case ("new" shows nothing, DESIGN.md §2 Bảng).
const VERDICT: Partial<Record<RowVerdict, { label: string; variant: "info" | "destructive" | "outline" }>> = {
  update: { label: "Updates saved contact", variant: "info" },
  invalid: { label: "Invalid email", variant: "destructive" },
  repeat: { label: "Merged", variant: "outline" },
};

export function ImportDialog({
  open,
  onOpenChange,
  preview: openOn,
  onImported,
  onViewContacts,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called once the contacts are written; the dialog then shows the result screen. */
  onImported: (result: ImportResult) => void;
  /** "View contacts" on the result screen, with the upload's tags. Without it the button reads "Done". */
  onViewContacts?: (tags: string[]) => void;
  /** Preview only: start on this step with the sample file loaded. */
  preview?: "review" | "done";
}) {
  const { contacts } = useContactsStore();
  const fileRef = useRef<HTMLInputElement>(null);
  // Preview start (?import=…): the sample file, columns guessed.
  const [sample] = useState(() => {
    if (!openOn) return undefined;
    const parsed = parseCsv(SAMPLE_FILE.text);
    return { rows: parsed, mapping: parsed[0].map(guessField) };
  });
  const [step, setStep] = useState<Step>(openOn ?? "file");
  const [fileName, setFileName] = useState<string | undefined>(sample && SAMPLE_FILE.name);
  const [fileError, setFileError] = useState<string>();
  const [rows, setRows] = useState<string[][]>(sample?.rows ?? []);
  const [mapping, setMapping] = useState<FieldKey[]>(sample?.mapping ?? []);
  const [tags, setTags] = useState<string[]>([]);
  const [showErrors, setShowErrors] = useState(false);
  const [importing, setImporting] = useState(false);
  // Result screen. The "done" preview shows what the sample would give, without writing anything.
  const [result, setResult] = useState<(ImportResult & { tags: string[]; errorFile: string }) | undefined>(() => {
    if (openOn !== "done" || !sample) return undefined;
    const p = buildPreview(sample.rows, sample.mapping, []);
    return { tags: [], ...resultOf(p), errorFile: errorCsv(sample.rows, p) };
  });

  const allTags = tagsOf(contacts);
  const emailMapped = mapping.includes("email");
  const preview: Preview | undefined = step === "review" ? buildPreview(rows, mapping, normalizeTags(tags)) : undefined;
  const errorCount = preview?.counts.invalid ?? 0;
  const toImport = preview ? preview.counts.new + preview.counts.update : 0;
  // Rows with an error first, then file order; blank and sample rows are not listed.
  const reviewRows = preview
    ? preview.rows.filter((r) => r.verdict !== "blank").sort((a, b) => Number(Boolean(b.issue)) - Number(Boolean(a.issue)) || a.line - b.line)
    : [];

  function reset() {
    setStep("file");
    setFileName(undefined);
    setFileError(undefined);
    setRows([]);
    setMapping([]);
    setTags([]);
    setShowErrors(false);
    setImporting(false);
    setResult(undefined);
  }

  function load(name: string, text: string) {
    const parsed = parseCsv(text).filter((r, i) => i === 0 || r.length > 1 || r[0]?.trim());
    if (parsed.length < 2) {
      setFileError("This file has no rows under the header. Use the downloaded template.");
      return;
    }
    setFileName(name);
    setFileError(undefined);
    setRows(parsed);
    setMapping(parsed[0].map(guessField));
  }

  function pickFile(file: File) {
    // Refused before parsing (EC-CON-04).
    if (file.size > MAX_FILE_BYTES) {
      setFileError(`“${file.name}” is ${(file.size / 1024 / 1024).toFixed(1)} MB. Files can be up to 5 MB.`);
      return;
    }
    if (/\.xlsx?$/i.test(file.name)) {
      // Excel is parsed on the server in the live app; this mock has no parser, so it previews sample rows.
      load(file.name, SAMPLE_FILE.text);
      return;
    }
    file.text().then((t) => load(file.name, t), () => setFileError("We couldn't read this file. Try saving it again as CSV."));
  }

  function download(name: string, text: string) {
    const url = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }
  const downloadTemplate = () => download("saella-contacts-template.csv", templateCsv());

  function next() {
    if (step === "file") {
      if (!fileName) return setShowErrors(true);
      setShowErrors(false);
      setStep("map");
    } else if (step === "map") {
      if (!emailMapped) return setShowErrors(true);
      setShowErrors(false);
      setStep("review");
    }
  }

  function confirm() {
    if (!preview) return;
    setImporting(true);
    const toWrite = preview.rows
      .filter((r) => r.verdict === "new" || r.verdict === "update")
      .map((r) => r.contact);
    const errorFile = errorCsv(rows, preview);
    const counts = resultOf(preview);
    // Short pause so the button shows its working state, like a real request.
    setTimeout(() => {
      const written = upsertContacts(toWrite);
      const r = { ...counts, ...written };
      setResult({ tags: normalizeTags(tags), ...r, errorFile });
      setImporting(false);
      setStep("done");
      onImported(r);
    }, 700);
  }

  const stepIndex = step === "file" ? 1 : step === "map" ? 2 : 3;
  const errorFileName = `${(fileName ?? "contacts").replace(/\.(csv|xlsx?|txt)$/i, "")}-errors.csv`;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        // Not while rows are being written: closing would hide whether the import finished (PATTERNS 9.14).
        if (!o && importing) return;
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      {/* Review needs the 5-column table in full, so that step is wider. */}
      <DialogContent
        className={cn(step === "review" ? "sm:max-w-4xl" : "sm:max-w-3xl")}
        showCloseButton={!importing}
        onEscapeKeyDown={(e) => importing && e.preventDefault()}
        onInteractOutside={(e) => importing && e.preventDefault()}
      >
        <DialogHeader>
          {step !== "done" && <p className="text-sm text-muted-foreground tabular-nums">Step {stepIndex} of 3</p>}
          <DialogTitle>
            {step === "file" ? "Upload contacts" : step === "map" ? "Match your columns" : step === "review" ? "Review before importing" : "Import finished"}
          </DialogTitle>
          <DialogDescription className={cn(step === "review" && "tabular-nums")}>
            {step === "review" && preview
              ? reviewSummary(preview.counts.new, preview.counts.update)
              : step === "done"
              ? `“${fileName ?? "Your file"}” into your contacts${result?.tags.length ? `, tagged ${result.tags.map((t) => `“${t}”`).join(", ")}` : ""}.`
              : step === "file"
                ? "Bring in people you know from a CSV or Excel file."
              : "Tell us what each column holds. Columns you don't need are left out."}
          </DialogDescription>
        </DialogHeader>

        {step === "file" && (
          <FieldGroup>
            <Field data-invalid={(showErrors && !fileName) || Boolean(fileError) || undefined}>
              <FieldLabel htmlFor="imp-file">File</FieldLabel>
              <input
                ref={fileRef}
                id="imp-file"
                type="file"
                accept=".csv,.xlsx,.xls,text/csv"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) pickFile(f);
                  e.target.value = "";
                }}
              />
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files[0];
                  if (f) pickFile(f);
                }}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-card border border-dashed border-input px-6 py-8 text-center",
                  ((showErrors && !fileName) || fileError) && "border-destructive"
                )}
              >
                <FileSpreadsheetIcon className="size-6 text-muted-foreground" aria-hidden />
                {fileName ? (
                  <p className="font-medium">
                    {fileName} <span className="font-normal text-muted-foreground tabular-nums">· {fmt(rows.length - 1)} rows</span>
                  </p>
                ) : (
                  <p className="text-muted-foreground">Drop a file here, or choose one. CSV or Excel, up to 5 MB and 1,000 rows.</p>
                )}
                <div className="flex flex-wrap justify-center gap-2">
                  <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
                    <UploadIcon data-icon="inline-start" />
                    {fileName ? "Choose another file" : "Choose file"}
                  </Button>
                </div>
              </div>
              {fileError ? (
                <FieldError>{fileError}</FieldError>
              ) : showErrors && !fileName ? (
                <FieldError>Choose a file to upload</FieldError>
              ) : (
                <FieldDescription>
                  Not sure about the format?{" "}
                  <Button type="button" variant="link" className="h-auto p-0" onClick={downloadTemplate}>
                    <DownloadIcon data-icon="inline-start" />
                    Download the template
                  </Button>
                </FieldDescription>
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor="imp-tags">Tags for everyone in this upload (optional)</FieldLabel>
              <TagInput id="imp-tags" value={tags} onChange={(t) => setTags(normalizeTags(t))} suggestions={allTags} />
            </Field>
          </FieldGroup>
        )}

        {step === "map" && (
          <div className="flex flex-col gap-3">
            <div className={cn("overflow-hidden rounded-lg border", SCROLL_DIALOG_TABLE)}>
              <Table aria-label="Column matching">
                <TableHeader>
                  <TableRow>
                    <TableHead>Column in your file</TableHead>
                    <TableHead>First value</TableHead>
                    <TableHead>Saella field</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows[0]?.map((header, i) => (
                    <TableRow key={`${header}-${i}`}>
                      <TableCell className="font-medium">{header || `Column ${i + 1}`}</TableCell>
                      <TableCell className="max-w-56 truncate text-muted-foreground">{rows[1]?.[i]}</TableCell>
                      <TableCell>
                        <Select
                          value={mapping[i]}
                          onValueChange={(v) =>
                            // One column per field: picking a field another column holds frees that one.
                            setMapping((m) => m.map((x, j) => (j === i ? (v as FieldKey) : x === v && v !== "skip" ? "skip" : x)))
                          }
                        >
                          <SelectTrigger aria-label={`Field for ${header}`} className="w-44">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {FIELDS.map((f) => (
                                <SelectItem key={f.key} value={f.key}>
                                  {f.label}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {showErrors && !emailMapped ? (
              <Alert variant="destructive">
                <TriangleAlertIcon />
                <AlertTitle>Match one column to Email</AlertTitle>
                <AlertDescription>Every contact needs an email address. If your file has none, use the downloaded template.</AlertDescription>
              </Alert>
            ) : (
              <p className="text-sm text-muted-foreground">Email is required. Everything else is optional.</p>
            )}
          </div>
        )}

        {step === "review" && preview && (
          <div className="flex flex-col gap-4">
            {/* Errors: the count and the file to fix them; each row's reason is in the table below. */}
            {errorCount > 0 && (
              <Alert variant="warning">
                <TriangleAlertIcon />
                <AlertTitle className="tabular-nums">
                  {fmt(errorCount)} {errorCount === 1 ? "row has an error and won't be" : "rows have errors and won't be"} imported
                </AlertTitle>
                <AlertDescription>
                  <Button variant="link" className="h-auto p-0" onClick={() => download(errorFileName, errorCsv(rows, preview))}>
                    <DownloadIcon data-icon="inline-start" />
                    Download rows with errors
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            {preview.truncated && (
              <Alert variant="warning">
                <TriangleAlertIcon />
                <AlertTitle>Only the first {fmt(MAX_ROWS)} rows are read</AlertTitle>
                <AlertDescription>
                  Your file has {fmt(preview.totalRows)} rows. Split it into files of up to {fmt(MAX_ROWS)} rows to bring in the rest.
                </AlertDescription>
              </Alert>
            )}
            {/* The table's own container scrolls, so the header can stick to it while the rows scroll. Separate borders keep
                the header line while it sticks. */}
            <div className={cn("overflow-hidden rounded-lg border", SCROLL_DIALOG_TABLE)}>
              <Table aria-label="Rows to import" className="border-separate border-spacing-0 text-dense [&_tbody_td]:border-b [&_tbody_tr:last-child_td]:border-b-0">
                <TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:border-b [&_th]:bg-table-head [&_tr]:border-b-0">
                  <TableRow>
                    <TableHead className="w-12">Row</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviewRows.slice(0, REVIEW_LIMIT).map((r) => {
                    const verdict = r.issue === "missing_email" ? { label: "No email", variant: "destructive" as const } : VERDICT[r.verdict];
                    return (
                      <TableRow key={r.line}>
                        <TableCell className="text-muted-foreground tabular-nums">{r.line}</TableCell>
                        <TableCell>{`${r.contact.firstName} ${r.contact.lastName}`.trim()}</TableCell>
                        <TableCell className={cn(r.verdict === "invalid" && "text-destructive-soft-foreground")}>{r.contact.email}</TableCell>
                        <TableCell className="text-muted-foreground">{r.contact.company}</TableCell>
                        <TableCell>{verdict && <Badge variant={verdict.variant}>{verdict.label}</Badge>}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {reviewRows.length > REVIEW_LIMIT && (
                <p className="border-t px-3 py-2 text-sm text-muted-foreground tabular-nums">
                  Showing {fmt(REVIEW_LIMIT)} of {fmt(reviewRows.length)} rows
                </p>
              )}
            </div>
          </div>
        )}

        {step === "done" && result && (
          <div className="flex flex-col gap-4">
            <dl className="grid grid-cols-2 divide-x overflow-hidden rounded-lg border sm:grid-cols-4">
              <Count label="New" value={result.added} />
              <Count label="Updated" value={result.updated} />
              <Count label="Merged" value={result.skipped} muted />
              <Count label="Errors" value={result.errors} tone={result.errors > 0 ? "destructive" : undefined} />
            </dl>
            {result.errors > 0 ? (
              // The count is in the Errors tile: one line with the way to fix them.
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                Fix those rows and upload the file again.
                <Button variant="link" className="h-auto min-h-6 p-0" onClick={() => download(errorFileName, result.errorFile)}>
                  <DownloadIcon data-icon="inline-start" />
                  Download error file
                </Button>
              </p>
            ) : (
              <p className="flex items-center gap-2 text-sm">
                <CircleCheckIcon className="size-4 text-success" aria-hidden />
                Import completed with no errors
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          {step === "done" ? (
            <>
              <Button variant="outline" className="mr-auto" onClick={reset}>
                <UploadIcon data-icon="inline-start" />
                Upload another file
              </Button>
              <Button
                onClick={() => {
                  onOpenChange(false);
                  if (onViewContacts && result) onViewContacts(result.tags);
                  reset();
                }}
              >
                {onViewContacts ? "View contacts" : "Done"}
              </Button>
            </>
          ) : (
            <>
              {/* Three buttons: Cancel alone on the far left, Back next to the main action (PATTERNS 9.10). */}
              <Button variant="outline" className={cn(step !== "file" && "sm:mr-auto")} onClick={() => onOpenChange(false)} disabled={importing}>
                Cancel
              </Button>
              {step !== "file" && (
                <Button variant="outline" onClick={() => setStep(step === "review" ? "map" : "file")} disabled={importing}>
                  <ArrowLeftIcon data-icon="inline-start" />
                  Back
                </Button>
              )}
              {step === "review" ? (
                <Button onClick={confirm} disabled={importing || !preview || toImport === 0}>
                  {importing && <Spinner data-icon="inline-start" />}
                  {importing ? "Importing" : `Import ${fmt(toImport)} contacts`}
                </Button>
              ) : (
                <Button onClick={next}>Continue</Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Count({ label, value, muted, tone }: { label: string; value: number; muted?: boolean; tone?: "destructive" }) {
  return (
    <div className="flex flex-col gap-0.5 px-4 py-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "font-heading text-2xl font-medium tracking-title tabular-nums",
          muted && "text-muted-foreground",
          tone === "destructive" && "text-destructive-soft-foreground"
        )}
      >
        {fmt(value)}
      </dd>
    </div>
  );
}

/** Result counts for a preview. Saved contacts are always updated; blank and sample rows are not counted anywhere. */
function resultOf(p: Preview): ImportResult {
  return { added: p.counts.new, updated: p.counts.update, skipped: p.counts.repeat, errors: p.counts.invalid };
}

/** The review's one summary line: what the import will do. */
function reviewSummary(added: number, updated: number) {
  const n = (v: number, one: string, many: string) => `${fmt(v)} ${v === 1 ? one : many}`;
  if (added + updated === 0) return "No rows can be imported. Fix the file and upload it again.";
  const saved = updated > 0 ? `${n(updated, "is", "are")} already in your contacts and will be updated.` : "";
  if (added === 0) return `${fmt(updated)} ${updated === 1 ? "contact is" : "contacts are"} already in your contacts and will be updated.`;
  return `${n(added, "new contact", "new contacts")}.${saved ? ` ${saved}` : ""}`;
}
