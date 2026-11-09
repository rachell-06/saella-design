"use client";

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
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldSet, FieldLegend } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { createList, fmt, normalizeTags, upsertContacts, useContactsStore } from "./data";
import {
  type DuplicateMode,
  FIELDS,
  type FieldKey,
  ISSUE_LABEL,
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
} from "./import";

// Upload contacts: choose file → match columns → review → import (2026-10-28). Nothing is written until the
// review is confirmed (PRD Contacts AC-CON-I-02, BR-RULE-CON-06). Tags apply to the whole upload and are never a
// column in the file, so an existing sheet imports unchanged (live app: lib/email/contact-tags.ts).
// R9 (2026-10-29, HubSpot H5, Apollo A7, Mailchimp F6): the review opens with a check line ("No errors in 14 rows"
// or the failing rows with their reason), asks what to do with people already in the list (update or skip), and
// the import ends on a result screen New / Updated / Skipped / Errors with the error rows as a CSV.
// Preview: ?import=review | done opens the dialog on that step with the sample file.
type Step = "file" | "map" | "review" | "done";

export type ImportResult = { added: number; updated: number; skipped: number; errors: number };

const VERDICT: Record<RowVerdict, { label: string; variant: "success" | "info" | "destructive" | "secondary" }> = {
  new: { label: "New", variant: "success" },
  update: { label: "Updates existing", variant: "info" },
  invalid: { label: "Invalid email", variant: "destructive" },
  repeat: { label: "Repeat in file", variant: "secondary" },
  blank: { label: "Blank", variant: "secondary" },
};

