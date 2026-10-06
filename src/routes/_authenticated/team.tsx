import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ShieldCheck, Trash2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createTeamMember, removeTeamMember } from "@/lib/team.functions";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/_authenticated/team")({
  head: () => ({ meta: [
    { title: "إدارة الفريق — عبقرينو AI Studio" },
    { name: "description", content: "أضف حسابات المساعدين وحدد صلاحياتهم." },
    { property: "og:title", content: "إدارة الفريق — عبقرينو" },
    { property: "og:description", content: "إدارة آمنة لحسابات فريق الاستوديو." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: TeamPage,
});

function TeamPage() {
  const qc = useQueryClient();
  const createMember = useServerFn(createTeamMember);
  const removeMember = useServerFn(removeTeamMember);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ displayName: "", email: "", password: "", role: "editor" as "admin" | "editor" | "viewer", studio: true, library: true, team: false, maxVideos: "", maxMinutes: "" });
  const { data: roles = [] } = useQuery({ queryKey: ["my-roles"], queryFn: async () => (await supabase.from("user_roles").select("role")).data ?? [] });
  const isOwner = roles.some((r) => r.role === "owner");
  const { data: members = [] } = useQuery({ queryKey: ["team-members"], queryFn: async () => (await supabase.from("team_members").select("*").order("created_at")).data ?? [] });

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    try {
      await createMember({ data: { ...form, maxVideos: form.maxVideos === "" ? null : +form.maxVideos, maxMinutes: form.maxMinutes === "" ? null : +form.maxMinutes } });
      toast.success("تم إنشاء حساب المساعد");
      setForm({ displayName: "", email: "", password: "", role: "editor", studio: true, library: true, team: false, maxVideos: "", maxMinutes: "" });
      await qc.invalidateQueries({ queryKey: ["team-members"] });
    } catch (error) { toast.error((error as Error).message); }
    finally { setBusy(false); }
  }

  if (!isOwner) return <div className="glass rounded-2xl p-10 text-center"><ShieldCheck className="mx-auto mb-3 size-10 text-gold" /><h1 className="font-bold">هذه الصفحة للمدير الرئيسي</h1><p className="mt-2 text-sm text-muted-foreground">يمكنك استخدام الاستوديو والمكتبة وفق الصلاحيات الممنوحة لك.</p></div>;

  return <div><PageHeader title="إدارة الفريق" subtitle="أنت المدير الرئيسي — أضف مساعدين وحدد ما يمكنهم الوصول إليه" />
    <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
      <form onSubmit={submit} className="glass space-y-4 rounded-2xl p-5 lg:self-start">
        <h2 className="flex items-center gap-2 font-bold"><UserPlus className="size-5 text-gold" />حساب مساعد جديد</h2>
        <div><Label htmlFor="member-name">الاسم</Label><Input id="member-name" className="mt-1" required value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} /></div>
        <div><Label htmlFor="member-email">البريد الإلكتروني</Label><Input id="member-email" className="mt-1" dir="ltr" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        <div><Label htmlFor="member-password">كلمة مرور مؤقتة</Label><Input id="member-password" className="mt-1" dir="ltr" type="password" minLength={8} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
        <div><Label htmlFor="member-role">الدور</Label><select id="member-role" className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as typeof form.role })}><option value="admin">مدير مساعد</option><option value="editor">محرر</option><option value="viewer">مشاهد</option></select></div>
        <div className="grid grid-cols-2 gap-3"><div><Label htmlFor="max-videos">حد الفيديوهات</Label><Input id="max-videos" className="mt-1" type="number" min={0} placeholder="بلا حد" value={form.maxVideos} onChange={(e) => setForm({ ...form, maxVideos: e.target.value })} /></div><div><Label htmlFor="max-min">دقائق لكل فيديو</Label><Input id="max-min" className="mt-1" type="number" min={0} step="0.5" placeholder="بلا حد" value={form.maxMinutes} onChange={(e) => setForm({ ...form, maxMinutes: e.target.value })} /></div></div>
        <div className="space-y-3"><Permission label="استخدام الاستوديو" checked={form.studio} onChange={(v) => setForm({ ...form, studio: v })} /><Permission label="إدارة المكتبة" checked={form.library} onChange={(v) => setForm({ ...form, library: v })} /><Permission label="إدارة الفريق" checked={form.team} onChange={(v) => setForm({ ...form, team: v })} /></div>
        <Button className="w-full" variant="gold" type="submit" disabled={busy}><UserPlus />{busy ? "جارٍ الإنشاء…" : "إنشاء الحساب"}</Button>
      </form>
      <section><h2 className="mb-3 flex items-center gap-2 font-bold"><Users className="size-5 text-gold" />الحسابات ({members.length})</h2><div className="space-y-3">{members.map((member) => <div key={member.id} className="glass flex flex-wrap items-center gap-3 rounded-2xl p-4"><div className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary font-bold text-gold">{(member.display_name || member.email).slice(0, 1).toUpperCase()}</div><div className="min-w-0 flex-1"><h3 className="truncate font-medium">{member.display_name || "بدون اسم"}</h3><p className="truncate text-xs text-muted-foreground" dir="ltr">{member.email}</p></div><span className="rounded-full bg-secondary px-3 py-1 text-xs text-gold-soft">{member.role === "owner" ? "المدير الرئيسي" : member.role === "admin" ? "مدير مساعد" : member.role === "editor" ? "محرر" : "مشاهد"}</span>{member.role !== "owner" && <Limits id={member.id} maxVideos={member.max_videos} maxMinutes={member.max_minutes_per_video} onSaved={() => qc.invalidateQueries({ queryKey: ["team-members"] })} />}{member.role !== "owner" && <Button variant="ghost" size="icon" aria-label="حذف الحساب" onClick={async () => { try { await removeMember({ data: { id: member.id, memberId: member.member_id } }); await qc.invalidateQueries({ queryKey: ["team-members"] }); toast.success("تم حذف الحساب"); } catch (error) { toast.error((error as Error).message); } }}><Trash2 /></Button>}</div>)}</div></section>
    </div>
  </div>;
}

function Permission({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex items-center gap-2 text-sm"><Checkbox checked={checked} onCheckedChange={(v) => onChange(v === true)} />{label}</label>;
}
function Limits({ id, maxVideos, maxMinutes, onSaved }: { id: string; maxVideos: number | null; maxMinutes: number | null; onSaved: () => void }) {
  const [v, setV] = useState(maxVideos?.toString() ?? "");
  const [m, setM] = useState(maxMinutes?.toString() ?? "");
  async function save() {
    const { error } = await supabase.from("team_members").update({ max_videos: v === "" ? null : +v, max_minutes_per_video: m === "" ? null : +m }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("تم حفظ الحدود"); onSaved(); }
  }
  return <div className="flex w-full items-end gap-2 sm:order-last"><label className="flex-1 text-xs text-muted-foreground">حد الفيديوهات<Input type="number" min={0} placeholder="بلا حد" value={v} onChange={(e) => setV(e.target.value)} className="mt-1 h-9" /></label><label className="flex-1 text-xs text-muted-foreground">دقائق/فيديو<Input type="number" min={0} step="0.5" placeholder="بلا حد" value={m} onChange={(e) => setM(e.target.value)} className="mt-1 h-9" /></label><Button size="sm" variant="glass" onClick={save}>حفظ</Button></div>;
}
