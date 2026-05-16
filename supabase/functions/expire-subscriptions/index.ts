import { createClient } from "@supabase/supabase-js";

type DenoRuntime = {
  env: {
    get(name: string): string | undefined;
  };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};

const denoRuntime = (globalThis as typeof globalThis & { Deno: DenoRuntime })
  .Deno;

denoRuntime.serve(async (req: Request) => {
  const expectedSecret = denoRuntime.env.get("EXPIRE_SUBSCRIPTIONS_SECRET");
  const authHeader = req.headers.get("authorization");
  const bearerToken = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (!expectedSecret || bearerToken !== expectedSecret) {
    console.warn("Unauthorized expire-subscriptions attempt");
    return new Response("Unauthorized", { status: 401 });
  }

  const SUPABASE_URL = denoRuntime.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = denoRuntime.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("subscriptions")
    .update({ status: "expired" })
    .lt("expires_at", now)
    .eq("status", "active")
    .select("id");


  if (error) {
    console.error("❌ Expire error", error);
    return new Response("error", { status: 500 });
  }

  console.log(`✅ Expired ${data?.length || 0} subscriptions updated`);

  return new Response("ok");
});
