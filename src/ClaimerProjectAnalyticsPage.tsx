import { useEffect, useMemo, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useParams } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  PieChart as PieChartIcon,
  Wallet,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ThemeToggle } from "./ThemeToggle";
import { supabase } from "./supabase";
import { useClaimerWalletAuth } from "./hooks/useClaimerWalletAuth";

type ClaimerOrganization = {
  id: string;
  name: string;
  logo_url: string | null;
};

type ClaimerProject = {
  project_name: string;
  token_symbol: string;
  token_mint: string;
  organizations: ClaimerOrganization | ClaimerOrganization[] | null;
};

type ClaimerSchedule = {
  id: string;
  total_amount: number | string;
  claimed_amount: number | string | null;
  start_date: string;
  cliff_months: number | null;
  duration_months: number;
  schedule_type: string | null;
  vesting_projects: ClaimerProject | ClaimerProject[] | null;
};

type ClaimHistoryRow = {
  id: string;
  schedule_id: string | null;
  amount: number | string;
  created_at?: string | null;
  claimed_at?: string | null;
  claim_executed_at?: string | null;
  token_price_usd_at_claim?: number | string | null;
  claim_value_usd?: number | string | null;
};

const CLAIM_PROGRESS_COLORS = ["#14F195", "hsl(var(--primary))", "#64748b"];

const getClaimerProject = (
  schedule: ClaimerSchedule | undefined,
): ClaimerProject | null => {
  const project = schedule?.vesting_projects;

  if (Array.isArray(project)) {
    return project[0] ?? null;
  }

  return project ?? null;
};

const getClaimerOrganization = (
  project: ClaimerProject | null,
): ClaimerOrganization | null => {
  const organization = project?.organizations;

  if (Array.isArray(organization)) {
    return organization[0] ?? null;
  }

  return organization ?? null;
};

const getClaimDate = (claim: ClaimHistoryRow) =>
  claim.claim_executed_at || claim.claimed_at || claim.created_at || "";

const getClaimValueUsd = (claim: ClaimHistoryRow) => {
  if (claim.claim_value_usd !== null && claim.claim_value_usd !== undefined) {
    return Number(claim.claim_value_usd);
  }

  if (
    claim.token_price_usd_at_claim !== null &&
    claim.token_price_usd_at_claim !== undefined
  ) {
    return Number(claim.amount ?? 0) * Number(claim.token_price_usd_at_claim);
  }

  return 0;
};

const calculateVested = (schedule: ClaimerSchedule) => {
  const now = new Date();
  const start = new Date(schedule.start_date);
  const cliffEnd = new Date(start);
  cliffEnd.setMonth(cliffEnd.getMonth() + (schedule.cliff_months ?? 0));

  if (now < cliffEnd) return 0;
  if (schedule.schedule_type === "immediate") return Number(schedule.total_amount);

  const elapsed =
    (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30);
  const vestedMonths = Math.min(elapsed, schedule.duration_months);

  return Number(
    ((vestedMonths / schedule.duration_months) * Number(schedule.total_amount)).toFixed(2),
  );
};

export default function ClaimerProjectAnalyticsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { publicKey } = useWallet();
  const {
    authError,
    authLoading,
    isSignedInForConnectedWallet,
    signInWithConnectedWallet,
    signingIn,
    walletAddress,
  } = useClaimerWalletAuth();
  const [schedules, setSchedules] = useState<ClaimerSchedule[]>([]);
  const [claims, setClaims] = useState<ClaimHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const load = async () => {
        if (!projectId || !walletAddress || !isSignedInForConnectedWallet) {
          setSchedules([]);
          setClaims([]);
          setLoading(false);
          return;
        }

        const { data: scheduleData } = await supabase
          .from("vesting_schedules")
          .select(
            `
              id,
              total_amount,
              claimed_amount,
              start_date,
              cliff_months,
              duration_months,
              schedule_type,
              vesting_projects (
                project_name,
                token_symbol,
                token_mint,
                organizations (id, name, logo_url)
              )
            `,
          )
          .eq("project_id", projectId)
          .eq("recipient_wallet", walletAddress)
          .eq("is_active", true);

        const nextSchedules = (scheduleData ?? []) as unknown as ClaimerSchedule[];
        setSchedules(nextSchedules);

        const scheduleIds = nextSchedules.map((schedule) => schedule.id);
        if (scheduleIds.length === 0) {
          setClaims([]);
          setLoading(false);
          return;
        }

        const { data: claimData } = await supabase
          .from("claim_history")
          .select("*")
          .in("schedule_id", scheduleIds)
          .order("created_at", { ascending: true });

        setClaims((claimData ?? []) as ClaimHistoryRow[]);
        setLoading(false);
      };

      void load();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [isSignedInForConnectedWallet, projectId, walletAddress]);

  const project = getClaimerProject(schedules[0]);
  const organization = getClaimerOrganization(project);
  const totalAllocation = schedules.reduce(
    (sum, schedule) => sum + Number(schedule.total_amount ?? 0),
    0,
  );
  const claimedFromSchedules = schedules.reduce(
    (sum, schedule) => sum + Number(schedule.claimed_amount ?? 0),
    0,
  );
  const vestedTotal = schedules.reduce(
    (sum, schedule) => sum + calculateVested(schedule),
    0,
  );
  const claimableNow = Math.max(vestedTotal - claimedFromSchedules, 0);
  const lockedOrUnvested = Math.max(totalAllocation - claimedFromSchedules - claimableNow, 0);
  const totalClaimValueUsd = claims.reduce(
    (sum, claim) => sum + getClaimValueUsd(claim),
    0,
  );
  const claimsWithValueSnapshots = claims.filter(
    (claim) => getClaimValueUsd(claim) > 0,
  ).length;

  const progressPieData = [
    { name: "Claimed", value: claimedFromSchedules },
    { name: "Claimable Now", value: claimableNow },
    { name: "Locked / Unvested", value: lockedOrUnvested },
  ].filter((item) => item.value > 0);

  const claimTimelineData = useMemo(
    () =>
      claims.map((claim) => ({
        date: getClaimDate(claim)
          ? new Date(getClaimDate(claim)).toLocaleDateString()
          : "Unknown",
        tokens: Number(claim.amount ?? 0),
        usdValue: getClaimValueUsd(claim),
      })),
    [claims],
  );

  const logoUrl = organization?.logo_url ?? null;
  const projectMark =
    project?.token_symbol?.slice(0, 3).toUpperCase() ||
    project?.project_name
      ?.split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() ||
    "VA";

  return (
    <div
      className="min-h-screen relative"
      style={{ background: "var(--gradient-hero)" }}
    >
      <div className="absolute inset-0 mesh-bg opacity-20 pointer-events-none" />
      <div className="relative z-10 mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="mb-8 flex items-center justify-between border-b border-[hsl(265_40%_20%/0.5)] pb-6">
          <button
            type="button"
            onClick={() => {
              window.location.href = "/claim";
            }}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Claim dashboard
          </button>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <WalletMultiButton />
          </div>
        </div>

        {!publicKey ? (
          <div className="glass-card rounded-2xl p-12 text-center">
            <Wallet className="mx-auto mb-4 h-10 w-10 text-[hsl(var(--primary))]" />
            <h1 className="font-display text-2xl font-bold text-foreground">
              Connect wallet
            </h1>
            <p className="mx-auto mb-6 mt-2 max-w-md text-sm text-muted-foreground">
              Connect your Solana wallet to view your project analytics.
            </p>
            <WalletMultiButton />
          </div>
        ) : authLoading ? (
          <div className="glass-card rounded-2xl p-8 text-center text-sm text-muted-foreground">
            Checking wallet sign-in...
          </div>
        ) : !isSignedInForConnectedWallet ? (
          <div className="glass-card rounded-2xl p-12 text-center">
            <Wallet className="mx-auto mb-4 h-10 w-10 text-[hsl(var(--primary))]" />
            <h1 className="font-display text-2xl font-bold text-foreground">
              Verify this wallet
            </h1>
            <p className="mx-auto mb-6 mt-2 max-w-md text-sm text-muted-foreground">
              Sign a message with the connected Solana wallet before private project
              analytics are shown.
            </p>
            {authError && (
              <p className="mb-4 text-sm text-[hsl(0_84%_70%)]">{authError}</p>
            )}
            <button
              type="button"
              onClick={() => void signInWithConnectedWallet()}
              disabled={signingIn}
              className="rounded-xl border border-[hsl(var(--primary)/0.4)] bg-[hsl(var(--primary)/0.15)] px-5 py-3 text-sm font-bold text-foreground transition hover:bg-[hsl(var(--primary)/0.24)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {signingIn ? "Waiting for signature..." : "Sign in with Solana"}
            </button>
          </div>
        ) : loading ? (
          <div className="glass-card rounded-2xl p-8 text-center text-sm text-muted-foreground">
            Loading claimer analytics...
          </div>
        ) : schedules.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center text-sm text-muted-foreground">
            No active vesting schedules found for this project and wallet.
          </div>
        ) : (
          <div className="space-y-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[hsl(var(--accent)/0.36)] bg-[hsl(265_40%_14%/0.92)] font-display text-2xl font-black text-foreground">
                <span className="absolute inset-0 bg-linear-to-br from-[hsl(var(--primary)/0.3)] to-[hsl(var(--accent)/0.18)]" />
                <span className="relative">{projectMark}</span>
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={`${organization?.name || project?.project_name || "Project"} logo`}
                    className="absolute inset-0 h-full w-full object-cover"
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                ) : null}
              </div>
              <div>
                <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-[hsl(157_87%_51%/0.26)] bg-[hsl(157_87%_51%/0.08)] px-3 py-1 text-xs font-bold uppercase tracking-widest text-[hsl(var(--accent))]">
                  <PieChartIcon className="h-3.5 w-3.5" />
                  Claimer Project Analytics
                </p>
                <h1 className="font-display text-3xl font-bold text-foreground">
                  {project?.project_name || "Project Analytics"}
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                  Your personal claiming progress, claim execution history, and
                  stored USD value snapshots for this project.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {[
                {
                  label: "Total Allocation",
                  value: totalAllocation.toLocaleString(),
                  icon: Calendar,
                  color: "text-[hsl(var(--primary))]",
                },
                {
                  label: "Claimed",
                  value: claimedFromSchedules.toLocaleString(),
                  icon: Wallet,
                  color: "text-green-400",
                },
                {
                  label: "Claimable",
                  value: claimableNow.toLocaleString(),
                  icon: BarChart3,
                  color: "text-[hsl(var(--accent))]",
                },
                {
                  label: "Claim Value",
                  value: `$${totalClaimValueUsd.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}`,
                  icon: PieChartIcon,
                  color: "text-yellow-300",
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

            <div className="grid gap-8 lg:grid-cols-2">
              <div className="glass-card rounded-2xl p-5 sm:p-6">
                <h2 className="mb-2 font-display text-xl font-semibold text-foreground">
                  Claiming Progress
                </h2>
                <p className="mb-4 text-sm text-muted-foreground">
                  Your allocation split into claimed, claimable now, and locked or
                  unvested tokens.
                </p>
                <div className="h-80">
                  {progressPieData.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      No progress data available yet.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={progressPieData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={64}
                          outerRadius={104}
                          paddingAngle={3}
                        >
                          {progressPieData.map((entry, index) => (
                            <Cell
                              key={entry.name}
                              fill={CLAIM_PROGRESS_COLORS[index % CLAIM_PROGRESS_COLORS.length]}
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

              <div className="glass-card rounded-2xl p-5 sm:p-6">
                <h2 className="mb-2 font-display text-xl font-semibold text-foreground">
                  Claim Value At Execution
                </h2>
                <p className="mb-4 text-sm text-muted-foreground">
                  USD bars use stored execution-time token price snapshots from
                  claim history.
                </p>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={claimTimelineData}>
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="usdValue" fill="hsl(var(--accent))" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {claims.length > 0 && claimsWithValueSnapshots === 0 && (
                  <p className="mt-3 text-xs text-[hsl(45_90%_72%)]">
                    Historical token price snapshots are not recorded for these
                    claims yet.
                  </p>
                )}
              </div>
            </div>

            <div className="glass-card rounded-2xl p-5 sm:p-6">
              <h2 className="mb-4 font-display text-xl font-semibold text-foreground">
                Claimed Tokens Over Time
              </h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={claimTimelineData}>
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="tokens"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
