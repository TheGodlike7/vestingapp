import { createClient } from "@supabase/supabase-js";
import { Buffer } from "node:buffer";

type TokenTransfer = {
  fromUserAccount?: string;
  toUserAccount?: string;
  mint?: string;
  tokenAmount?: number | string;
};

type HeliusTx = {
  signature?: string;
  tokenTransfers?: TokenTransfer[];
  memo?: string;
};

type ParsedMemo = {
  info?: unknown;
  type?: unknown;
};

type RpcInstruction = {
  program?: string;
  programId?: string;
  parsed?: string | ParsedMemo | true;
  data?: string;
};

type RpcAccountKey = string | {
  pubkey?: string;
  signer?: boolean;
};

type PendingPayment = {
  id: string;
  user_id: string;
  user_id_prefix: string;
  status: "pending" | "completed" | "expired";
  amount_usdc: number | string;
  token_mint: string;
  business_wallet: string;
  expires_at: string;
};

type ProjectOwner = {
  id: string;
  wallet_address: string | null;
};

type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type TableDefinition<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type ProcessedTransactionRow = {
  signature: string;
  created_at: string | null;
  status: "processing" | "completed" | "failed" | string;
  error: string | null;
  amount: string | number | null;
  wallet: string | null;
  retry_count: number | null;
  last_retry: string | null;
  raw_payload: Json | null;
};

type PendingPaymentRow = {
  id: string;
  user_id: string;
  user_id_prefix: string;
  status: "pending" | "completed" | "expired";
  amount_usdc: string | number;
  token_mint: string;
  business_wallet: string;
  network: string;
  tx_signature: string | null;
  created_at: string;
  expires_at: string;
  updated_at: string;
  completed_at: string | null;
};

type ProjectOwnerRow = {
  id: string;
  wallet_address: string | null;
};

type PublicSchema = {
  Tables: {
    processed_transactions: TableDefinition<
      ProcessedTransactionRow,
      Partial<ProcessedTransactionRow> & { signature: string },
      Partial<ProcessedTransactionRow>
    >;
    pending_payments: TableDefinition<PendingPaymentRow, Partial<PendingPaymentRow>, Partial<PendingPaymentRow>>;
    project_owners: TableDefinition<ProjectOwnerRow, Partial<ProjectOwnerRow>, Partial<ProjectOwnerRow>>;
  };
  Views: Record<string, never>;
  Functions: {
    complete_subscription_payment: {
      Args: {
        p_payment_id: string;
        p_signature: string;
        p_owner_id: string;
        p_months_paid: number;
        p_amount_usdc: string;
        p_wallet: string;
      };
      Returns: { subscription_id: string; expires_at: string }[];
    };
  };
  Enums: Record<string, never>;
  CompositeTypes: Record<string, never>;
};

type Database = {
  public: PublicSchema;
};

type ServiceClient = ReturnType<typeof createClient<Database, "public", PublicSchema>>;

const MEMO_PREFIX = "vestingapp-starter-";
const USDC_DECIMALS = 6;
const MAX_MONTHS_PER_TRANSACTION = 12;

function readRequiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function amountToAtomic(value: number | string, decimals: number): bigint {
  const normalized = typeof value === "number" ? value.toFixed(decimals) : value.trim();

  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new Error(`Invalid token amount: ${normalized}`);
  }

  const [wholePart, fractionPart = ""] = normalized.split(".");
  const excessFraction = fractionPart.slice(decimals);
  if (/[1-9]/.test(excessFraction)) {
    throw new Error(`Token amount has more than ${decimals} decimals: ${normalized}`);
  }

  const factor = 10n ** BigInt(decimals);
  const wholeAtomic = BigInt(wholePart) * factor;
  const fractionalAtomic = BigInt((fractionPart.slice(0, decimals).padEnd(decimals, "0")) || "0");
  return wholeAtomic + fractionalAtomic;
}

function atomicToDecimalString(value: bigint, decimals: number): string {
  const factor = 10n ** BigInt(decimals);
  const whole = value / factor;
  const fraction = value % factor;
  const fractionText = fraction.toString().padStart(decimals, "0").replace(/0+$/, "");
  return fractionText ? `${whole.toString()}.${fractionText}` : whole.toString();
}

function getAccountKeyText(accountKey: RpcAccountKey | undefined): string | null {
  if (!accountKey) return null;
  if (typeof accountKey === "string") return accountKey;
  return typeof accountKey.pubkey === "string" ? accountKey.pubkey : null;
}

function getSigner(accountKeys: RpcAccountKey[]): string | null {
  const explicitSigner = accountKeys.find((accountKey) => typeof accountKey !== "string" && accountKey.signer);
  return getAccountKeyText(explicitSigner ?? accountKeys[0]);
}

