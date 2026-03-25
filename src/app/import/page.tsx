"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle, Plus,
  Loader2, ChevronDown, ChevronRight, Zap,
} from "lucide-react";
import { MOCK_CLIENTS, MOCK_CONTENT_TYPES } from "@/lib/mock-data";
import * as api from "@/lib/api";
import type { Client } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";


function FormGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-x-6 items-start py-5">
      <div className="form-section-label pt-2 select-none">{label}</div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function FieldLabel({ children, required, hint }: { children: React.ReactNode; required?: boolean; hint?: string }) {
  return (
    <div>
      <label className="block text-[13px] font-medium text-[#374151]">
        {children}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {hint && <p className="text-[11px] text-[#9ca3af] mt-0.5">{hint}</p>}
    </div>
  );
}

export default function AssignmentPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>(MOCK_CLIENTS as Client[]);
  const [showAddClient, setShowAddClient] = useState(false);
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
  const [priority, setPriority] = useState("low");
  const [serpOpen, setSerpOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const selectedClient = clients.find((c) => c.id === clientId);
  const selectedCT = MOCK_CONTENT_TYPES.find((ct) => ct.slug === contentTypeSlug);
  const formValid = !!clientId && !!contentTypeSlug && !!targetKeyword.trim();

  const inp = "flex h-9 w-full rounded-lg border border-[#d1d5db] bg-white px-3 text-sm text-[#111827] placeholder:text-[#9ca3af] focus:border-[#534AB7] focus:ring-2 focus:ring-[#534AB7]/10 focus:outline-none";
  const ta = "flex w-full rounded-lg border border-[#d1d5db] bg-white px-3 py-2 text-sm text-[#111827] placeholder:text-[#9ca3af] focus:border-[#534AB7] focus:ring-2 focus:ring-[#534AB7]/10 focus:outline-none resize-none";

  function handleCancel() { setClientId(""); setContentTypeSlug(""); setTargetKeyword(""); setSecondaryKeywords(""); setSearchIntent("transactional"); setTargetUrl(""); setPageGoal(""); setInstructions(""); setInternalLinks(""); setReferenceUrl(""); setMetaTitle(""); setMetaDescription(""); setCompetitorUrls(""); setAlsoAsked(""); setSerpNotes(""); setPageCta(""); setWordCount(""); setPriority("low"); setApiError(null); }

  async function handleSave(run: boolean) {
    if (!formValid) return;
    setIsSubmitting(true); setApiError(null);
    const body: api.CreatePageBody = {
      client_id: clientId,
      content_type: contentTypeSlug,
      target_keyword: targetKeyword,
      secondary_keywords: secondaryKeywords || undefined,
      search_intent: searchIntent || undefined,
      target_url: targetUrl || undefined,
      page_goal: pageGoal || undefined,
      instructions: instructions || undefined,
      internal_links: internalLinks || undefined,
      reference_url: referenceUrl || undefined,
      meta_title: metaTitle || undefined,
      meta_description: metaDescription || undefined,
      competitor_urls: competitorUrls || undefined,
      also_asked: alsoAsked || undefined,
      serp_notes: serpNotes || undefined,
      page_cta: pageCta || undefined,
      target_word_count: wordCount ? parseInt(wordCount, 10) : undefined,
      priority: priority || undefined,
      run,
    };
    try {
      await api.createPage(body);
      toast.success(run ? "Page saved & generation queued." : "Page saved successfully.");
      await new Promise((r) => setTimeout(r, 500));
      router.push("/pipeline");
    } catch {
      console.log("[Mock mode] POST /add_form payload:", body);
      toast.success(run ? "Page saved & generation queued. (mock)" : "Page saved successfully. (mock)");
      await new Promise((r) => setTimeout(r, 500));
      router.push("/pipeline");
    } finally {
      setIsSubmitting(false);
    }
  }


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-[#111827]">New page assignment</h1>
          <p className="text-sm text-[#6b7280] mt-0.5">Create a new SEO page assignment.</p>
        </div>
      </div>

      {apiError && <Alert variant="destructive"><AlertCircle className="size-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{apiError}</AlertDescription></Alert>}

      <div className="card-elevated-lg rounded-xl overflow-hidden">
          <div className="px-6 py-2 divide-y divide-[#f0f0f0]">
            <FormGroup label="Linking">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <FieldLabel required>Client</FieldLabel>
                  <div className="flex gap-2">
                    <Select value={clientId} onValueChange={setClientId}><SelectTrigger className="flex-1 h-9 rounded-lg border-[#d1d5db] text-sm"><SelectValue placeholder="Select client..." /></SelectTrigger><SelectContent className="rounded-lg shadow-lg border-[#e5e7eb]">{clients.map((c) => <SelectItem key={c.id} value={c.id} className="text-[13px]">{c.name} ({c.id})</SelectItem>)}</SelectContent></Select>
                    <Button type="button" variant="outline" size="sm" onClick={() => setShowAddClient(true)} className="h-9 w-9 p-0 rounded-lg border-[#d1d5db] text-[#6b7280] hover:text-[#534AB7] hover:border-[#534AB7]" title="Add new client"><Plus className="size-4" /></Button>
                  </div>
                  {selectedClient && (
                    <div className="rounded-lg bg-[#f9fafb] border border-[#e5e7eb] p-3 space-y-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-medium text-[#111827]">{selectedClient.name}</span>
                        {selectedClient.branche && <span className="badge-pill bg-[#EEEDFE] text-[#534AB7]">{selectedClient.branche}</span>}
                        {selectedClient.business_model && <span className="badge-pill bg-[#ECFDF5] text-[#059669]">{selectedClient.business_model}</span>}
                        {selectedClient.market_model && <span className="badge-pill bg-[#FFFBEB] text-[#D97706]">{selectedClient.market_model}</span>}
                      </div>
                      {selectedClient.tone_of_voice && <p className="text-xs text-[#6b7280]"><span className="text-[#9ca3af]">Tone:</span> {selectedClient.tone_of_voice}</p>}
                      {selectedClient.notes && <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">{selectedClient.notes}</p>}
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <FieldLabel required>Content type</FieldLabel>
                  <Select value={contentTypeSlug} onValueChange={setContentTypeSlug}><SelectTrigger className="w-full h-9 rounded-lg border-[#d1d5db] text-sm"><SelectValue placeholder="Select content type..." /></SelectTrigger><SelectContent className="rounded-lg shadow-lg border-[#e5e7eb]">{MOCK_CONTENT_TYPES.map((ct) => <SelectItem key={ct.slug} value={ct.slug} className="text-[13px] font-mono">{ct.slug}</SelectItem>)}</SelectContent></Select>
                  {selectedCT && <div className="flex items-center gap-2 text-xs text-[#6b7280]"><span className="badge-pill bg-amber-50 text-amber-700">{selectedCT.lower_bound}&ndash;{selectedCT.upper_bound} words</span><span>{selectedCT.writing_perspective} &middot; {selectedCT.also_asked_handling}</span></div>}
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
              <Select value={searchIntent} onValueChange={setSearchIntent}><SelectTrigger className="max-w-[200px] h-9 rounded-lg border-[#d1d5db] text-sm"><SelectValue /></SelectTrigger><SelectContent className="rounded-lg shadow-lg border-[#e5e7eb]"><SelectItem value="transactional" className="text-[13px]">transactional</SelectItem><SelectItem value="informational" className="text-[13px]">informational</SelectItem><SelectItem value="local" className="text-[13px]">local</SelectItem></SelectContent></Select>
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
                <p className="text-xs text-[#9ca3af]">Leave empty for auto-generation</p>
                <div className="flex gap-4">
                  <div className="flex-1 space-y-1.5"><FieldLabel>Meta title</FieldLabel><div className="relative"><input className={inp} placeholder="Max 60 characters" maxLength={60} value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} />{metaTitle && <span className={"absolute right-3 top-1/2 -translate-y-1/2 text-[10px] tabular-nums " + (metaTitle.length > 55 ? "text-[#D97706]" : "text-[#94a3b8]")}>{metaTitle.length}/60</span>}</div></div>
                  <div className="flex-1 space-y-1.5"><FieldLabel>Meta description</FieldLabel><div className="relative"><input className={inp} placeholder="Max 155 characters" maxLength={155} value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} />{metaDescription && <span className={"absolute right-3 top-1/2 -translate-y-1/2 text-[10px] tabular-nums " + (metaDescription.length > 145 ? "text-[#D97706]" : "text-[#94a3b8]")}>{metaDescription.length}/155</span>}</div></div>
                </div>
              </div>
            </FormGroup>

            <div className="py-5">
              <button type="button" onClick={() => setSerpOpen(!serpOpen)} className="group flex items-center gap-1.5 text-xs font-medium text-[#9ca3af] uppercase tracking-wide hover:text-[#534AB7]">
                {serpOpen ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                SERP analysis (optional)
              </button>
              {serpOpen && (
                <div className="mt-3 pl-[126px] space-y-3">
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
                <div className="w-[130px] space-y-1.5"><FieldLabel>Priority</FieldLabel><Select value={priority} onValueChange={setPriority}><SelectTrigger className="h-9 rounded-lg border-[#d1d5db] text-sm"><SelectValue /></SelectTrigger><SelectContent className="rounded-lg shadow-lg border-[#e5e7eb]"><SelectItem value="high" className="text-[13px]">High</SelectItem><SelectItem value="medium" className="text-[13px]">Medium</SelectItem><SelectItem value="low" className="text-[13px]">Low</SelectItem></SelectContent></Select></div>
              </div>
            </FormGroup>
          </div>

          <div className="action-bar flex items-center justify-between px-6 py-3">
            <div className="flex items-center gap-1.5 text-xs text-[#9ca3af]">
              <span>Status</span>
              <span className="badge-pill bg-gray-100 text-[#6b7280]">new</span>
              <span>&middot;</span>
              <span>ID auto-generated</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleCancel} disabled={isSubmitting} className="h-8 rounded-lg text-sm text-[#6b7280]">Cancel</Button>
              <Button size="sm" className="h-8 rounded-lg bg-[#534AB7] hover:bg-[#4a42a0] px-4 text-sm" disabled={!formValid || isSubmitting} onClick={() => handleSave(false)}>{isSubmitting ? <Loader2 className="size-3.5 animate-spin" /> : null}Save</Button>
              <Button size="sm" className="h-8 rounded-lg bg-[#111827] hover:bg-black px-4 text-sm text-white" disabled={!formValid || isSubmitting} onClick={() => handleSave(true)}><Zap className="size-3" />Save + Generate</Button>
            </div>
          </div>
        </div>

      {/* Add Client Dialog */}
      <AddClientDialog
        open={showAddClient}
        onClose={() => setShowAddClient(false)}
        onCreated={(client) => {
          setClients((prev) => [...prev, client]);
          setClientId(client.id);
          setShowAddClient(false);
          toast.success(`Client "${client.name}" added.`);
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add Client Dialog
// ---------------------------------------------------------------------------

function AddClientDialog({
  open, onClose, onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (client: Client) => void;
}) {
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [branche, setBranche] = useState("");
  const [businessModel, setBusinessModel] = useState("B2C");
  const [marketModel, setMarketModel] = useState("National");
  const [toneOfVoice, setToneOfVoice] = useState("");
  const [ctaPreferences, setCtaPreferences] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const inp = "flex h-9 w-full rounded-lg border border-[#d1d5db] bg-white px-3 text-sm text-[#111827] placeholder:text-[#9ca3af] focus:border-[#534AB7] focus:ring-2 focus:ring-[#534AB7]/10 focus:outline-none";
  const ta = "flex w-full rounded-lg border border-[#d1d5db] bg-white px-3 py-2 text-sm text-[#111827] placeholder:text-[#9ca3af] focus:border-[#534AB7] focus:ring-2 focus:ring-[#534AB7]/10 focus:outline-none resize-none";

  function resetForm() {
    setName(""); setDomain(""); setBranche(""); setBusinessModel("B2C");
    setMarketModel("National"); setToneOfVoice(""); setCtaPreferences(""); setNotes("");
  }

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const body: api.CreateClientBody = {
      name: name.trim(), slug,
      domain: domain || undefined,
      branche: branche || undefined,
      business_model: businessModel,
      market_model: marketModel,
      tone_of_voice: toneOfVoice || undefined,
      cta_preferences: ctaPreferences || undefined,
      notes: notes || undefined,
    };
    try {
      const created = await api.createClient(body);
      resetForm();
      onCreated(created);
    } catch {
      // Mock fallback — generate a local ID
      const mockClient: Client = { id: `C${Date.now()}`, ...body };
      console.log("[Mock mode] POST /add_client payload:", body);
      resetForm();
      onCreated(mockClient);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { resetForm(); onClose(); } }}>
      <DialogContent className="sm:max-w-[480px] rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Add new client</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div className="space-y-1">
            <label className="text-[13px] font-medium text-[#374151]">Name <span className="text-red-500">*</span></label>
            <input className={inp} placeholder="e.g. King Laminaat" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="space-y-1">
            <label className="text-[13px] font-medium text-[#374151]">Domain</label>
            <input className={inp} placeholder="https://example.nl" value={domain} onChange={(e) => setDomain(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-[13px] font-medium text-[#374151]">Branche</label>
            <input className={inp} placeholder="e.g. Vloerenretail, Automotive" value={branche} onChange={(e) => setBranche(e.target.value)} />
          </div>
          <div className="flex gap-3">
            <div className="flex-1 space-y-1">
              <label className="text-[13px] font-medium text-[#374151]">Business model</label>
              <Select value={businessModel} onValueChange={setBusinessModel}>
                <SelectTrigger className="h-9 rounded-lg border-[#d1d5db] text-sm"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-lg shadow-lg border-[#e5e7eb]">
                  <SelectItem value="B2C" className="text-[13px]">B2C</SelectItem>
                  <SelectItem value="B2B" className="text-[13px]">B2B</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-[13px] font-medium text-[#374151]">Market model</label>
              <Select value={marketModel} onValueChange={setMarketModel}>
                <SelectTrigger className="h-9 rounded-lg border-[#d1d5db] text-sm"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-lg shadow-lg border-[#e5e7eb]">
                  <SelectItem value="National" className="text-[13px]">National</SelectItem>
                  <SelectItem value="Regional" className="text-[13px]">Regional</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[13px] font-medium text-[#374151]">Tone of voice</label>
            <input className={inp} placeholder="e.g. modern, professioneel, warm" value={toneOfVoice} onChange={(e) => setToneOfVoice(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-[13px] font-medium text-[#374151]">CTA preferences</label>
            <input className={inp} placeholder="e.g. Bekijk collectie, Vraag offerte aan" value={ctaPreferences} onChange={(e) => setCtaPreferences(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-[13px] font-medium text-[#374151]">Notes</label>
            <textarea className={ta} rows={2} placeholder="Special instructions or restrictions..." value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-3 border-t border-[#f0f0f0]">
          <Button variant="outline" size="sm" onClick={() => { resetForm(); onClose(); }} className="h-8 rounded-lg text-sm text-[#6b7280]">Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={!name.trim() || saving} className="h-8 rounded-lg bg-[#534AB7] hover:bg-[#4a42a0] px-4 text-sm">
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
            Add client
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
