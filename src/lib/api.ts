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

export type PageStatus =
  | "nieuw"
  | "in_progress"
  | "review"
  | "needs_review"
  | "done";

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
// 1. Clients — GET /api/clients
// ---------------------------------------------------------------------------

export async function getClients(): Promise<Client[]> {
  const data = await apiFetch<{ clients: Client[] }>("/api/clients");
  return data.clients;
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
// 3a. Create page — POST /api/pages (single page)
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
  instructions?: string;
  internal_links?: string;
  reference_url?: string;
  meta_title?: string;
  meta_description?: string;
  competitor_urls?: string;
  also_asked?: string;
  serp_notes?: string;
  page_cta?: string;
  target_word_count?: number;
}

export async function createPage(
  body: CreatePageBody
): Promise<{ id: string; status: string; created_at: string }> {
  return apiFetch<{ id: string; status: string; created_at: string }>(
    "/api/pages",
    { method: "POST", body: JSON.stringify(body) }
  );
}

// ---------------------------------------------------------------------------
// 3b. Generate single page — POST /api/pages/:id/generate
// ---------------------------------------------------------------------------

export async function generatePage(
  pageId: string
): Promise<{ page_id: string; status: string; message: string }> {
  return apiFetch<{ page_id: string; status: string; message: string }>(
    `/api/pages/${pageId}/generate`,
    { method: "POST", body: JSON.stringify({}) }
  );
}

// ---------------------------------------------------------------------------
// 4. Pages — GET /api/pages (with optional filters)
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
  return apiFetch<{ pages: Page[]; total: number }>(`/api/pages${query}`);
}

// ---------------------------------------------------------------------------
// 4. Stats — GET /api/stats
// ---------------------------------------------------------------------------

export async function getStats(): Promise<Stats> {
  return apiFetch<Stats>("/api/stats");
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
// 6. Batch generate — POST /api/pages/batch-generate
// ---------------------------------------------------------------------------

export async function batchGenerate(
  pageIds: string[]
): Promise<BatchGenerateResult> {
  return apiFetch<BatchGenerateResult>("/api/pages/batch-generate", {
    method: "POST",
    body: JSON.stringify({ page_ids: pageIds }),
  });
}

// ---------------------------------------------------------------------------
// 7. Get page + article — GET /api/pages/:id
// ---------------------------------------------------------------------------

export async function getPageWithArticle(
  pageId: string
): Promise<{ page: Page; article?: Article }> {
  return apiFetch<{ page: Page; article?: Article }>(`/api/pages/${pageId}`);
}

// ---------------------------------------------------------------------------
// 8. Approve article — POST /api/articles/:pageId/approve
// ---------------------------------------------------------------------------

export async function approveArticle(
  pageId: string
): Promise<{ article: Article }> {
  return apiFetch<{ article: Article }>(
    `/api/articles/${pageId}/approve`,
    { method: "POST" }
  );
}

// ---------------------------------------------------------------------------
// 9. Regenerate article — POST /api/articles/:pageId/regenerate
// ---------------------------------------------------------------------------

export async function regenerateArticle(
  pageId: string
): Promise<{ job_id: string }> {
  return apiFetch<{ job_id: string }>(
    `/api/articles/${pageId}/regenerate`,
    { method: "POST" }
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
