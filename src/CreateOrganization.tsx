import { useEffect, useMemo, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletReadyState, type WalletName } from "@solana/wallet-adapter-base";
import {
  BadgeCheck,
  Globe2,
  Home,
  Loader2,
  ShieldCheck,
  Users,
  WalletCards,
} from "lucide-react";
import { supabase } from "@/supabase";
import { isAllowedSubscriptionWallet } from "@/payments/subscriptionPaymentConfig";

export type OrganizationType = "dao" | "company";

export type OrganizationKycRecord = {
  id: string;
  name: string;
  owner_id: string;
  organization_type: OrganizationType | null;
  owner_full_name: string | null;
  x_url: string | null;
  discord_url: string | null;
  telegram_url: string | null;
  meta_url: string | null;
  instagram_url: string | null;
  linkedin_url: string | null;
  website_url: string | null;
  kyc_profile_submitted: boolean | null;
  kyc_submitted_at: string | null;
};

type OrganizationLinkKey =
  | "x_url"
  | "discord_url"
  | "telegram_url"
  | "meta_url"
  | "instagram_url"
  | "linkedin_url"
  | "website_url";

type OrganizationLinks = Record<OrganizationLinkKey, string>;

type LinkField = {
  key: OrganizationLinkKey;
  label: string;
  placeholder: string;
  helper: string;
};

const linkFields: LinkField[] = [
  {
    key: "x_url",
    label: "X account",
    placeholder: "https://x.com/your_org",
    helper: "Mandatory for DAOs.",
  },
  {
    key: "discord_url",
    label: "Discord server",
    placeholder: "https://discord.gg/your_org",
    helper: "Mandatory for DAOs.",
  },
  {
    key: "telegram_url",
    label: "Telegram group",
    placeholder: "https://t.me/your_org",
    helper: "Mandatory for DAOs.",
  },
  {
    key: "meta_url",
    label: "Meta/Facebook page",
    placeholder: "https://facebook.com/your_org",
    helper: "Company profiles require Meta/Facebook or Instagram.",
  },
  {
    key: "instagram_url",
    label: "Instagram",
    placeholder: "https://instagram.com/your_org",
    helper: "Company profiles require Instagram or Meta/Facebook.",
  },
  {
    key: "linkedin_url",
    label: "LinkedIn",
    placeholder: "https://linkedin.com/company/your_org",
    helper: "Mandatory for company profiles.",
  },
  {
    key: "website_url",
    label: "Main website",
    placeholder: "https://your-org.com",
    helper: "Mandatory for company profiles.",
  },
];

function WalletBrandIcon({ icon, label }: { icon: string; label: string }) {
  if (icon) {
    return (
      <img
        src={icon}
        alt=""
        className="h-6 w-6 shrink-0 rounded-md object-contain"
        loading="lazy"
      />
    );
  }

  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[hsl(265_44%_20%)] text-xs font-bold text-foreground">
      {label.slice(0, 1).toUpperCase()}
    </span>
  );
}

