import React, { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { supabase } from "@/supabase";
import { toast } from "@/components/ui/sonner-toast";
import { motion, AnimatePresence } from "framer-motion";

type Vesting = {
  id: string;
  total_amount: number;
  claimed_amount: number | null;
  start_date: string;
  cliff_months: number | null;
  duration_months: number;
  schedule_type: string | null;
};

const CLAIMS_HAVE_SECURE_ONCHAIN_PATH = false;

export default function ClaimerVestingsPage({
  projectId,
}: {
  projectId: string;
}) {
  const { publicKey } = useWallet();
  const [vestings, setVestings] = useState<Vesting[]>([]);
  const [selected, setSelected] = useState<Vesting | null>(null);
  const [claiming] = useState(false);
  const claimsEnabled = CLAIMS_HAVE_SECURE_ONCHAIN_PATH && import.meta.env.VITE_CLAIMS_ENABLED === "true";


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

  const handleClaim = () => {
    toast.info(
      "Claiming is temporarily disabled while the secure mainnet claim path is finalized.",
    );
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
              onClick={handleClaim}
              disabled={!claimsEnabled || claiming}
              className="btn-primary mt-4 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {!claimsEnabled ? "Claiming temporarily disabled" : claiming ? "Claiming..." : "Claim"}
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