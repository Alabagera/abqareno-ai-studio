import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Owner or model managers: checks that a self-hosted model server answers, and records the result.
export const testModelEndpoint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ modelId: z.string().min(1).max(100) }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: canManage } = await context.supabase.rpc("can_manage_models");
    if (!canManage) throw new Error("لا تملك صلاحية ربط النماذج");
    const { data: ownerId } = await context.supabase.rpc("workspace_owner_id", { _user_id: context.userId });
    const workspace = (ownerId as string | null) ?? context.userId;
    const { data: row } = await context.supabase.from("model_endpoints")
      .select("endpoint_url, access_token").eq("owner_id", workspace).eq("model_id", data.modelId).maybeSingle();
    const url = row?.endpoint_url?.trim();
    if (!url || !/^https:\/\//i.test(url)) {
      return { ok: false, message: "أضف رابطًا عامًا يبدأ بـ https (رابط النفق)، فالموقع لا يصل إلى localhost في جهازك" };
    }
    let ok = false; let message = "";
    try {
      const res = await fetch(url, { headers: row?.access_token ? { Authorization: `Bearer ${row.access_token}` } : {}, signal: AbortSignal.timeout(10000) });
      ok = res.status < 500;
      message = ok ? `متصل (${res.status})` : `الخادم أعاد خطأ ${res.status}`;
    } catch {
      message = "لا يستجيب — تأكد أن الجهاز والنفق يعملان";
    }
    await context.supabase.from("model_endpoints").update({ last_status: message, last_checked_at: new Date().toISOString() })
      .eq("owner_id", workspace).eq("model_id", data.modelId);
    return { ok, message };
  });
