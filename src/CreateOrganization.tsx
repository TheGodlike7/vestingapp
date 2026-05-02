import { useEffect, useMemo, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletReadyState, type WalletName } from "@solana/wallet-adapter-base";
import { Home, Loader2, ShieldCheck, WalletCards } from "lucide-react";
import { supabase } from "@/supabase";
import { isAllowedSubscriptionWallet } from "@/payments/subscriptionPaymentConfig";

export default function CreateOrganization({
  onCreated,
}: {
  onCreated: () => void;
}) {
  const { publicKey, wallets, wallet, select, connect, connected, connecting } = useWallet();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [pendingWalletName, setPendingWalletName] = useState<string | null>(null);

  const allowedWallets = useMemo(
    () => wallets.filter(({ adapter }) => isAllowedSubscriptionWallet(adapter.name)),
    [wallets],
  );

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
    if (loading) return;
    setMessage("");
    select(walletName);
    setPendingWalletName(String(walletName));
  };

  const createOrg = async () => {
    if (!publicKey) {
      setMessage("Connect a supported Solana wallet first.");
      return;
    }

    if (!name.trim()) {
      setMessage("Organization name is required.");
      return;
    }

    setLoading(true);
    setMessage("");

    const { error } = await supabase.from("organizations").insert({
      owner_id: publicKey.toBase58(),
      name: name.trim(),
    });

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
            <h2 className="font-display text-lg font-bold text-foreground">Create your organization</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              This becomes the home base for projects, schedules, and recipients.
            </p>
          </div>
        </div>
        <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-[hsl(var(--primary))]" />
      </div>

      {!publicKey && (
        <div className="mt-5 rounded-xl border border-[hsl(265_40%_20%)] bg-[hsl(265_30%_12%/0.85)] p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <WalletCards className="h-4 w-4 text-[hsl(var(--accent))]" />
            Connect a supported wallet
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
                    className="flex items-center justify-between rounded-lg border border-[hsl(265_40%_22%)] bg-[hsl(265_30%_15%)] px-3 py-3 text-left text-sm transition hover:border-[hsl(var(--primary))] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="font-medium text-foreground">{adapter.name}</span>
                    <span className="text-xs text-muted-foreground">
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
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
        <input
          placeholder="Organization name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="min-h-11 rounded-xl border border-[hsl(265_40%_22%)] bg-[hsl(265_44%_15%/0.55)] px-4 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-[hsl(var(--primary))]"
        />

        <button
          type="button"
          onClick={createOrg}
          disabled={loading || !publicKey}
          className="flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
          style={{ background: "var(--gradient-primary)", boxShadow: loading ? "none" : "var(--glow-purple)" }}
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Create
        </button>
      </div>

      {message && (
        <div className="mt-3 rounded-xl border border-[hsl(0_84%_60%/0.35)] bg-[hsl(0_84%_60%/0.1)] px-4 py-3 text-sm text-[hsl(0_84%_70%)]">
          {message}
        </div>
      )}
    </div>
  );
}
