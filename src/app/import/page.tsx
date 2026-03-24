"use client";

import { useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Upload, AlertCircle, FileSpreadsheet,
  Loader2, ChevronDown, ChevronRight, Zap,
} from "lucide-react";
import { MOCK_CLIENTS, MOCK_CONTENT_TYPES } from "@/lib/mock-data";
import * as api from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";

interface CsvRow { [key: string]: string }
const CSV_COLS = ["client_id","content_type","target_keyword","search_intent","target_url","priority"] as const;

function parseCsv(text: string): CsvRow[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ""; });
    return row;
  });
}

const VALID_SLUGS = new Set(MOCK_CONTENT_TYPES.map((ct) => ct.slug));

function csvRowStatus(row: CsvRow): { valid: boolean; error?: string } {
  if (!row.target_keyword?.trim()) return { valid: false, error: "missing keyword" };
  if (!row.client_id?.trim()) return { valid: false, error: "missing client_id" };
  if (row.content_type && !VALID_SLUGS.has(row.content_type)) return { valid: false, error: "bad type" };
  return { valid: true };
}

function FormGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-x-8 items-start py-5">
      <div className="form-section-label pt-2 select-none">{label}</div>
      <div className="space-y-3.5">{children}</div>
    </div>
  );
}

function FieldLabel({ children, required, hint }: { children: React.ReactNode; required?: boolean; hint?: string }) {
  return (
    <div>
      <label className="block text-[13.5px] font-semibold text-[#1e293b] tracking-[-0.01em]">
        {children}{required && <span className="text-[#e11d48] ml-0.5">*</span>}
      </label>
      {hint && <p className="text-[11px] text-[#94a3b8] mt-0.5 font-medium">{hint}</p>}
    </div>
  );
}

