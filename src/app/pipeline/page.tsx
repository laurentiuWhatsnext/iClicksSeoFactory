"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { MOCK_CLIENTS, MOCK_CONTENT_TYPES, MOCK_PAGES, MOCK_STATS } from "@/lib/mock-data";
import * as api from "@/lib/api";
import type { Page, PageStatus, Client, ContentType, Stats } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ListChecks, Play, Eye, Loader2, AlertCircle, RefreshCw, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "nieuw", label: "Nieuw" },
  { value: "in_progress", label: "In progress" },
  { value: "review", label: "Review" },
  { value: "done", label: "Done" },
];

const PRIORITY_OPTIONS = [
  { value: "all", label: "All priorities" },
  { value: "1", label: "1 — Hoog" },
  { value: "2", label: "2 — Midden" },
  { value: "3", label: "3 — Laag" },
];

const STATUS_BADGE: Record<PageStatus, string> = {
  nieuw: "bg-[#F3F4F6] text-[#6B7280]",
  in_progress: "bg-[#FFFBEB] text-[#D97706]",
  review: "bg-[#EFF6FF] text-[#2563EB]",
  needs_review: "bg-[#FEF2F2] text-[#DC2626]",
  done: "bg-[#ECFDF5] text-[#059669]",
};

const PRIORITY_BADGE: Record<number, string> = {
  1: "bg-[#FEF2F2] text-[#DC2626]",
  2: "bg-[#FFFBEB] text-[#D97706]",
  3: "bg-[#F3F4F6] text-[#6B7280]",
};

