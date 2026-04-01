import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { WalletContextProvider } from "./WalletProvider.tsx";
import { supabase } from "./supabase.ts";
import { Zap, Wallet, Inbox, TrendingUp } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle.tsx";
import { Connection, Transaction } from "@solana/web3.js";
import { Toaster } from "./components/ui/sonner.tsx";
import { toast } from "./components/ui/sonner-toast.ts";

type VestingProject = {
  project_name: string;
  token_symbol: string;
  token_mint: string;
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
  vesting_projects?: VestingProject;
  claimed_amount?: number;
};

type ClaimHistory = {
  id: string;
  amount: number;
  claimed_at: string;
};

function ClaimPage() {
  const { publicKey, signTransaction } = useWallet();
  const [schedules, setSchedules] = useState<VestingSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<ClaimHistory[]>([]);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const connection = new Connection("https://api.devnet.solana.com");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const fetchSchedules = async (wallet: string) => {
    setLoading(true);
    const { data } = await supabase
      .from("vesting_schedules")
      .select(`*, vesting_projects (project_name, token_symbol, token_mint)`)
      .eq("recipient_wallet", wallet)
      .eq("is_active", true);

    if (data) setSchedules(data as VestingSchedule[]);
    setLoading(false);
  };

  useEffect(() => {
    if (!publicKey) return;

    const run = async () => {
      await fetchSchedules(publicKey.toBase58());
    };

    run();
  }, [publicKey]);

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

  const fetchHistory = async (scheduleId: string) => {
    const { data } = await supabase
      .from("claim_history")
      .select("*")
      .eq("schedule_id", scheduleId)
      .order("claimed_at", { ascending: false });

    if (data) setHistory(data);
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

          <div className="flex items-center gap-3">
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
          <div className="mb-4 text-center text-sm text-foreground">
            {statusMessage}
          </div>
        )}
        {!publicKey ? (
          <div className="glass-card rounded-2xl p-12 text-center border border-[hsl(271_100%_64%/0.2)]">
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
        ) : loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground gap-3">
            <div className="w-5 h-5 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin" />
            Loading your schedules...
          </div>
        ) : schedules.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center border border-[hsl(265_40%_20%/0.5)]">
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
          <div className="space-y-4">
            {schedules.map((schedule) => {
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
                >
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="font-display text-lg font-semibold text-foreground mb-1">
                        {schedule.vesting_projects?.project_name}
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
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    {[
                      { label: "Total", value: schedule.total_amount },
                      { label: "Vested", value: vested },
                      { label: "Claimable", value: vested },
                    ].map((item) => (
                      <div key={item.label} className="text-center">
                        <div className="text-xs text-muted-foreground">
                          {item.label}
                        </div>
                        <div className="font-bold">
                          {item.value} {schedule.vesting_projects?.token_symbol}
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Progress Bar (claimed %) */}
                  <div className="mt-3">
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
                    onClick={async () => {
                      if (!publicKey || !signTransaction) return;

                      let toastId: string | number | undefined;

                      try {
                        setClaimingId(schedule.id);
                        setStatusMessage(null);

                        // ⏳ Show loading toast
                        const toastId = toast.loading("Processing claim...");

                        // 1️⃣ Build transaction (SIMPLE TRANSFER EXAMPLE)
                        const transaction = new Transaction();

                        // ⚠️ Placeholder — you will replace this with your vesting program later
                        // For now we simulate a transaction

                        transaction.feePayer = publicKey;

                        const { blockhash } =
                          await connection.getLatestBlockhash();
                        transaction.recentBlockhash = blockhash;

                        // 2️⃣ Sign transaction
                        const signedTx = await signTransaction(transaction);

                        // 3️⃣ Send transaction
                        const txSig = await connection.sendRawTransaction(
                          signedTx.serialize(),
                        );

                        // 4️⃣ Confirm transaction
                        await connection.confirmTransaction(txSig, "confirmed");

                        // 5️⃣ AFTER SUCCESS → update backend
                        const { error } = await supabase.rpc("claim_tokens", {
                          p_schedule_id: schedule.id,
                          p_amount: claimable,
                          p_wallet: publicKey.toBase58(),
                          p_tx_signature: txSig,
                        });

                        if (error) throw error;

                        // ✅ SUCCESS TOAST HERE
                        toast.success("Tokens claimed successfully", {
                          id: toastId,
                        });

                        setStatusMessage("✅ Claim successful (on-chain)");
                        await fetchSchedules(publicKey.toBase58());
                        await fetchHistory(schedule.id);
                      } catch (err) {
                        const message =
                          err instanceof Error ? err.message : "Claim failed";

                        // ❌ ERROR TOAST HERE
                        toast.error(message, {
                          id: toastId,
                        });

                        setStatusMessage("❌ " + message);
                      } finally {
                        setClaimingId(null);
                      }
                    }}
                    disabled={claimable === 0 || claimingId === schedule.id}
                    className={`w-full py-2 rounded ${
                      claimable === 0 || claimingId === schedule.id
                        ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                        : "bg-purple-500 text-white"
                    }`}
                  >
                    {claimingId === schedule.id
                      ? "Claiming..."
                      : claimable > 0
                        ? `Claim ${claimable} ${schedule.vesting_projects?.token_symbol}`
                        : claimed >= schedule.total_amount
                          ? "Fully claimed"
                          : "Nothing to claim"}
                  </button>
                  <div className="mt-4">
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
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <>
      <WalletContextProvider>
        <ClaimPage />
      </WalletContextProvider>
      <Toaster />
    </>
  );
}
