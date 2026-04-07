export const config = {
  auth: false,
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  try {
    console.log("🔥 RETRY FUNCTION STARTED");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const HELIUS_SECRET = Deno.env.get("HELIUS_WEBHOOK_SECRET")!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data: failedTxs, error } = await supabase
      .from("processed_transactions")
      .select("*")
      .eq("status", "failed")
      .limit(10);

    if (error) {
      console.error("❌ DB ERROR FULL:", JSON.stringify(error, null, 2));
      throw new Error("Failed to fetch retries");
    }

    console.log("📦 Failed txs:", failedTxs);

    for (const tx of failedTxs || []) {
      try {
        console.log("🔁 Retrying:", tx?.signature);
        await sendTelegram(
          `🔁 Retry triggered\nTx: ${tx?.signature} (Attempt ${tx?.retry_count || 0})`,
        );

        if (!tx?.raw_payload) {
          console.warn("⚠️ Missing raw_payload:", tx?.signature);
          continue;
        }

        const res = await fetch(`${SUPABASE_URL}/functions/v1/helius-webhook`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            authorization: `Bearer ${HELIUS_SECRET}`,
          },
          body: JSON.stringify([tx.raw_payload]),
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Retry failed: ${text}`);
        }

        await supabase
          .from("processed_transactions")
          .update({ status: "completed" })
          .eq("signature", tx.signature);

        console.log("✅ Retry success:", tx.signature);
        await sendTelegram(`✅ Retry success\nTx: ${tx.signature}`);
      } catch (innerErr) {
        console.error("❌ RETRY FAILED:", innerErr);
        await sendTelegram(`❌ Retry failed\nTx: ${tx.signature}`);

        await supabase
          .from("processed_transactions")
          .update({
            retry_count: (tx.retry_count || 0) + 1,
          })
          .eq("signature", tx.signature);
      }
    }
    await sendTelegram("🚀 Telegram is working");
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("🔥 TOP LEVEL ERROR:", err);

    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : String(err),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
});
