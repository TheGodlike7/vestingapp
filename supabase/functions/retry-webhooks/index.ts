export const config = {
  auth: false,
};

import { createClient } from "@supabase/supabase-js";

type ProcessedTransaction = {
  signature: string;
  status: string;
  error: string | null;
  retry_count: number | null;
  raw_payload: unknown;
};

type DenoRuntime = {
  env: {
    get(name: string): string | undefined;
  };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};

const denoRuntime = (globalThis as typeof globalThis & { Deno: DenoRuntime })
  .Deno;

async function sendTelegram(message: string): Promise<void> {
  const BOT = denoRuntime.env.get("TELEGRAM_BOT_TOKEN");
  const CHAT = denoRuntime.env.get("TELEGRAM_CHAT_ID");

  if (!BOT || !CHAT) return;

  await fetch(`https://api.telegram.org/bot${BOT}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: CHAT,
      text: message,
    }),
  });
}

denoRuntime.serve(async (req: Request) => {
  try {
    const expectedRetrySecret = denoRuntime.env.get("RETRY_WEBHOOKS_SECRET");
    const authHeader = req.headers.get("authorization");
    const bearerToken = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];

    if (!expectedRetrySecret || bearerToken !== expectedRetrySecret) {
      console.warn("Unauthorized retry-webhooks attempt");
      return new Response("Unauthorized", { status: 401 });
    }

    const SUPABASE_URL = denoRuntime.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_KEY = denoRuntime.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const HELIUS_SECRET = denoRuntime.env.get("HELIUS_WEBHOOK_SECRET")!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: { persistSession: false },
    });

    const { data: failedTxs, error } = await supabase
      .from("processed_transactions")
      .select("signature, status, error, retry_count, raw_payload")
      .eq("status", "failed")
      .limit(10);

    if (error) {
      throw new Error(error.message);
    }

    for (const tx of (failedTxs ?? []) as ProcessedTransaction[]) {
      try {
        if ((tx.retry_count || 0) >= 5) {
          console.warn(`Max retries reached: ${tx.signature}`);
          continue;
        }

        if (!tx.raw_payload) {
          console.warn(`Missing raw_payload for ${tx.signature}`);
          continue;
        }

        await sendTelegram(
          `Retry triggered\nTx: ${tx.signature} (Attempt ${tx.retry_count || 0})`,
        );

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
          throw new Error(`Retry call failed: ${text}`);
        }

        const { data: refreshedTx, error: refreshedError } = await supabase
          .from("processed_transactions")
          .select("status, error")
          .eq("signature", tx.signature)
          .maybeSingle<{ status: string; error: string | null }>();

        if (refreshedError) {
          throw new Error(refreshedError.message);
        }

        if (refreshedTx?.status !== "completed") {
          throw new Error(
            refreshedTx?.error ?? "Retry did not complete transaction",
          );
        }

        await sendTelegram(`Retry success\nTx: ${tx.signature}`);
      } catch (innerErr) {
        const message =
          innerErr instanceof Error ? innerErr.message : String(innerErr);
        console.error(`Retry failed for ${tx.signature}:`, message);

        if ((tx.retry_count || 0) < 3) {
          await sendTelegram(`Retry failed\nTx: ${tx.signature}\n${message}`);
        }

        await supabase
          .from("processed_transactions")
          .update({
            status: "failed",
            error: message,
            retry_count: (tx.retry_count || 0) + 1,
            last_retry: new Date().toISOString(),
          })
          .eq("signature", tx.signature);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("retry-webhooks failed:", message);

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
