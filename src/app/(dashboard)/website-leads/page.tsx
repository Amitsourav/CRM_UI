"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ManagerGuard } from "@/components/shared/admin-guard";
import { PageHeader } from "@/components/shared/page-header";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebounce } from "@/hooks/use-debounce";
import {
  useWebsiteLeadForms,
  useWebsiteLeads,
} from "@/hooks/use-website-leads";
import { useWebsiteLeadCountStore } from "@/stores/website-lead-count-store";
import { websiteLeadsService } from "@/services/website-leads-service";
import {
  WebsiteLeadTable,
  WebsiteLeadTableSkeleton,
} from "@/components/website-leads/website-lead-table";
import { WebsiteLeadDrawer } from "@/components/website-leads/website-lead-drawer";
import { ConvertLeadDialog } from "@/components/website-leads/convert-lead-dialog";
import { Globe, RefreshCw, Search, X } from "lucide-react";
import type {
  WebsiteLeadCounts,
  WebsiteSubmission,
  WebsiteSubmissionStatus,
} from "@/types";

const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 400;
const ALL_FORMS = "__all__";

const TABS: Array<{ value: WebsiteSubmissionStatus; label: string }> = [
  { value: "new", label: "New" },
  { value: "converted", label: "Converted" },
  { value: "duplicate", label: "Duplicate" },
  { value: "spam", label: "Spam" },
];

const EMPTY_COPY: Record<WebsiteSubmissionStatus, { title: string; description: string }> =
  {
    new: {
      title: "No new website leads",
      description:
        "They'll appear here automatically when someone fills a form on the site.",
    },
    converted: {
      title: "Nothing converted yet",
      description:
        "Submissions you turn into leads from the New tab will be listed here.",
    },
    duplicate: {
      title: "No duplicates",
      description:
        "Submissions that match an existing lead by email or phone land here.",
    },
    spam: {
      title: "No spam",
      description:
        "Junk submissions you dismiss from the New tab will be kept here.",
    },
  };

function isStatus(value: string | null): value is WebsiteSubmissionStatus {
  return (
    value === "new" ||
    value === "converted" ||
    value === "duplicate" ||
    value === "spam"
  );
}

function WebsiteLeadsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ── URL-backed view state, so a filtered view is shareable ──
  const statusParam = searchParams.get("status");
  const status: WebsiteSubmissionStatus = isStatus(statusParam)
    ? statusParam
    : "new";
  const formKey = searchParams.get("form_key") || "";
  const query = searchParams.get("q") || "";
  const pageParam = Number(searchParams.get("page"));
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  const patchParams = useCallback(
    (patch: Record<string, string | undefined>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined || value === "") next.delete(key);
        else next.set(key, value);
      }
      const qs = next.toString();
      router.replace(qs ? `/website-leads?${qs}` : "/website-leads", {
        scroll: false,
      });
    },
    [router, searchParams]
  );

  // Search is typed locally and pushed to the URL once it settles, so every
  // keystroke doesn't become a history entry or a request.
  const [searchValue, setSearchValue] = useState(query);
  const debouncedSearch = useDebounce(searchValue, SEARCH_DEBOUNCE_MS);
  // Remembers the last value *we* wrote to the URL, which distinguishes a
  // URL change we caused from one the user caused (back button, shared
  // link). Without it the sync-back effect would overwrite keystrokes typed
  // while a debounced write was still in flight.
  const lastPushedQuery = useRef(query);

  useEffect(() => {
    if (debouncedSearch === lastPushedQuery.current) return;
    lastPushedQuery.current = debouncedSearch;
    patchParams({ q: debouncedSearch || undefined, page: undefined });
  }, [debouncedSearch, patchParams]);

  useEffect(() => {
    if (query === lastPushedQuery.current) return;
    lastPushedQuery.current = query;
    setSearchValue(query);
  }, [query]);

  const listParams = useMemo(
    () => ({
      status,
      form_key: formKey || undefined,
      q: query || undefined,
      page,
      page_size: PAGE_SIZE,
    }),
    [status, formKey, query, page]
  );

  const {
    submissions,
    total,
    totalPages,
    isLoading,
    error,
    refetch,
    removeLocal,
    patchLocal,
  } = useWebsiteLeads(listParams);

  const forms = useWebsiteLeadForms();
  const counts = useWebsiteLeadCountStore((s) => s.counts);
  const refreshCounts = useWebsiteLeadCountStore((s) => s.refresh);
  const decrementNew = useWebsiteLeadCountStore((s) => s.decrementNew);

  useEffect(() => {
    refreshCounts();
  }, [refreshCounts]);

  // ── Triage ──
  const [selected, setSelected] = useState<WebsiteSubmission | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [converting, setConverting] = useState<WebsiteSubmission | null>(null);
  const [convertOpen, setConvertOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const openDrawer = (submission: WebsiteSubmission) => {
    setSelected(submission);
    setDrawerOpen(true);
  };

  const openConvert = (submission: WebsiteSubmission) => {
    setDrawerOpen(false);
    setConverting(submission);
    setConvertOpen(true);
  };

  // A row that leaves its tab is dropped immediately; one that stays (because
  // we're on the "all activity" side of a transition) is patched in place.
  const settleRow = (
    submission: WebsiteSubmission,
    updated: WebsiteSubmission | null
  ) => {
    if (!updated || updated.status !== status) removeLocal(submission.id);
    else patchLocal(updated);
    if (selected?.id === submission.id) {
      setSelected(updated);
      if (!updated) setDrawerOpen(false);
    }
    refreshCounts();
  };

  // The dialog handles the toast and the navigation to the new lead; all
  // that's left here is to drop the row and re-sync the tab counts.
  const handleConverted = (submission: WebsiteSubmission) => {
    removeLocal(submission.id);
    decrementNew();
    setDrawerOpen(false);
    refreshCounts();
  };

  const handleAlreadyLinked = (
    submission: WebsiteSubmission,
    leadId: string | null
  ) => {
    // The backend has already re-tagged this as duplicate and linked it.
    const updated: WebsiteSubmission = {
      ...submission,
      status: "duplicate",
      lead_id: leadId ?? submission.lead_id ?? null,
    };
    decrementNew();
    settleRow(submission, updated);
  };

  const handleSpam = async (submission: WebsiteSubmission) => {
    setPendingId(submission.id);
    try {
      const updated = await websiteLeadsService.spam(submission.id);
      decrementNew();
      settleRow(submission, updated);
      toast.success("Marked as spam", {
        action: {
          label: "Undo",
          onClick: () => handleReopen(updated, { silent: true }),
        },
      });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      toast.error(e.response?.data?.detail || "Failed to mark as spam");
    } finally {
      setPendingId(null);
    }
  };

  const handleReopen = async (
    submission: WebsiteSubmission,
    opts?: { silent?: boolean }
  ) => {
    setPendingId(submission.id);
    try {
      const updated = await websiteLeadsService.reopen(submission.id);
      settleRow(submission, updated);
      if (!opts?.silent) toast.success("Moved back to New");
      else toast.success("Restored");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      toast.error(e.response?.data?.detail || "Failed to reopen submission");
    } finally {
      setPendingId(null);
    }
  };

  const countFor = (tab: WebsiteSubmissionStatus) =>
    counts[tab as keyof WebsiteLeadCounts] ?? 0;

  const hasFilters = !!formKey || !!query;
  const showingFrom = (page - 1) * PAGE_SIZE + 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Website Leads"
        description="Review form submissions from the website before they enter the pipeline."
      >
        <Button variant="outline" size="sm" onClick={() => { refetch(); refreshCounts(); }}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </PageHeader>

      <Tabs
        value={status}
        onValueChange={(v) =>
          patchParams({ status: v, page: undefined })
        }
      >
        <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5">
              {tab.label}
              <span className="rounded-full bg-muted-foreground/15 px-1.5 text-[11px] font-semibold tabular-nums">
                {countFor(tab.value)}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name, email or phone…"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchValue && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
              onClick={() => setSearchValue("")}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        <Select
          value={formKey || ALL_FORMS}
          onValueChange={(v) =>
            patchParams({
              form_key: v === ALL_FORMS ? undefined : v,
              page: undefined,
            })
          }
        >
          <SelectTrigger className="w-full sm:w-[280px]">
            <SelectValue placeholder="All forms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FORMS}>All forms</SelectItem>
            {forms.map((f) => (
              <SelectItem key={f.form_key} value={f.form_key}>
                {f.form_name} ({f.new})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchValue("");
              patchParams({ form_key: undefined, q: undefined, page: undefined });
            }}
          >
            <X className="mr-2 h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      {isLoading && <WebsiteLeadTableSkeleton />}

      {!isLoading && error && (
        <div className="rounded-md border py-12 text-center">
          <p className="font-medium">Couldn&apos;t load website leads</p>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" className="mt-4" onClick={refetch}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      )}

      {!isLoading && !error && submissions.length === 0 && (
        <EmptyState
          icon={Globe}
          title={hasFilters ? "No matching submissions" : EMPTY_COPY[status].title}
          description={
            hasFilters
              ? "Try a different search term or form filter."
              : EMPTY_COPY[status].description
          }
        />
      )}

      {!isLoading && !error && submissions.length > 0 && (
        <>
          <WebsiteLeadTable
            submissions={submissions}
            onSelect={openDrawer}
            onConvert={openConvert}
            onSpam={handleSpam}
            onReopen={(s) => handleReopen(s)}
            pendingId={pendingId}
          />
          <div className="flex flex-col items-center gap-2">
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={(p) =>
                patchParams({ page: p === 1 ? undefined : String(p) })
              }
            />
            <p className="text-sm text-muted-foreground">
              Showing {showingFrom}–{showingFrom + submissions.length - 1} of{" "}
              {total}
            </p>
          </div>
        </>
      )}

      <WebsiteLeadDrawer
        submission={selected}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onConvert={openConvert}
        onSpam={handleSpam}
        onReopen={(s) => handleReopen(s)}
        pendingId={pendingId}
      />

      <ConvertLeadDialog
        submission={converting}
        open={convertOpen}
        onOpenChange={setConvertOpen}
        onConverted={handleConverted}
        onAlreadyLinked={handleAlreadyLinked}
      />
    </div>
  );
}

export default function WebsiteLeadsPage() {
  return (
    <ManagerGuard>
      <Suspense>
        <WebsiteLeadsPageContent />
      </Suspense>
    </ManagerGuard>
  );
}