function isValidOfficialUrl(value: string) {
  if (!value) return true;

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function requiredForType(field: OrganizationLinkKey, organizationType: OrganizationType) {
  if (organizationType === "dao") {
    return field === "x_url" || field === "discord_url" || field === "telegram_url";
  }

  return field === "linkedin_url" || field === "website_url";
}

function compactWallet(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function getLinkValue(record: OrganizationKycRecord | null | undefined, key: OrganizationLinkKey) {
  return record?.[key] ?? "";
}

export default function CreateOrganization({
  existingOrganization,
  onCreated,
  readOnlyPreview = false,
}: {
  existingOrganization?: OrganizationKycRecord | null;
  onCreated: () => void;
  readOnlyPreview?: boolean;
}) {
  const { publicKey, wallets, wallet, select, connect, connected, connecting } = useWallet();
  const [name, setName] = useState(existingOrganization?.name ?? "");
  const [ownerFullName, setOwnerFullName] = useState(existingOrganization?.owner_full_name ?? "");
  const [organizationType, setOrganizationType] = useState<OrganizationType>(
    existingOrganization?.organization_type ?? "dao",
  );
  const [links, setLinks] = useState<OrganizationLinks>({
    x_url: getLinkValue(existingOrganization, "x_url"),
    discord_url: getLinkValue(existingOrganization, "discord_url"),
    telegram_url: getLinkValue(existingOrganization, "telegram_url"),
    meta_url: getLinkValue(existingOrganization, "meta_url"),
    instagram_url: getLinkValue(existingOrganization, "instagram_url"),
    linkedin_url: getLinkValue(existingOrganization, "linkedin_url"),
    website_url: getLinkValue(existingOrganization, "website_url"),
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [pendingWalletName, setPendingWalletName] = useState<string | null>(null);

  const allowedWallets = useMemo(
    () => wallets.filter(({ adapter }) => isAllowedSubscriptionWallet(adapter.name)),
    [wallets],
  );

  const activeWallet = publicKey?.toBase58() ?? "";
  const editingExisting = Boolean(existingOrganization);
  const canShowForm = Boolean(publicKey) || readOnlyPreview;
  const socialRequirement =
    organizationType === "dao"
      ? "DAO profiles require X, Discord, and Telegram links."
      : "Company profiles require LinkedIn, main website, and Meta/Facebook or Instagram.";

  useEffect(() => {
    if (!pendingWalletName || !wallet || wallet.adapter.name !== pendingWalletName || connected || connecting) {
      return;
    }

    const run = async () => {
      try {
        await connect();
        setMessage("");
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Wallet connection failed";
        setMessage(errorMessage);
      } finally {
        setPendingWalletName(null);
      }
    };

    void run();
  }, [connect, connected, connecting, pendingWalletName, wallet]);

  const handleSelectWallet = (walletName: WalletName) => {
    if (loading || readOnlyPreview) return;
    setMessage("");
    select(walletName);
    setPendingWalletName(String(walletName));
  };

  const updateLink = (key: OrganizationLinkKey, value: string) => {
    setLinks((currentLinks) => ({
      ...currentLinks,
      [key]: value,
    }));
  };

  const validateForm = () => {
    if (!publicKey) {
      return "Connect a supported Solana wallet first.";
    }

    if (!name.trim()) {
      return "Organization name is required.";
    }

    if (!ownerFullName.trim()) {
      return "Organization owner name is required for KYC.";
    }

    const trimmedLinks = Object.fromEntries(
      Object.entries(links).map(([key, value]) => [key, value.trim()]),
    ) as OrganizationLinks;

    if (organizationType === "dao") {
      const missingDaoLinks = ["x_url", "discord_url", "telegram_url"].filter(
        (key) => !trimmedLinks[key as OrganizationLinkKey],
      );

      if (missingDaoLinks.length > 0) {
        return "DAO KYC requires X, Discord server, and Telegram group links.";
      }
    } else if (!trimmedLinks.linkedin_url || !trimmedLinks.website_url) {
      return "Company KYC requires LinkedIn and the organization main website.";
    } else if (!trimmedLinks.meta_url && !trimmedLinks.instagram_url) {
      return "Company KYC requires either a Meta/Facebook page or Instagram link.";
    }

    const invalidField = linkFields.find((field) => !isValidOfficialUrl(trimmedLinks[field.key]));
    if (invalidField) {
      return `${invalidField.label} must be a valid http or https link.`;
    }

    return "";
  };

  const createOrg = async () => {
    if (readOnlyPreview) return;

    const validationError = validateForm();
    if (validationError) {
      setMessage(validationError);
      return;
    }

    setLoading(true);
    setMessage("");

    const trimmedLinks = Object.fromEntries(
      Object.entries(links).map(([key, value]) => [key, value.trim() || null]),
    ) as Record<OrganizationLinkKey, string | null>;

    const payload = {
      owner_id: activeWallet,
      name: name.trim(),
      organization_type: organizationType,
      owner_full_name: ownerFullName.trim(),
      x_url: trimmedLinks.x_url,
      discord_url: trimmedLinks.discord_url,
      telegram_url: trimmedLinks.telegram_url,
      meta_url: trimmedLinks.meta_url,
      instagram_url: trimmedLinks.instagram_url,
      linkedin_url: trimmedLinks.linkedin_url,
      website_url: trimmedLinks.website_url,
      kyc_profile_submitted: true,
      kyc_submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = existingOrganization
      ? await supabase
          .from("organizations")
          .update(payload)
          .eq("id", existingOrganization.id)
          .eq("owner_id", activeWallet)
      : await supabase.from("organizations").insert(payload);

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    onCreated();
  };

  return (
    <div className="rounded-2xl border border-[hsl(265_40%_22%)] bg-[hsl(265_35%_10%/0.72)] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[hsl(157_87%_51%/0.25)] bg-[hsl(157_87%_51%/0.08)]">
            <Home className="h-5 w-5 text-[hsl(var(--accent))]" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-foreground">
              {readOnlyPreview
                ? "Organization KYC form preview"
                : editingExisting
                  ? "Complete organization KYC"
                  : "Create your organization"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {readOnlyPreview
                ? "Preview the owner wallet, organization identity, and official links form without saving anything."
                : "Connect the owner wallet, name the organization, and submit the official KYC profile."}
            </p>
          </div>
        </div>
        <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-[hsl(var(--primary))]" />
      </div>

      {readOnlyPreview ? (
        <div className="mt-5 rounded-xl border border-[hsl(45_90%_60%/0.3)] bg-[hsl(45_90%_60%/0.09)] px-4 py-3 text-sm text-[hsl(45_90%_72%)]">
          Superadmin read-only preview. Wallet connection, form edits, and submit actions are disabled.
        </div>
      ) : !publicKey ? (
        <div className="mt-5 rounded-xl border border-[hsl(265_40%_20%)] bg-[hsl(265_30%_12%/0.85)] p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <WalletCards className="h-4 w-4 text-[hsl(var(--accent))]" />
            Step 1: Connect the organization owner wallet
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {allowedWallets.length > 0 ? (
              allowedWallets.map(({ adapter, readyState }) => {
                const usable = readyState === WalletReadyState.Installed || readyState === WalletReadyState.Loadable;
                return (
                  <button
                    key={adapter.name}
                    type="button"
                    onClick={() => handleSelectWallet(adapter.name)}
                    disabled={!usable || connecting}
                    className="flex items-center justify-between gap-3 rounded-lg border border-[hsl(265_40%_22%)] bg-[hsl(265_30%_15%)] px-3 py-3 text-left text-sm transition hover:border-[hsl(var(--primary))] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="flex min-w-0 items-center gap-2 text-foreground">
                      <WalletBrandIcon icon={adapter.icon} label={adapter.name} />
                      <span className="truncate font-medium">{adapter.name}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {connecting && pendingWalletName === adapter.name ? "Connecting" : readyState}
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="sm:col-span-2 rounded-lg border border-dashed border-[hsl(265_40%_24%)] p-4 text-sm text-muted-foreground">
                No supported wallet extension was detected in this browser.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-[hsl(157_87%_51%/0.24)] bg-[hsl(157_87%_51%/0.08)] px-4 py-3 text-sm text-[hsl(var(--accent))]">
          <div className="flex items-center gap-2 font-semibold">
            <BadgeCheck className="h-4 w-4" />
            Owner wallet connected: {compactWallet(activeWallet)}
          </div>
        </div>
      )}

      {canShowForm && (
        <div className="mt-5 space-y-5">
          <div className="rounded-xl border border-[hsl(265_40%_20%)] bg-[hsl(265_30%_12%/0.82)] p-4">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Users className="h-4 w-4 text-[hsl(var(--accent))]" />
              Step 2: Organization identity
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Organization name
                </span>
                <input
                  placeholder="VestingApp DAO"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  disabled={readOnlyPreview}
                  className="min-h-11 w-full rounded-xl border border-[hsl(265_40%_22%)] bg-[hsl(265_44%_15%/0.55)] px-4 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-[hsl(var(--primary))] disabled:cursor-not-allowed disabled:opacity-70"
                />
              </label>

              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Owner of organization
                </span>
                <input
                  placeholder="Legal owner, founder, or authorized representative"
                  value={ownerFullName}
                  onChange={(event) => setOwnerFullName(event.target.value)}
                  disabled={readOnlyPreview}
                  className="min-h-11 w-full rounded-xl border border-[hsl(265_40%_22%)] bg-[hsl(265_44%_15%/0.55)] px-4 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-[hsl(var(--primary))] disabled:cursor-not-allowed disabled:opacity-70"
                />
              </label>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {[
                {
                  value: "dao" as const,
                  title: "DAO",
                  description: "Requires X, Discord, and Telegram.",
                },
                {
                  value: "company" as const,
                  title: "Company or foundation",
                  description: "Requires LinkedIn, website, and Meta/Facebook or Instagram.",
                },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    if (!readOnlyPreview) setOrganizationType(option.value);
                  }}
                  disabled={readOnlyPreview}
                  className={`rounded-xl border px-4 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-80 ${
                    organizationType === option.value
                      ? "border-[hsl(var(--accent))] bg-[hsl(157_87%_51%/0.08)]"
                      : "border-[hsl(265_40%_22%)] bg-[hsl(265_30%_15%)] hover:border-[hsl(var(--primary))]"
                  }`}
                >
                  <span className="block text-sm font-bold text-foreground">{option.title}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{option.description}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[hsl(265_40%_20%)] bg-[hsl(265_30%_12%/0.82)] p-4">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Globe2 className="h-4 w-4 text-[hsl(var(--accent))]" />
                Step 3: Official links
              </div>
              <span className="text-xs text-muted-foreground">{socialRequirement}</span>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {linkFields.map((field) => {
                const required = requiredForType(field.key, organizationType);
                const companySocialRequired =
                  organizationType === "company" && (field.key === "meta_url" || field.key === "instagram_url");
                return (
                  <label key={field.key} className="space-y-2">
                    <span className="flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {field.label}
                      {(required || companySocialRequired) && (
                        <span className="rounded-full bg-[hsl(157_87%_51%/0.12)] px-2 py-0.5 text-[10px] text-[hsl(var(--accent))]">
                          Required
                        </span>
                      )}
                    </span>
                    <input
                      type="url"
                      placeholder={field.placeholder}
                      value={links[field.key]}
                      onChange={(event) => updateLink(field.key, event.target.value)}
                      disabled={readOnlyPreview}
                      className="min-h-11 w-full rounded-xl border border-[hsl(265_40%_22%)] bg-[hsl(265_44%_15%/0.55)] px-4 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-[hsl(var(--primary))] disabled:cursor-not-allowed disabled:opacity-70"
                    />
                    <span className="block text-[11px] leading-4 text-muted-foreground">{field.helper}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={createOrg}
            disabled={loading || readOnlyPreview}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: "var(--gradient-primary)", boxShadow: loading || readOnlyPreview ? "none" : "var(--glow-purple)" }}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {readOnlyPreview ? "Read-only preview" : editingExisting ? "Save KYC profile" : "Create organization"}
          </button>
        </div>
      )}

      {message && (
        <div className="mt-3 rounded-xl border border-[hsl(0_84%_60%/0.35)] bg-[hsl(0_84%_60%/0.1)] px-4 py-3 text-sm text-[hsl(0_84%_70%)]">
          {message}
        </div>
      )}
    </div>
  );
}
