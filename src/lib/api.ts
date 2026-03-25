// src/lib/api.ts
// Typed fetch wrappers for all iClicks API endpoints.
// Base URL is read from NEXT_PUBLIC_API_URL (defaults to localhost:8000).
// Swap the mock-data imports in each page for these functions when Mihai's
// endpoints are live — the data shapes are identical.

const BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

// ---------------------------------------------------------------------------
// Shared types  (mirror the Supabase data model exactly)
// ---------------------------------------------------------------------------

// Mihai's status flow: new → in_progress → review → approved / rejected | failed
export type PageStatus =
  | "new"
  | "in_progress"
  | "review"
  | "approved"
  | "rejected"
  | "failed";

export interface Client {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  branche?: string;
  tone_of_voice?: string;
  notes?: string;
  business_model?: string;
  market_model?: string;
  cta_preferences?: string;
}

export interface ContentType {
  id: string;
  slug: string;
  label: string;
  lower_bound?: number;
  upper_bound?: number;
  writing_perspective?: string;
  also_asked_handling?: string;
}

export interface Page {
  id: string;
  client_id: string;
  content_type_id: string;
  target_keyword: string;
  secondary_keywords: string[];
  target_url: string;
  priority: number;
  status: PageStatus;
}

export interface Article {
  id: string;
  page_id: string;
  content: string;
  score: number;
  score_details: Record<string, number>;
  version: number;
  created_at: string;
}

export interface Stats {
  total_pages: number;
  by_status: Record<string, number>;
  by_client: Record<string, number>;
  avg_cost: number;
  avg_generation_time: number;
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: ValidationError[];
}

export interface BatchGenerateResult {
  queued: number;
  job_ids: string[];
}

// SSE event shape from GET /api/progress
export interface ProgressEvent {
  page_id: string;
  status: PageStatus;
  stage:
    | "briefing_start"
    | "briefing_done"
    | "writing_start"
    | "writing_progress"
    | "score_check"
    | "done";
  writing_progress?: number; // 0–100, only on writing_progress stage
}

// ---------------------------------------------------------------------------
// Internal fetch helper (JSON only — FormData handled separately)
// ---------------------------------------------------------------------------

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // ignore parse error, keep default message
    }
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// 1. Clients — GET /get_clients
// Response: { clients: [...] }
// ---------------------------------------------------------------------------

export async function getClients(): Promise<Client[]> {
  const data = await apiFetch<{ clients: Client[] }>("/get_clients");
  return data.clients;
}

// ---------------------------------------------------------------------------
// 1b. Create client — POST /add_client
// ---------------------------------------------------------------------------

export interface CreateClientBody {
  name: string;
  slug: string;
  domain?: string;
  branche?: string;
  tone_of_voice?: string;
  notes?: string;
  business_model?: string;
  market_model?: string;
  cta_preferences?: string;
}

