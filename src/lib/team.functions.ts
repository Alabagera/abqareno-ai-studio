import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const memberSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().trim().min(2).max(80),
  role: z.enum(["admin", "editor", "viewer"]),
  studio: z.boolean(),
  library: z.boolean(),
  team: z.boolean(),
});

export const createTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => memberSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isOwner } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "owner",
    });
    if (!isOwner) throw new Error("هذه العملية متاحة للمدير الرئيسي فقط");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email.toLowerCase(),
      password: data.password,
      email_confirm: true,
      user_metadata: { display_name: data.displayName },
    });
    if (createError || !created.user) throw new Error(createError?.message ?? "تعذر إنشاء الحساب");

    const memberId = created.user.id;
    const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
      id: memberId,
      email: data.email.toLowerCase(),
      display_name: data.displayName,
    });
    if (profileError) throw new Error(profileError.message);

    const { error: memberError } = await supabaseAdmin.from("team_members").upsert({
      owner_id: context.userId,
      member_id: memberId,
      email: data.email.toLowerCase(),
      display_name: data.displayName,
      role: data.role,
      permissions: { studio: data.studio, library: data.library, team: data.team },
      status: "active",
    }, { onConflict: "owner_id,email" });
    if (memberError) throw new Error(memberError.message);

    if (data.role === "admin") {
      await supabaseAdmin.from("user_roles").upsert({ user_id: memberId, role: "admin" }, { onConflict: "user_id,role" });
    }
    return { ok: true };
  });

export const removeTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid(), memberId: z.string().uuid().nullable() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: isOwner } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "owner",
    });
    if (!isOwner) throw new Error("هذه العملية متاحة للمدير الرئيسي فقط");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("team_members").delete().eq("id", data.id).eq("owner_id", context.userId);
    if (error) throw new Error(error.message);
    if (data.memberId) await supabaseAdmin.auth.admin.deleteUser(data.memberId);
    return { ok: true };
  });