function decodeMemoInstruction(instruction: RpcInstruction): string | null {
  if (typeof instruction.parsed === "string") {
    return instruction.parsed;
  }

  if (
    instruction.parsed &&
    typeof instruction.parsed === "object" &&
    "info" in instruction.parsed &&
    typeof instruction.parsed.info === "string"
  ) {
    return instruction.parsed.info;
  }

  if (instruction.data) {
    try {
      return Buffer.from(instruction.data, "base64").toString("utf-8");
    } catch {
      return null;
    }
  }

  return null;
}

function findMemo(instructions: RpcInstruction[]): string | null {
  const memoInstruction = instructions.find(
    (instruction) =>
      instruction.program === "memo" ||
      instruction.programId === "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
  );

  return memoInstruction ? decodeMemoInstruction(memoInstruction) : null;
}

async function sendTelegram(message: string): Promise<void> {
  const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");

  if (!BOT_TOKEN || !CHAT_ID) return;

  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        parse_mode: "Markdown",
      }),
    });
  } catch (err) {
    console.error("Telegram send failed:", err);
  }
}

async function verifyTransaction(rpcUrl: string, signature: string): Promise<unknown> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTransaction",
        params: [
          signature,
          {
            encoding: "jsonParsed",
            maxSupportedTransactionVersion: 0,
            commitment: "confirmed",
          },
        ],
      }),
    });

    const json = await res.json();
    if (json.result) return json.result;

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  throw new Error("Transaction was not found on-chain after retries");
}

async function acquireProcessingLock(
  supabase: ServiceClient,
  signature: string,
  rawPayload: HeliusTx,
): Promise<boolean> {
  const { error: insertError } = await supabase
    .from("processed_transactions")
    .insert({
      signature,
      status: "processing",
      raw_payload: rawPayload as unknown as Json,
      retry_count: 0,
      created_at: new Date().toISOString(),
    });

  if (!insertError) return true;

  const { data: retryLock, error: retryError } = await supabase
    .from("processed_transactions")
    .update({
      status: "processing",
      error: null,
      raw_payload: rawPayload as unknown as Json,
      last_retry: new Date().toISOString(),
    })
    .eq("signature", signature)
    .eq("status", "failed")
    .select("signature")
    .maybeSingle();

  if (retryError) {
    console.warn(`Could not acquire retry lock for ${signature}:`, retryError.message);
  }

  return Boolean(retryLock);
}

async function failProcessedTransaction(
  supabase: ServiceClient,
  signature: string,
  message: string,
): Promise<void> {
  await supabase
    .from("processed_transactions")
    .update({
      status: "failed",
      error: message,
      last_retry: new Date().toISOString(),
    })
    .eq("signature", signature);
}

