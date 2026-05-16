import { useCallback, useEffect, useMemo, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { WalletContextProvider } from "./WalletProvider.tsx";
import { supabase } from "./supabase.ts";
import { ArrowLeft, BarChart3, Zap, Wallet, Inbox, TrendingUp } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle.tsx";
import { ClaimOnboardingGuide } from "./components/onboarding/ClaimOnboardingGuide.tsx";
import { Toaster } from "./components/ui/sonner.tsx";
import { useSubscription } from "./hooks/usesubscription.ts";
import { useClaimerWalletAuth } from "./hooks/useClaimerWalletAuth.ts";

// 🔥 NEW IMPORT (will use later when you create it)
import ClaimerDashboard from "./ClaimerDashboard";
import ClaimerProjectsPage from "./ClaimerProjectsPage.tsx";
import ClaimerVestingsPage from "./ClaimerVestingsPage.tsx";
import { AdminDashboard } from "./AdminDashboard.tsx";
import WebhookDashboard from "./WebhookDashboard.tsx";

type VestingOrganization = {
  id: string;
  name: string;
  logo_url: string | null;
};

type VestingProject = {
  id: string;
  project_name: string;
  token_symbol: string;
  token_mint: string;
  organization_id: string | null;
  organizations?: VestingOrganization | VestingOrganization[] | null;
};

type VestingSchedule = {
  id: string;
  project_id: string | null;
  recipient_wallet: string;
  total_amount: number;
  start_date: string;
  cliff_months: number | null;
  duration_months: number;
  schedule_type: string | null;
  is_active: boolean | null;
  created_at: string | null;
  vesting_projects?: VestingProject | VestingProject[] | null;
  claimed_amount?: number;
};

type ClaimHistory = {
  id: string;
  amount: number;
  claimed_at: string;
};

const CLAIMS_HAVE_SECURE_ONCHAIN_PATH = false;

const getScheduleProject = (schedule: VestingSchedule): VestingProject | null => {
  const project = schedule.vesting_projects;

  if (Array.isArray(project)) {
    return project[0] ?? null;
  }

  return project ?? null;
};

const getProjectOrganization = (
  project: VestingProject | null,
): VestingOrganization | null => {
  const organization = project?.organizations;

  if (Array.isArray(organization)) {
    return organization[0] ?? null;
  }

  return organization ?? null;
};

export function ClaimPage() {
  const { publicKey } = useWallet();
  const {
    authError,
    authLoading,
    isSignedInForConnectedWallet,
    signInWithConnectedWallet,
    signingIn,
    walletAddress,
  } = useClaimerWalletAuth();
  const [schedules, setSchedules] = useState<VestingSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<ClaimHistory[]>([]);
  const claimingId: string | null = null;
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [selectedAnalyticsOrgId, setSelectedAnalyticsOrgId] = useState<string | null>(null);
  const claimsEnabled = CLAIMS_HAVE_SECURE_ONCHAIN_PATH && import.meta.env.VITE_CLAIMS_ENABLED === 'true';

  const fetchHistory = useCallback(async (scheduleId: string) => {
    const { data } = await supabase
      .from("claim_history")
      .select("*")
      .eq("schedule_id", scheduleId)
      .order("claimed_at", { ascending: false });

    if (data) setHistory(data);
  }, []);

  const fetchSchedules = useCallback(async (wallet: string) => {
    setLoading(true);
    const { data } = await supabase
      .from("vesting_schedules")
      .select(`*, vesting_projects (id, project_name, token_symbol, token_mint, organization_id, organizations (id, name, logo_url))`)
      .eq("recipient_wallet", wallet)
      .eq("is_active", true);

    if (data) {
      const nextSchedules = data as VestingSchedule[];
      setSchedules(nextSchedules);
      if (nextSchedules[0]) {
        await fetchHistory(nextSchedules[0].id);
      } else {
        setHistory([]);
      }
    }
    setLoading(false);
  }, [fetchHistory]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!walletAddress || !isSignedInForConnectedWallet) {
        setSchedules([]);
        setHistory([]);
        setLoading(false);
        return;
      }

      void fetchSchedules(walletAddress);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [fetchSchedules, isSignedInForConnectedWallet, walletAddress]);

  const claimerOrganizations = useMemo(() => {
    const organizationMap = new Map<string, VestingOrganization>();

    schedules.forEach((schedule) => {
      const organization = getProjectOrganization(getScheduleProject(schedule));
      if (organization && !organizationMap.has(organization.id)) {
        organizationMap.set(organization.id, organization);
      }
    });

    return Array.from(organizationMap.values());
  }, [schedules]);

  const selectedAnalyticsOrganization = claimerOrganizations.find(
    (organization) => organization.id === selectedAnalyticsOrgId,
  );

  const analyticsProjects = useMemo(() => {
    if (!selectedAnalyticsOrgId) return [];

    const projectMap = new Map<
      string,
      VestingProject & { logo_url: string | null; scheduleCount: number }
    >();

    schedules.forEach((schedule) => {
      const project = getScheduleProject(schedule);
      if (!project || project.organization_id !== selectedAnalyticsOrgId) return;

      const current = projectMap.get(project.id);
      projectMap.set(project.id, {
        ...project,
        logo_url: getProjectOrganization(project)?.logo_url ?? null,
        scheduleCount: (current?.scheduleCount ?? 0) + 1,
      });
    });

    return Array.from(projectMap.values());
  }, [schedules, selectedAnalyticsOrgId]);

  const getProjectMark = (project: Pick<VestingProject, "project_name" | "token_symbol">) => {
    if (project.token_symbol) return project.token_symbol.slice(0, 3).toUpperCase();
    return project.project_name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  };

  const calculateVested = (schedule: VestingSchedule) => {
    const now = new Date();
    const start = new Date(schedule.start_date);

    const cliffMonths = schedule.cliff_months ?? 0;
    const cliffEnd = new Date(start);
    cliffEnd.setMonth(cliffEnd.getMonth() + cliffMonths);

    if (now < cliffEnd) return 0;
    if (schedule.schedule_type === "immediate") return schedule.total_amount;

    const totalDuration = schedule.duration_months;
    const elapsed =
      (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30);

    const vestedMonths = Math.min(elapsed, totalDuration);

    return Number(
      ((vestedMonths / totalDuration) * schedule.total_amount).toFixed(2),
    );
  };

  const calculateCliffStatus = (schedule: VestingSchedule) => {
    const now = new Date();
    const start = new Date(schedule.start_date);

    const cliffMonths = schedule.cliff_months ?? 0;
    const cliffEnd = new Date(start);
    cliffEnd.setMonth(cliffEnd.getMonth() + cliffMonths);

    if (now < cliffEnd) {
      const daysLeft = Math.ceil(
        (cliffEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      return `Cliff ends in ${daysLeft} days`;
    }

    return "Cliff passed ✅";
  };

  const getNextUnlock = (schedule: {
    start_date: string;
    cliff_months: number | null;
    duration_months: number;
  }) => {
    const now = new Date();
    const start = new Date(schedule.start_date);

    const cliffEnd = new Date(start);
    cliffEnd.setMonth(cliffEnd.getMonth() + (schedule.cliff_months || 0));

    if (now < cliffEnd) {
      const days = Math.ceil(
        (cliffEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      return `Unlocks in ${days} days`;
    }

    const nextMonth = new Date(start);
    nextMonth.setMonth(
      start.getMonth() +
        Math.floor(
          (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30),
        ) +
        1,
    );

    const days = Math.ceil(
      (nextMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
    return `Next unlock in ${days} days`;
  };

  return (
    <div
      className="min-h-screen relative"
      style={{ background: "var(--gradient-hero)" }}
    >
      <div className="absolute inset-0 mesh-bg opacity-20 pointer-events-none" />
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-150 h-100 bg-[hsl(271_100%_64%/0.12)] rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 pb-6 border-b border-[hsl(265_40%_20%/0.5)]">
          <a href="/" className="flex items-center gap-2.5">
            <div className="relative w-8 h-8">
              <div className="absolute inset-0 rounded-lg bg-linear-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] opacity-80" />
              <Zap className="absolute inset-0 m-auto w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-lg text-foreground">
              Vesting<span className="gradient-text">App</span>
            </span>
          </a>

          <div className="flex items-center gap-3" data-claim-guide="wallet-control">
            <ThemeToggle />
            <WalletMultiButton />
          </div>
        </div>

        {/* Title */}
        <div className="mb-8">
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
            Claim Tokens
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            View and claim your vested tokens
          </p>
        </div>
        {statusMessage && (
          <div
            className="mb-4 text-center text-sm text-foreground"
            data-claim-guide="claim-status"
          >
            {statusMessage}
          </div>
        )}
        {publicKey && !claimsEnabled && (
          <div
            className="mb-4 rounded-2xl border border-[hsl(45_90%_60%/0.32)] bg-[hsl(45_90%_60%/0.1)] px-5 py-4 text-sm text-[hsl(45_90%_72%)]"
            data-claim-guide="claim-status"
          >
            Claiming is temporarily disabled while the secure mainnet claim path is finalized. You can still review vesting schedules.
          </div>
        )}
        {!publicKey ? (
          <div
            className="glass-card rounded-2xl p-12 text-center border border-[hsl(271_100%_64%/0.2)]"
            data-claim-guide="connect-wallet"
          >
            <div className="w-20 h-20 rounded-2xl bg-[hsl(271_100%_64%/0.1)] border border-[hsl(271_100%_64%/0.2)] flex items-center justify-center mx-auto mb-6">
              <Wallet className="w-10 h-10 text-[hsl(var(--primary))]" />
            </div>
            <h2 className="font-display text-xl font-bold text-foreground mb-2">
              Connect Your Wallet
            </h2>
            <p className="text-muted-foreground text-sm mb-8 max-w-sm mx-auto">
              Connect your Solana wallet to view your vesting schedules and
              claim tokens
            </p>
            <WalletMultiButton />
          </div>
        ) : authLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground gap-3">
            <div className="w-5 h-5 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin" />
            Checking wallet sign-in...
          </div>
        ) : !isSignedInForConnectedWallet ? (
          <div className="glass-card rounded-2xl p-12 text-center border border-[hsl(271_100%_64%/0.2)]">
            <div className="w-20 h-20 rounded-2xl bg-[hsl(271_100%_64%/0.1)] border border-[hsl(271_100%_64%/0.2)] flex items-center justify-center mx-auto mb-6">
              <Wallet className="w-10 h-10 text-[hsl(var(--primary))]" />
            </div>
            <h2 className="font-display text-xl font-bold text-foreground mb-2">
              Verify This Wallet
            </h2>
            <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
              Sign a message with the connected Solana wallet before private vesting
              schedules are shown.
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
          <div className="flex items-center justify-center py-20 text-muted-foreground gap-3">
            <div className="w-5 h-5 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin" />
            Loading your schedules...
          </div>
        ) : schedules.length === 0 ? (
          <div
            className="glass-card rounded-2xl p-12 text-center border border-[hsl(265_40%_20%/0.5)]"
            data-claim-guide="schedule-list"
          >
            <div className="w-20 h-20 rounded-2xl bg-[hsl(265_44%_15%/0.5)] border border-[hsl(265_40%_20%)] flex items-center justify-center mx-auto mb-6">
              <Inbox className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="font-display text-xl font-bold text-foreground mb-2">
              No Vesting Schedules
            </h2>
            <p className="text-muted-foreground text-sm mb-2">
              No active vesting schedules found for your wallet
            </p>
          </div>
        ) : (
          <>
        {publicKey && schedules.length > 0 && (
          <div className="glass-card mb-4 rounded-2xl border border-[hsl(265_40%_20%/0.5)] p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-[hsl(271_100%_64%/0.25)] bg-[hsl(271_100%_64%/0.08)] px-3 py-1 text-xs font-bold uppercase tracking-widest text-[hsl(var(--primary))]">
                  <BarChart3 className="h-3.5 w-3.5" />
                  Claimer Analytics
                </p>
                <h2 className="font-display text-xl font-bold text-foreground">
                  Your project analytics
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Select an organization, then open analytics for a project where your vesting schedule is active.
                </p>
              </div>
              {selectedAnalyticsOrgId && (
                <button
                  type="button"
                  onClick={() => setSelectedAnalyticsOrgId(null)}
                  className="inline-flex items-center gap-2 rounded-xl border border-[hsl(265_40%_24%)] px-4 py-2 text-sm font-bold text-foreground transition hover:border-[hsl(var(--primary))]"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Organizations
                </button>
              )}
            </div>

            {!selectedAnalyticsOrgId ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {claimerOrganizations.map((organization) => (
                  <button
                    key={organization.id}
                    type="button"
                    onClick={() => setSelectedAnalyticsOrgId(organization.id)}
                    className="group flex flex-col items-center gap-3 rounded-2xl border border-transparent p-3 text-center transition hover:border-[hsl(var(--primary)/0.38)] hover:bg-[hsl(265_40%_16%/0.58)]"
                  >
                    <span className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-[hsl(var(--primary)/0.34)] bg-[hsl(265_40%_14%/0.92)] font-display text-lg font-black text-foreground transition group-hover:scale-105">
                      <span className="absolute inset-0 bg-linear-to-br from-[hsl(var(--primary)/0.28)] to-[hsl(var(--accent)/0.18)]" />
                      <span className="relative">
                        {organization.name
                          .split(/\s+/)
                          .slice(0, 2)
                          .map((part) => part[0])
                          .join("")
                          .toUpperCase()}
                      </span>
                      {organization.logo_url ? (
                        <img
                          src={organization.logo_url}
                          alt={`${organization.name} logo`}
                          className="absolute inset-0 h-full w-full object-cover"
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.style.display = "none";
                          }}
                        />
                      ) : null}
                    </span>
                    <span className="line-clamp-2 text-sm font-bold text-foreground">
                      {organization.name}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div>
                <p className="mb-3 text-sm font-semibold text-foreground">
                  {selectedAnalyticsOrganization?.name || "Selected organization"}
                </p>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {analyticsProjects.map((project) => (
                    <button
                      key={project.id}
                      type="button"
                      onClick={() => {
                        window.location.href = `/claim/analytics/project/${project.id}`;
                      }}
                      className="group flex flex-col items-center gap-3 rounded-2xl border border-transparent p-3 text-center transition hover:border-[hsl(var(--accent)/0.38)] hover:bg-[hsl(265_40%_16%/0.58)]"
                    >
                      <span className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-[hsl(var(--accent)/0.34)] bg-[hsl(265_40%_14%/0.92)] font-display text-base font-black text-foreground transition group-hover:scale-105">
                        <span className="absolute inset-0 bg-linear-to-br from-[hsl(var(--primary)/0.25)] to-[hsl(var(--accent)/0.2)]" />
                        <span className="relative">{getProjectMark(project)}</span>
                        {project.logo_url ? (
                          <img
                            src={project.logo_url}
                            alt={`${project.project_name} logo`}
                            className="absolute inset-0 h-full w-full object-cover"
                            loading="lazy"
                            onError={(event) => {
                              event.currentTarget.style.display = "none";
                            }}
                          />
                        ) : null}
                      </span>
                      <span className="line-clamp-2 text-sm font-bold text-foreground">
                        {project.project_name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {project.scheduleCount} active schedule{project.scheduleCount === 1 ? "" : "s"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
          <div className="space-y-4" data-claim-guide="schedule-list">
            {schedules.map((schedule, index) => {
              const vested = calculateVested(schedule);
              const claimed = schedule.claimed_amount || 0;
              const claimable = Math.max(vested - claimed, 0);
              const progress = (
                (claimed / schedule.total_amount) *
                100
              ).toFixed(1);
              const progressPercent = Math.min(
                (claimed / schedule.total_amount) * 100,
                100,
              );

              return (
                <div
                  key={schedule.id}
                  className="glass-card rounded-2xl p-6 border border-[hsl(265_40%_20%/0.5)]"
                  data-claim-guide={index === 0 ? "vesting-card" : undefined}
                >
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="font-display text-lg font-semibold text-foreground mb-1">
                        {getScheduleProject(schedule)?.project_name}
                      </h2>
                      <p className="text-muted-foreground text-sm">
                        {schedule.schedule_type} vesting • Started{" "}
                        {new Date(schedule.start_date).toLocaleDateString()}
                      </p>
                    </div>

                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[hsl(157_87%_51%/0.15)] text-[hsl(var(--accent))] border border-[hsl(157_87%_51%/0.3)]">
                      Active
                    </span>
                  </div>

                  {/* Amounts */}
                  <div className="grid grid-cols-3 gap-3 mb-6" data-claim-guide={index === 0 ? "vesting-amounts" : undefined}>
                    {[
                      { label: "Total", value: schedule.total_amount },
                      { label: "Vested", value: vested },
                      { label: "Claimable", value: claimable },
                    ].map((item) => (
                      <div key={item.label} className="text-center">
                        <div className="text-xs text-muted-foreground">
                          {item.label}
                        </div>
                        <div className="font-bold">
                          {item.value} {getScheduleProject(schedule)?.token_symbol}
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Progress Bar (claimed %) */}
                  <div className="mt-3" data-claim-guide={index === 0 ? "vesting-progress" : undefined}>
                    <div className="h-2 bg-[hsl(265_44%_15%)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {progressPercent.toFixed(1)}% claimed
                    </p>
                  </div>

                  {/* Progress */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs mb-2">
                      <span>{calculateCliffStatus(schedule)}</span>
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {progress}%
                      </span>
                    </div>

                    <div className="h-2 bg-gray-200 rounded-full">
                      <div
                        className="h-2 rounded-full bg-purple-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Cooldown */}
                  <p className="text-xs text-muted-foreground mt-1">
                    {getNextUnlock(schedule)}
                  </p>

                  {/* Claim */}
                  <button
                    type="button"
                    onClick={() => {
                      setStatusMessage(
                        "Claiming is temporarily disabled while the secure mainnet claim path is finalized.",
                      );
                    }}
                    disabled={!claimsEnabled || claimable === 0 || claimingId === schedule.id}
                    data-claim-guide={index === 0 ? "claim-action" : undefined}
                    className={`w-full py-2 rounded ${
                      !claimsEnabled || claimable === 0 || claimingId === schedule.id
                        ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                        : "bg-purple-500 text-white"
                    }`}
                  >
                    {claimingId === schedule.id
                      ? "Claiming..."
                      : !claimsEnabled
                        ? "Claiming temporarily disabled"
                        : claimable > 0
                          ? `Claim ${claimable} ${getScheduleProject(schedule)?.token_symbol}`
                          : claimed >= schedule.total_amount
                            ? "Fully claimed"
                            : "Nothing to claim"}
                  </button>
                  <div className="mt-4" data-claim-guide={index === 0 ? "claim-history" : undefined}>
                    <p className="text-xs text-muted-foreground mb-2">
                      Claim History
                    </p>
                    {history.map((h) => (
                      <div
                        key={h.id}
                        className="text-xs text-muted-foreground flex justify-between"
                      >
                        <span>
                          {new Date(h.claimed_at).toLocaleDateString()}
                        </span>
                        <span>{h.amount}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          </>
        )}
      </div>
      <ClaimOnboardingGuide walletAddress={walletAddress} />
    </div>
  );
}

function AppContent() {
  const { publicKey } = useWallet();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  const [selectedOrg, setSelectedOrg] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const [selectedProject, setSelectedProject] = useState<{
    id: string;
    project_name: string;
    token_symbol: string;
  } | null>(null);

  const isSubscriptionValid = useSubscription(
  publicKey ? publicKey.toBase58() : null
);

  // 🔥 CHECK ROLE
  useEffect(() => {
    if (!publicKey) return;

    const checkRole = async () => {
      const { data } = await supabase
        .from("vesting_projects")
        .select("id")
        .eq("owner_id", publicKey.toBase58())
        .limit(1);

      setIsAdmin(!!(data && data.length > 0));
    };

    checkRole();
  }, [publicKey]);

  // 🔥 Loading state (no UI change, just safety)
  if (isAdmin === null || isSubscriptionValid === null) {
    return null;
  }
  
  // 🔥 SUBSCRIPTION CHECK
  if (!isSubscriptionValid) {
    return (
      <div style={{ padding: 40, color: "white" }}>
        ❌ Subscription expired or inactive
      </div>
    );
  }

  // 🔥 ADMIN
  if (isAdmin) {
    return <AdminDashboard />;
  }

  if (window.location.pathname === "/webhooks") {
    return <WebhookDashboard />;
  }

  // 🔥 CLAIMER FLOW

  // 🟢 STEP 1 — Organizations
  if (!selectedOrg) {
    return (
      <ClaimerDashboard onSelectOrganization={(org) => setSelectedOrg(org)} />
    );
  }

  // 🟡 STEP 2 — Projects
  if (!selectedProject) {
    return (
      <>
        {/* 🔥 BACK BUTTON */}
        <div
          onClick={() => setSelectedOrg(null)}
          style={{ cursor: "pointer", marginBottom: "10px" }}
        >
          ← Back
        </div>

        <ClaimerProjectsPage
          organizationId={selectedOrg.id}
          onSelectProject={(project: {
            id: string;
            project_name: string;
            token_symbol: string;
          }) => setSelectedProject(project)}
        />
      </>
    );
  }

  // 🔵 STEP 3 — Vestings
  return (
    <>
      {/* 🔥 BACK BUTTON */}
      <div
        onClick={() => setSelectedProject(null)}
        style={{ cursor: "pointer", marginBottom: "10px" }}
      >
        ← Back
      </div>

      <ClaimerVestingsPage projectId={selectedProject.id} />
    </>
  );
}

export default function App() {
  return (
    <>
      <WalletContextProvider>
        <AppContent />
      </WalletContextProvider>
      <Toaster />
    </>
  );
}
