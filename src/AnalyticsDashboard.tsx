import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { toast } from "@/components/ui/sonner-toast";
import { ArrowLeft, ArrowRight, BarChart3, Calendar, FolderOpen, Lock, Users, Zap } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import {
  backendActivityFilters,
  filterBackendActivity,
  formatTransactionSignature,
  getStatusClass,
  type BackendActivityStatus,
  type ProcessedTx,
} from "./analyticsActivity";

type VestingSchedule = {
  id: string;
  claimable_amount: number | string | null;
  claimed_amount: number | string | null;
  total_amount: number | string | null;
  next_unlock_at: string | null;
};

type Recommendation = {
  message: string;
  score: number;
};

type AnalyticsProject = {
  id: string;
  project_name: string | null;
  token_symbol: string | null;
  token_mint: string | null;
  organization_id: string | null;
  logo_url: string | null;
};

type ProjectRecord = Omit<AnalyticsProject, "logo_url">;

type OrganizationLogoRecord = {
  id: string;
  logo_url: string | null;
};

export default function AnalyticsDashboard() {
  const [projects, setProjects] = useState<AnalyticsProject[]>([]);
  const [leaderboard, setLeaderboard] = useState<
    { wallet: string; total: number }[]
  >([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [projectCount, setProjectCount] = useState(0);
  const [processedTxs, setProcessedTxs] = useState<ProcessedTx[]>([]);
  const [filter, setFilter] = useState<BackendActivityStatus>("all");

  const totalTx = processedTxs.length;

  const successTx = processedTxs.filter(
    (tx) => tx.status === "completed",
  ).length;

  const failedTx = processedTxs.filter((tx) => tx.status === "failed").length;

  const successRate = totalTx ? ((successTx / totalTx) * 100).toFixed(1) : "0";

  const totalRevenue = successTx * 99;

  const filteredTxs = filterBackendActivity(processedTxs, filter);
  const previewTxs = filteredTxs.slice(0, 6);

  const fraudTxs = processedTxs.filter(
    (tx) => tx.status === "failed" && (tx.retry_count || 0) === 0,
  );

  // Leaderboard KPI Logic
  const userLeaderboard = Object.values(
    processedTxs.reduce(
      (acc, tx) => {
        if (tx.status !== "completed") return acc;

        const user = tx.wallet || "unknown";

        if (!acc[user]) {
          acc[user] = { user, total: 0 };
        }

        acc[user].total += 99;

        return acc;
      },
      {} as Record<string, { user: string; total: number }>,
    ),
  ).sort((a, b) => b.total - a.total);

  // 🔥 FETCH PROCESSED TXS
  const fetchProcessedTxs = async () => {
  const { data } = await supabase
    .from("processed_transactions")
    .select("wallet, signature, status, retry_count, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  if (data) setProcessedTxs(data);
};

  // 🔥 RECOMMENDATIONS
  const generateRecommendations = (schedules: VestingSchedule[]): string[] => {
    let totalClaimable = 0;
    let totalClaimed = 0;
    let totalAmount = 0;
    let nearestUnlockDays: number | null = null;

    schedules.forEach((s) => {
      const claimable = Number(s.claimable_amount ?? 0);
      const claimed = Number(s.claimed_amount ?? 0);
      const total = Number(s.total_amount ?? 0);

      totalClaimable += claimable;
      totalClaimed += claimed;
      totalAmount += total;

      if (claimable === 0 && s.next_unlock_at) {
        const days = Math.ceil(
          (new Date(s.next_unlock_at).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24),
        );

        if (
          days > 0 &&
          (nearestUnlockDays === null || days < nearestUnlockDays)
        ) {
          nearestUnlockDays = days;
        }
      }
    });

    const recs: Recommendation[] = [];

    if (totalClaimable > 0) {
      recs.push({
        message: `💰 You have ${totalClaimable} tokens ready to claim`,
        score: 100,
      });
    }

    if (totalAmount > 0) {
      const avg = Math.round((totalClaimed / totalAmount) * 100);
      if (avg > 0 && avg < 100) {
        recs.push({
          message: `📈 You’ve claimed ${avg}% of your allocation`,
          score: 30,
        });
      }
    }

    if (nearestUnlockDays !== null && nearestUnlockDays <= 7) {
      recs.push({
        message: `⏳ Next unlock in ${nearestUnlockDays} day(s)`,
        score: 70 - nearestUnlockDays,
      });
    }

    return recs.sort((a, b) => b.score - a.score).map((r) => r.message);
  };

  const getProjectMark = (project: AnalyticsProject): string => {
    const symbol = project.token_symbol?.trim();
    if (symbol) return symbol.slice(0, 3).toUpperCase();

    const name = project.project_name?.trim();
    if (name) {
      return name
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase();
    }

    return "VA";
  };

  const fetchProjects = async () => {
    const { data } = await supabase
      .from("vesting_projects")
      .select("id, project_name, token_symbol, token_mint, organization_id")
      .order("project_name", { ascending: true });

    const projectRecords = (data ?? []) as ProjectRecord[];
    const organizationIds = Array.from(
      new Set(
        projectRecords
          .map((project) => project.organization_id)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    let logoByOrganizationId: Record<string, string | null> = {};

    if (organizationIds.length > 0) {
      const { data: organizations } = await supabase
        .from("organizations")
        .select("id, logo_url")
        .in("id", organizationIds);

      logoByOrganizationId = Object.fromEntries(
        ((organizations ?? []) as OrganizationLogoRecord[]).map((organization) => [
          organization.id,
          organization.logo_url,
        ]),
      );
    }

    const nextProjects = projectRecords.map((project) => ({
      ...project,
      logo_url: project.organization_id
        ? logoByOrganizationId[project.organization_id] ?? null
        : null,
    }));

    setProjects(nextProjects);
    setProjectCount(nextProjects.length);
  };

  const fetchLeaderboard = async () => {
    const { data } = await supabase
      .from("claim_history")
      .select("wallet, amount");

    if (!data) return;

    const grouped: Record<string, number> = {};

    data.forEach((item: { wallet: string; amount: number | string }) => {
      if (!grouped[item.wallet]) grouped[item.wallet] = 0;
      grouped[item.wallet] += Number(item.amount);
    });

    setLeaderboard(
      Object.entries(grouped)
        .map(([wallet, total]) => ({ wallet, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10),
    );
  };

  // 🔥 TOASTS (ANTI-SPAM)
  const triggerRecommendationToasts = (schedules: VestingSchedule[]) => {
    let totalClaimable = 0;
    let nearestUnlockDays: number | null = null;

    schedules.forEach((s) => {
      const claimable = Number(s.claimable_amount ?? 0);

      if (claimable > 0) totalClaimable += claimable;

      if (claimable === 0 && s.next_unlock_at) {
        const days = Math.ceil(
          (new Date(s.next_unlock_at).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24),
        );

        if (
          days > 0 &&
          (nearestUnlockDays === null || days < nearestUnlockDays)
        ) {
          nearestUnlockDays = days;
        }
      }
    });

    const today = new Date().toDateString();

    if (totalClaimable > 0 && localStorage.getItem("claim") !== today) {
      toast.success(`💰 You have ${totalClaimable} tokens ready to claim`);
      localStorage.setItem("claim", today);
    }

    if (
      nearestUnlockDays !== null &&
      nearestUnlockDays <= 7 &&
      localStorage.getItem("unlock") !== today
    ) {
      toast(`⏳ Next unlock in ${nearestUnlockDays} day(s)`);
      localStorage.setItem("unlock", today);
    }
  };

  // 🔥 FETCH DATA
  useEffect(() => {
    const load = async () => {
      await fetchProjects();
      await fetchLeaderboard();
      await fetchProcessedTxs();

      const { data } = await supabase.from("vesting_schedules").select("*");
      if (!data) return;

      setRecommendations(generateRecommendations(data));
      triggerRecommendationToasts(data);
    };

    load();
    const channel = supabase
  .channel("realtime-processed-txs")
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "processed_transactions",
    },
    () => {
      fetchProcessedTxs();
    }
  )
  .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
                window.location.href = "/dashboard";
              }}
              className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </button>
            <a href="/" className="flex items-center gap-2">
              <div className="relative h-7 w-7">
                <div className="absolute inset-0 rounded-lg bg-linear-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] opacity-80" />
                <Zap className="absolute inset-0 m-auto h-3.5 w-3.5 text-white" />
              </div>
              <span className="hidden font-display text-lg font-bold text-foreground sm:block">
                Har<span className="gradient-text">vest</span>
              </span>
            </a>
          </div>
          <ThemeToggle />
        </div>

        <div className="mb-8">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-[hsl(271_100%_64%/0.26)] bg-[hsl(271_100%_64%/0.08)] px-3 py-1 text-xs font-bold uppercase tracking-widest text-[hsl(var(--primary))]">
            <BarChart3 className="h-3.5 w-3.5" />
            Analytics
          </p>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Analytics Dashboard
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Monitor project activity, claims, revenue signals, backend payment status, and risk indicators.
          </p>
        </div>

        <div className="space-y-8">
        {/* Stats */}
        <div className="mx-auto mb-10 grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {[
            {
              label: "Active Projects",
              value: projectCount.toString(),
              icon: FolderOpen,
              color: "text-[hsl(var(--primary))]",
            },
            {
              label: "Total Schedules",
              value: "0",
              icon: Calendar,
              color: "text-[hsl(var(--accent))]",
            },
            {
              label: "Total Recipients",
              value: "0",
              icon: Users,
              color: "text-[hsl(var(--primary))]",
            },
            {
              label: "Tokens Locked",
              value: "0",
              icon: Lock,
              color: "text-[hsl(var(--accent))]",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="glass-card flex min-h-32 flex-col items-center justify-center rounded-2xl px-3 py-4 text-center transition hover:border-[hsl(var(--primary)/0.34)]"
            >
              <stat.icon className={`mb-3 h-5 w-5 ${stat.color}`} />
              <div className={`mb-1 font-display text-2xl font-bold ${stat.color}`}>
                {stat.value}
              </div>
              <div className="max-w-24 text-balance text-xs font-semibold leading-4 text-muted-foreground">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="glass-card p-4 rounded-xl">
            <p className="text-xs text-muted-foreground">Revenue</p>
            <p className="text-xl font-bold text-green-400">${totalRevenue}</p>
          </div>

          <div className="glass-card p-4 rounded-xl">
            <p className="text-xs text-muted-foreground">Success Rate</p>
            <p className="text-xl font-bold text-foreground">{successRate}%</p>
          </div>

          <div className="glass-card p-4 rounded-xl">
            <p className="text-xs text-muted-foreground">Completed</p>
            <p className="text-xl font-bold text-green-400">{successTx}</p>
          </div>

          <div className="glass-card p-4 rounded-xl">
            <p className="text-xs text-muted-foreground">Failed</p>
            <p className="text-xl font-bold text-red-400">{failedTx}</p>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 mb-8 sm:p-6">
          <div className="mb-5">
            <h2 className="font-display text-xl font-semibold text-foreground">
              Project Analytics
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Select a project to open its expanded claim, recipient, and schedule
              graphs on a dedicated analytics page.
            </p>
          </div>

          {projects.length === 0 ? (
            <div className="rounded-2xl border border-[hsl(265_40%_22%)] px-4 py-8 text-center text-sm text-muted-foreground">
              No projects available yet.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {projects.map((project, index) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => {
                    window.location.href = `/analytics/project/${project.id}`;
                  }}
                  className="group flex min-w-0 flex-col items-center gap-3 rounded-2xl border border-transparent p-3 text-center transition hover:border-[hsl(var(--primary)/0.38)] hover:bg-[hsl(265_40%_16%/0.58)]"
                >
                  <span
                    className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-[hsl(var(--primary)/0.36)] bg-[hsl(265_40%_14%/0.92)] font-display text-lg font-black text-foreground shadow-[0_0_32px_hsl(var(--primary)/0.2)] transition group-hover:scale-105"
                    style={{
                      boxShadow:
                        index % 2 === 0
                          ? "0 0 34px hsl(var(--primary) / 0.26)"
                          : "0 0 34px hsl(var(--accent) / 0.22)",
                    }}
                  >
                    <span className="absolute inset-0 bg-linear-to-br from-[hsl(var(--primary)/0.28)] to-[hsl(var(--accent)/0.18)]" />
                    <span className="relative">{getProjectMark(project)}</span>
                    {project.logo_url ? (
                      <img
                        src={project.logo_url}
                        alt={`${project.project_name || "Project"} logo`}
                        className="absolute inset-0 h-full w-full object-cover"
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    ) : null}
                  </span>
                  <span className="w-full truncate text-sm font-bold text-foreground">
                    {project.project_name || "Untitled Project"}
                  </span>
                  <span className="max-w-28 truncate text-xs text-muted-foreground">
                    {project.token_symbol || project.token_mint || "Project"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="glass-card rounded-2xl p-6 mb-8">
          <h2 className="font-display text-lg font-semibold text-foreground mb-4">
            Leaderboard
          </h2>

          <div className="space-y-3">
            {leaderboard.map((item, index) => (
              <div
                key={item.wallet}
                className="flex justify-between items-center text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-5">
                    #{index + 1}
                  </span>
                  <span className="font-mono">
                    {item.wallet.slice(0, 6)}...{item.wallet.slice(-4)}
                  </span>
                </div>

                <span className="font-medium">{item.total}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6 mb-8">
          <h2 className="font-display text-lg font-semibold text-foreground mb-4">
            Insights
          </h2>

          <div className="space-y-2 text-sm">
            {recommendations.length === 0 ? (
              <p className="text-muted-foreground">No insights available</p>
            ) : (
              recommendations.map((rec, i) => (
                <div key={i} className="text-muted-foreground">
                  {rec}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      <div className="glass-card rounded-2xl p-6 mb-8">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">
              Live Backend Activity
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Recent processed payment transactions. Open the full activity page
              to search and load every transaction.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              window.location.href = "/analytics/activity";
            }}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[hsl(265_40%_26%)] px-4 text-sm font-semibold text-muted-foreground transition hover:border-[hsl(var(--primary)/0.45)] hover:text-foreground"
          >
            View all activity
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {backendActivityFilters.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                filter === f
                  ? "bg-[hsl(var(--primary))] text-white"
                  : "bg-[hsl(265_40%_20%)] text-muted-foreground hover:text-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {processedTxs.length === 0 ? (
            <p className="text-muted-foreground text-sm">No activity yet</p>
          ) : previewTxs.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No activity matching this filter
            </p>
          ) : (
            previewTxs.map((tx) => (
              <div
                key={tx.signature}
                className="flex items-center justify-between gap-4 rounded-xl border border-[hsl(265_40%_18%)] bg-[hsl(265_40%_12%/0.5)] px-3 py-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-mono text-xs text-foreground" title={tx.signature}>
                    {formatTransactionSignature(tx.signature)}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {new Date(tx.created_at).toLocaleString()}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className={`font-bold capitalize ${getStatusClass(tx.status)}`}>
                    {tx.status}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    retries: {tx.retry_count ?? 0}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6 mb-8">
        <h2 className="font-display text-lg font-semibold text-red-400 mb-4">
          🚨 Fraud / Suspicious Activity
        </h2>

        <div className="space-y-2">
          {fraudTxs.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No suspicious activity
            </p>
          ) : (
            fraudTxs.map((tx) => (
              <div key={tx.signature} className="text-sm flex justify-between">
                <span className="font-mono">{formatTransactionSignature(tx.signature)}</span>
                <span className="text-red-400">FAILED</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6 mb-8">
        <h2 className="font-display text-lg font-semibold text-foreground mb-4">
          🏆 Top Users
        </h2>

        <div className="space-y-2">
          {userLeaderboard.slice(0, 5).map((u, i) => (
            <div key={u.user} className="flex justify-between text-sm">
              <span>
                #{i + 1} {u.user.slice(0, 6)}...
              </span>
              <span className="text-green-400 font-bold">${u.total}</span>
            </div>
          ))}
        </div>
      </div>
      </div>
    </div>
  );
}
