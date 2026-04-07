import { createClient } from "https://esm.sh/@supabase/supabase-js@2.35.0";

async function sendTelegram(message: string) {
  const BOT = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const CHAT = Deno.env.get("TELEGRAM_CHAT_ID");

  if (!BOT || !CHAT) return;

  await fetch(`https://api.telegram.org/bot${BOT}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: CHAT,
      text: message,
      parse_mode: "Markdown",
    }),
  });
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BUSINESS_WALLET = Deno.env.get("BUSINESS_WALLET")!;
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const REQUIRED_AMOUNT = 99 * 1_000_000;
const HELIUS_SECRET = Deno.env.get("HELIUS_WEBHOOK_SECRET")!;

Deno.serve(async (req: Request) => {
  try {
    // 🔐 STRICT AUTH CHECK
    const authHeader = req.headers.get("authorization");
    if (!authHeader || authHeader !== `Bearer ${HELIUS_SECRET}`) {
      console.warn("❌ Unauthorized webhook");
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    if (!Array.isArray(body)) {
      console.warn("❌ Invalid payload format");
      return new Response("Invalid payload", { status: 400 });
    }

    for (const tx of body) {
      if (!tx?.signature || !tx?.tokenTransfers) {
        console.warn("⚠️ Skipping invalid tx structure");
        continue;
      }

      const txSignature = tx.signature;

      // 🔥 ATOMIC LOCK
      const { error: lockError } = await supabase
        .from("processed_transactions")
        .insert({ signature: txSignature, status: "processing", raw_payload: tx });

      if (lockError) {
        console.log(`⏭️ Already locked/processed ${txSignature}`);
        continue;
      }

      const memo = tx.description || "";

      // 🔐 MEMO VALIDATION
      const memoMatch = memo.match(/^vestingapp-starter-([a-zA-Z0-9]+)$/);

      const tokenTransfers = tx.tokenTransfers;

      // 🔥 CHECK TX STATUS (if available)
      if (tx?.type === "FAILED") {
        console.warn(`❌ Skipping failed tx ${txSignature}`);
        continue;
      }

      // 🔍 VALIDATE TRANSFERS:
      for (const transfer of tokenTransfers) {
        const isUSDC = transfer.mint === USDC_MINT;
        const isToUs = transfer.toUserAccount === BUSINESS_WALLET;
        const isEnough = transfer.tokenAmount >= REQUIRED_AMOUNT;

        if (!transfer?.tokenAmount) continue;

        // 🚩 FRAUD DETECTION: Underpayment
        if (!transfer?.tokenAmount || transfer.tokenAmount < REQUIRED_AMOUNT) {
          await supabase.from("fraud_logs").insert({
            signature: txSignature,
            reason: "Underpayment",
            severity: "medium",
            error: `Received ${transfer.tokenAmount} instead of ${REQUIRED_AMOUNT}`,
          });

          // 🔥 Increment Wallet Risk
          await supabase.rpc("increment_wallet_risk", {
            wallet_input: transfer.fromUserAccount,
            risk_points: 10,
          });
          continue;
        }

        // 🚩 FRAUD DETECTION: Invalid USDC Token
        if (transfer.mint !== USDC_MINT) {
          await supabase.from("fraud_logs").insert({
            signature: txSignature,
            wallet: transfer.fromUserAccount,
            reason: "INVALID_TOKEN",
            severity: "high",
          });

          // 🔥 Increment Wallet Risk
          await supabase.rpc("increment_wallet_risk", {
            wallet_input: transfer.fromUserAccount,
            risk_points: 10,
          });
          continue;
        }

        // 🚩 FRAUD DETECTION: Invalid Destination
        if (transfer.toUserAccount !== BUSINESS_WALLET) {
          await supabase.from("fraud_logs").insert({
            signature: txSignature,
            wallet: transfer.fromUserAccount,
            reason: "INVALID_DESTINATION",
            severity: "high",
          });

          // 🔥 Increment Wallet Risk
          await supabase.rpc("increment_wallet_risk", {
            wallet_input: transfer.fromUserAccount,
            risk_points: 10,
          });
          continue;
        }

        // 🚩 FRAUD DETECTION: Invalid Memo
        if (!memoMatch) {
          await supabase.from("fraud_logs").insert({
            signature: txSignature,
            wallet: transfer.fromUserAccount,
            reason: "INVALID_MEMO",
            severity: "high",
          });

          // 🔥 Increment Wallet Risk;
          await supabase.rpc("increment_wallet_risk", {
            wallet_input: transfer.fromUserAccount,
            risk_points: 10,
          });
          continue;

          await sendTelegram(
            `🚨 *FRAUD ALERT*\n\nTx: ${txSignature}\nReason: Invalid memo`
          );
          continue;
        }

        if (!(isUSDC && isToUs && isEnough)) continue;

        // 🔍 FIND USER
        const { data: owners } = await supabase
          .from("project_owners")
          .select("id")
          .ilike("id", `${userIdPrefix}%`)
          .limit(1);

        if (!owners || owners.length === 0) {
          console.warn(`⚠️ No user found for prefix ${userIdPrefix}`);
          continue;
        }

        const ownerId = owners[0].id;
        // 🔍 CHECK RECENT TXS FOR DUPLICATES (WEAKER)
        const { data: recentTx } = await supabase
          .from("subscriptions")
          .select("transaction_signature")
          .eq("owner_id", ownerId)
          .order("created_at", { ascending: false })
          .limit(5);

        if (recentTx?.some((t) => t.transaction_signature === txSignature)) {
          await supabase.from("fraud_logs").insert({
            signature: txSignature,
            wallet: ownerId,
            reason: "DUPLICATE_TRANSACTION",
            severity: "high",
          });
          continue;
        }

        // 🚩 FRAUD SANCTION: Blocked Wallet
        const { data: risk } = await supabase
          .from("wallet_risk")
          .select("is_blocked")
          .eq("wallet", ownerId)
          .maybeSingle();

        if (risk?.is_blocked) {
          console.warn(`🚫 Blocked wallet ${ownerId}`);

          await supabase.from("fraud_logs").insert({
            signature: txSignature,
            wallet: ownerId,
            reason: "BLOCKED_WALLET_ATTEMPT",
            severity: "critical",
          });
          continue;
        }

        // 🚦 RATE LIMIT CHECK
        const { count } = await supabase
          .from("subscriptions")
          .select("*", { count: "exact", head: true })
          .eq("owner_id", ownerId)
          .gte(
            "created_at",
            new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          );

        if ((count ?? 0) > 3) {
          await supabase.from("fraud_logs").insert({
            signature: txSignature,
            wallet: ownerId,
            reason: "RATE_LIMIT_EXCEEDED",
            severity: "high",
          });

          console.warn("🚨 Suspicious activity detected");
          continue;
        }

        // � IDEMPOTENCY (STRONGER)
        const { data: existing } = await supabase
          .from("subscriptions")
          .select("id")
          .eq("transaction_signature", txSignature)
          .maybeSingle();

        if (existing) {
          console.log(`⚠️ Duplicate tx skipped ${txSignature}`);
          continue;
        }

        // ✅ SUBSCRIPTION ACTIVATION
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        const { error: insertError } = await supabase
          .from("subscriptions")
          .insert({
            owner_id: ownerId,
            status: "active",
            plan: "starter",
            amount_usd: 99,
            transaction_signature: txSignature,
            expires_at: expiresAt.toISOString(),
          });

          await sendTelegram(
          `💸 *New Subscription Activated*\n\nUser: ${ownerId}\nAmount: $99\nTx: ${txSignature}`
        );

        if (insertError) {
          console.error("❌ DB insert failed", insertError);

          // 🔥 MARK FAILED
          await supabase
            .from("processed_transactions")
            .update({
              status: "failed",
              error: insertError.message, 
              retry_count: 0,
              last_retry: null, })
            .eq("signature", txSignature);

          continue;
        }

        // ✅ ONLY AFTER SUCCESS
        await supabase
          .from("processed_transactions")
          .update({ status: "completed", wallet: ownerId, amount: 99 })
          .eq("signature", txSignature);

        console.log(`✅ Subscription activated for user ${ownerId}`);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("🔥 Webhook error:", err);
    const error = err as Error;

    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
