import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock3,
  Database,
  RefreshCw,
  Search,
  XCircle,
  Zap,
} from "lucide-react";
import { toast } from "@/components/ui/sonner-toast";
import {
  backendActivityFilters,
  filterBackendActivity,
  formatCompactWallet,
  formatTransactionSignature,
  getBackendActivityCounts,
  getStatusBadgeClass,
  type BackendActivityStatus,
  type ProcessedTx,
} from "./analyticsActivity";
import { supabase } from "./supabase";
import { ThemeToggle } from "./ThemeToggle";

const filterLabels: Record<BackendActivityStatus, string> = {
  all: "All",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
};

const ACTIVITY_PAGE_SIZE = 20;

export default function AnalyticsActivityPage() {
  const [transactions, setTransactions] = useState<ProcessedTx[]>([]);
  const [filter, setFilter] = useState<BackendActivityStatus>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("processed_transactions")
      .select("wallet, signature, status, retry_count, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Unable to load backend activity");
      setTransactions([]);
      setLoading(false);
      return;
    }

    setTransactions((data ?? []) as ProcessedTx[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    const initialLoadTimer = window.setTimeout(() => {
      void fetchTransactions();
    }, 0);

    const channel = supabase
      .channel("analytics-activity-processed-transactions")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "processed_transactions",
        },
        () => {
          void fetchTransactions();
        },
      )
      .subscribe();

    return () => {
      window.clearTimeout(initialLoadTimer);
      void supabase.removeChannel(channel);
    };
  }, [fetchTransactions]);

  const counts = useMemo(
    () => getBackendActivityCounts(transactions),
    [transactions],
  );

  const filteredTransactions = useMemo(
    () => filterBackendActivity(transactions, filter, search),
    [transactions, filter, search],
  );

  const totalPages = Math.max(
    1,
    Math.ceil(filteredTransactions.length / ACTIVITY_PAGE_SIZE),
  );
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * ACTIVITY_PAGE_SIZE;
  const pageEndIndex = pageStartIndex + ACTIVITY_PAGE_SIZE;
  const paginatedTransactions = filteredTransactions.slice(
    pageStartIndex,
    pageEndIndex,
  );
  const visibleStart = filteredTransactions.length === 0 ? 0 : pageStartIndex + 1;
  const visibleEnd = Math.min(pageEndIndex, filteredTransactions.length);
  const pageWindowStart = Math.max(1, safeCurrentPage - 2);
  const pageWindowEnd = Math.min(totalPages, safeCurrentPage + 2);
  const middlePageButtons = Array.from(
    { length: pageWindowEnd - pageWindowStart + 1 },
    (_, index) => pageWindowStart + index,
  );
  const pageButtons: Array<number | "start-gap" | "end-gap"> = [
    ...(pageWindowStart > 1 ? [1] : []),
    ...(pageWindowStart > 2 ? (["start-gap"] as const) : []),
    ...middlePageButtons,
    ...(pageWindowEnd < totalPages - 1 ? (["end-gap"] as const) : []),
    ...(pageWindowEnd < totalPages ? [totalPages] : []),
  ];

  const handleFilterChange = (nextFilter: BackendActivityStatus) => {
    setFilter(nextFilter);
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const metricCards = [
    {
      label: "All Transactions",
      value: counts.all,
      icon: Database,
      className: "text-[hsl(var(--accent))]",
    },
    {
      label: "Processing",
      value: counts.processing,
      icon: Clock3,
      className: "text-yellow-300",
    },
    {
      label: "Completed",
      value: counts.completed,
      icon: CheckCircle2,
      className: "text-green-400",
    },
    {
      label: "Failed",
      value: counts.failed,
      icon: XCircle,
      className: "text-red-400",
    },
  ];

  return (
    <div
      className="min-h-screen relative"
      style={{ background: "var(--gradient-hero)" }}
    >
      <div className="absolute inset-0 mesh-bg opacity-20 pointer-events-none" />
      <div
        className="absolute top-[-10%] left-1/2 h-96 w-136 -translate-x-1/2 rounded-full blur-[100px] pointer-events-none"
        style={{ background: "hsl(var(--primary) / 0.12)" }}
      />

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="mb-8 flex items-center justify-between border-b border-[hsl(265_40%_20%/0.5)] pb-6">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => {
                window.location.href = "/analytics";
              }}
              className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Analytics
            </button>
            <a href="/" className="flex items-center gap-2">
              <div className="relative h-7 w-7">
                <div className="absolute inset-0 rounded-lg bg-linear-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] opacity-80" />
                <Zap className="absolute inset-0 m-auto h-3.5 w-3.5 text-white" />
              </div>
              <span className="hidden font-display text-lg font-bold text-foreground sm:block">
                Vesting<span className="gradient-text">App</span>
              </span>
            </a>
          </div>
          <ThemeToggle />
        </div>

        <div className="mb-8">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-[hsl(271_100%_64%/0.26)] bg-[hsl(271_100%_64%/0.08)] px-3 py-1 text-xs font-bold uppercase tracking-widest text-[hsl(var(--primary))]">
            <Activity className="h-3.5 w-3.5" />
            Live Backend Activity
          </p>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Transaction Activity
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Review every processed subscription payment transaction with fast
            status filters and explorer-style search.
          </p>
        </div>

        <div className="mx-auto mb-8 grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {metricCards.map((metric) => (
            <div
              key={metric.label}
              className="glass-card flex min-h-28 flex-col items-center justify-center rounded-2xl px-3 py-4 text-center"
            >
              <metric.icon className={`mb-2 h-5 w-5 ${metric.className}`} />
              <div
                className={`mb-1 font-display text-2xl font-bold ${metric.className}`}
              >
                {metric.value}
              </div>
              <div className="max-w-28 text-balance text-xs font-semibold leading-4 text-muted-foreground">
                {metric.label}
              </div>
            </div>
          ))}
        </div>

        <div className="glass-card rounded-2xl p-4 sm:p-6">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {backendActivityFilters.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => handleFilterChange(item)}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    filter === item
                      ? "bg-[hsl(var(--primary))] text-white"
                      : "bg-[hsl(265_40%_20%)] text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {filterLabels[item]}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                void fetchTransactions();
              }}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[hsl(265_40%_26%)] px-4 text-sm font-semibold text-muted-foreground transition hover:border-[hsl(var(--primary)/0.45)] hover:text-foreground"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>

          <label className="relative mb-5 block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(event) => handleSearchChange(event.target.value)}
              placeholder="Search by signature, wallet, or status"
              className="h-11 w-full rounded-xl border border-[hsl(265_40%_24%)] bg-[hsl(265_40%_12%/0.72)] pl-10 pr-4 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-[hsl(var(--primary)/0.55)]"
            />
          </label>

          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>
              Showing {visibleStart}-{visibleEnd} of {filteredTransactions.length}
              matching transactions, {transactions.length} loaded
            </span>
            <span>
              Page {safeCurrentPage} of {totalPages}. Signatures show the first
              15 characters.
            </span>
          </div>

          <div className="hidden overflow-hidden rounded-2xl border border-[hsl(265_40%_22%)] md:block">
            <div className="grid grid-cols-[1.25fr_0.75fr_1.05fr_0.5fr_1fr] gap-4 bg-[hsl(265_40%_12%/0.72)] px-4 py-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              <span>Signature</span>
              <span>Status</span>
              <span>Wallet</span>
              <span>Retries</span>
              <span>Date</span>
            </div>

            {loading ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                Loading backend activity...
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No transactions match this view.
              </div>
            ) : (
              paginatedTransactions.map((tx) => (
                <div
                  key={tx.signature}
                  className="grid grid-cols-[1.25fr_0.75fr_1.05fr_0.5fr_1fr] gap-4 border-t border-[hsl(265_40%_18%)] px-4 py-3 text-sm"
                >
                  <span
                    className="font-mono text-xs text-foreground"
                    title={tx.signature}
                  >
                    {formatTransactionSignature(tx.signature)}
                  </span>
                  <span>
                    <span
                      className={`inline-flex rounded-full border px-2 py-1 text-xs font-bold capitalize ${getStatusBadgeClass(
                        tx.status,
                      )}`}
                    >
                      {tx.status}
                    </span>
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {formatCompactWallet(tx.wallet)}
                  </span>
                  <span className="text-muted-foreground">
                    {tx.retry_count ?? 0}
                  </span>
                  <span className="text-muted-foreground">
                    {new Date(tx.created_at).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="space-y-3 md:hidden">
            {loading ? (
              <div className="rounded-2xl border border-[hsl(265_40%_22%)] px-4 py-8 text-center text-sm text-muted-foreground">
                Loading backend activity...
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="rounded-2xl border border-[hsl(265_40%_22%)] px-4 py-8 text-center text-sm text-muted-foreground">
                No transactions match this view.
              </div>
            ) : (
              paginatedTransactions.map((tx) => (
                <div
                  key={tx.signature}
                  className="rounded-2xl border border-[hsl(265_40%_22%)] bg-[hsl(265_40%_12%/0.58)] p-4"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p
                        className="font-mono text-xs text-foreground"
                        title={tx.signature}
                      >
                        {formatTransactionSignature(tx.signature)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(tx.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-2 py-1 text-xs font-bold capitalize ${getStatusBadgeClass(
                        tx.status,
                      )}`}
                    >
                      {tx.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                    <div>
                      <p className="mb-1 font-semibold uppercase tracking-widest">
                        Wallet
                      </p>
                      <p className="font-mono">{formatCompactWallet(tx.wallet)}</p>
                    </div>
                    <div className="text-right">
                      <p className="mb-1 font-semibold uppercase tracking-widest">
                        Retries
                      </p>
                      <p>{tx.retry_count ?? 0}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {filteredTransactions.length > 0 && (
            <div className="mt-5 flex flex-col gap-3 border-t border-[hsl(265_40%_18%)] pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                {ACTIVITY_PAGE_SIZE} rows per page
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((page) => Math.max(1, page - 1))
                  }
                  disabled={safeCurrentPage === 1}
                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-[hsl(265_40%_26%)] px-3 text-xs font-semibold text-muted-foreground transition hover:border-[hsl(var(--primary)/0.45)] hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous
                </button>
                {pageButtons.map((page) =>
                  typeof page === "number" ? (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={`h-9 min-w-9 rounded-lg px-3 text-xs font-bold transition ${
                        safeCurrentPage === page
                          ? "bg-[hsl(var(--primary))] text-white"
                          : "border border-[hsl(265_40%_26%)] text-muted-foreground hover:border-[hsl(var(--primary)/0.45)] hover:text-foreground"
                      }`}
                    >
                      {page}
                    </button>
                  ) : (
                    <span
                      key={page}
                      className="inline-flex h-9 min-w-9 items-center justify-center text-xs font-bold text-muted-foreground"
                    >
                      ...
                    </span>
                  ),
                )}
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((page) => Math.min(totalPages, page + 1))
                  }
                  disabled={safeCurrentPage === totalPages}
                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-[hsl(265_40%_26%)] px-3 text-xs font-semibold text-muted-foreground transition hover:border-[hsl(var(--primary)/0.45)] hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
