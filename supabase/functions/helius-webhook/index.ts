import { createClient } from "@supabase/supabase-js";

// 📩 TELEGRAM HELPER
async function sendTelegram(message: string): Promise<void> {
  const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");

  if (!BOT_TOKEN || !CHAT_ID) {
    console.warn("⚠️ Telegram env variables missing");
    return;
  }

  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        parse_mode: "Markdown",
      }),
    });
  } catch (err) {
    console.error("❌ Telegram send failed:", err);
  }
}

export const config = {
  auth: false,
};

type TokenTransfer = {
  fromUserAccount: string;
  toUserAccount: string;
  mint: string;
  tokenAmount: number;
};

type HeliusTx = {
  signature: string;
  tokenTransfers: TokenTransfer[];
  memo?: string;
};

Deno.serve(async (req: Request): Promise<Response> => {
  
    // 🔐 AUTH CHECK — ADD THIS BLOCK HERE
    const apiKey = req.headers.get("x-api-key");

      if (apiKey !== Deno.env.get("HELIUS_WEBHOOK_SECRET")) {
        console.warn("❌ Unauthorized webhook attempt");
      return new Response("Unauthorized", { status: 401 });
    }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // RATE LIMIT (ANTI-SPAM)
    const { count } = await supabase
      .from("processed_transactions")
      .select("*", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - 60000).toISOString());

      if ((count || 0) > 100) {
       return new Response("Rate limit", { status: 429 });
      }

    // 📦 PARSE BODY
    const body: unknown = await req.json();

    if (!Array.isArray(body)) {
      return new Response("Invalid payload", { status: 400 });
    }

    const txs = body as HeliusTx[];

    for (const tx of txs) {
      if (!tx.signature || !tx.tokenTransfers) continue;

      const txSignature = tx.signature;

      // Onchain Extraction
      const RPC_URL = Deno.env.get("SOLANA_RPC_URL")!;

      const verifyRes = await fetch(RPC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTransaction",
        params: [
          txSignature,
          { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 }
        ],
       }),
      });

      const verifyJson = await verifyRes.json();
      
      if (!verifyJson.result) {
        console.warn(`🚨 Transaction not found on-chain: ${txSignature}`);
        continue;
      }
      
      const signer =
        verifyJson.result.transaction.message.accountKeys[0];

      if (!signer) {
        console.warn("🚨 Missing signer");
        continue;
      }

      const status = verifyJson.result.meta?.err;

      if (status !== null) {
        console.warn(`❌ Transaction failed on-chain: ${txSignature}`);
        continue;
      }

      // Extract Real Transfers
      const instructions =
        verifyJson.result.transaction.message.instructions || [];

      const onchainTransfers: TokenTransfer[] = [];

      for (const ix of instructions) {
        if (ix.parsed && ix.parsed.type === "transferChecked") {
          const info = ix.parsed.info;

          onchainTransfers.push({
            fromUserAccount: info.source,
            toUserAccount: info.destination,
            mint: info.mint,
            tokenAmount: Number(info.tokenAmount.amount) / 1_000_000,
          });
        }
      }

      // 🔒 IDEMPOTENCY LOCK
      const { error: lockError } = await supabase
        .from("processed_transactions")
        .insert({
          signature: txSignature,
          status: "processing",
          raw_payload: tx,
          retry_count: 0,
          created_at: new Date().toISOString(),
        });

      if (lockError) {
        console.warn(`⏭️ Duplicate or concurrent tx blocked: ${txSignature}`);
        continue;
      }

      // 🧠 MEMO PARSE
      const memo = tx.memo || "";
      const memoMatch = memo.match(/^vestingapp-starter-([a-zA-Z0-9]+)/);

      if (!memoMatch) {
        console.warn(`⚠️ Invalid memo for ${txSignature}`);
        continue;
      }

      const userIdPrefix = memoMatch[1];

      // 🔍 CREATE AND FILTER VALID TRANSFERS
      const validTransfers = onchainTransfers.filter(
        (t) =>
          t.mint === Deno.env.get("USDC_MINT") &&
          t.toUserAccount === Deno.env.get("BUSINESS_WALLET") &&
          t.tokenAmount === 0.1
      );

      if (validTransfers.length === 0) {
        console.warn(`⚠️ No valid payments in ${txSignature}`);
        continue;
      }

      // MAX MONTH LIMIT
      const monthsPaid = validTransfers.length;
        
        if (monthsPaid > 12) {
         console.warn(`🚨 Excessive payment (${monthsPaid} months): ${txSignature}`);
         continue;
        }
      
      // 🔁 MID-FLIGHT RACE CHECK
      const { data: existingTx } = await supabase
        .from("processed_transactions")
        .select("status")
        .eq("signature", txSignature)
        .maybeSingle();

        if (existingTx?.status === "completed") {
          console.warn(`⚠️ Already processed mid-flight: ${txSignature}`);
          continue;
        }

      // 👤 FIND USER
      const { data: owners } = await supabase
        .from("project_owners")
        .select("id, wallet_address")
        .ilike("id", `${userIdPrefix}%`)
        .limit(1);

      if (!owners || owners.length === 0) {
        console.warn(`⚠️ No owner found for prefix ${userIdPrefix}`);
        continue;
      }

      const ownerId = owners[0].id;
      const ownerWallet = owners[0].wallet_address;

      // 🔐 WALLET VALIDATION
      const payerWallet = validTransfers[0].fromUserAccount;
      
      // 🔒 WALLET CONSISTENCY CHECK
      const allSameWallet = validTransfers.every((t) => t.fromUserAccount === payerWallet);

        if (!allSameWallet) {
          console.warn(`🚨 Mixed wallets in tx: ${txSignature}`);
          continue;
        }

        if (ownerWallet !== payerWallet) {
        console.warn(`🚨 Wallet mismatch for ${ownerId}`);
        continue;
        }

      // 🔄 CHECK EXISTING ACTIVE SUBSCRIPTION
      const { data: existingSub } = await supabase
        .from("subscriptions")
        .select("expires_at")
        .eq("owner_id", ownerId)
        .eq("status", "active")
        .maybeSingle();

      const isNewSubscription = !existingSub;
      const now = new Date();

      const baseDate =
        existingSub?.expires_at && new Date(existingSub.expires_at) > now
        ? new Date(existingSub.expires_at)
        : now;

      const expiresAt = new Date(baseDate);
      expiresAt.setMonth(expiresAt.getMonth() + monthsPaid);

      // 💾 UPSERT SUBSCRIPTION
      const { error: subError } = await supabase
        .from("subscriptions")
        .upsert({
          owner_id: ownerId,
          status: "active",
          plan: "starter",
          amount_usd: 0.1 * monthsPaid,
          started_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          transaction_signature: txSignature,
        });

      if (subError) {
        console.error("❌ Subscription insert failed", subError);

        await supabase
          .from("processed_transactions")
          .update({
            status: "failed",
            error: subError.message,
          })
          .eq("signature", txSignature);

        continue;
      }

      // ✅ MARK SUCCESS
      await supabase
        .from("processed_transactions")
        .update({
          status: "completed",
          last_retry: null,
        })
        .eq("signature", txSignature);

      console.log(
        `✅ Subscription updated: ${ownerId} (+${monthsPaid} months)`
      );

      if (monthsPaid >= 3) {
        await sendTelegram(
          `💸 *Bulk Subscription*\nUser: ${ownerId}\nMonths: ${monthsPaid}\nTx: ${txSignature}`
        );
      } else if (isNewSubscription) {
        await sendTelegram(
          `💸 *New Subscription Activated*\n\nUser: ${ownerId}\nMonths: ${monthsPaid}\nTx: ${txSignature}`
        );
      } else {
        await sendTelegram(
          `🔄 *Subscription Updated*\n\nUser: ${ownerId}\nMonths: ${monthsPaid}\nTx: ${txSignature}`
        );
      }
  }
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    const error = err as Error;

    console.error("🔥 CRITICAL ERROR:", error.message);

    return new Response(
      JSON.stringify({ 
        error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" }, }
    );
  }
});