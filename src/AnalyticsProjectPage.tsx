import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BarChart3, Calendar, Users, Wallet, Zap } from "lucide-react";
import {
  Bar,
  BarChart,
  Line,
  Cell,
  Legend,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useParams } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";
import { supabase } from "./supabase";

type AnalyticsProject = {
  id: string;
  project_name: string | null;
  token_symbol: string | null;
  token_mint: string | null;
  organization_id: string | null;
  logo_url: string | null;
};

type ProjectRecord = Omit<AnalyticsProject, "logo_url">;

const PROJECT_PROGRESS_COLORS = ["#14F195", "hsl(var(--primary))", "#64748b"];

type ClaimSchedule = {
  recipient_wallet: string | null;
};

type ProjectClaim = {
  amount: number | string;
  wallet: string | null;
  created_at: string;
  vesting_schedules: ClaimSchedule | ClaimSchedule[] | null;
};

type ProjectSchedule = {
  id: string;
  recipient_wallet: string | null;
  total_amount: number | string | null;
  claimed_amount: number | string | null;
  claimable_amount: number | string | null;
  next_unlock_at: string | null;
};

const getClaimSchedule = (claim: ProjectClaim): ClaimSchedule | null => {
  if (Array.isArray(claim.vesting_schedules)) {
    return claim.vesting_schedules[0] ?? null;
  }

  return claim.vesting_schedules;
};

