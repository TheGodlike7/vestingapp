import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import type { User } from "@supabase/supabase-js";
import { ArrowLeft, BadgeCheck, Building2, CheckCircle2, Clock3, CreditCard, ShieldAlert, Zap } from "lucide-react";
import CreateOrganization, { type KybStatus, type OrganizationKycRecord } from "./CreateOrganization";
import { ThemeToggle } from "./ThemeToggle";
import { WalletContextProvider } from "./WalletProvider";
import { supabase } from "./supabase";
import { useSubscription } from "./useSubscription";

function compactWallet(address: string) {
  return `${address.slice(0, 8)}...${address.slice(-4)}`;
}

function trustStatusCopy(status: KybStatus | null | undefined) {
  switch (status) {
    case "verified":
      return {
        label: "Verified organization",
        body: "This organization can display Harvest trust signals during paid beta.",
        className: "border-[hsl(157_87%_51%/0.3)] bg-[hsl(157_87%_51%/0.08)] text-[hsl(var(--accent))]",
        icon: BadgeCheck,
      };
    case "submitted":
      return {
        label: "Trust profile submitted",
        body: "Your profile is ready for superadmin review. You can keep building while review runs in the background.",
        className: "border-[hsl(45_90%_60%/0.3)] bg-[hsl(45_90%_60%/0.08)] text-[hsl(45_90%_72%)]",
        icon: Clock3,
      };
    case "in_review":
      return {
        label: "Trust profile in review",
        body: "A superadmin is reviewing your organization details and official links.",
        className: "border-[hsl(271_100%_64%/0.3)] bg-[hsl(271_100%_64%/0.08)] text-[hsl(var(--primary))]",
        icon: Clock3,
      };
    case "needs_changes":
      return {
        label: "Trust profile needs changes",
        body: "Review notes are available below. Update and resubmit the profile when ready.",
        className: "border-[hsl(45_90%_60%/0.35)] bg-[hsl(45_90%_60%/0.09)] text-[hsl(45_90%_72%)]",
        icon: ShieldAlert,
      };
    case "rejected":
      return {
        label: "Trust profile rejected",
        body: "This organization is not eligible for a verified trust badge right now.",
        className: "border-[hsl(0_84%_60%/0.35)] bg-[hsl(0_84%_60%/0.08)] text-[hsl(0_84%_70%)]",
        icon: ShieldAlert,
      };
    case "suspended":
      return {
        label: "Trust profile suspended",
        body: "A superadmin suspended this organization trust profile. Contact support before making changes.",
        className: "border-[hsl(0_84%_60%/0.45)] bg-[hsl(0_84%_60%/0.1)] text-[hsl(0_84%_70%)]",
        icon: ShieldAlert,
      };
    default:
      return {
        label: "Trust profile incomplete",
        body: "Submit a lightweight trust profile to become eligible for verified organization signals.",
        className: "border-[hsl(265_40%_24%)] bg-[hsl(265_35%_10%/0.72)] text-muted-foreground",
        icon: Building2,
      };
  }
}

