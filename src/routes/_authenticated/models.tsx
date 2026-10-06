import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { AI_MODELS, TASK_LABELS, type AiModel, type ModelTask } from "@/lib/ai/registry";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { testModelEndpoint } from "@/lib/model-endpoints.functions";

export const Route = createFileRoute("/_authenticated/models")({
  head: () => ({ meta: [{ title: "نماذج الذكاء الاصطناعي — عبقرينو" }, { name: "description", content: "اربط النماذج مفتوحة المصدر بجهازك الخاص." }, { property: "og:title", content: "نماذج عبقرينو AI" }, { property: "og:description", content: "سجل نماذج الصوت وتحريك الوجه والترجمة القابل للتوسعة." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Models,
});

type Endpoint = { model_id: string; endpoint_url: string; access_token: string | null; enabled: boolean; last_status: string | null };

function Models() {
  const { data: access } = useQuery({ queryKey: ["workspace-access"], queryFn: async () => (await supabase.rpc("my_workspace_access")).data as Record<string, boolean> | null });
  const { data: isOwner } = useQuery({ queryKey: ["is-owner"], queryFn: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return false;
    return (await supabase.rpc("has_role", { _user_id: u.user.id, _role: "owner" })).data === true;
  } });
  const { data: endpoints } = useQuery({ queryKey: ["model-endpoints"], enabled: isOwner === true, queryFn: async () => ((await supabase.from("model_endpoints").select("model_id, endpoint_url, access_token, enabled, last_status")).data ?? []) as Endpoint[] });
  const tasks = Object.keys(TASK_LABELS) as ModelTask[];
  if (access && !access["models"]) return <div className="glass rounded-2xl p-8 text-center text-muted-foreground">لم يمنحك المدير صلاحية عرض هذه الصفحة.</div>;
  const showNames = isOwner === true || access?.["show_model_names"] === true;
  return (
    <div>
      <PageHeader title="النماذج والأدوات" subtitle="اربط كل نموذج مفتوح بجهازك — بدون إعادة بناء الموقع" />
      {isOwner && <SetupGuide />}
      <div className="space-y-6">
        {tasks.map((t) => (
          <section key={t}>
            <h2 className="mb-3 text-sm font-bold text-gold-soft">{TASK_LABELS[t]}</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {AI_MODELS.filter((m) => m.task === t).map((m) => {
                const ep = endpoints?.find((e) => e.model_id === m.id);
                const connected = m.status === "ready" || (ep?.enabled && ep.endpoint_url);
                return (
                  <div key={m.id} className="glass rounded-2xl p-4">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-bold" dir="auto">{showNames ? m.name : TASK_LABELS[m.task]}</h3>
                      <span className="shrink-0 rounded-full bg-secondary px-2.5 py-0.5 text-[11px] text-muted-foreground">{connected ? "متصل" : "غير مربوط"}</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{m.description}</p>
                    {showNames && <p className="mt-2 text-xs text-muted-foreground">المصدر: {m.source}{m.vram ? ` · ذاكرة الكرت: ${m.vram}` : ""}</p>}
                    {isOwner && m.selfHosted && <EndpointEditor model={m} ep={ep} />}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function EndpointEditor({ model, ep }: { model: AiModel; ep: Endpoint | undefined }) {
  const qc = useQueryClient();
  const test = useServerFn(testModelEndpoint);
  const [url, setUrl] = useState(ep?.endpoint_url ?? "");
  const [token, setToken] = useState(ep?.access_token ?? "");
  const [enabled, setEnabled] = useState(ep?.enabled ?? false);
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("model_endpoints").upsert({ owner_id: u.user!.id, model_id: model.id, endpoint_url: url.trim(), access_token: token.trim() || null, enabled, updated_at: new Date().toISOString() }, { onConflict: "owner_id,model_id" });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("تم الحفظ");
    qc.invalidateQueries({ queryKey: ["model-endpoints"] });
  }
  async function check() {
    setBusy(true);
    try { await save(); const r = await test({ data: { modelId: model.id } }); r.ok ? toast.success(r.message) : toast.error(r.message); qc.invalidateQueries({ queryKey: ["model-endpoints"] }); }
    catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }
  return (
    <details className="mt-3 rounded-xl bg-secondary/50 p-3">
      <summary className="cursor-pointer text-xs text-gold-soft">ربط بجهازي</summary>
      <div className="mt-3 space-y-2">
        <Input dir="ltr" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://xxxx.trycloudflare.com" />
        <p className="text-[11px] text-muted-foreground" dir="ltr">Local: {model.defaultUrl}</p>
        {model.setup && (
          <div className="rounded-lg bg-background/60 p-2">
            <p className="text-[11px] text-muted-foreground">أمر التثبيت:</p>
            <div className="flex items-center gap-2">
              <code dir="ltr" className="flex-1 overflow-x-auto whitespace-nowrap text-[11px]">{model.setup}</code>
              <button type="button" className="shrink-0 text-[11px] text-gold-soft underline" onClick={() => { navigator.clipboard.writeText(model.setup!); toast.success("تم النسخ"); }}>نسخ</button>
            </div>
          </div>
        )}
        <Input dir="ltr" type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="رمز حماية اختياري" />
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />تفعيل هذا النموذج</label>
        {ep?.last_status && <p className="text-[11px] text-muted-foreground">آخر فحص: {ep.last_status}</p>}
        <div className="flex gap-2">
          <Button size="sm" variant="gold" disabled={busy} onClick={save}>حفظ</Button>
          <Button size="sm" variant="ghost" disabled={busy || !url} onClick={check}>اختبار الاتصال</Button>
          {model.repo && <a href={model.repo} target="_blank" rel="noreferrer" className="ms-auto self-center text-[11px] text-gold-soft underline">طريقة التثبيت</a>}
        </div>
      </div>
    </details>
  );
}

function SetupGuide() {
  return (
    <details className="glass mb-6 rounded-2xl p-4" open>
      <summary className="cursor-pointer font-bold text-gold">كيف أربط النماذج بنفسي؟ (خطوات سهلة)</summary>
      <div className="mt-3 grid gap-4 md:grid-cols-2 text-sm leading-7 text-muted-foreground">
        <div className="rounded-xl bg-secondary/50 p-3">
          <h3 className="mb-1 font-bold text-foreground">على سيرفرك الخاص (الأفضل — يعمل دائمًا)</h3>
          <ol className="list-decimal space-y-1 ps-5">
            <li>ادخل إلى السيرفر وثبّت Docker بالأمر: <code dir="ltr">curl -fsSL https://get.docker.com | sh</code></li>
            <li>إن كان فيه كرت NVIDIA ثبّت «NVIDIA Container Toolkit».</li>
            <li>انسخ «أمر التثبيت» الظاهر في بطاقة النموذج والصقه في السيرفر.</li>
            <li>اربط نطاقًا فرعيًا لكل نموذج، مثل <span dir="ltr">image.yourdomain.com</span>، عبر Cloudflare Tunnel أو Nginx مع شهادة https.</li>
            <li>الصق الرابط في البطاقة ← فعّل ← «اختبار الاتصال».</li>
          </ol>
        </div>
        <div className="rounded-xl bg-secondary/50 p-3">
          <h3 className="mb-1 font-bold text-foreground">على جهاز الكمبيوتر</h3>
          <ol className="list-decimal space-y-1 ps-5">
            <li>ثبّت Docker Desktop، ولنماذج المحادثة ثبّت Ollama من ollama.com.</li>
            <li>انسخ «أمر التثبيت» من البطاقة والصقه في الطرفية (Terminal).</li>
            <li>ثبّت cloudflared وشغّل: <code dir="ltr">cloudflared tunnel --url http://localhost:PORT</code> (ضع رقم المنفذ المكتوب تحت البطاقة).</li>
            <li>الصق رابط https الناتج في البطاقة واضغط «اختبار الاتصال».</li>
            <li>يجب أن يبقى الجهاز شغالًا أثناء الاستخدام.</li>
          </ol>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">«بدون GPU» = يعمل على أي سيرفر عادي. الأرقام مثل 8GB = ذاكرة كرت الشاشة المطلوبة. أضف «رمز حماية» حتى لا يستخدم أحد سيرفرك.</p>
    </details>
  );
}