export function ImportDialog({
  open,
  onOpenChange,
  listId: fixedListId,
  preview: openOn,
  onImported,
  onViewList,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Upload into this list (list screen). Without it the user picks a list or names a new one. */
  listId?: string;
  /** Called once the contacts are written; the dialog then shows the result screen. */
  onImported: (listId: string, result: ImportResult) => void;
  /** "View list" on the result screen (Contacts home). Without it the button reads "Done". */
  onViewList?: (listId: string) => void;
  /** Preview only: start on this step with the sample file loaded. */
  preview?: "review" | "done";
}) {
  const { lists, contacts } = useContactsStore();
  const fileRef = useRef<HTMLInputElement>(null);
  // Preview start (?import=…): the sample file, columns guessed, a new list named after it.
  const [sample] = useState(() => {
    if (!openOn) return undefined;
    const parsed = parseCsv(SAMPLE_FILE.text);
    return { rows: parsed, mapping: parsed[0].map(guessField), name: SAMPLE_FILE.name.replace(/\.csv$/i, "").replace(/[-_]+/g, " ") };
  });
  const [step, setStep] = useState<Step>(openOn ?? "file");
  const [fileName, setFileName] = useState<string | undefined>(sample && SAMPLE_FILE.name);
  const [fileError, setFileError] = useState<string>();
  const [excelNote, setExcelNote] = useState(false);
  const [rows, setRows] = useState<string[][]>(sample?.rows ?? []);
  const [mapping, setMapping] = useState<FieldKey[]>(sample?.mapping ?? []);
  const [target, setTarget] = useState<"new" | "existing">(fixedListId ? "existing" : "new");
  const [existingId, setExistingId] = useState<string>(fixedListId ?? "");
  const [newName, setNewName] = useState(sample?.name ?? "");
  const [tags, setTags] = useState<string[]>([]);
  const [dupMode, setDupMode] = useState<DuplicateMode>("update");
  const [showErrors, setShowErrors] = useState(false);
  const [importing, setImporting] = useState(false);
  // Result screen. The "done" preview shows what the sample would give, without writing anything.
  const [result, setResult] = useState<(ImportResult & { listId: string; errorFile: string }) | undefined>(() => {
    if (openOn !== "done" || !sample) return undefined;
    const p = buildPreview(sample.rows, sample.mapping, fixedListId, []);
    return { listId: fixedListId ?? "", ...resultOf(p, "update"), errorFile: errorCsv(sample.rows, p) };
  });

  const allTags = [...new Set(lists.flatMap((l) => l.tags))].sort((a, b) => a.localeCompare(b));
  const targetId = target === "existing" ? existingId : undefined;
  const emailMapped = mapping.includes("email");
  const preview: Preview | undefined = step === "review" ? buildPreview(rows, mapping, targetId, normalizeTags(tags)) : undefined;
  const errorRows = preview?.rows.filter((r) => r.issue) ?? [];
  const checkedRows = preview ? preview.rows.length - preview.counts.blank : 0;
  const toImport = preview ? preview.counts.new + (dupMode === "update" ? preview.counts.update : 0) : 0;

  function reset() {
    setStep("file");
    setFileName(undefined);
    setFileError(undefined);
    setExcelNote(false);
    setRows([]);
    setMapping([]);
    setTarget(fixedListId ? "existing" : "new");
    setExistingId(fixedListId ?? "");
    setNewName("");
    setTags([]);
    setDupMode("update");
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
    if (!newName) setNewName(name.replace(/\.(csv|xlsx?|txt)$/i, "").replace(/[-_]+/g, " "));
  }

  function pickFile(file: File) {
    setExcelNote(false);
    // Refused before parsing (EC-CON-04).
    if (file.size > MAX_FILE_BYTES) {
      setFileError(`“${file.name}” is ${(file.size / 1024 / 1024).toFixed(1)} MB. Files can be up to 5 MB.`);
      return;
    }
    if (/\.xlsx?$/i.test(file.name)) {
      // Excel is parsed on the server in the live app; this prototype has no parser, so it previews sample rows.
      setExcelNote(true);
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

  const targetOk = target === "existing" ? Boolean(existingId) : Boolean(newName.trim());

  function next() {
    if (step === "file") {
      if (!fileName || !targetOk) return setShowErrors(true);
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
      .filter((r) => r.verdict === "new" || (r.verdict === "update" && dupMode === "update"))
      .map((r) => r.contact);
    const errorFile = errorCsv(rows, preview);
    const counts = resultOf(preview, dupMode);
    // Short pause so the button shows its working state, like a real request.
    setTimeout(() => {
      const id = targetId ?? createList({ name: newName.trim(), source: "upload", tags: normalizeTags(tags) });
      const written = upsertContacts(id, toWrite);
      const r = { ...counts, ...written };
      setResult({ listId: id, ...r, errorFile });
      setImporting(false);
      setStep("done");
      onImported(id, r);
    }, 700);
  }

  const stepIndex = step === "file" ? 1 : step === "map" ? 2 : 3;
  const fixedList = lists.find((l) => l.id === fixedListId);
  const resultList = lists.find((l) => l.id === result?.listId) ?? fixedList;
  const errorFileName = `${(fileName ?? "contacts").replace(/\.(csv|xlsx?|txt)$/i, "")}-errors.csv`;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      {/* Review needs the 5-column table in full (bug 2026-10-30: Result column cut off), so that step is wider. */}
      <DialogContent className={cn(step === "review" ? "sm:max-w-4xl" : "sm:max-w-3xl")}>
        <DialogHeader>
          {step !== "done" && <p className="text-sm text-muted-foreground tabular-nums">Step {stepIndex} of 3</p>}
          <DialogTitle>
            {step === "file" ? "Upload contacts" : step === "map" ? "Match your columns" : step === "review" ? "Review before importing" : "Import finished"}
          </DialogTitle>
          <DialogDescription>
            {step === "done"
              ? `“${fileName ?? "Your file"}” into ${resultList ? `“${resultList.name}”` : "a new list"}.`
              : step === "file"
              ? fixedList
                ? `Add people to “${fixedList.name}” from a CSV or Excel file.`
                : "Bring in your own list from a CSV or Excel file."
              : step === "map"
                ? "Tell us what each column holds. Columns you don't need are left out."
                : "Nothing is saved until you import."}
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
                  {!fileName && (
                    <Button type="button" variant="ghost" onClick={() => load(SAMPLE_FILE.name, SAMPLE_FILE.text)}>
                      Try a sample file
                    </Button>
                  )}
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
              {excelNote && (
                <FieldDescription>
                  Excel files are read by the server in the live app. This preview fills in sample rows.
                </FieldDescription>
              )}
            </Field>

            {!fixedListId && (
              <FieldSet>
                <FieldLegend variant="label">Add to</FieldLegend>
                <RadioGroup value={target} onValueChange={(v) => setTarget(v as "new" | "existing")} className="flex flex-col gap-3">
                  <Field orientation="horizontal">
                    <RadioGroupItem value="new" id="imp-t-new" />
                    <FieldLabel htmlFor="imp-t-new" className="font-normal">A new list</FieldLabel>
                  </Field>
                  {target === "new" && (
                    <Field data-invalid={(showErrors && !newName.trim()) || undefined} className="pl-7">
                      <FieldLabel htmlFor="imp-name" className="sr-only">List name</FieldLabel>
                      <Input id="imp-name" placeholder="List name, e.g. Bangkok fair leads" value={newName} onChange={(e) => setNewName(e.target.value)} aria-invalid={(showErrors && !newName.trim()) || undefined} />
                      {showErrors && !newName.trim() && <FieldError>Name the new list</FieldError>}
                    </Field>
                  )}
                  <Field orientation="horizontal">
                    <RadioGroupItem value="existing" id="imp-t-existing" />
                    <FieldLabel htmlFor="imp-t-existing" className="font-normal">An existing list</FieldLabel>
                  </Field>
                  {target === "existing" && (
                    <Field data-invalid={(showErrors && !existingId) || undefined} className="pl-7">
                      <Select value={existingId} onValueChange={setExistingId}>
                        <SelectTrigger aria-label="Existing list" className="w-full" aria-invalid={(showErrors && !existingId) || undefined}>
                          <SelectValue placeholder="Choose a list" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {lists.map((l) => (
                              <SelectItem key={l.id} value={l.id}>
                                {l.name} · {fmt(contacts[l.id]?.length ?? 0)}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      {showErrors && !existingId && <FieldError>Choose a list</FieldError>}
                    </Field>
                  )}
                </RadioGroup>
              </FieldSet>
            )}

            <Field>
              <FieldLabel htmlFor="imp-tags">Tags for everyone in this upload (optional)</FieldLabel>
              <TagInput id="imp-tags" value={tags} onChange={(t) => setTags(normalizeTags(t))} suggestions={allTags} />
              <FieldDescription>Tags help you find this group later and filter it when you send.</FieldDescription>
            </Field>
          </FieldGroup>
        )}

        {step === "map" && (
          <div className="flex flex-col gap-3">
            <div className="max-h-96 overflow-auto rounded-lg border">
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
            {/* Check line (HubSpot "0 errors found, of 3 rows scanned"): the answer first, then the rows to fix. */}
            {errorRows.length === 0 ? (
              <p className="flex items-center gap-2 text-sm tabular-nums">
                <CircleCheckIcon className="size-4 text-success" aria-hidden />
                No errors in {fmt(checkedRows)} rows
              </p>
            ) : (
              <Alert variant="warning">
                <TriangleAlertIcon />
                <AlertTitle className="tabular-nums">
                  {fmt(errorRows.length)} {errorRows.length === 1 ? "error" : "errors"} in {fmt(checkedRows)} rows. These rows are skipped.
                </AlertTitle>
                <AlertDescription>
                  <ul className="flex flex-col gap-0.5 tabular-nums">
                    {errorRows.slice(0, 5).map((r) => (
                      <li key={r.line}>
                        Row {r.line}: {r.issue && ISSUE_LABEL[r.issue]}
                        {r.contact.email && ` (${r.contact.email})`}
                      </li>
                    ))}
                    {errorRows.length > 5 && <li>And {fmt(errorRows.length - 5)} more in the error file</li>}
                  </ul>
                  <Button variant="link" className="h-auto p-0" onClick={() => download(errorFileName, errorCsv(rows, preview))}>
                    <DownloadIcon data-icon="inline-start" />
                    Download rows with errors
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            {targetId && (
              <FieldSet>
                <FieldLegend variant="label">If someone is already in this list</FieldLegend>
                <FieldDescription className="tabular-nums">
                  {preview.counts.update > 0
                    ? `${fmt(preview.counts.update)} ${preview.counts.update === 1 ? "row matches" : "rows match"} a contact by email and company.`
                    : "No one in this file is in the list yet."}
                </FieldDescription>
                <RadioGroup value={dupMode} onValueChange={(v) => setDupMode(v as DuplicateMode)} className="flex flex-col gap-3">
                  <Field orientation="horizontal">
                    <RadioGroupItem value="update" id="imp-dup-update" />
                    <FieldLabel htmlFor="imp-dup-update" className="font-normal">
                      Update their details
                      <span className="text-muted-foreground">Empty cells keep what&apos;s there; tags are added.</span>
                    </FieldLabel>
                  </Field>
                  <Field orientation="horizontal">
                    <RadioGroupItem value="skip" id="imp-dup-skip" />
                    <FieldLabel htmlFor="imp-dup-skip" className="font-normal">
                      Skip them
                      <span className="text-muted-foreground">The list stays as it is for these people.</span>
                    </FieldLabel>
                  </Field>
                </RadioGroup>
              </FieldSet>
            )}
            <dl className="grid grid-cols-2 divide-x overflow-hidden rounded-lg border sm:grid-cols-4">
              <Count label="New contacts" value={preview.counts.new} />
              <Count
                label={dupMode === "update" ? "Already in list, updated" : "Already in list, skipped"}
                value={preview.counts.update}
                muted={dupMode === "skip"}
              />
              <Count label="Repeats in file, merged" value={preview.counts.repeat} muted />
              <Count label="Errors, skipped" value={preview.counts.invalid} tone={preview.counts.invalid > 0 ? "destructive" : undefined} />
            </dl>
            {preview.truncated && (
              <Alert variant="warning">
                <TriangleAlertIcon />
                <AlertTitle>Only the first {fmt(MAX_ROWS)} rows are read</AlertTitle>
                <AlertDescription>
                  Your file has {fmt(preview.totalRows)} rows. Split it into files of up to {fmt(MAX_ROWS)} rows to bring in the rest.
                </AlertDescription>
              </Alert>
            )}
            <div className="max-h-72 overflow-auto rounded-lg border">
              <Table aria-label="Rows to import" className="text-dense">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-right">Row</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.rows
                    .filter((r) => r.verdict !== "blank")
                    .slice(0, 50)
                    .map((r) => (
                      <TableRow key={r.line}>
                        <TableCell className="text-right text-muted-foreground tabular-nums">{r.line}</TableCell>
                        <TableCell>{`${r.contact.firstName} ${r.contact.lastName}`.trim()}</TableCell>
                        <TableCell className={cn(r.verdict === "invalid" && "text-destructive-soft-foreground")}>{r.contact.email || "–"}</TableCell>
                        <TableCell className="text-muted-foreground">{r.contact.company}</TableCell>
                        <TableCell>
                          {r.verdict === "update" && dupMode === "skip" ? (
                            <Badge variant="secondary">Skipped, in list</Badge>
                          ) : r.issue === "missing_email" ? (
                            <Badge variant="destructive">No email</Badge>
                          ) : (
                            <Badge variant={VERDICT[r.verdict].variant}>{VERDICT[r.verdict].label}</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-sm text-muted-foreground">
              {preview.counts.blank > 0 && `${fmt(preview.counts.blank)} blank or sample rows are skipped. `}
              Columns set to “Don&apos;t import” are left out.
            </p>
          </div>
        )}

        {step === "done" && result && (
          <div className="flex flex-col gap-4">
            <dl className="grid grid-cols-2 divide-x overflow-hidden rounded-lg border sm:grid-cols-4">
              <Count label="New" value={result.added} />
              <Count label="Updated" value={result.updated} />
              <Count label="Skipped" value={result.skipped} muted />
              <Count label="Errors" value={result.errors} tone={result.errors > 0 ? "destructive" : undefined} />
            </dl>
            {result.errors > 0 ? (
              <Alert variant="warning">
                <TriangleAlertIcon />
                <AlertTitle className="tabular-nums">
                  {fmt(result.errors)} {result.errors === 1 ? "row wasn't" : "rows weren't"} imported
                </AlertTitle>
                <AlertDescription>
                  <p>The error file has those rows as they were in your file, with the reason in an Error column. Fix them and upload it again.</p>
                  <Button variant="link" className="h-auto p-0" onClick={() => download(errorFileName, result.errorFile)}>
                    <DownloadIcon data-icon="inline-start" />
                    Download error file
                  </Button>
                </AlertDescription>
              </Alert>
            ) : (
              <p className="flex items-center gap-2 text-sm">
                <CircleCheckIcon className="size-4 text-success" aria-hidden />
                Import completed with no errors
              </p>
            )}
            {result.skipped > 0 && (
              <p className="text-sm text-muted-foreground">
                Skipped: repeats inside the file{dupMode === "skip" ? " and people already in the list" : ""}. Nothing in the list was changed for them.
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
                  if (onViewList && result?.listId) onViewList(result.listId);
                  reset();
                }}
              >
                {onViewList ? "View list" : "Done"}
              </Button>
            </>
          ) : (
            <>
              {step !== "file" && (
                <Button variant="ghost" className="mr-auto" onClick={() => setStep(step === "review" ? "map" : "file")} disabled={importing}>
                  <ArrowLeftIcon data-icon="inline-start" />
                  Back
                </Button>
              )}
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={importing}>
                Cancel
              </Button>
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

/** Result counts for a preview under a duplicate rule. Blank and sample rows are not counted anywhere. */
function resultOf(p: Preview, mode: DuplicateMode): ImportResult {
  return {
    added: p.counts.new,
    updated: mode === "update" ? p.counts.update : 0,
    skipped: p.counts.repeat + (mode === "skip" ? p.counts.update : 0),
    errors: p.counts.invalid,
  };
}
