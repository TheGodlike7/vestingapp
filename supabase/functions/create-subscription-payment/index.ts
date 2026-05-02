import { createClient } from "@supabase/supabase-js";

type RequestBody = {
  walletAddress?: unknown;
};

type ProjectOwnerInsert = {
  id: string;
  email: string | null;
  wallet_address: string;
  company_name: string | null;
  plan: string;
  is_active: boolean;
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
    },
  });
}

function readRequiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function normalizeWalletAddress(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error("walletAddress is required");
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed.length < 32 || trimmed.length > 64) {
    throw new Error("walletAddress is invalid");
  }

  return trimmed;
}

function getCompanyName(userMetadata: Record<string, unknown> | null | undefined): string | null {
  const companyName = userMetadata?.company_name;
  return typeof companyName === "string" && companyName.trim() ? companyName.trim() : null;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const SUPABASE_URL = readRequiredEnv("SUPABASE_URL");
    const SUPABASE_ANON_KEY = readRequiredEnv("SUPABASE_ANON_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = readRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const BUSINESS_WALLET = readRequiredEnv("BUSINESS_WALLET");
    const USDC_MINT = readRequiredEnv("USDC_MINT");
    const SUBSCRIPTION_USDC_AMOUNT = Number(Deno.env.get("SUBSCRIPTION_USDC_AMOUNT") ?? "0.1");
    const SOLANA_NETWORK = Deno.env.get("SOLANA_NETWORK") ?? "devnet";

    if (!Number.isFinite(SUBSCRIPTION_USDC_AMOUNT) || SUBSCRIPTION_USDC_AMOUNT <= 0) {
      throw new Error("SUBSCRIPTION_USDC_AMOUNT is invalid");
    }

    const authorization = req.headers.get("Authorization");
    if (!authorization) {
      return jsonResponse({ error: "Missing authorization" }, 401);
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const body = (await req.json().catch(() => ({}))) as RequestBody;
    const walletAddress = normalizeWalletAddress(body.walletAddress);
    const user = userData.user;
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const now = new Date();
    const nowIso = now.toISOString();

    await serviceClient
      .from("pending_payments")
      .update({ status: "expired", updated_at: nowIso })
      .eq("user_id", user.id)
      .eq("status", "pending")
      .lte("expires_at", nowIso);

    const { data: existingPending, error: existingError } = await serviceClient
      .from("pending_payments")
      .select("id, user_id_prefix, expires_at")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .gt("expires_at", nowIso)
      .maybeSingle();

    if (existingError) {
      throw new Error(existingError.message);
    }

    if (existingPending) {
      return jsonResponse(
        {
          error: "A subscription payment is already pending.",
          payment: {
            paymentId: existingPending.id,
            userIdPrefix: existingPending.user_id_prefix,
            expiresAt: existingPending.expires_at,
          },
        },
        409,
      );
    }

    const companyName = getCompanyName(user.user_metadata);
    const { data: existingOwner, error: ownerLookupError } = await serviceClient
      .from("project_owners")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (ownerLookupError) {
      throw new Error(ownerLookupError.message);
    }

    if (existingOwner) {
      const ownerUpdate: Record<string, string | null> = {
        email: user.email ?? null,
        wallet_address: walletAddress,
      };

      if (companyName) {
        ownerUpdate.company_name = companyName;
      }

      const { error: ownerUpdateError } = await serviceClient
        .from("project_owners")
        .update(ownerUpdate)
        .eq("id", user.id);

      if (ownerUpdateError) {
        throw new Error(ownerUpdateError.message);
      }
    } else {
      const ownerRecord: ProjectOwnerInsert = {
        id: user.id,
        email: user.email ?? null,
        wallet_address: walletAddress,
        company_name: companyName,
        plan: "starter",
        is_active: false,
      };

      const { error: ownerInsertError } = await serviceClient
        .from("project_owners")
        .insert(ownerRecord);

      if (ownerInsertError) {
        throw new Error(ownerInsertError.message);
      }
    }

    const paymentId = crypto.randomUUID();
    const userIdPrefix = paymentId;
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000).toISOString();
    const memo = `vestingapp-starter-${userIdPrefix}`;

    const { data: pendingPayment, error: insertError } = await serviceClient
      .from("pending_payments")
      .insert({
        id: paymentId,
        user_id: user.id,
        user_id_prefix: userIdPrefix,
        status: "pending",
        amount_usdc: SUBSCRIPTION_USDC_AMOUNT,
        token_mint: USDC_MINT,
        business_wallet: BUSINESS_WALLET,
        network: SOLANA_NETWORK,
        expires_at: expiresAt,
      })
      .select("id, user_id_prefix, amount_usdc, token_mint, business_wallet, network, expires_at, status")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return jsonResponse({ error: "A subscription payment is already pending." }, 409);
      }
      throw new Error(insertError.message);
    }

    return jsonResponse({
      payment: {
        paymentId: pendingPayment.id,
        userIdPrefix: pendingPayment.user_id_prefix,
        memo,
        amountUsdc: Number(pendingPayment.amount_usdc),
        tokenMint: pendingPayment.token_mint,
        businessWallet: pendingPayment.business_wallet,
        network: pendingPayment.network,
        expiresAt: pendingPayment.expires_at,
        status: pendingPayment.status,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("create-subscription-payment failed:", message);
    return jsonResponse({ error: message }, 500);
  }
});
