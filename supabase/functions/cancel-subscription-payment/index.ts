import { createClient } from "@supabase/supabase-js";

type RequestBody = {
  paymentId?: unknown;
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

function parsePaymentId(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("paymentId is required");
  }
  return value.trim();
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
    const authorization = req.headers.get("Authorization");

    if (!authorization) {
      return jsonResponse({ error: "Missing authorization" }, 401);
    }

    const body = (await req.json().catch(() => ({}))) as RequestBody;
    const paymentId = parsePaymentId(body.paymentId);

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const { error } = await serviceClient
      .from("pending_payments")
      .update({ status: "expired", updated_at: new Date().toISOString() })
      .eq("id", paymentId)
      .eq("user_id", userData.user.id)
      .eq("status", "pending");

    if (error) {
      throw new Error(error.message);
    }

    return jsonResponse({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("cancel-subscription-payment failed:", message);
    return jsonResponse({ error: message }, 500);
  }
});
