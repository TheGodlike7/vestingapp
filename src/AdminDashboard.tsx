import { useWallet } from "@solana/wallet-adapter-react";
import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  BadgeCheck,
  BarChart3,
  Building2,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  FolderOpen,
  KeyRound,
  LockKeyhole,
  LogOut,
  Plus,
  Zap,
} from "lucide-react";
import { CreateProjectModal } from "./CreateProjectModal.tsx";
import { OnboardingGuide } from "./components/onboarding/OnboardingGuide.tsx";
import { ThemeToggle } from "./ThemeToggle.tsx";
import { supabase } from "./supabase";
import { useSubscription } from "./useSubscription.ts";
import { WalletContextProvider } from "./WalletProvider.tsx";

type Project = {
  id: string;
  owner_id: string;
  project_name: string;
  token_mint: string;
  token_symbol: string;
  created_at: string;
};

type Organization = {
  id: string;
  name: string;
  owner_id: string;
  kyb_status: string | null;
  kyb_risk_level: string | null;
};

function AdminDashboardContent() {
  const { publicKey } = useWallet();

  const [user, setUser] = useState<User | null>(null);
  const userId = user?.id ?? null;

  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [organization, setOrganization] = useState<Organization | null>(null);

  const { isActive, loading: subLoading, canCreate } = useSubscription(userId);
  const activeWalletAddress = publicKey?.toBase58() ?? null;
  const activeOrganization =
    organization?.owner_id === activeWalletAddress ? organization : null;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const fetchProjects = useCallback(async (ownerId: string) => {
    const { data } = await supabase
      .from("vesting_projects")
      .select("*")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false });

    setProjects(data ?? []);
  }, []);

  const fetchOrganizationForWallet = useCallback(async (walletAddress: string) => {
    const { data, error } = await supabase
      .from("organizations")
      .select("id, name, owner_id, kyb_status, kyb_risk_level")
      .eq("owner_id", walletAddress)
      .limit(1)
      .maybeSingle<Organization>();

    if (error) {
      return null;
    }

    return data ?? null;
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (cancelled) return;

      if (!session) {
        window.location.href = "/login";
        return;
      }

      setUser(session.user);
      await fetchProjects(session.user.id);

      if (!cancelled) {
        setLoading(false);
      }
    };

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, [fetchProjects]);

  useEffect(() => {
    if (!activeWalletAddress) return;

    let cancelled = false;

    const loadOrganization = async () => {
      const nextOrganization = await fetchOrganizationForWallet(activeWalletAddress);

      if (!cancelled) {
        setOrganization(nextOrganization);
      }
    };

    void loadOrganization();

    return () => {
      cancelled = true;
    };
  }, [activeWalletAddress, fetchOrganizationForWallet]);

  if (loading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center text-sm text-muted-foreground"
        style={{ background: "var(--gradient-hero)" }}
      >
        Loading dashboard...
      </div>
    );
  }

  return (
    <div
      className="min-h-screen relative"
      style={{ background: "var(--gradient-hero)" }}
    >
      <div className="absolute inset-0 mesh-bg opacity-20 pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-6">
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

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu((prev) => !prev)}
                className="flex items-center gap-2 px-3 py-2 rounded-full border border-[hsl(265_40%_20%)] bg-[hsl(265_44%_15%/0.5)] text-foreground hover:border-[hsl(var(--primary))] transition-all text-sm"
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-white"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  {user?.email?.charAt(0).toUpperCase() ?? "U"}
                </div>
                <span className="hidden sm:block">Account</span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>

              {showProfileMenu && (
                <div
                  className="absolute right-0 top-[calc(100%+0.5rem)] glass-card rounded-xl border border-[hsl(265_40%_20%)] min-w-55 z-50 overflow-hidden"
                  style={{ boxShadow: "var(--shadow-purple)" }}
                >
                  <div className="px-4 py-3 border-b border-[hsl(265_40%_20%/0.5)]">
                    <p className="text-xs text-muted-foreground mb-1">
                      Signed in as
                    </p>
                    <p className="text-sm font-semibold text-foreground truncate">
                      {user?.email}
                    </p>
                  </div>
                  {[
                    {
                      label: "Manage Subscription",
                      icon: CreditCard,
                      action: () => {
                        window.location.href = "/subscription";
                      },
                    },
                    {
                      label: "Change Password",
                      icon: KeyRound,
                      action: () => {
                        window.location.href = "/reset-password";
                      },
                    },
                  ].map((item) => (
                    <button
                      key={item.label}
                      onClick={() => {
                        item.action();
                        setShowProfileMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-[hsl(265_44%_15%/0.6)] transition-colors border-b border-[hsl(265_40%_20%/0.3)] text-left"
                    >
                      <item.icon className="w-4 h-4 text-muted-foreground" />
                      {item.label}
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      window.location.href = "/analytics";
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-[hsl(265_44%_15%/0.6)] transition-colors border-b border-[hsl(265_40%_20%/0.3)] text-left"
                  >
                    <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                    Analytics
                  </button>

                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[hsl(0_84%_60%)] hover:bg-[hsl(0_84%_60%/0.1)] transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mb-9 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-3xl md:text-3xl font-bold text-foreground">
              Dashboard
            </h1>
            <p className="text-muted-foreground text-sm mt-2">
              Manage your vesting projects and schedules
            </p>
          </div>

          <button
            type="button"
            data-onboard="analytics-link"
            onClick={() => {
              window.location.href = "/analytics";
            }}
            className="inline-flex w-fit items-center justify-center gap-2 rounded-xl border border-[hsl(265_40%_24%)] bg-[hsl(265_44%_15%/0.45)] px-4 py-2 text-sm font-bold text-foreground transition hover:border-[hsl(var(--primary))] hover:bg-[hsl(265_44%_15%/0.65)]"
          >
            <BarChart3 className="h-4 w-4 text-[hsl(var(--accent))]" />
            Analytics
          </button>
        </div>

        <div
          data-onboard="subscription-cta"
          className={`mb-8 rounded-2xl border p-5 ${
            isActive
              ? "border-[hsl(157_87%_51%/0.28)] bg-[hsl(157_87%_51%/0.08)]"
              : "border-[hsl(0_84%_60%/0.3)] bg-[hsl(0_84%_60%/0.08)]"
          }`}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div
                className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                  isActive
                    ? "border-[hsl(157_87%_51%/0.35)] bg-[hsl(157_87%_51%/0.12)] text-[hsl(var(--accent))]"
                    : "border-[hsl(0_84%_60%/0.35)] bg-[hsl(0_84%_60%/0.12)] text-[hsl(0_84%_70%)]"
                }`}
              >
                {isActive ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <LockKeyhole className="h-5 w-5" />
                )}
              </div>
              <div>
                <p
                  className={`font-semibold text-sm ${
                    isActive
                      ? "text-[hsl(var(--accent))]"
                      : "text-[hsl(0_84%_70%)]"
                  }`}
                >
                  {subLoading
                    ? "Checking subscription"
                    : isActive
                      ? "Starter subscription active"
                      : "No active subscription"}
                </p>
                <p className="text-muted-foreground text-xs mt-1">
                  {isActive
                    ? "Your workspace can create projects and manage vesting schedules."
                    : "Subscribe to unlock project creation and vesting schedule management."}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                window.location.href = "/subscription";
              }}
              className="btn-primary px-5 py-2 rounded-xl text-sm font-bold text-white whitespace-nowrap"
            >
              {isActive ? "Manage plan" : "Subscribe now"}
            </button>
          </div>
        </div>

        <div data-onboard="organization-card" className="mb-8">
          <div className="rounded-2xl border border-[hsl(265_40%_22%)] bg-[hsl(265_35%_10%/0.72)] p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[hsl(157_87%_51%/0.25)] bg-[hsl(157_87%_51%/0.08)]">
                  <Building2 className="h-5 w-5 text-[hsl(var(--accent))]" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">
                    Organization
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-lg font-bold text-foreground">
                      {activeOrganization ? activeOrganization.name : "Create your organization"}
                    </h2>
                    {activeOrganization?.kyb_status === "verified" ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-[hsl(157_87%_51%/0.28)] bg-[hsl(157_87%_51%/0.08)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[hsl(var(--accent))]">
                        <BadgeCheck className="h-3 w-3" />
                        Verified
                      </span>
                    ) : activeOrganization ? (
                      <span className="rounded-full border border-[hsl(265_40%_24%)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        {(activeOrganization.kyb_status ?? "unverified").replace("_", " ")}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {activeOrganization
                      ? activeOrganization.kyb_status === "verified"
                        ? "Your home base is verified for paid beta trust signals."
                        : "Your home base is ready. Submit or review the trust profile to unlock verified signals."
                      : "Open the organization setup page to create your workspace home base."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  window.location.href = "/organization";
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-[hsl(265_40%_24%)] px-4 py-2 text-sm font-bold text-foreground transition hover:border-[hsl(var(--primary))] hover:bg-[hsl(265_44%_15%/0.55)]"
              >
                {activeOrganization ? "Manage organization" : "Create organization"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div
          data-onboard="project-list"
          className="glass-card rounded-2xl p-6"
        >
          <div className="flex justify-between items-center mb-6 gap-4">
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground">
                Your Projects
              </h2>
              <p className="text-muted-foreground text-xs mt-0.5">
                {projects.length} project{projects.length !== 1 ? "s" : ""}
              </p>
            </div>

            <button
              type="button"
              data-onboard="new-project"
              onClick={() => {
                if (!canCreate) {
                  window.location.href = "/subscription";
                  return;
                }

                setShowCreateModal(true);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                canCreate
                  ? "btn-primary text-white"
                  : "border border-[hsl(265_40%_20%)] text-muted-foreground cursor-not-allowed"
              }`}
            >
              {canCreate ? (
                <>
                  <Plus className="h-4 w-4" />
                  New Project
                </>
              ) : (
                <>
                  <LockKeyhole className="h-4 w-4" />
                  Subscribe to Create
                </>
              )}
            </button>
          </div>

          {projects.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-[hsl(271_100%_64%/0.1)] border border-[hsl(271_100%_64%/0.2)] flex items-center justify-center mx-auto mb-4">
                <FolderOpen className="w-8 h-8 text-[hsl(var(--primary))]" />
              </div>
              <p className="text-foreground font-medium mb-1">
                No projects yet
              </p>
              <p className="text-muted-foreground text-sm">
                Create your first vesting project to get started
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {projects.map((project) => (
                <div key={project.id} className="project-card">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[hsl(271_100%_64%/0.1)] border border-[hsl(271_100%_64%/0.2)] flex items-center justify-center shrink-0">
                      <FolderOpen className="w-5 h-5 text-[hsl(var(--primary))]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-sm">
                        {project.project_name}
                      </h3>
                      <p className="text-muted-foreground text-xs">
                        {project.token_symbol} /{" "}
                        {project.token_mint.slice(0, 8)}...
                      </p>
                    </div>
                  </div>
                  <button
                    className="manage-btn text-sm"
                    onClick={() => {
                      window.location.href = `/project/${project.id}`;
                    }}
                  >
                    Manage
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showCreateModal && user && (
        <CreateProjectModal
          userId={user.id}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            void fetchProjects(user.id);
          }}
        />
      )}

      <OnboardingGuide userId={userId} />
    </div>
  );
}

export function AdminDashboard() {
  return (
    <WalletContextProvider>
      <AdminDashboardContent />
    </WalletContextProvider>
  );
}