Deno.serve(async (req: Request): Promise<Response> => {
  const expectedSecret = Deno.env.get("HELIUS_WEBHOOK_SECRET");
  const apiKey = req.headers.get("x-api-key");
  const authHeader = req.headers.get("authorization");
  const bearerToken = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (!expectedSecret || (apiKey !== expectedSecret && bearerToken !== expectedSecret)) {
    console.warn("Unauthorized webhook attempt");
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const SUPABASE_URL = readRequiredEnv("SUPABASE_URL");
    const SERVICE_KEY = readRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const RPC_URL = Deno.env.get("SOLANA_RPC_URL") ?? "https://api.devnet.solana.com";
    const USDC_MINT = readRequiredEnv("USDC_MINT");
    const BUSINESS_WALLET = readRequiredEnv("BUSINESS_WALLET");
    const REQUIRED_AMOUNT = Number(Deno.env.get("SUBSCRIPTION_USDC_AMOUNT") ?? "0.1");
    const requiredAtomic = amountToAtomic(REQUIRED_AMOUNT, USDC_DECIMALS);

    if (requiredAtomic <= 0n) {
      throw new Error("SUBSCRIPTION_USDC_AMOUNT is invalid");
    }

    const supabase = createClient<Database>(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false },
    });

    const { count } = await supabase
      .from("processed_transactions")
      .select("*", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - 60000).toISOString());

    if ((count || 0) > 100) {
      return new Response("Rate limit", { status: 429 });
    }

    const body: unknown = await req.json();
    if (!Array.isArray(body)) {
      return jsonResponse({ error: "Invalid payload" }, 400);
    }

    const transactions = body as HeliusTx[];

    for (const tx of transactions) {
      const signature = tx.signature;
      if (!signature) continue;

      let lockAcquired = false;

      try {
        const verifiedTx = await verifyTransaction(RPC_URL, signature) as {
          meta?: { err?: unknown };
          transaction?: {
            message?: {
              accountKeys?: RpcAccountKey[];
              instructions?: RpcInstruction[];
            };
          };
        };

        if (verifiedTx.meta?.err !== null) {
          console.warn(`Skipping failed on-chain transaction ${signature}`);
          continue;
        }

        lockAcquired = await acquireProcessingLock(supabase, signature, tx);
        if (!lockAcquired) {
          console.warn(`Duplicate or in-flight transaction blocked: ${signature}`);
          continue;
        }

        const accountKeys = verifiedTx.transaction?.message?.accountKeys ?? [];
        const signer = getSigner(accountKeys);
        const instructions = verifiedTx.transaction?.message?.instructions ?? [];
        const decodedMemo = findMemo(instructions) ?? tx.memo ?? null;

        if (!decodedMemo?.startsWith(MEMO_PREFIX)) {
          throw new Error("Invalid or missing subscription memo");
        }

        const userIdPrefix = decodedMemo.slice(MEMO_PREFIX.length);

        const { data: pendingPaymentData, error: pendingError } = await supabase
          .from("pending_payments")
          .select("id, user_id, user_id_prefix, status, amount_usdc, token_mint, business_wallet, expires_at")
          .eq("user_id_prefix", userIdPrefix)
          .maybeSingle();

        if (pendingError) throw new Error(pendingError.message);
        const pendingPayment = pendingPaymentData as unknown as PendingPayment | null;
        if (!pendingPayment) throw new Error("No pending payment matches memo");
        if (pendingPayment.status !== "pending") throw new Error(`Payment intent is ${pendingPayment.status}`);

        if (new Date(pendingPayment.expires_at).getTime() <= Date.now()) {
          await supabase
            .from("pending_payments")
            .update({ status: "expired", updated_at: new Date().toISOString() })
            .eq("id", pendingPayment.id)
            .eq("status", "pending");
          throw new Error("Payment intent expired");
        }

        if (pendingPayment.token_mint !== USDC_MINT || pendingPayment.business_wallet !== BUSINESS_WALLET) {
          throw new Error("Payment intent configuration mismatch");
        }

        const validTransfers = (tx.tokenTransfers ?? []).filter((transfer) =>
          transfer.mint === USDC_MINT &&
          transfer.toUserAccount === BUSINESS_WALLET &&
          transfer.tokenAmount !== undefined &&
          amountToAtomic(transfer.tokenAmount, USDC_DECIMALS) > 0n
        );

        if (validTransfers.length === 0) {
          throw new Error("No valid USDC transfer to business wallet");
        }

        const payerWallet = validTransfers[0].fromUserAccount;
        if (!payerWallet) {
          throw new Error("Missing payer wallet");
        }

        const allSameWallet = validTransfers.every((transfer) => transfer.fromUserAccount === payerWallet);
        if (!allSameWallet) {
          throw new Error("Transaction includes mixed payer wallets");
        }

        if (signer && signer !== payerWallet) {
          throw new Error("Transaction signer does not match payer wallet");
        }

        const totalAtomic = validTransfers.reduce(
          (sum, transfer) => sum + amountToAtomic(transfer.tokenAmount ?? 0, USDC_DECIMALS),
          0n,
        );

        if (totalAtomic % requiredAtomic !== 0n) {
          throw new Error("Partial subscription payments are not allowed");
        }

        const monthsPaidBigInt = totalAtomic / requiredAtomic;
        if (monthsPaidBigInt < 1n) {
          throw new Error("Payment amount is below the required subscription amount");
        }

        if (monthsPaidBigInt > BigInt(MAX_MONTHS_PER_TRANSACTION)) {
          throw new Error(`Payment exceeds ${MAX_MONTHS_PER_TRANSACTION} months`);
        }

        const monthsPaid = Number(monthsPaidBigInt);
        const amountUsdc = atomicToDecimalString(totalAtomic, USDC_DECIMALS);

        const { data: ownerData, error: ownerError } = await supabase
          .from("project_owners")
          .select("id, wallet_address")
          .eq("id", pendingPayment.user_id)
          .maybeSingle();

        if (ownerError) throw new Error(ownerError.message);
        const owner = ownerData as unknown as ProjectOwner | null;
        if (!owner) throw new Error("Project owner does not exist");
        if (owner.wallet_address !== payerWallet) {
          throw new Error("Payer wallet does not match owner wallet");
        }

        const { error: completionError } = await supabase.rpc("complete_subscription_payment", {
          p_payment_id: pendingPayment.id,
          p_signature: signature,
          p_owner_id: owner.id,
          p_months_paid: monthsPaid,
          p_amount_usdc: amountUsdc,
          p_wallet: payerWallet,
        });

        if (completionError) {
          throw new Error(completionError.message);
        }

        if (monthsPaid >= 3) {
          await sendTelegram(`Bulk subscription\nUser: ${owner.id}\nMonths: ${monthsPaid}\nTx: ${signature}`);
        } else {
          await sendTelegram(`Subscription activated\nUser: ${owner.id}\nMonths: ${monthsPaid}\nTx: ${signature}`);
        }

        console.log(`Subscription payment completed: ${signature}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`Webhook processing failed for ${signature}:`, message);

        if (lockAcquired) {
          await failProcessedTransaction(supabase, signature, message);
        }
      }
    }

    return jsonResponse({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Webhook critical error:", message);
    return jsonResponse({ error: message }, 500);
  }
});
