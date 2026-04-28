import React, { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { supabase } from "@/supabase";
import { toast } from "@/components/ui/sonner-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { getAssociatedTokenAddress, createTransferInstruction } from "@solana/spl-token";

type Vesting = {
  id: string;
  total_amount: number;
  claimed_amount: number | null;
  start_date: string;
  cliff_months: number | null;
  duration_months: number;
  schedule_type: string | null;
};

export default function ClaimerVestingsPage({
  projectId,
}: {
  projectId: string;
}) {
  const { publicKey, sendTransaction } = useWallet();
  const [vestings, setVestings] = useState<Vesting[]>([]);
  const [selected, setSelected] = useState<Vesting | null>(null);
  const [claiming, setClaiming] = useState(false);
  const RPC_URL = "https://api.mainnet-beta.solana.com"; // or devnet
  const TOKEN_MINT = new PublicKey("YOUR_TOKEN_MINT_HERE");
  const TREASURY_WALLET = new PublicKey("YOUR_TREASURY_WALLET");


  useEffect(() => {
    if (!publicKey) return;

    const fetchVestings = async () => {
      const { data } = await supabase
        .from("vesting_schedules")
        .select("*")
        .eq("recipient_wallet", publicKey.toBase58())
        .eq("project_id", projectId);

      if (data) setVestings(data);
    };

    fetchVestings();
  }, [publicKey, projectId]);

  // 🔥 VESTING LOGIC
  const calculateVested = (v: Vesting) => {
    const now = new Date();
    const start = new Date(v.start_date);

    const cliffMonths = v.cliff_months ?? 0;
    const cliffEnd = new Date(start);
    cliffEnd.setMonth(cliffEnd.getMonth() + cliffMonths);

    if (now < cliffEnd) return 0;
    if (v.schedule_type === "immediate") return v.total_amount;

    const elapsed =
      (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30);

    const vestedMonths = Math.min(elapsed, v.duration_months);

    return Number(
      ((vestedMonths / v.duration_months) * v.total_amount).toFixed(2),
    );
  };

  // 🔥 CLAIM FUNCTION
  const handleClaim = async (v: Vesting) => {
  if (!publicKey || !sendTransaction) return;

  const vested = calculateVested(v);
  const claimed = v.claimed_amount ?? 0;
  const claimable = Math.max(vested - claimed, 0);

  if (claimable <= 0) {
    toast("Nothing to claim");
    return;
  }

  try {
    setClaiming(true);

    const connection = new Connection(RPC_URL);

    // 🔥 TOKEN ACCOUNTS
    const fromTokenAccount = await getAssociatedTokenAddress(
      TOKEN_MINT,
      TREASURY_WALLET
    );

    const toTokenAccount = await getAssociatedTokenAddress(
      TOKEN_MINT,
      publicKey
    );

    // 🔥 CREATE TRANSFER
    const instruction = createTransferInstruction(
      fromTokenAccount,
      toTokenAccount,
      TREASURY_WALLET, // authority (must sign)
      claimable * 1_000_000 // adjust decimals (e.g. USDC = 6)
    );

    const transaction = new Transaction().add(instruction);

    // 🔥 SEND TX
    const signature = await sendTransaction(transaction, connection);

    // 🔥 CONFIRM TX
    await connection.confirmTransaction(signature, "confirmed");

    toast.success("Claim successful on-chain");

    // 🔥 STORE IN DB
    await supabase.from("claim_history").insert({
      vesting_id: v.id,
      wallet: publicKey.toBase58(),
      amount: claimable,
      transaction_signature: signature,
    });

    // 🔄 UPDATE CLAIMED
    await supabase
      .from("vesting_schedules")
      .update({
        claimed_amount: claimed + claimable,
      })
      .eq("id", v.id);

    // 🔄 UI UPDATE
    setVestings((prev) =>
      prev.map((item) =>
        item.id === v.id
          ? {
              ...item,
              claimed_amount: (item.claimed_amount ?? 0) + claimable,
            }
          : item
      )
    );

    setSelected((prev) =>
      prev
        ? {
            ...prev,
            claimed_amount: (prev.claimed_amount ?? 0) + claimable,
          }
        : prev
    );
  } catch (err) {
    console.error(err);
    toast.error("Transaction failed");
  } finally {
    setClaiming(false);
  }
};

  return (
    <div className="space-y-4">
      {vestings.map((v) => {
        const vested = calculateVested(v);
        const claimed = v.claimed_amount ?? 0;
        const claimable = Math.max(vested - claimed, 0);

        return (
          <div key={v.id}>
            <button onClick={() => setSelected(v)}>
              Open — Claimable: {claimable}
            </button>
          </div>
        );
      })}

      {/* 🔥 POPUP */}
      <AnimatePresence>
  {selected && (
    <motion.div
      className="fixed inset-0 flex items-center justify-center bg-black/50 z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={() => setSelected(null)}
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0, y: 40 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{
          type: "spring",
          stiffness: 260,
          damping: 20,
        }}
        className="bg-white w-[70%] max-h-[80%] overflow-y-auto p-6 rounded-xl shadow-2xl"
        onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}      
      >
            <h2>Vesting Details</h2>

            <p>Total: {selected.total_amount}</p>
            <p>Claimed: {selected.claimed_amount ?? 0}</p>

            <p>
              Claimable:{" "}
              {Math.max(
                calculateVested(selected) -
                  (selected.claimed_amount ?? 0),
                0,
              )}
            </p>

            {/* 🔥 CLAIM BUTTON */}
            <button
              onClick={() => handleClaim(selected)}
              disabled={claiming}
              className="btn-primary mt-4"
            >
              {claiming ? "Claiming..." : "Claim"}
            </button>

            <button
              onClick={() => setSelected(null)}
              className="mt-3"
            >
              Close
            </button>
          </motion.div>
    </motion.div>
  )}
</AnimatePresence>
    </div>
  );
}