import { useEffect, useState } from "react";
import { supabase } from "@/supabase";

type FraudLog = {
  id: string;
  reason: string | null;
  wallet: string | null;
};

export default function FraudDashboard() {
  const [logs, setLogs] = useState<FraudLog[]>([]);

  useEffect(() => {
    const fetchLogs = async () => {
      const { data } = await supabase
        .from("fraud_logs")
        .select("id, reason, wallet")
        .order("created_at", { ascending: false });

      if (data) setLogs(data);
    };

    fetchLogs();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Fraud Monitor</h1>

      {logs.map((log) => (
        <div key={log.id} className="mb-3 p-3 border rounded-xl">
          <div>{log.reason ?? "No reason provided"}</div>
          <div className="text-xs text-muted-foreground">
            {log.wallet ?? "Unknown wallet"}
          </div>
        </div>
      ))}
    </div>
  );
}