export default function AssignmentPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"form" | "csv">("form");
  const [clientId, setClientId] = useState("");
  const [contentTypeSlug, setContentTypeSlug] = useState("");
  const [targetKeyword, setTargetKeyword] = useState("");
  const [secondaryKeywords, setSecondaryKeywords] = useState("");
  const [searchIntent, setSearchIntent] = useState("transactional");
  const [targetUrl, setTargetUrl] = useState("");
  const [pageGoal, setPageGoal] = useState("");
  const [instructions, setInstructions] = useState("");
  const [internalLinks, setInternalLinks] = useState("");
  const [referenceUrl, setReferenceUrl] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [competitorUrls, setCompetitorUrls] = useState("");
  const [alsoAsked, setAlsoAsked] = useState("");
  const [serpNotes, setSerpNotes] = useState("");
  const [pageCta, setPageCta] = useState("");
  const [wordCount, setWordCount] = useState("");
  const [priority, setPriority] = useState("laag");
  const [serpOpen, setSerpOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [csvFileName, setCsvFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const selectedClient = MOCK_CLIENTS.find((c) => c.id === clientId);
  const selectedCT = MOCK_CONTENT_TYPES.find((ct) => ct.slug === contentTypeSlug);
  const formValid = !!clientId && !!contentTypeSlug && !!targetKeyword.trim();
  const csvValid = csvRows.filter((r) => csvRowStatus(r).valid);
  const csvInvalid = csvRows.filter((r) => !csvRowStatus(r).valid);

  const inp = "flex h-[42px] w-full rounded-[10px] border border-[#d1d5db] bg-white px-3.5 py-2 text-[14px] text-[#1e293b] font-[450] shadow-[0_1px_2px_rgba(0,0,0,0.04)] placeholder:text-[#94a3b8] placeholder:font-normal focus:border-[#534AB7] focus:ring-2 focus:ring-[#534AB7]/12 focus:shadow-[0_1px_2px_rgba(0,0,0,0.04),0_0_0_3px_rgba(83,74,183,0.08)] focus:outline-none transition-all";
  const ta = "flex w-full rounded-[10px] border border-[#d1d5db] bg-white px-3.5 py-2.5 text-[14px] text-[#1e293b] font-[450] shadow-[0_1px_2px_rgba(0,0,0,0.04)] placeholder:text-[#94a3b8] placeholder:font-normal focus:border-[#534AB7] focus:ring-2 focus:ring-[#534AB7]/12 focus:shadow-[0_1px_2px_rgba(0,0,0,0.04),0_0_0_3px_rgba(83,74,183,0.08)] focus:outline-none resize-none transition-all";

  const processFile = useCallback((f: File) => {
    setCsvFile(f); setCsvFileName(f.name); setApiError(null);
    const reader = new FileReader();
    reader.onload = (ev) => setCsvRows(parseCsv(ev.target?.result as string));
    reader.readAsText(f);
  }, []);

  function handleDrop(e: React.DragEvent) { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f?.name.endsWith(".csv")) processFile(f); }
  function clearCsv() { setCsvFile(null); setCsvRows([]); setCsvFileName(""); if (fileInputRef.current) fileInputRef.current.value = ""; }
  function handleCancel() { setClientId(""); setContentTypeSlug(""); setTargetKeyword(""); setSecondaryKeywords(""); setSearchIntent("transactional"); setTargetUrl(""); setPageGoal(""); setInstructions(""); setInternalLinks(""); setReferenceUrl(""); setMetaTitle(""); setMetaDescription(""); setCompetitorUrls(""); setAlsoAsked(""); setSerpNotes(""); setPageCta(""); setWordCount(""); setPriority("laag"); clearCsv(); setApiError(null); }

  async function handleSave(andGenerate: boolean) {
    if (!formValid) return;
    setIsSubmitting(true); setApiError(null);
    const body: api.CreatePageBody = { client_id: clientId, content_type: contentTypeSlug, target_keyword: targetKeyword, secondary_keywords: secondaryKeywords || undefined, search_intent: searchIntent || undefined, target_url: targetUrl || undefined, page_goal: pageGoal || undefined, instructions: instructions || undefined, internal_links: internalLinks || undefined, reference_url: referenceUrl || undefined, meta_title: metaTitle || undefined, meta_description: metaDescription || undefined, competitor_urls: competitorUrls || undefined, also_asked: alsoAsked || undefined, serp_notes: serpNotes || undefined, page_cta: pageCta || undefined, target_word_count: wordCount ? parseInt(wordCount, 10) : undefined, priority: priority || undefined };
    try { const result = await api.createPage(body); if (andGenerate) { await api.generatePage(result.id); toast.success("Page saved & generation queued."); } else { toast.success("Page saved successfully."); } await new Promise((r) => setTimeout(r, 500)); router.push("/pipeline"); }
    catch { console.log("[Mock mode] Save payload:", body, { generate: andGenerate }); toast.success(andGenerate ? "Page saved & generation queued. (mock)" : "Page saved successfully. (mock)"); await new Promise((r) => setTimeout(r, 500)); router.push("/pipeline"); }
    finally { setIsSubmitting(false); }
  }

  async function handleCsvImport() {
    if (!csvFile || csvValid.length === 0) return;
    setIsSubmitting(true); setApiError(null);
    try { const result = await api.importCsv(csvFile, "", ""); toast.success("Import complete \u2014 " + result.imported + " pages added."); await new Promise((r) => setTimeout(r, 800)); router.push("/pipeline"); }
    catch { console.log("[Mock mode] CSV import:", csvValid.length, "rows"); toast.success("Import complete \u2014 " + csvValid.length + " pages added. (mock)"); await new Promise((r) => setTimeout(r, 800)); router.push("/pipeline"); }
    finally { setIsSubmitting(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.03em] text-[#0f172a]">New page assignment</h1>
          <p className="text-[13.5px] text-[#64748b] mt-1 font-[450]">Create a new SEO page or import in bulk via CSV.</p>
        </div>
        <div className="segmented-control">
          <button onClick={() => setMode("form")} className={mode === "form" ? "active" : ""}>Single page</button>
          <button onClick={() => setMode("csv")} className={mode === "csv" ? "active" : ""}>CSV bulk import</button>
        </div>
      </div>

      {apiError && <Alert variant="destructive"><AlertCircle className="size-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{apiError}</AlertDescription></Alert>}

      {mode === "form" && (
        <div className="card-elevated-lg rounded-2xl bg-white border border-[#e2e4e9] overflow-hidden">
          <div className="px-7 py-3 divide-y divide-[#ecedf2]">
            <FormGroup label="Linking">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <FieldLabel required>Client</FieldLabel>
                  <Select value={clientId} onValueChange={setClientId}><SelectTrigger className="w-full h-[42px] rounded-[10px] border-[#d1d5db] text-[14px] font-[450] shadow-[0_1px_2px_rgba(0,0,0,0.04)]"><SelectValue placeholder="Select client..." /></SelectTrigger><SelectContent className="rounded-xl shadow-xl border-[#e2e4e9]">{MOCK_CLIENTS.map((c) => <SelectItem key={c.id} value={c.id} className="text-[13px]">{c.name} ({c.id})</SelectItem>)}</SelectContent></Select>
                  {selectedClient && (
                    <div className="rounded-xl bg-gradient-to-br from-[#F9FAFB] to-[#F3F4F6] border border-[#e2e4e9] p-3.5 space-y-2 animate-in fade-in-0 slide-in-from-top-1 duration-200">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] font-semibold text-[#0f172a]">{selectedClient.name}</span>
                        {selectedClient.branche && <span className="badge-pill bg-[#EEEDFE] text-[#534AB7]">{selectedClient.branche}</span>}
                        {selectedClient.business_model && <span className="badge-pill bg-[#ECFDF5] text-[#059669]">{selectedClient.business_model}</span>}
                        {selectedClient.market_model && <span className="badge-pill bg-[#FFFBEB] text-[#D97706]">{selectedClient.market_model}</span>}
                      </div>
                      {selectedClient.tone_of_voice && <p className="text-[11px] text-[#64748b]"><span className="font-medium text-[#94a3b8]">Tone:</span> {selectedClient.tone_of_voice}</p>}
                      {selectedClient.notes && <p className="text-[11px] text-[#B91C1C] font-medium bg-[#FEF2F2] rounded-md px-2 py-1">{selectedClient.notes}</p>}
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <FieldLabel required>Content type</FieldLabel>
                  <Select value={contentTypeSlug} onValueChange={setContentTypeSlug}><SelectTrigger className="w-full h-[42px] rounded-[10px] border-[#d1d5db] text-[14px] font-[450] shadow-[0_1px_2px_rgba(0,0,0,0.04)]"><SelectValue placeholder="Select content type..." /></SelectTrigger><SelectContent className="rounded-xl shadow-xl border-[#e2e4e9]">{MOCK_CONTENT_TYPES.map((ct) => <SelectItem key={ct.slug} value={ct.slug} className="text-[13px] font-mono">{ct.slug}</SelectItem>)}</SelectContent></Select>
                  {selectedCT && <div className="flex items-center gap-2 text-[11px] text-[#64748b] animate-in fade-in-0 duration-200"><span className="badge-pill bg-[#FFFBEB] text-[#D97706]">{selectedCT.lower_bound}&ndash;{selectedCT.upper_bound} words</span><span>{selectedCT.writing_perspective} &middot; Also asked: {selectedCT.also_asked_handling}</span></div>}
                </div>
              </div>
            </FormGroup>

            <FormGroup label="Keywords">
              <div className="flex gap-4">
                <div className="flex-1 space-y-1.5"><FieldLabel required>Primary keyword</FieldLabel><input className={inp} placeholder="e.g. wit klik pvc" value={targetKeyword} onChange={(e) => setTargetKeyword(e.target.value)} /></div>
                <div className="flex-[2] space-y-1.5"><FieldLabel>Secondary keywords</FieldLabel><input className={inp} placeholder="comma-separated" value={secondaryKeywords} onChange={(e) => setSecondaryKeywords(e.target.value)} /></div>
              </div>
            </FormGroup>

            <FormGroup label="Search intent">
              <Select value={searchIntent} onValueChange={setSearchIntent}><SelectTrigger className="max-w-[200px] h-[42px] rounded-[10px] border-[#d1d5db] text-[14px] font-[450] shadow-[0_1px_2px_rgba(0,0,0,0.04)]"><SelectValue /></SelectTrigger><SelectContent className="rounded-xl shadow-xl border-[#e2e4e9]"><SelectItem value="transactional" className="text-[13px]">transactional</SelectItem><SelectItem value="informational" className="text-[13px]">informational</SelectItem><SelectItem value="local" className="text-[13px]">local</SelectItem></SelectContent></Select>
            </FormGroup>

            <FormGroup label="Page details">
              <div className="space-y-4">
                <div className="space-y-1.5"><FieldLabel>Target URL</FieldLabel><input className={inp} placeholder="/pvc-vloeren/klik-pvc/wit-klik-pvc/" value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} /></div>
                <div className="space-y-1.5"><FieldLabel>Page goal</FieldLabel><input className={inp} placeholder="Ranking + conversie richting aankoop" value={pageGoal} onChange={(e) => setPageGoal(e.target.value)} /></div>
                <div className="space-y-1.5"><FieldLabel hint="Passed VERBATIM to the writer agent">Instructions (optional)</FieldLabel><textarea className={ta} rows={2} placeholder="Any specific instructions for the AI writer..." value={instructions} onChange={(e) => setInstructions(e.target.value)} /></div>
              </div>
            </FormGroup>

            <FormGroup label="Links">
              <div className="space-y-4">
                <div className="space-y-1.5"><FieldLabel hint="One URL per line">Internal links (optional)</FieldLabel><textarea className={ta} rows={2} placeholder="https://example.com/page-1" value={internalLinks} onChange={(e) => setInternalLinks(e.target.value)} /></div>
                <div className="space-y-1.5"><FieldLabel>Reference URL (optional)</FieldLabel><input className={inp} placeholder="Competitor or inspiration URL" value={referenceUrl} onChange={(e) => setReferenceUrl(e.target.value)} /></div>
              </div>
            </FormGroup>

            <FormGroup label="Meta">
              <div className="space-y-1">
                <p className="text-[10px] text-[#94a3b8]">Leave empty for auto-generation</p>
                <div className="flex gap-4">
                  <div className="flex-1 space-y-1.5"><FieldLabel>Meta title</FieldLabel><div className="relative"><input className={inp} placeholder="Max 60 characters" maxLength={60} value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} />{metaTitle && <span className={"absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium tabular-nums " + (metaTitle.length > 55 ? "text-[#D97706]" : "text-[#94a3b8]")}>{metaTitle.length}/60</span>}</div></div>
                  <div className="flex-1 space-y-1.5"><FieldLabel>Meta description</FieldLabel><div className="relative"><input className={inp} placeholder="Max 155 characters" maxLength={155} value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} />{metaDescription && <span className={"absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium tabular-nums " + (metaDescription.length > 145 ? "text-[#D97706]" : "text-[#94a3b8]")}>{metaDescription.length}/155</span>}</div></div>
                </div>
              </div>
            </FormGroup>

            <div className="py-6">
              <button type="button" onClick={() => setSerpOpen(!serpOpen)} className="group flex items-center gap-2 text-[11px] font-semibold text-[#94a3b8] uppercase tracking-[0.08em] hover:text-[#534AB7] transition-colors">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#F3F4F6] group-hover:bg-[#EEEDFE] transition-colors">{serpOpen ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}</span>
                SERP analysis (optional)
              </button>
              {serpOpen && (
                <div className="mt-4 pl-[148px] space-y-4 animate-in fade-in-0 slide-in-from-top-2 duration-200">
                  <div className="space-y-1.5"><FieldLabel>Competitor URLs</FieldLabel><textarea className={ta} rows={2} placeholder="One URL per line" value={competitorUrls} onChange={(e) => setCompetitorUrls(e.target.value)} /></div>
                  <div className="space-y-1.5"><FieldLabel>People Also Ask</FieldLabel><textarea className={ta} rows={2} placeholder="One question per line" value={alsoAsked} onChange={(e) => setAlsoAsked(e.target.value)} /></div>
                  <div className="space-y-1.5"><FieldLabel>SERP notes</FieldLabel><textarea className={ta} rows={2} placeholder="Any additional SERP observations" value={serpNotes} onChange={(e) => setSerpNotes(e.target.value)} /></div>
                </div>
              )}
            </div>

            <FormGroup label="CTA + Settings">
              <div className="flex gap-4 items-start">
                <div className="flex-1 space-y-1.5"><FieldLabel>Page CTA (optional)</FieldLabel><input className={inp} placeholder="e.g. Bestel online, Bezoek onze winkel" value={pageCta} onChange={(e) => setPageCta(e.target.value)} /></div>
                <div className="w-[150px] space-y-1.5"><FieldLabel>Word count</FieldLabel><div className="relative"><input type="number" className={inp} placeholder="e.g. 1100" value={wordCount} onChange={(e) => setWordCount(e.target.value)} />{selectedCT && !wordCount && <span className="absolute right-2 top-1/2 -translate-y-1/2 badge-pill bg-[#FFFBEB] text-[#D97706] pointer-events-none text-[10px]">{selectedCT.lower_bound}&ndash;{selectedCT.upper_bound}</span>}</div></div>
                <div className="w-[130px] space-y-1.5"><FieldLabel>Priority</FieldLabel><Select value={priority} onValueChange={setPriority}><SelectTrigger className="h-[42px] rounded-[10px] border-[#d1d5db] text-[14px] font-[450] shadow-[0_1px_2px_rgba(0,0,0,0.04)]"><SelectValue /></SelectTrigger><SelectContent className="rounded-xl shadow-xl border-[#e2e4e9]"><SelectItem value="hoog" className="text-[13px]">hoog</SelectItem><SelectItem value="midden" className="text-[13px]">midden</SelectItem><SelectItem value="laag" className="text-[13px]">laag</SelectItem></SelectContent></Select></div>
              </div>
            </FormGroup>
          </div>

          <div className="action-bar flex items-center justify-between px-7 py-4">
            <div className="flex items-center gap-2 text-[11px] text-[#94a3b8]">
              <span>Status</span>
              <span className="badge-pill bg-[#F3F4F6] text-[#64748b]">nieuw</span>
              <span className="text-[#D1D5DB]">&middot;</span>
              <span>ID auto-generated</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Button variant="outline" size="sm" onClick={handleCancel} disabled={isSubmitting} className="h-[38px] rounded-[10px] border-[#d1d5db] px-4 text-[13.5px] font-semibold text-[#64748b] hover:text-[#1e293b] hover:bg-[#f1f5f9] hover:border-[#94a3b8]">Cancel</Button>
              <Button size="sm" className="h-[38px] rounded-[10px] bg-[#534AB7] hover:bg-[#4338A0] px-5 text-[13.5px] font-semibold shadow-md shadow-[#534AB7]/25" disabled={!formValid || isSubmitting} onClick={() => handleSave(false)}>{isSubmitting ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : null}Save</Button>
              <Button size="sm" className="h-[38px] rounded-[10px] bg-[#1e293b] hover:bg-[#0f172a] px-5 text-[13.5px] font-semibold text-white shadow-md shadow-black/15" disabled={!formValid || isSubmitting} onClick={() => handleSave(true)}><Zap className="size-3.5" />Save + Generate</Button>
            </div>
          </div>
        </div>
      )}

      {mode === "csv" && (
        <>
          {csvRows.length === 0 && (
            <div onDrop={handleDrop} onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }} onClick={() => fileInputRef.current?.click()} className={"drop-zone flex cursor-pointer flex-col items-center justify-center gap-4 p-20 text-center " + (isDragging ? "dragging" : "")}>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#EEEDFE] to-[#F3F4F6]"><Upload className="size-6 text-[#534AB7]" /></div>
              <div><p className="text-[14px] font-medium text-[#0f172a]">Drop CSV or click to browse</p><p className="text-[12px] text-[#94a3b8] mt-1">Required columns: client_id, content_type, target_keyword</p></div>
              <input ref={fileInputRef} type="file" accept=".csv" onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); }} className="hidden" />
            </div>
          )}
          {csvRows.length > 0 && (
            <div className="card-elevated-lg rounded-2xl bg-white border border-[#e2e4e9] overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#e2e4e9] bg-[#F9FAFB]">
                <div className="flex items-center gap-3 text-[13px]">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EEEDFE]"><FileSpreadsheet className="size-4 text-[#534AB7]" /></div>
                  <span className="font-semibold text-[#0f172a]">{csvFileName}</span>
                  <span className="badge-pill bg-[#F3F4F6] text-[#64748b]">{csvRows.length} rows</span>
                  <span className="badge-pill bg-[#ECFDF5] text-[#059669]">{csvValid.length} valid</span>
                  {csvInvalid.length > 0 && <span className="badge-pill bg-[#FEF2F2] text-[#DC2626]">{csvInvalid.length} error{csvInvalid.length !== 1 ? "s" : ""}</span>}
                </div>
                <Button variant="ghost" size="sm" onClick={clearCsv} className="h-7 text-[12px] text-[#64748b] hover:text-[#DC2626]">Clear</Button>
              </div>
              <Table>
                <TableHeader><TableRow className="bg-[#FAFAFA] hover:bg-[#FAFAFA]"><TableHead className="w-8 text-[10px] uppercase text-[#94a3b8] font-semibold tracking-wider">#</TableHead>{CSV_COLS.map((col) => <TableHead key={col} className="text-[10px] uppercase text-[#94a3b8] font-semibold tracking-wider">{col}</TableHead>)}<TableHead className="w-16 text-right text-[10px] uppercase text-[#94a3b8] font-semibold tracking-wider">status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {csvRows.map((row, i) => { const s = csvRowStatus(row); return (
                    <TableRow key={i} className={"h-11 " + (s.valid ? "hover:bg-[#F9FAFB]" : "bg-[#FEF2F2]/40")}>
                      <TableCell className="text-[#94a3b8] text-[11px] tabular-nums font-medium">{i + 1}</TableCell>
                      {CSV_COLS.map((col) => <TableCell key={col} className={"text-[12px] " + (!s.valid && col === "content_type" && row.content_type && !VALID_SLUGS.has(row.content_type) ? "text-[#DC2626] font-semibold" : col === "client_id" || col === "content_type" ? "font-mono text-[11px] text-[#64748b]" : "text-[#374151]")}>{row[col] || <span className="text-[#D1D5DB]">&mdash;</span>}</TableCell>)}
                      <TableCell className="text-right">{s.valid ? <span className="badge-pill bg-[#ECFDF5] text-[#059669]">valid</span> : <span className="badge-pill bg-[#FEF2F2] text-[#DC2626]">{s.error}</span>}</TableCell>
                    </TableRow>
                  ); })}
                </TableBody>
              </Table>
              <div className="action-bar flex items-center justify-between px-5 py-4">
                <span className="text-[12px] text-[#64748b]">{csvValid.length} page{csvValid.length !== 1 ? "s" : ""} will be imported as &ldquo;nieuw&rdquo;.{csvInvalid.length > 0 ? " " + csvInvalid.length + " skipped." : ""}</span>
                <div className="flex gap-2.5">
                  <Button variant="outline" size="sm" disabled={isSubmitting} onClick={handleCancel} className="h-[38px] rounded-[10px] border-[#d1d5db] text-[13.5px] font-semibold text-[#64748b]">Cancel</Button>
                  <Button size="sm" className="h-[38px] rounded-[10px] bg-[#534AB7] hover:bg-[#4338A0] px-5 text-[13.5px] font-semibold shadow-md shadow-[#534AB7]/25" disabled={csvValid.length === 0 || isSubmitting} onClick={handleCsvImport}>{isSubmitting ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : null}Import {csvValid.length}</Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
