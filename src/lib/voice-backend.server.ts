import { createClient } from "@supabase/supabase-js";

// Shared server helpers for voice: verify the caller and find the workspace's
// linked self-hosted model (which replaces the paid gateway automatically).
export async function authVoice(request: Request) {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!url || !key || token.split(".").length !== 3) return null;
  const sb = createClient(url, key, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return null;
  return { sb, userId: data.user.id };
}

export async function linkedEndpoint(sb: Awaited<ReturnType<typeof authVoice>> extends infer T ? T extends { sb: infer S } ? S : never : never, userId: string, modelId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: ownerId } = await sb.rpc("workspace_owner_id", { _user_id: userId });
  if (!ownerId) return null;
  const { data } = await supabaseAdmin.from("model_endpoints").select("endpoint_url, access_token, enabled").eq("owner_id", ownerId as string).eq("model_id", modelId).maybeSingle();
  return data?.enabled && data.endpoint_url ? { url: data.endpoint_url.replace(/\/$/, ""), token: data.access_token } : null;
}
