import { createClient } from "@supabase/supabase-js";

Deno.serve(async () => {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("subscriptions")
    .update({ status: "expired" })
    .select("id")
    .lt("expires_at", now)
    .eq("status", "active");


  if (error) {
    console.error("❌ Expire error", error);
    return new Response("error", { status: 500 });
  }

  console.log(`✅ Expired ${data?.length || 0} subscriptions updated`);

  return new Response("ok");
});