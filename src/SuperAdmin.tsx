import { useEffect, useState, useCallback } from "react";
import { supabase } from "./supabase";
import {
  AlertTriangle,
  BadgeCheck,
  Building2,
  Calendar,
  CheckCircle,
  Clock3,
  FolderOpen,
  LogOut,
  PauseCircle,
  ShieldAlert,
  Users,
  XCircle,
  Zap,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import type { KybRiskLevel, KybStatus, OrganizationType } from "./CreateOrganization";

type Owner = {
  id: string;
  email: string;
  company_name: string | null;
  plan: string;
  is_active: boolean;
  is_super_admin: boolean;
  created_at: string;
};

type ReviewOrganization = {
  id: string;
  name: string;
  owner_id: string;
  organization_type: OrganizationType | null;
  owner_full_name: string | null;
  logo_url: string | null;
  country_of_operation: string | null;
  contact_email: string | null;
  representative_role: string | null;
  project_description: string | null;
  x_url: string | null;
  discord_url: string | null;
  telegram_url: string | null;
  meta_url: string | null;
  instagram_url: string | null;
  linkedin_url: string | null;
  website_url: string | null;
  kyc_submitted_at: string | null;
  kyb_status: KybStatus | null;
  kyb_risk_level: KybRiskLevel | null;
  kyb_risk_score: number | null;
  kyb_review_notes: string | null;
  updated_at: string | null;
};

type AuthUser = {
  id: string;
};

const negativeStatuses = new Set<KybStatus>(["needs_changes", "rejected", "suspended"]);

function statusClass(status: KybStatus | null) {
  if (status === "verified") return "border-[hsl(157_87%_51%/0.3)] bg-[hsl(157_87%_51%/0.12)] text-[hsl(var(--accent))]";
  if (status === "submitted" || status === "in_review") return "border-[hsl(45_90%_60%/0.3)] bg-[hsl(45_90%_60%/0.1)] text-[hsl(45_90%_72%)]";
  if (status === "needs_changes") return "border-[hsl(271_100%_64%/0.3)] bg-[hsl(271_100%_64%/0.1)] text-[hsl(var(--primary))]";
  if (status === "rejected" || status === "suspended") return "border-[hsl(0_84%_60%/0.35)] bg-[hsl(0_84%_60%/0.1)] text-[hsl(0_84%_70%)]";
  return "border-[hsl(265_40%_24%)] bg-[hsl(265_35%_10%/0.72)] text-muted-foreground";
}

function riskClass(level: KybRiskLevel | null) {
  if (level === "low") return "text-[hsl(var(--accent))]";
  if (level === "medium") return "text-[hsl(45_90%_72%)]";
  if (level === "high") return "text-[hsl(0_84%_70%)]";
  return "text-muted-foreground";
}

function reviewLinks(organization: ReviewOrganization): Array<[string, string]> {
  return [
    ["X", organization.x_url],
    ["Discord", organization.discord_url],
    ["Telegram", organization.telegram_url],
    ["Meta/Facebook", organization.meta_url],
    ["Instagram", organization.instagram_url],
    ["LinkedIn", organization.linkedin_url],
    ["Website", organization.website_url],
  ].filter((item): item is [string, string] => Boolean(item[1]));
}

export function SuperAdmin() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [organizations, setOrganizations] = useState<ReviewOrganization[]>([]);
  const [stats, setStats] = useState({ totalOwners: 0, totalProjects: 0, totalSchedules: 0, activeSchedules: 0 });
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);

  const fetchOwners = useCallback(async () => {
    const { data } = await supabase.from("project_owners").select("*").order("created_at", { ascending: false });
    if (data) setOwners(data);
  }, []);

  const fetchOrganizations = useCallback(async () => {
    const { data } = await supabase
      .from("organizations")
      .select(
        "id, name, owner_id, organization_type, owner_full_name, logo_url, country_of_operation, contact_email, representative_role, project_description, x_url, discord_url, telegram_url, meta_url, instagram_url, linkedin_url, website_url, kyc_submitted_at, kyb_status, kyb_risk_level, kyb_risk_score, kyb_review_notes, updated_at",
      )
      .neq("kyb_status", "unverified")
      .order("kyb_risk_score", { ascending: false })
      .order("updated_at", { ascending: false });

    if (data) setOrganizations(data as ReviewOrganization[]);
  }, []);

  const fetchStats = useCallback(async () => {
    const [ownersRes, projectsRes, schedulesRes, activeRes] = await Promise.all([
      supabase.from("project_owners").select("id", { count: "exact" }),
      supabase.from("vesting_projects").select("id", { count: "exact" }),
      supabase.from("vesting_schedules").select("id", { count: "exact" }),
      supabase.from("vesting_schedules").select("id", { count: "exact" }).eq("is_active", true),
    ]);
    setStats({
      totalOwners: ownersRes.count || 0,
      totalProjects: projectsRes.count || 0,
      totalSchedules: schedulesRes.count || 0,
      activeSchedules: activeRes.count || 0,
    });
  }, []);

  const checkSuperAdmin = useCallback(async (authUser: AuthUser) => {
    const { data } = await supabase
      .from("project_owners")
      .select("*")
      .eq("id", authUser.id)
      .single();

    if (!data?.is_super_admin) {
      setUnauthorized(true);
      setLoading(false);
      return;
    }

    setUser(authUser);
    await Promise.all([fetchOwners(), fetchOrganizations(), fetchStats()]);
    setLoading(false);
  }, [fetchOwners, fetchOrganizations, fetchStats]);

  useEffect(() => {
    const run = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        window.location.href = "/login";
        return;
      }

      await checkSuperAdmin(session.user);
    };

    void run();
  }, [checkSuperAdmin]);

  const toggleActive = async (ownerId: string, currentStatus: boolean) => {
    await supabase.from("project_owners").update({ is_active: !currentStatus }).eq("id", ownerId);
    void fetchOwners();
  };

  const changePlan = async (ownerId: string, plan: string) => {
    await supabase.from("project_owners").update({ plan }).eq("id", ownerId);
    void fetchOwners();
  };

  const reviewOrganization = async (organization: ReviewOrganization, nextStatus: KybStatus) => {
    if (!user) return;

    const notes = (reviewNotes[organization.id] ?? organization.kyb_review_notes ?? "").trim();
    if (negativeStatuses.has(nextStatus) && !notes) {
      setReviewMessage("Review notes are required for needs changes, reject, and suspend decisions.");
      return;
    }

    setReviewingId(organization.id);
    setReviewMessage(null);

    const { error } = await supabase
      .from("organizations")
      .update({
        kyb_status: nextStatus,
        kyb_review_notes: notes || (nextStatus === "verified" ? "Approved for paid beta trust badge." : null),
        kyb_reviewed_at: new Date().toISOString(),
        kyb_reviewed_by: user.id,
      })
      .eq("id", organization.id);

    setReviewingId(null);

    if (error) {
      setReviewMessage(error.message);
      return;
    }

    setReviewNotes((current) => ({ ...current, [organization.id]: "" }));
    await fetchOrganizations();
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--gradient-hero)" }}>
      <div className="flex items-center gap-3 text-muted-foreground">
        <div className="w-5 h-5 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin" />
        Loading...
      </div>
    </div>
  );

  if (unauthorized) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--gradient-hero)" }}>
      <div className="text-center glass-card rounded-2xl p-12 max-w-sm mx-4">
        <div className="w-16 h-16 rounded-2xl bg-[hsl(0_84%_60%/0.1)] border border-[hsl(0_84%_60%/0.3)] flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8 text-[hsl(0_84%_60%)]" />
        </div>
        <h2 className="font-display text-xl font-bold text-foreground mb-2">Access Denied</h2>
        <p className="text-muted-foreground text-sm mb-6">You don't have super admin privileges</p>
        <button
          onClick={() => window.location.href = "/dashboard"}
          className="btn-primary px-6 py-2.5 rounded-xl text-sm font-bold text-white"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen relative" style={{ background: "var(--gradient-hero)" }}>
      <div className="absolute inset-0 mesh-bg opacity-20 pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex justify-between items-center mb-8 pb-6 border-b border-[hsl(265_40%_20%/0.5)]">
          <a href="/" className="flex items-center gap-2.5">
            <div className="relative w-8 h-8">
              <div className="absolute inset-0 rounded-lg bg-linear-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] opacity-80" />
              <Zap className="absolute inset-0 m-auto w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-lg text-foreground">
              Har<span className="gradient-text">vest</span>
            </span>
          </a>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              onClick={() => supabase.auth.signOut().then(() => window.location.href = "/login")}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[hsl(265_40%_20%)] text-muted-foreground hover:text-foreground transition-colors text-sm"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:block">Sign Out</span>
            </button>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-[hsl(271_100%_64%/0.1)] border border-[hsl(271_100%_64%/0.2)] flex items-center justify-center">
              <Zap className="w-4 h-4 text-[hsl(var(--primary))]" />
            </div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">Super Admin</h1>
          </div>
          <p className="text-muted-foreground text-sm ml-11">Platform control center</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Clients", value: stats.totalOwners, icon: Users, color: "text-[hsl(var(--primary))]" },
            { label: "Total Projects", value: stats.totalProjects, icon: FolderOpen, color: "text-[hsl(var(--accent))]" },
            { label: "Total Schedules", value: stats.totalSchedules, icon: Calendar, color: "text-[hsl(var(--primary))]" },
            { label: "Active Schedules", value: stats.activeSchedules, icon: CheckCircle, color: "text-[hsl(var(--accent))]" },
          ].map((stat) => (
            <div key={stat.label} className="stat-card">
              <stat.icon className={`w-6 h-6 mx-auto mb-3 ${stat.color} stat-icon`} />
              <div className={`text-2xl font-bold font-display mb-1 ${stat.color}`}>{stat.value}</div>
              <div className="text-muted-foreground text-xs">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="glass-card rounded-2xl p-6 mb-8">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground">Organization Review Queue</h2>
              <p className="text-muted-foreground text-xs mt-0.5">
                {organizations.length} submitted trust profile{organizations.length === 1 ? "" : "s"}
              </p>
            </div>
            {reviewMessage && (
              <div className="rounded-xl border border-[hsl(0_84%_60%/0.35)] bg-[hsl(0_84%_60%/0.1)] px-3 py-2 text-xs text-[hsl(0_84%_70%)]">
                {reviewMessage}
              </div>
            )}
          </div>

          {organizations.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[hsl(265_40%_24%)] p-8 text-center text-sm text-muted-foreground">
              No submitted trust profiles yet.
            </div>
          ) : (
            <div className="space-y-4">
              {organizations.map((organization) => (
                <div key={organization.id} className="rounded-2xl border border-[hsl(265_40%_22%)] bg-[hsl(265_35%_10%/0.58)] p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[hsl(var(--primary)/0.32)] bg-[hsl(265_44%_15%/0.65)]">
                          <Building2 className="h-5 w-5 text-muted-foreground" />
                          {organization.logo_url ? (
                            <img
                              src={organization.logo_url}
                              alt=""
                              className="absolute inset-0 h-full w-full object-cover"
                              loading="lazy"
                              onError={(event) => {
                                event.currentTarget.style.display = "none";
                              }}
                            />
                          ) : null}
                        </div>
                        <div>
                          <h3 className="font-display text-lg font-bold text-foreground">{organization.name}</h3>
                          <p className="text-xs text-muted-foreground">
                            {organization.organization_type === "dao" ? "DAO" : "Company"} • {organization.country_of_operation || "No country"} • {organization.contact_email || "No contact"}
                          </p>
                        </div>
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-bold capitalize ${statusClass(organization.kyb_status)}`}>
                          {(organization.kyb_status ?? "unverified").replace("_", " ")}
                        </span>
                        <span className={`text-xs font-bold capitalize ${riskClass(organization.kyb_risk_level)}`}>
                          {organization.kyb_risk_level ?? "unknown"} risk • {organization.kyb_risk_score ?? 0}/100
                        </span>
                      </div>

                      <div className="grid gap-3 text-xs text-muted-foreground md:grid-cols-2">
                        <p><span className="font-semibold text-foreground">Owner:</span> {organization.owner_full_name || "Missing"}</p>
                        <p><span className="font-semibold text-foreground">Role:</span> {organization.representative_role || "Missing"}</p>
                        <p className="md:col-span-2"><span className="font-semibold text-foreground">Description:</span> {organization.project_description || "Missing"}</p>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {reviewLinks(organization).map(([label, href]) => (
                          <a
                            key={label}
                            href={href}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full border border-[hsl(265_40%_24%)] px-2.5 py-1 text-xs text-foreground transition hover:border-[hsl(var(--primary))]"
                          >
                            {label}
                          </a>
                        ))}
                      </div>
                    </div>

                    <div className="w-full shrink-0 lg:w-86">
                      <textarea
                        value={reviewNotes[organization.id] ?? organization.kyb_review_notes ?? ""}
                        onChange={(event) => setReviewNotes((current) => ({ ...current, [organization.id]: event.target.value }))}
                        placeholder="Reviewer notes. Required for needs changes, reject, or suspend."
                        className="mb-3 min-h-24 w-full rounded-xl border border-[hsl(265_40%_22%)] bg-[hsl(265_44%_15%/0.55)] px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-[hsl(var(--primary))]"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { status: "in_review" as const, label: "In Review", icon: Clock3 },
                          { status: "verified" as const, label: "Verify", icon: BadgeCheck },
                          { status: "needs_changes" as const, label: "Needs Changes", icon: AlertTriangle },
                          { status: "rejected" as const, label: "Reject", icon: XCircle },
                          { status: "suspended" as const, label: "Suspend", icon: PauseCircle },
                        ].map((action) => (
                          <button
                            key={action.status}
                            type="button"
                            disabled={reviewingId === organization.id}
                            onClick={() => void reviewOrganization(organization, action.status)}
                            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[hsl(265_40%_24%)] px-3 text-xs font-bold text-foreground transition hover:border-[hsl(var(--primary))] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <action.icon className="h-3.5 w-3.5" />
                            {action.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass-card rounded-2xl p-6">
          <div className="mb-6">
            <h2 className="font-display text-lg font-semibold text-foreground">All Clients</h2>
            <p className="text-muted-foreground text-xs mt-0.5">{owners.length} registered clients</p>
          </div>

          {owners.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">No clients yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[hsl(265_40%_20%/0.5)]">
                    {["Email", "Company", "Plan", "Status", "Joined", "Actions"].map(h => (
                      <th key={h} className="text-left px-3 py-3 text-muted-foreground text-xs font-semibold uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {owners.map((owner) => (
                    <tr key={owner.id} className="border-b border-[hsl(265_40%_20%/0.3)] hover:bg-[hsl(265_44%_15%/0.3)] transition-colors">
                      <td className="px-3 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: "var(--gradient-primary)" }}>
                            {owner.email?.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm text-foreground truncate max-w-45">{owner.email}</span>
                          {owner.is_super_admin && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[hsl(45_90%_60%/0.15)] text-[hsl(45_90%_60%)] border border-[hsl(45_90%_60%/0.3)]">ADMIN</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-4 text-sm text-muted-foreground">{owner.company_name || "—"}</td>
                      <td className="px-3 py-4">
                        <select
                          value={owner.plan}
                          onChange={e => void changePlan(owner.id, e.target.value)}
                          className="bg-[hsl(265_44%_15%/0.5)] border border-[hsl(265_40%_20%)] text-foreground rounded-lg px-2 py-1 text-xs cursor-pointer focus:outline-none focus:border-[hsl(var(--primary))]"
                        >
                          <option value="free">Free</option>
                          <option value="starter">Starter</option>
                          <option value="enterprise">Enterprise</option>
                        </select>
                      </td>
                      <td className="px-3 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          owner.is_active
                            ? "bg-[hsl(157_87%_51%/0.15)] text-[hsl(var(--accent))] border border-[hsl(157_87%_51%/0.3)]"
                            : "bg-[hsl(0_84%_60%/0.15)] text-[hsl(0_84%_60%)] border border-[hsl(0_84%_60%/0.3)]"
                        }`}>
                          {owner.is_active ? "Active" : "Suspended"}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-xs text-muted-foreground">
                        {new Date(owner.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-4">
                        {!owner.is_super_admin && (
                          <button
                            onClick={() => void toggleActive(owner.id, owner.is_active)}
                            className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                              owner.is_active
                                ? "border-[hsl(0_84%_60%/0.4)] text-[hsl(0_84%_60%)] hover:bg-[hsl(0_84%_60%/0.1)]"
                                : "border-[hsl(157_87%_51%/0.4)] text-[hsl(var(--accent))] hover:bg-[hsl(157_87%_51%/0.1)]"
                            }`}
                          >
                            {owner.is_active ? "Suspend" : "Activate"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
