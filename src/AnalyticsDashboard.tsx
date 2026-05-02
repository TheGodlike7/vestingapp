import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { toast } from "@/components/ui/sonner-toast";
import { FolderOpen, Calendar, Users, Lock } from "lucide-react";
import { LineChart, BarChart, Bar, Line, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart.tsx";

import { Tooltip, ResponsiveContainer } from "recharts";

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

type ClaimWithProject = {
  amount: number | string;
  vesting_schedules: {
    vesting_projects: {
      project_name: string;
    }[];
  }[];
};

type ProcessedTx = {
  wallet: string | null;
  signature: string;
  status: string;
  retry_count: number | null;
  created_at: string;
};

const backendActivityFilters = ["all", "completed", "failed"] as const;

export default function AnalyticsDashboard() {
  const [chartData, setChartData] = useState<{ date: string; total: number }[]>(
    [],
  );
  const [projectChartData, setProjectChartData] = useState<
    { project: string; total: number }[]
  >([]);
  const [leaderboard, setLeaderboard] = useState<
    { wallet: string; total: number }[]
  >([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [projectCount, setProjectCount] = useState(0);
  const [processedTxs, setProcessedTxs] = useState<ProcessedTx[]>([]);
  const [filter, setFilter] = useState<"all" | "completed" | "failed">("all");

  const totalTx = processedTxs.length;

  const successTx = processedTxs.filter(
    (tx) => tx.status === "completed",
  ).length;

  const failedTx = processedTxs.filter((tx) => tx.status === "failed").length;

  const successRate = totalTx ? ((successTx / totalTx) * 100).toFixed(1) : "0";

  const totalRevenue = successTx * 99;

  const filteredTxs =
    filter === "all"
      ? processedTxs
      : processedTxs.filter((tx) => tx.status === filter);

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

  // Revenue Chart Data Logic
  const revenueByDay = processedTxs.reduce(
    (acc, tx) => {
      if (tx.status !== "completed") return acc;

      const date = new Date(tx.created_at).toLocaleDateString();

      if (!acc[date]) acc[date] = 0;
      acc[date] += 99;

      return acc;
    },
    {} as Record<string, number>,
  );

  const revenueData = Object.entries(revenueByDay).map(([date, value]) => ({
    date,
    revenue: value,
  }));

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

  const fetchProjectCount = async () => {
    const { data } = await supabase.from("vesting_projects").select("id");

    if (data) setProjectCount(data.length);
  };

  const fetchChartData = async () => {
    const { data } = await supabase
      .from("claim_history")
      .select("amount, created_at");

    if (!data) return;

    const grouped: Record<string, number> = {};

    data.forEach((item: { amount: number | string; created_at: string }) => {
      const date = new Date(item.created_at).toISOString().slice(0, 10);
      if (!grouped[date]) grouped[date] = 0;
      grouped[date] += Number(item.amount);
    });

    setChartData(
      Object.entries(grouped).map(([date, total]) => ({ date, total })),
    );
  };

  const fetchProjectChartData = async () => {
    const { data } = await supabase.from("claim_history").select(`
        amount,
        vesting_schedules (
          vesting_projects (
            project_name
          )
        )
      `);

    if (!data) return;

    const grouped: Record<string, number> = {};

    data.forEach((item: ClaimWithProject) => {
      const project =
        item.vesting_schedules[0]?.vesting_projects[0]?.project_name ||
        "Unknown";

      if (!grouped[project]) grouped[project] = 0;
      grouped[project] += Number(item.amount);
    });

    setProjectChartData(
      Object.entries(grouped).map(([project, total]) => ({
        project,
        total,
      })),
    );
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
      await fetchChartData();
      await fetchProjectChartData();
      await fetchLeaderboard();
      await fetchProjectCount();
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
    <>
      <div className="space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-8 lg:grid-cols-8 gap-6 mb-10">
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
            <div key={stat.label} className="stat-card">
              <stat.icon
                className={`w-6 h-5 mx-auto mb-4 ${stat.color} stat-icon`}
              />
              <div
                className={`text-2xl font-bold font-display mb-2 ${stat.color}`}
              >
                {stat.value}
              </div>
              <div className="text-muted-foreground text-xs">{stat.label}</div>
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

        {/* ✅ CHART NEW BLOCK */}
        <div className="glass-card rounded-2xl p-4 mb-8">
          <h2 className="font-display text-lg font-semibold text-foreground mb-4">
            Claims Overview
          </h2>

          <ChartContainer
            config={{
              total: { label: "Claims", color: "hsl(var(--primary))" },
            }}
          >
            <LineChart data={chartData}>
              <XAxis dataKey="date" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                type="monotone"
                dataKey="total"
                stroke="var(--color-total)"
                strokeWidth={2}
              />
            </LineChart>
          </ChartContainer>
        </div>

        <div className="glass-card rounded-2xl p-6 mb-8">
          <h2 className="font-display text-lg font-semibold text-foreground mb-4">
            Revenue Over Time
          </h2>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData}>
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#14F195"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6 mb-8">
          <h2 className="font-display text-lg font-semibold text-foreground mb-4">
            Claims Per Project
          </h2>

          <ChartContainer
            config={{
              total: { label: "Claimed", color: "hsl(var(--accent))" },
            }}
          >
            <BarChart data={projectChartData}>
              <XAxis dataKey="project" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="total" fill="var(--color-total)" />
            </BarChart>
          </ChartContainer>
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
        <h2 className="font-display text-lg font-semibold text-foreground mb-4">
          Live Backend Activity
        </h2>
        <div className="flex gap-2 mb-4">
          {backendActivityFilters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold 
            ${
              filter === f
                ? "bg-[hsl(var(--primary))] text-white"
                : "bg-[hsl(265_40%_20%)] text-muted-foreground"
            }`}
            >
              {f}
            </button>
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

        <div className="space-y-3">
          {processedTxs.length === 0 ? (
            <p className="text-muted-foreground text-sm">No activity yet</p>
          ) : (
            filteredTxs.map((tx) => (
              <div
                key={tx.signature}
                className="flex justify-between items-center text-sm"
              >
                <div>
                  <p className="font-mono text-xs">
                    {tx.signature.slice(0, 8)}...
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {new Date(tx.created_at).toLocaleString()}
                  </p>
                </div>

                <div className="text-right">
                  <p
                    className={`font-bold ${
                      tx.status === "completed"
                        ? "text-green-400"
                        : tx.status === "failed"
                          ? "text-red-400"
                          : "text-yellow-400"
                    }`}
                  >
                    {tx.status}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    retries: {tx.retry_count || 0}
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
                <span className="font-mono">{tx.signature.slice(0, 8)}...</span>
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
    </>
  );
}