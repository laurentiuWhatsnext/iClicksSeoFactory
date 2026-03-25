"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import * as api from "@/lib/api";
import type { Page, Article, Client, ContentType, PageStatus } from "@/lib/api";
import { MOCK_CLIENTS, MOCK_CONTENT_TYPES, MOCK_PAGES, MOCK_ARTICLE } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ArrowLeft, XCircle, CheckCircle2, Loader2, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_BADGE: Record<PageStatus, { cls: string; label: string }> = {
  new: { cls: "bg-[#F3F4F6] text-[#6B7280] border border-[#E5E7EB]", label: "New" },
  in_progress: { cls: "bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]", label: "In Progress" },
  review: { cls: "bg-[#DBEAFE] text-[#1D4ED8] border border-[#93C5FD]", label: "Review" },
  approved: { cls: "bg-[#D1FAE5] text-[#047857] border border-[#6EE7B7]", label: "Approved" },
  rejected: { cls: "bg-[#FEE2E2] text-[#B91C1C] border border-[#FCA5A5]", label: "Rejected" },
  failed: { cls: "bg-[#FEE2E2] text-[#7F1D1D] border border-[#FCA5A5]", label: "Failed" },
};

const SCORE_LABELS: Record<string, string> = {
  keyword_usage: "Keyword usage",
  word_count: "Word count",
  structure: "Structure",
  meta_optimisation: "Meta SEO",
  readability: "Readability",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function scoreColor(s: number) {
  if (s >= 80) return "text-[#059669]";
  if (s >= 60) return "text-[#D97706]";
  return "text-[#DC2626]";
}

function scoreBarClass(s: number) {
  if (s >= 80) return "[&>div]:bg-[#059669]";
  if (s >= 60) return "[&>div]:bg-[#D97706]";
  return "[&>div]:bg-[#DC2626]";
}

function priorityLabel(p: number) {
  return p === 1 ? "High" : p === 2 ? "Medium" : "Low";
}

function lookupClient(id: string, clients: Client[]) {
  return clients.find((c) => c.id === id)?.name ?? id;
}

function lookupContentType(id: string, types: ContentType[]) {
  return types.find((ct) => ct.id === id)?.label ?? id;
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function ReviewSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.42fr] animate-pulse">
      <div className="space-y-4">
        <div className="h-8 w-2/3 rounded-lg bg-[#F3F4F6]" />
        <div className="rounded-xl bg-white border border-[#E5E7EB] p-6 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-4 w-full rounded-lg bg-[#F3F4F6]" />
          ))}
        </div>
      </div>
      <div className="space-y-4">
        <div className="rounded-xl bg-white border border-[#E5E7EB] p-5 space-y-4">
          <div className="h-16 w-24 rounded-lg bg-[#F3F4F6]" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-4 w-full rounded-lg bg-[#F3F4F6]" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ReviewPage({
  params,
}: {
  params: Promise<{ pageId: string }>;
}) {
  const { pageId } = use(params);

  const [page, setPage] = useState<Page | null>(null);
  const [article, setArticle] = useState<Article | null>(null);
  const [clients, setClients] = useState<Client[]>(MOCK_CLIENTS);
  const [contentTypes, setContentTypes] = useState<ContentType[]>(MOCK_CONTENT_TYPES);
  const [status, setStatus] = useState<PageStatus>("review");

  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [approved, setApproved] = useState(false);

  // ---------------------------------------------------------------------------
  // Load
  // ---------------------------------------------------------------------------

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setApiError(null);
      try {
        const [pageResult, clientsResult, contentTypesResult] = await Promise.all([
          api.getPageWithArticle(pageId), api.getClients(), api.getContentTypes(),
        ]);
        setPage(pageResult.page);
        setArticle(pageResult.article ?? null);
        setStatus(pageResult.page.status);
        setClients(clientsResult);
        setContentTypes(contentTypesResult);
      } catch {
        console.log("[Mock mode] Using local mock data for review.");
        const mockPage = MOCK_PAGES.find((p) => p.id === pageId);
        if (mockPage) {
          setPage(mockPage as Page);
          setStatus(mockPage.status as PageStatus);
          setArticle(MOCK_ARTICLE as Article);
        } else {
          setApiError(`Page "${pageId}" not found.`);
        }
        setClients(MOCK_CLIENTS);
        setContentTypes(MOCK_CONTENT_TYPES);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [pageId]);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  async function handleApprove() {
    setIsApproving(true);
    try {
      await api.approveArticle(pageId);
      setStatus("approved");
      setApproved(true);
      toast.success("Article approved — status set to approved.");
    } catch {
      console.log("[Mock mode] Approved page:", pageId);
      setStatus("approved");
      setApproved(true);
      toast.success("Article approved — status set to approved. (mock)");
    } finally {
      setIsApproving(false);
    }
  }

  async function handleReject() {
    setIsRegenerating(true);
    try {
      await api.rejectArticle(pageId);
      setStatus("rejected");
      toast.success("Article rejected — form can be re-run.");
    } catch {
      console.log("[Mock mode] Rejected page:", pageId);
      setStatus("rejected");
      toast.success("Article rejected — form can be re-run. (mock)");
    } finally {
      setIsRegenerating(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Link href="/pipeline" className="inline-flex items-center gap-1.5 text-[13px] text-[#6B7280] hover:text-[#0F0F0F] transition-colors">
          <ArrowLeft className="size-3.5" />
          Back to pipeline
        </Link>
        <ReviewSkeleton />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Error state
  // ---------------------------------------------------------------------------

  if (apiError || !page) {
    return (
      <div className="space-y-4">
        <Link href="/pipeline" className="inline-flex items-center gap-1.5 text-[13px] text-[#6B7280] hover:text-[#0F0F0F] transition-colors">
          <ArrowLeft className="size-3.5" />
          Back to pipeline
        </Link>
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Failed to load article</AlertTitle>
          <AlertDescription>{apiError ?? `Page "${pageId}" not found.`}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-5">
      {/* Back link */}
      <Link
        href="/pipeline"
        className="inline-flex items-center gap-1.5 text-[13px] text-[#6B7280] hover:text-[#0F0F0F] transition-colors"
      >
        <ArrowLeft className="size-3.5" />
        Back to pipeline
      </Link>

      {/* Heading */}
      <div className="flex items-start gap-3">
        <h1 className="text-xl font-semibold tracking-tight text-[#0F0F0F]">
          {page.target_keyword}
        </h1>
        <span className={`mt-1 inline-flex shrink-0 items-center rounded-md px-3 py-1 text-xs font-semibold ${(STATUS_BADGE[status] ?? STATUS_BADGE.review).cls}`}>
          {(STATUS_BADGE[status] ?? STATUS_BADGE.review).label}
        </span>
      </div>

      {/* Two-column grid */}
      <div className="grid gap-6 lg:grid-cols-[1fr_0.42fr]">

        {/* LEFT — Article content */}
        <Card className="card-elevated border-[#E5E7EB] rounded-xl overflow-hidden">
          <CardContent className="p-6">
            {article ? (
              <div className="prose prose-sm max-w-none">
                <pre className="whitespace-pre-wrap font-sans text-[14px] leading-[1.7] text-[#374151]">
                  {article.content}
                </pre>
              </div>
            ) : (
              <p className="text-[13px] text-[#9CA3AF] italic">
                No article generated yet. Use the pipeline to trigger generation.
              </p>
            )}
          </CardContent>
        </Card>

        {/* RIGHT — Score + details + actions (sticky) */}
        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">

          {/* Score card */}
          {article ? (
            <Card className="card-elevated border-[#E5E7EB] rounded-xl overflow-hidden">
              <CardContent className="p-5 space-y-5">
                <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-[#9CA3AF]">
                  Quality score
                </p>

                {/* Big score */}
                <div className="flex items-baseline gap-1">
                  <span className={`text-[48px] font-bold tabular-nums leading-none ${scoreColor(article.score)}`}>
                    {article.score}
                  </span>
                  <span className="text-base text-[#9CA3AF]">/ 100</span>
                </div>

                <div className="h-px bg-[#F3F4F6]" />

                {/* Sub-scores */}
                <div className="space-y-3.5">
                  {Object.entries(article.score_details).map(([key, value]) => (
                    <div key={key} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] text-[#6B7280]">
                          {SCORE_LABELS[key] ?? key}
                        </span>
                        <span className={`text-[12px] font-semibold tabular-nums ${scoreColor(value)}`}>
                          {value}
                        </span>
                      </div>
                      <Progress value={value} className={`h-[3px] ${scoreBarClass(value)}`} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="card-elevated border-[#E5E7EB] rounded-xl">
              <CardContent className="p-5 text-[13px] text-[#9CA3AF] italic">
                Score will appear once an article is generated.
              </CardContent>
            </Card>
          )}

          {/* Page details */}
          <Card className="card-elevated border-[#E5E7EB] rounded-xl overflow-hidden">
            <CardContent className="p-5 space-y-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-[#9CA3AF]">
                Page details
              </p>

              <dl className="space-y-3">
                {[
                  { label: "Client", value: lookupClient(page.client_id, clients) },
                  { label: "Content type", value: lookupContentType(page.content_type_id, contentTypes) },
                  { label: "Target URL", value: page.target_url, mono: true },
                  { label: "Priority", value: priorityLabel(page.priority) },
                  ...(article ? [{ label: "Version", value: String(article.version) }] : []),
                ].map(({ label, value, mono }) => (
                  <div key={label} className="flex items-center justify-between py-1 border-b border-[#F3F4F6] last:border-0">
                    <dt className="text-[12px] text-[#9CA3AF]">{label}</dt>
                    <dd className={`text-[12px] font-medium text-[#0F0F0F] ${mono ? "font-mono text-[11px]" : ""}`}>
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 h-10 rounded-lg border-[#DC2626]/30 text-[13px] font-medium text-[#DC2626] hover:bg-[#FEF2F2] hover:border-[#DC2626]/50"
              onClick={handleReject}
              disabled={isRegenerating || isApproving || approved || status === "rejected"}
            >
              {isRegenerating ? (
                <><Loader2 className="size-4 animate-spin" />Rejecting&hellip;</>
              ) : status === "rejected" ? (
                <><XCircle className="size-4" />Rejected</>
              ) : (
                <><XCircle className="size-4" />Reject</>
              )}
            </Button>

            <Button
              className={`flex-1 h-10 rounded-lg text-[13px] font-medium shadow-sm ${
                approved
                  ? "bg-[#059669] hover:bg-[#059669] cursor-default"
                  : "bg-[#534AB7] hover:bg-[#4338A0]"
              }`}
              onClick={handleApprove}
              disabled={approved || isApproving || isRegenerating || !article}
            >
              {isApproving ? (
                <><Loader2 className="size-4 animate-spin" />Approving\u2026</>
              ) : approved ? (
                <><CheckCircle2 className="size-4" />Approved</>
              ) : (
                <><CheckCircle2 className="size-4" />Approve</>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