const formatProjectMark = (project: AnalyticsProject | null): string => {
  const symbol = project?.token_symbol?.trim();
  if (symbol) return symbol.slice(0, 3).toUpperCase();

  const name = project?.project_name?.trim();
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

export default function AnalyticsProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<AnalyticsProject | null>(null);
  const [claims, setClaims] = useState<ProjectClaim[]>([]);
  const [schedules, setSchedules] = useState<ProjectSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      const loadProjectAnalytics = async () => {
        if (!projectId) {
          setLoading(false);
          return;
        }

        const { data: projectData } = await supabase
          .from("vesting_projects")
          .select("id, project_name, token_symbol, token_mint, organization_id")
          .eq("id", projectId)
          .maybeSingle();

        let logoUrl: string | null = null;
        const projectRecord = (projectData ?? null) as ProjectRecord | null;

        if (projectRecord?.organization_id) {
          const { data: organizationData } = await supabase
            .from("organizations")
            .select("logo_url")
            .eq("id", projectRecord.organization_id)
            .maybeSingle<{ logo_url: string | null }>();

          logoUrl = organizationData?.logo_url ?? null;
        }

        const [{ data: claimData }, { data: scheduleData }] =
          await Promise.all([
            supabase
              .from("claim_history")
              .select(
                `
                  amount,
                  wallet,
                  created_at,
                  vesting_schedules!inner (
                    project_id,
                    recipient_wallet
                  )
                `,
              )
              .eq("vesting_schedules.project_id", projectId)
              .order("created_at", { ascending: true }),
            supabase
              .from("vesting_schedules")
              .select(
                "id, recipient_wallet, total_amount, claimed_amount, claimable_amount, next_unlock_at",
              )
              .eq("project_id", projectId),
          ]);

        setProject(projectRecord ? { ...projectRecord, logo_url: logoUrl } : null);
        setClaims((claimData ?? []) as ProjectClaim[]);
        setSchedules((scheduleData ?? []) as ProjectSchedule[]);
        setLoading(false);
      };

      void loadProjectAnalytics();
    }, 0);

    return () => window.clearTimeout(loadTimer);
  }, [projectId]);

  const claimChartData = useMemo(() => {
    const grouped: Record<string, number> = {};

    claims.forEach((claim) => {
      const date = new Date(claim.created_at).toISOString().slice(0, 10);
      grouped[date] = (grouped[date] ?? 0) + Number(claim.amount ?? 0);
    });

    return Object.entries(grouped).map(([date, total]) => ({ date, total }));
  }, [claims]);

  const recipientChartData = useMemo(() => {
    const grouped: Record<string, number> = {};

    claims.forEach((claim) => {
      const schedule = getClaimSchedule(claim);
      const wallet = claim.wallet || schedule?.recipient_wallet || "unknown";
      const label = `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
      grouped[label] = (grouped[label] ?? 0) + Number(claim.amount ?? 0);
    });

    return Object.entries(grouped)
      .map(([wallet, total]) => ({ wallet, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 12);
  }, [claims]);

  const totalClaimed = claims.reduce(
    (sum, claim) => sum + Number(claim.amount ?? 0),
    0,
  );
  const totalLocked = schedules.reduce(
    (sum, schedule) => sum + Number(schedule.total_amount ?? 0),
    0,
  );
  const totalClaimedFromSchedules = schedules.reduce(
    (sum, schedule) => sum + Number(schedule.claimed_amount ?? 0),
    0,
  );
  const totalClaimableNow = schedules.reduce(
    (sum, schedule) => sum + Number(schedule.claimable_amount ?? 0),
    0,
  );
  const totalUnvestedOrLocked = Math.max(
    totalLocked - totalClaimedFromSchedules - totalClaimableNow,
    0,
  );
  const projectProgressPieData = [
    { name: "Claimed", value: totalClaimedFromSchedules },
    { name: "Claimable Now", value: totalClaimableNow },
    { name: "Locked / Unvested", value: totalUnvestedOrLocked },
  ].filter((item) => item.value > 0);
  const recipientCount = new Set(
    schedules.map((schedule) => schedule.recipient_wallet).filter(Boolean),
  ).size;

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

        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[hsl(var(--primary)/0.36)] bg-[hsl(265_40%_14%/0.92)] font-display text-2xl font-black text-foreground shadow-[0_0_42px_hsl(var(--primary)/0.24)]">
            <span className="absolute inset-0 bg-linear-to-br from-[hsl(var(--primary)/0.3)] to-[hsl(var(--accent)/0.18)]" />
            <span className="relative">{formatProjectMark(project)}</span>
            {project?.logo_url ? (
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
          </div>
          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-[hsl(271_100%_64%/0.26)] bg-[hsl(271_100%_64%/0.08)] px-3 py-1 text-xs font-bold uppercase tracking-widest text-[hsl(var(--primary))]">
              <BarChart3 className="h-3.5 w-3.5" />
              Project Analytics
            </p>
            <h1 className="font-display text-3xl font-bold text-foreground">
              {project?.project_name || "Project Analytics"}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Expanded claim, recipient, and vesting schedule graphs for this project.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="glass-card rounded-2xl p-8 text-center text-sm text-muted-foreground">
            Loading project analytics...
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {[
                {
                  label: "Claims",
                  value: claims.length.toString(),
                  icon: BarChart3,
                  color: "text-[hsl(var(--primary))]",
                },
                {
                  label: "Recipients",
                  value: recipientCount.toString(),
                  icon: Users,
                  color: "text-[hsl(var(--accent))]",
                },
                {
                  label: "Claimed",
                  value: totalClaimed.toLocaleString(),
                  icon: Wallet,
                  color: "text-green-400",
                },
                {
                  label: "Locked",
                  value: totalLocked.toLocaleString(),
                  icon: Calendar,
                  color: "text-[hsl(var(--primary))]",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="glass-card flex min-h-28 flex-col items-center justify-center rounded-2xl px-3 py-4 text-center"
                >
                  <stat.icon className={`mb-2 h-5 w-5 ${stat.color}`} />
                  <div
                    className={`mb-1 font-display text-xl font-bold ${stat.color}`}
                  >
                    {stat.value}
                  </div>
                  <div className="text-xs font-semibold text-muted-foreground">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            <div className="glass-card rounded-2xl p-5 sm:p-6">
              <h2 className="mb-4 font-display text-xl font-semibold text-foreground">
                Claims Overview
              </h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={claimChartData}>
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-5 sm:p-6">
              <h2 className="mb-4 font-display text-xl font-semibold text-foreground">
                Claims By Recipient
              </h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={recipientChartData}>
                    <XAxis dataKey="wallet" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="total" fill="hsl(var(--accent))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-5 sm:p-6">
              <h2 className="mb-2 font-display text-xl font-semibold text-foreground">
                Project Claiming Progress
              </h2>
              <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
                Best-fit allocation view: claimed tokens, currently claimable tokens,
                and the remaining locked or unvested balance.
              </p>
              <div className="h-80">
                {projectProgressPieData.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    No allocation progress available yet.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={projectProgressPieData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={72}
                        outerRadius={112}
                        paddingAngle={3}
                      >
                        {projectProgressPieData.map((entry, index) => (
                          <Cell
                            key={entry.name}
                            fill={PROJECT_PROGRESS_COLORS[index % PROJECT_PROGRESS_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