function TrustStatusCard({ organization }: { organization: OrganizationKycRecord }) {
  const copy = trustStatusCopy(organization.kyb_status);
  const Icon = copy.icon;

  return (
    <div className={`mb-5 rounded-2xl border p-5 ${copy.className}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-current/30 bg-current/10">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Organization trust</p>
            <h2 className="font-display text-lg font-bold text-foreground">{copy.label}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{copy.body}</p>
            {organization.kyb_review_notes ? (
              <p className="mt-3 rounded-xl border border-current/20 bg-black/10 px-3 py-2 text-xs text-foreground">
                Review notes: {organization.kyb_review_notes}
              </p>
            ) : null}
          </div>
        </div>
        <div className="text-left text-xs sm:text-right">
          <p className="font-semibold text-foreground">{organization.kyb_risk_level ?? "unknown"} risk</p>
          <p className="mt-1 text-muted-foreground">Score {organization.kyb_risk_score ?? 0}/100</p>
        </div>
      </div>
    </div>
  );
}

function OrganizationPageContent() {
  const { publicKey } = useWallet();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [organizationLoading, setOrganizationLoading] = useState(false);
  const [organization, setOrganization] = useState<OrganizationKycRecord | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const userId = user?.id ?? null;
  const activeWalletAddress = publicKey?.toBase58() ?? null;
  const activeOrganization = organization?.owner_id === activeWalletAddress ? organization : null;
  const { isActive, loading: subscriptionLoading } = useSubscription(userId);
  const subscriptionPending = !isSuperAdmin && Boolean(userId) && (subscriptionLoading || isActive === null);

  const organizationSelect =
    "id, name, owner_id, organization_type, owner_full_name, logo_url, country_of_operation, contact_email, representative_role, project_description, x_url, discord_url, telegram_url, meta_url, instagram_url, linkedin_url, website_url, source_of_funds_attestation, sanctions_attestation, non_custodial_attestation, terms_attestation, kyc_profile_submitted, kyc_submitted_at, kyb_status, kyb_risk_level, kyb_risk_score, kyb_reviewed_at, kyb_reviewed_by, kyb_review_notes";

  const fetchOrganization = useCallback(async (walletAddress: string) => {
    const { data } = await supabase
      .from("organizations")
      .select(organizationSelect)
      .eq("owner_id", walletAddress)
      .limit(1)
      .maybeSingle<OrganizationKycRecord>();

    setOrganization(data ?? null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (cancelled) return;

      if (!session) {
        window.location.href = "/login";
        return;
      }

      const { data: owner } = await supabase
        .from("project_owners")
        .select("is_super_admin")
        .eq("id", session.user.id)
        .maybeSingle<{ is_super_admin: boolean }>();

      if (cancelled) return;

      setIsSuperAdmin(Boolean(owner?.is_super_admin));
      setUser(session.user);
      setLoading(false);
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!activeWalletAddress) return;

    let cancelled = false;

    const run = async () => {
      setOrganizationLoading(true);
      const { data } = await supabase
        .from("organizations")
        .select(organizationSelect)
        .eq("owner_id", activeWalletAddress)
        .limit(1)
        .maybeSingle<OrganizationKycRecord>();

      if (!cancelled) {
        setOrganization(data ?? null);
        setOrganizationLoading(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [activeWalletAddress]);

  if (loading || subscriptionPending) {
    return (
      <div
        className="flex min-h-screen items-center justify-center text-sm text-muted-foreground"
        style={{ background: "var(--gradient-hero)" }}
      >
        Loading organization setup...
      </div>
    );
  }

  return (
    <div
      className="min-h-screen relative"
      style={{ background: "var(--gradient-hero)" }}
    >
      <div className="absolute inset-0 mesh-bg opacity-20 pointer-events-none" />
      <div className="relative z-10 mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <div className="mb-8 flex items-center justify-between border-b border-[hsl(265_40%_20%/0.5)] pb-6">
          <a href="/" className="flex items-center gap-2.5">
            <div className="relative h-8 w-8">
              <div className="absolute inset-0 rounded-lg bg-linear-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] opacity-80" />
              <Zap className="absolute inset-0 m-auto h-4 w-4 text-white" />
            </div>
            <span className="font-display text-lg font-bold text-foreground">
              Vesting<span className="gradient-text">App</span>
            </span>
          </a>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => {
                window.location.href = "/dashboard";
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-[hsl(265_40%_24%)] px-4 py-2 text-sm font-bold text-foreground transition hover:border-[hsl(var(--primary))]"
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </button>
          </div>
        </div>

        <div className="mb-8">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-[hsl(157_87%_51%/0.26)] bg-[hsl(157_87%_51%/0.08)] px-3 py-1 text-xs font-bold uppercase tracking-widest text-[hsl(var(--accent))]">
            <Building2 className="h-3.5 w-3.5" />
            Organization Trust Profile
          </p>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Create your organization
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isSuperAdmin
              ? "Superadmin preview mode shows the smart trust profile without wallet access, edits, or submission."
              : "Subscription unlocks this page. The trust profile makes the organization eligible for verified signals without blocking paid beta usage."}
          </p>
        </div>

        {isSuperAdmin ? (
          <CreateOrganization
            readOnlyPreview
            onCreated={() => {}}
          />
        ) : isActive !== true ? (
          <div className="rounded-2xl border border-[hsl(0_84%_60%/0.28)] bg-[hsl(0_84%_60%/0.08)] p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[hsl(0_84%_60%/0.35)] bg-[hsl(0_84%_60%/0.12)]">
                  <CreditCard className="h-5 w-5 text-[hsl(0_84%_70%)]" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold text-foreground">Subscription required</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Activate the starter plan first, then return here to create and verify your organization.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  window.location.href = "/subscription";
                }}
                className="btn-primary rounded-xl px-5 py-3 text-sm font-bold text-white"
              >
                Subscribe now
              </button>
            </div>
          </div>
        ) : organizationLoading ? (
          <div className="rounded-2xl border border-[hsl(265_40%_22%)] bg-[hsl(265_35%_10%/0.72)] p-6 text-sm text-muted-foreground">
            Loading organization profile...
          </div>
        ) : activeOrganization ? (
          <>
            <TrustStatusCard organization={activeOrganization} />
            <div className="mb-5 rounded-2xl border border-[hsl(265_40%_22%)] bg-[hsl(265_35%_10%/0.72)] p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[hsl(157_87%_51%/0.25)] bg-[hsl(157_87%_51%/0.08)]">
                    <Building2 className="h-5 w-5 text-[hsl(var(--accent))]" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">Current organization</p>
                    <h2 className="font-display text-xl font-bold text-foreground">{activeOrganization.name}</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {activeOrganization.organization_type === "dao" ? "DAO" : "Company or foundation"} owned by {activeOrganization.owner_full_name}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">Owner wallet: {compactWallet(activeOrganization.owner_id)}</p>
                  </div>
                </div>
                {activeOrganization.kyb_status === "verified" ? (
                  <div className="inline-flex items-center gap-2 rounded-full border border-[hsl(157_87%_51%/0.26)] bg-[hsl(157_87%_51%/0.08)] px-3 py-1.5 text-xs font-semibold text-[hsl(var(--accent))]">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Verified trust badge
                  </div>
                ) : null}
              </div>
            </div>
            {activeOrganization.kyb_status !== "suspended" ? (
              <CreateOrganization
                key={activeOrganization.id}
                existingOrganization={activeOrganization}
                onCreated={() => {
                  if (activeWalletAddress) void fetchOrganization(activeWalletAddress);
                }}
              />
            ) : null}
          </>
        ) : (
          <CreateOrganization
            key={activeWalletAddress ?? "new-organization"}
            onCreated={() => {
              if (activeWalletAddress) void fetchOrganization(activeWalletAddress);
            }}
          />
        )}

        {user && (
          <p className="mt-4 text-xs text-muted-foreground">
            Signed in as {user.email}
          </p>
        )}
      </div>
    </div>
  );
}

export function OrganizationPage() {
  return (
    <WalletContextProvider>
      <OrganizationPageContent />
    </WalletContextProvider>
  );
}
