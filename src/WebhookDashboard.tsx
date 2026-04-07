import { useEffect, useState } from "react";
import { supabase } from "@/supabase";

type Tx = {
  signature: string;
  status: string;
  wallet: string | null;
  amount: number | null;
  error: string | null;
  created_at: string;
};

export default function WebhookDashboard() {
  const [txs, setTxs] = useState<Tx[]>([]);

  const fetchTxs = async () => {
    const { data } = await supabase
      .from("processed_transactions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) setTxs(data);
  };

  useEffect(() => {
    fetchTxs();

    const channel = supabase
      .channel("webhook-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "processed_transactions" },
        () => fetchTxs()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold">Webhook Monitor</h1>

      <div className="space-y-2">
        {txs.map((tx) => (
          <div
            key={tx.signature}
            className="p-4 rounded-xl border bg-[hsl(265_44%_15%/0.4)]"
          >
            <div className="flex justify-between text-sm">
              <span className="font-mono">
                {tx.signature.slice(0, 8)}...
              </span>

              <span
                className={
                  tx.status === "completed"
                    ? "text-green-400"
                    : tx.status === "failed"
                    ? "text-red-400"
                    : "text-yellow-400"
                }
              >
                {tx.status}
              </span>
            </div>

            <div className="text-xs text-muted-foreground mt-1">
              {new Date(tx.created_at).toLocaleString()}
            </div>

            {tx.wallet && (
              <div className="text-xs mt-1">
                Wallet: {tx.wallet}
              </div>
            )}

            {tx.amount && (
              <div className="text-xs">
                Amount: ${tx.amount}
              </div>
            )}

            {tx.error && (
              <div className="text-xs text-red-400 mt-1">
                Error: {tx.error}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}