export async function createClient(
  body: CreateClientBody
): Promise<Client> {
  return apiFetch<Client>("/add_client", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// 2. Content types — GET /api/content-types
// ---------------------------------------------------------------------------

export async function getContentTypes(): Promise<ContentType[]> {
  const data = await apiFetch<{ content_types: ContentType[] }>(
    "/api/content-types"
  );
  return data.content_types;
}

// ---------------------------------------------------------------------------
// 3. Create/save form — POST /add_form
// Single endpoint: run=false saves as "new", run=true saves AND queues generation
// ---------------------------------------------------------------------------

export interface CreatePageBody {
  client_id: string;
  content_type: string;       // slug, e.g. "seo_dienstenpagina_b2c"
  target_keyword: string;
  secondary_keywords?: string;
  search_intent?: string;
  target_url?: string;
  page_goal?: string;
  priority?: string;
  instructions?: string;      // passed VERBATIM to writer agent
  internal_links?: string;
  reference_url?: string;
  meta_title?: string;
  meta_description?: string;
  competitor_urls?: string;
  also_asked?: string;
  serp_notes?: string;
  page_cta?: string;
  target_word_count?: number;
  run?: boolean;              // true = save + immediately queue for generation
}

export async function createPage(
  body: CreatePageBody
): Promise<{ id: string; status: string; created_at: string }> {
  return apiFetch<{ id: string; status: string; created_at: string }>(
    "/add_form",
    { method: "POST", body: JSON.stringify(body) }
  );
}

// ---------------------------------------------------------------------------
// 4. Get all forms — GET /get_forms
// Also used with ?form_id=X to get a single form (Screen 3)
// ---------------------------------------------------------------------------

export interface GetPagesParams {
  status?: string;
  client_id?: string;
  priority?: number;
}

export async function getPages(
  params: GetPagesParams = {}
): Promise<{ pages: Page[]; total: number }> {
  const qs = new URLSearchParams();
  if (params.status && params.status !== "all") qs.set("status", params.status);
  if (params.client_id && params.client_id !== "all")
    qs.set("client_id", params.client_id);
  if (params.priority) qs.set("priority", String(params.priority));

  const query = qs.toString() ? `?${qs}` : "";
  return apiFetch<{ pages: Page[]; total: number }>(`/get_forms${query}`);
}

// ---------------------------------------------------------------------------
// 4b. Stats — derived from /get_forms (no separate endpoint from Mihai yet)
// ---------------------------------------------------------------------------

export async function getStats(): Promise<Stats> {
  // Try dedicated stats endpoint first, fall back to computing from forms
  try {
    return await apiFetch<Stats>("/api/stats");
  } catch {
    const { pages } = await getPages();
    const by_status: Record<string, number> = {};
    const by_client: Record<string, number> = {};
    for (const p of pages) {
      by_status[p.status] = (by_status[p.status] ?? 0) + 1;
      by_client[p.client_id] = (by_client[p.client_id] ?? 0) + 1;
    }
    return { total_pages: pages.length, by_status, by_client, avg_cost: 0, avg_generation_time: 0 };
  }
}

// ---------------------------------------------------------------------------
// 5. CSV import — POST /api/import/csv (FormData)
// ---------------------------------------------------------------------------

export async function importCsv(
  file: File,
  clientId: string,
  contentTypeId: string
): Promise<ImportResult> {
  const form = new FormData();
  form.append("csv", file);
  form.append("client_id", clientId);
  form.append("content_type_id", contentTypeId);

  // Do NOT set Content-Type — browser sets it automatically (with boundary)
  const res = await fetch(`${BASE}/api/import/csv`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {}
    throw new Error(message);
  }

  return res.json() as Promise<ImportResult>;
}

// ---------------------------------------------------------------------------
// 6. Batch generate — POST /generate_forms
// Only works on "new" or "failed" forms
// ---------------------------------------------------------------------------

export async function batchGenerate(
  pageIds: string[]
): Promise<BatchGenerateResult> {
  return apiFetch<BatchGenerateResult>("/generate_forms", {
    method: "POST",
    body: JSON.stringify({ ids: pageIds }),
  });
}

// ---------------------------------------------------------------------------
// 7. Get single form — GET /get_forms?form_id=X
// ---------------------------------------------------------------------------

export async function getPageWithArticle(
  pageId: string
): Promise<{ page: Page; article?: Article }> {
  return apiFetch<{ page: Page; article?: Article }>(
    `/get_forms?form_id=${encodeURIComponent(pageId)}`
  );
}

// ---------------------------------------------------------------------------
// 8. Evaluate (approve/reject) — PATCH /evaluate_form
// Only works for forms in "review" status
// ---------------------------------------------------------------------------

export async function approveArticle(
  pageId: string
): Promise<{ form_id: string; status: string }> {
  return apiFetch<{ form_id: string; status: string }>(
    "/evaluate_form",
    { method: "PATCH", body: JSON.stringify({ form_id: pageId, approved: true }) }
  );
}

export async function rejectArticle(
  pageId: string
): Promise<{ form_id: string; status: string }> {
  return apiFetch<{ form_id: string; status: string }>(
    "/evaluate_form",
    { method: "PATCH", body: JSON.stringify({ form_id: pageId, approved: false }) }
  );
}

// ---------------------------------------------------------------------------
// 10. SSE progress stream — GET /api/progress
// Returns an EventSource. Caller must call .close() on cleanup.
// ---------------------------------------------------------------------------

// Maps raw API stage strings to the 5 UI stage indices used in the
// pipeline progress panel: 0=Queued 1=Briefing 2=Writing 3=Score check 4=Done
export const STAGE_INDEX: Record<ProgressEvent["stage"], number> = {
  briefing_start: 1,
  briefing_done: 1,
  writing_start: 2,
  writing_progress: 2,
  score_check: 3,
  done: 4,
};

export function openProgressStream(
  onEvent: (e: ProgressEvent) => void,
  onError?: (e: Event) => void
): EventSource {
  const es = new EventSource(`${BASE}/api/progress`);

  es.onmessage = (raw) => {
    try {
      const parsed: ProgressEvent = JSON.parse(raw.data);
      onEvent(parsed);
    } catch {
      // Ignore malformed events
    }
  };

  if (onError) {
    es.onerror = onError;
  }

  return es; // Caller must call es.close() in cleanup
}
