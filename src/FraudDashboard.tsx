import { useEffect, useState } from "react";
import { supabase } from "@/supabase";

export default function FraudDashboard() {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    const fetchLogs = async () => {
      const { data } = await supabase
        .from("fraud_logs")
        .select("*")
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
          <div>{log.reason}</div>
          <div className="text-xs text-muted-foreground">
            {log.wallet}
          </div>
        </div>
      ))}
    </div>
  );
}