const STAGES = ["Queued", "Briefing", "Writing", "Score check", "Done"] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ctLabel(id: string, types: ContentType[]) {
  return types.find((ct) => ct.id === id)?.label ?? id;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({ label, value, accent, loading }: { label: string; value: number; accent?: string; loading: boolean }) {
  return (
    <div className="rounded-xl bg-[#F9FAFB] p-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-[#9CA3AF]">{label}</p>
      {loading ? (
        <div className="h-8 w-12 animate-pulse rounded-lg bg-[#E5E7EB] mt-1.5" />
      ) : (
        <p className={`text-[28px] font-semibold tabular-nums mt-0.5 ${accent ?? "text-[#0F0F0F]"}`}>{value}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function PipelinePage() {
  const [pages, setPages] = useState<Page[]>([]);
  const [clients, setClients] = useState<Client[]>(MOCK_CLIENTS);
  const [contentTypes, setContentTypes] = useState<ContentType[]>(MOCK_CONTENT_TYPES);
  const [stats, setStats] = useState<Stats | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [generating, setGenerating] = useState<
    Map<string, { keyword: string; stageIndex: number }>
  >(new Map());

  const sseRef = useRef<EventSource | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // ---------------------------------------------------------------------------
  // Data load
  // ---------------------------------------------------------------------------

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const [pagesResult, statsResult, clientsResult, contentTypesResult] =
        await Promise.all([
          api.getPages(), api.getStats(), api.getClients(), api.getContentTypes(),
        ]);
      setPages(pagesResult.pages);
      setStats(statsResult);
      setClients(clientsResult);
      setContentTypes(contentTypesResult);
    } catch {
      console.log("[Mock mode] Using local mock data for pipeline.");
      setPages(MOCK_PAGES as Page[]);
      setStats(MOCK_STATS as Stats);
      setClients(MOCK_CLIENTS);
      setContentTypes(MOCK_CONTENT_TYPES);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    return () => {
      sseRef.current?.close();
      timersRef.current.forEach(clearTimeout);
    };
  }, [loadData]);

  // ---------------------------------------------------------------------------
  // Filtered pages
  // ---------------------------------------------------------------------------

  const filteredPages = pages.filter((p) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (priorityFilter !== "all" && p.priority !== Number(priorityFilter)) return false;
    if (clientFilter !== "all" && p.client_id !== clientFilter) return false;
    return true;
  });

  const byStatus = stats?.by_status ?? {};
  const totalPages = Object.values(byStatus).reduce((a, b) => a + b, 0);

  // ---------------------------------------------------------------------------
  // Selection
  // ---------------------------------------------------------------------------

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds(
      selectedIds.size === filteredPages.length
        ? new Set()
        : new Set(filteredPages.map((p) => p.id))
    );
  }

  // ---------------------------------------------------------------------------
  // Generate
  // ---------------------------------------------------------------------------

  async function handleGenerate() {
    const ids = Array.from(selectedIds);
    setSelectMode(false);
    setSelectedIds(new Set());

    const initial = new Map<string, { keyword: string; stageIndex: number }>();
    ids.forEach((id) => {
      const page = pages.find((p) => p.id === id);
      initial.set(id, { keyword: page?.target_keyword ?? id, stageIndex: 0 });
    });
    setGenerating(new Map(initial));

    try {
      await api.batchGenerate(ids);
      sseRef.current?.close();
      const remaining = new Set(ids);
      sseRef.current = api.openProgressStream(
        (event) => {
          if (!ids.includes(event.page_id)) return;
          const stageIndex = api.STAGE_INDEX[event.stage] ?? 0;
          setGenerating((prev) => {
            const next = new Map(prev);
            const entry = next.get(event.page_id);
            if (entry) next.set(event.page_id, { ...entry, stageIndex });
            return next;
          });
          if (event.stage === "done") {
            setPages((prev) => prev.map((p) => p.id === event.page_id ? { ...p, status: event.status } : p));
            remaining.delete(event.page_id);
            if (remaining.size === 0) { sseRef.current?.close(); toast.success("All pages generated successfully."); }
          }
        },
        () => { toast.error("Lost connection to progress stream."); }
      );
    } catch {
      console.log("[Mock mode] Simulating generation for:", ids);
      ids.forEach((id, idx) => {
        for (let stage = 1; stage < STAGES.length; stage++) {
          const delay = idx * 500 + stage * 2000;
          const timer = setTimeout(() => {
            setGenerating((prev) => {
              const next = new Map(prev);
              const entry = next.get(id);
              if (entry) next.set(id, { ...entry, stageIndex: stage });
              return next;
            });
            if (stage === STAGES.length - 1) {
              setPages((prev) => prev.map((p) => p.id === id ? { ...p, status: "review" as PageStatus } : p));
            }
          }, delay);
          timersRef.current.push(timer);
        }
      });
      const totalTime = (ids.length - 1) * 500 + (STAGES.length - 1) * 2000 + 200;
      timersRef.current.push(setTimeout(() => { toast.success("All pages generated successfully. (mock)"); }, totalTime));
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[#0F0F0F]">Pipeline</h1>
          <p className="text-[13px] text-[#6B7280] mt-0.5">
            Monitor pages and trigger AI content generation.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={loadData}
          disabled={isLoading}
          className="h-8 rounded-lg text-[13px] text-[#6B7280] hover:text-[#0F0F0F]"
        >
          <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Error */}
      {apiError && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Failed to load pipeline</AlertTitle>
          <AlertDescription>
            {apiError} —{" "}
            <button onClick={loadData} className="underline font-medium">try again</button>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total pages" value={totalPages} loading={isLoading} />
        <StatCard label="Done" value={byStatus.done ?? 0} accent="text-[#059669]" loading={isLoading} />
        <StatCard label="In progress" value={byStatus.in_progress ?? 0} accent="text-[#D97706]" loading={isLoading} />
        <StatCard label="Queued" value={byStatus.nieuw ?? 0} loading={isLoading} />
      </div>

      {/* Filters + actions */}
      <div className="flex flex-wrap items-center gap-2.5">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px] h-8 rounded-lg border-[#E5E7EB] text-[12px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-xl shadow-lg border-[#E5E7EB]">
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-[12px]">{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[150px] h-8 rounded-lg border-[#E5E7EB] text-[12px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-xl shadow-lg border-[#E5E7EB]">
            {PRIORITY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-[12px]">{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger className="w-[170px] h-8 rounded-lg border-[#E5E7EB] text-[12px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-xl shadow-lg border-[#E5E7EB]">
            <SelectItem value="all" className="text-[12px]">All clients</SelectItem>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id} className="text-[12px]">{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant={selectMode ? "default" : "outline"}
            size="sm"
            onClick={() => { setSelectMode(!selectMode); if (selectMode) setSelectedIds(new Set()); }}
            disabled={isLoading}
            className={`h-8 rounded-lg text-[13px] font-medium ${
              selectMode
                ? "bg-[#534AB7] hover:bg-[#4338A0] text-white"
                : "border-[#E5E7EB] text-[#6B7280] hover:text-[#0F0F0F]"
            }`}
          >
            <ListChecks className="size-3.5" />
            Select pages
          </Button>

          {selectMode && selectedIds.size > 0 && (
            <Button
              size="sm"
              onClick={handleGenerate}
              className="h-8 rounded-lg bg-[#534AB7] hover:bg-[#4338A0] text-[13px] font-medium shadow-sm animate-in fade-in-0 duration-200"
            >
              <Play className="size-3.5" />
              Generate selected ({selectedIds.size})
            </Button>
          )}
        </div>
      </div>

      {/* Pages table */}
      <Card className="card-elevated border-[#E5E7EB] rounded-xl overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F9FAFB] hover:bg-[#F9FAFB]">
                {selectMode && (
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      checked={filteredPages.length > 0 && selectedIds.size === filteredPages.length}
                      onChange={toggleSelectAll}
                      className="size-3.5 rounded border-gray-300 accent-[#534AB7]"
                    />
                  </TableHead>
                )}
                <TableHead className="text-[10px] uppercase text-[#9CA3AF] font-medium tracking-wide">Keyword</TableHead>
                <TableHead className="text-[10px] uppercase text-[#9CA3AF] font-medium tracking-wide">Content type</TableHead>
                <TableHead className="text-[10px] uppercase text-[#9CA3AF] font-medium tracking-wide">Priority</TableHead>
                <TableHead className="text-[10px] uppercase text-[#9CA3AF] font-medium tracking-wide">Status</TableHead>
                <TableHead className="text-right text-[10px] uppercase text-[#9CA3AF] font-medium tracking-wide">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={selectMode ? 6 : 5}>
                      <div className="h-5 w-full animate-pulse rounded-lg bg-[#F3F4F6]" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredPages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={selectMode ? 6 : 5} className="text-center py-12">
                    <p className="text-[13px] text-[#9CA3AF]">
                      {apiError ? "Could not load pages." : "No pages match the current filters."}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredPages.map((page) => {
                  const isSelected = selectedIds.has(page.id);
                  return (
                    <TableRow
                      key={page.id}
                      className={`h-12 transition-colors ${
                        isSelected
                          ? "bg-[#FAFAFF] border-l-2 border-l-[#534AB7]"
                          : "hover:bg-[#F9FAFB]"
                      }`}
                    >
                      {selectMode && (
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(page.id)}
                            className="size-3.5 rounded border-gray-300 accent-[#534AB7]"
                          />
                        </TableCell>
                      )}
                      <TableCell className="text-[13px] font-medium text-[#0F0F0F]">
                        {page.target_keyword}
                      </TableCell>
                      <TableCell className="text-[12px] text-[#6B7280]">
                        {ctLabel(page.content_type_id, contentTypes)}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${PRIORITY_BADGE[page.priority] ?? PRIORITY_BADGE[3]}`}>
                          {page.priority === 1 ? "Hoog" : page.priority === 2 ? "Midden" : "Laag"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_BADGE[page.status] ?? STATUS_BADGE.nieuw}`}>
                          {page.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {(page.status === "review" || page.status === "done") && (
                          <Link
                            href={`/review/${page.id}`}
                            className="inline-flex items-center gap-1 text-[12px] font-medium text-[#534AB7] hover:underline transition-colors"
                          >
                            View article
                            <Eye className="size-3" />
                          </Link>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Generation progress panel */}
      {generating.size > 0 && (
        <Card className="card-elevated border-[#E5E7EB] rounded-xl overflow-hidden border-l-[3px] border-l-[#534AB7]">
          <CardContent className="p-5 space-y-4">
            <h3 className="text-[13px] font-semibold text-[#0F0F0F] flex items-center gap-2">
              <Loader2 className="size-4 animate-spin text-[#534AB7]" />
              Generation progress
            </h3>
            {Array.from(generating.entries()).map(([id, { keyword, stageIndex }]) => {
              const pct = Math.round((stageIndex / (STAGES.length - 1)) * 100);
              const isDone = stageIndex === STAGES.length - 1;
              return (
                <div key={id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-medium text-[#0F0F0F]">{keyword}</span>
                    <span className={`text-[11px] font-medium flex items-center gap-1 ${isDone ? "text-[#059669]" : "text-[#6B7280]"}`}>
                      {isDone && <CheckCircle2 className="size-3" />}
                      {STAGES[stageIndex]}
                    </span>
                  </div>
                  <Progress value={pct} className="h-1" />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
