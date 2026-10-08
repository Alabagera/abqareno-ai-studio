import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bell, BellRing, CheckCircle2, Circle, Music, Plus, Quote, RotateCcw, Trash2, Trophy, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { signedUrl, uploadMedia } from "@/lib/media";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/journal")({
  head: () => ({ meta: [
    { title: "يومياتي — مهامي وتذكيراتي | عبقرينو AI Studio" },
    { name: "description", content: "نظّم مهامك اليومية والأسبوعية والشهرية والسنوية مع تذكيرات بنغمات تختارها وعبارات تحفيزية." },
    { property: "og:title", content: "يومياتي — عبقرينو AI Studio" },
    { property: "og:description", content: "مهام وتذكيرات ونغمات وعبارات تحفيز في مكان واحد." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: Journal,
});

type Repeat = "daily" | "weekly" | "monthly" | "yearly";
interface Task { id: string; title: string; notes: string; repeat: string; remind_at: string | null; tone: string; tone_path: string | null; done: boolean; done_at: string | null; created_at: string }
const REPEATS: { id: Repeat; label: string }[] = [{ id: "daily", label: "يومية" }, { id: "weekly", label: "أسبوعية" }, { id: "monthly", label: "شهرية" }, { id: "yearly", label: "سنوية" }];

const QUOTES = [
  "النجاح مجموع جهود صغيرة تتكرر كل يوم.", "ابدأ حيث أنت، استخدم ما لديك، افعل ما تستطيع.", "من جدّ وجد، ومن زرع حصد.", "خطوة صغيرة اليوم أفضل من حلم كبير مؤجل.",
  "الانضباط هو الجسر بين الأهداف والإنجاز.", "لا تنتظر الظروف المثالية؛ اصنعها.", "قليل دائم خير من كثير منقطع.", "العقل الذي يتعلم كل يوم لا يشيخ.",
  "إذا هبّت رياحك فاغتنمها.", "اجعل يومك يستحق أن تفخر به.", "التركيز على مهمة واحدة يصنع المعجزات.", "Small steps every day lead to big results.",
  "الطموح وقود، والعمل هو المحرك.", "أنت أقوى مما تظن، وأقرب مما تتخيل.", "Discipline is choosing what you want most over what you want now.", "كل إنجاز عظيم بدأ بقرار المحاولة.",
];
const PRAISE = ["أحسنت! إنجاز رائع 🌟", "فخور بك، استمر هكذا 💪", "مهمة أخرى منجزة، أنت مبدع ✨", "شكرًا لالتزامك، يومك يزداد إشراقًا ☀️", "عمل عظيم! خطوة جديدة نحو هدفك 🏆", "ممتاز! الانضباط يصنع الفرق 👏"];

const TONES: { id: string; label: string; notes: number[]; type: OscillatorType; gap: number }[] = [
  { id: "chime", label: "جرس ناعم", notes: [880, 1320, 1760], type: "sine", gap: 0.18 },
  { id: "bell", label: "ناقوس", notes: [523, 659, 784, 1047], type: "triangle", gap: 0.22 },
  { id: "digital", label: "رقمي", notes: [1200, 900, 1200, 900], type: "square", gap: 0.12 },
  { id: "rise", label: "تصاعدي", notes: [440, 554, 659, 880, 1109], type: "sine", gap: 0.1 },
  { id: "marimba", label: "ماريمبا", notes: [659, 784, 659, 523], type: "triangle", gap: 0.16 },
  { id: "alarm", label: "منبّه قوي", notes: [988, 0, 988, 0, 988, 0, 988], type: "sawtooth", gap: 0.12 },
];
async function playTone(id: string, customUrl?: string | null) {
  if (id === "custom" && customUrl) { const a = new Audio(customUrl); await a.play().catch(() => undefined); return; }
  const t = TONES.find((x) => x.id === id) ?? TONES[0]!; const ctx = new AudioContext();
  t.notes.forEach((f, i) => {
    if (!f) return; const o = ctx.createOscillator(); const g = ctx.createGain(); const at = ctx.currentTime + i * t.gap;
    o.type = t.type; o.frequency.value = f; g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(0.25, at + 0.02); g.gain.exponentialRampToValueAtTime(0.001, at + 0.6);
    o.connect(g).connect(ctx.destination); o.start(at); o.stop(at + 0.65);
  });
  setTimeout(() => void ctx.close(), (t.notes.length * t.gap + 1) * 1000);
}
function nextTime(d: Date, r: string) {
  const n = new Date(d);
  if (r === "weekly") n.setDate(n.getDate() + 7); else if (r === "monthly") n.setMonth(n.getMonth() + 1); else if (r === "yearly") n.setFullYear(n.getFullYear() + 1); else n.setDate(n.getDate() + 1);
  return n;
}
const toLocalInput = (iso: string | null) => { if (!iso) return ""; const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };

function Journal() {
  const qc = useQueryClient();
  const { data: tasks = [] } = useQuery({ queryKey: ["journal-tasks"], queryFn: async () => ((await supabase.from("journal_tasks").select("*").order("created_at", { ascending: false })).data ?? []) as Task[] });
  const refresh = () => qc.invalidateQueries({ queryKey: ["journal-tasks"] });
  const [tab, setTab] = useState<Repeat | "all">("all");
  const [form, setForm] = useState({ title: "", notes: "", repeat: "daily" as Repeat, remind: "", tone: "chime" });
  const [customTone, setCustomTone] = useState<{ path: string; url: string } | null>(null);
  const [praise, setPraise] = useState<string | null>(null);
  const [leaving, setLeaving] = useState<string | null>(null);
  const quote = useMemo(() => QUOTES[Math.floor(Date.now() / 86400000) % QUOTES.length]!, []);
  const [notifyPerm, setNotifyPerm] = useState<string>("default");
  useEffect(() => { if (typeof Notification !== "undefined") setNotifyPerm(Notification.permission); }, []);

  // Reminder loop: fires while the site is open (even in a background tab).
  const tasksRef = useRef(tasks); tasksRef.current = tasks;
  useEffect(() => {
    const check = async () => {
      const now = Date.now();
      for (const t of tasksRef.current) {
        if (t.done || !t.remind_at || new Date(t.remind_at).getTime() > now) continue;
        const url = t.tone === "custom" && t.tone_path ? await signedUrl(t.tone_path) : null;
        void playTone(t.tone, url);
        if (typeof Notification !== "undefined" && Notification.permission === "granted") new Notification("⏰ تذكير من يومياتي", { body: t.title, icon: "/favicon.ico" });
        toast(`⏰ ${t.title}`, { description: "حان وقت مهمتك — أنت قادر عليها!" });
        await supabase.from("journal_tasks").update({ remind_at: nextTime(new Date(t.remind_at), t.repeat).toISOString() }).eq("id", t.id);
        void refresh();
      }
    };
    void check(); const id = setInterval(() => void check(), 20000); return () => clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function add() {
    if (!form.title.trim()) { toast.error("اكتب عنوان المهمة"); return; }
    const { error } = await supabase.from("journal_tasks").insert({ title: form.title.trim(), notes: form.notes, repeat: form.repeat, remind_at: form.remind ? new Date(form.remind).toISOString() : null, tone: form.tone, tone_path: form.tone === "custom" ? customTone?.path ?? null : null });
    if (error) { toast.error(error.message); return; }
    setForm((f) => ({ ...f, title: "", notes: "", remind: "" })); toast.success("أُضيفت المهمة، بالتوفيق! 🚀"); void refresh();
  }
  async function complete(t: Task) {
    setLeaving(t.id); void playTone("rise");
    setTimeout(async () => {
      await supabase.from("journal_tasks").update({ done: true, done_at: new Date().toISOString() }).eq("id", t.id);
      setLeaving(null); setPraise(PRAISE[Math.floor(Math.random() * PRAISE.length)]!); setTimeout(() => setPraise(null), 3500); void refresh();
    }, 700);
  }
  const reopen = async (t: Task) => { await supabase.from("journal_tasks").update({ done: false, done_at: null }).eq("id", t.id); void refresh(); };
  const remove = async (t: Task) => { await supabase.from("journal_tasks").delete().eq("id", t.id); void refresh(); };

  const active = tasks.filter((t) => !t.done && (tab === "all" || t.repeat === tab));
  const done = tasks.filter((t) => t.done).sort((a, b) => (b.done_at ?? "").localeCompare(a.done_at ?? ""));
  const pct = tasks.length ? Math.round((done.length / tasks.length) * 100) : 0;
  const repLabel = (r: string) => REPEATS.find((x) => x.id === r)?.label ?? r;

  return (
    <div dir="rtl" className="mx-auto max-w-4xl space-y-3 py-2">
      <header className="glass flex flex-wrap items-center gap-2 rounded-2xl px-3 py-2">
        <Quote className="size-4 shrink-0 text-gold" /><p className="min-w-0 flex-1 truncate text-sm font-bold" dir="auto" title={quote}>{quote}</p>
        <div className="flex items-center gap-1"><div className="h-1.5 w-16 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-gold transition-all duration-700" style={{ width: `${pct}%` }} /></div><span className="text-xs font-bold text-gold">{pct}%</span></div>
        {notifyPerm !== "granted" && typeof Notification !== "undefined" && <button type="button" aria-label="فعّل الإشعارات" onClick={async () => setNotifyPerm(await Notification.requestPermission())} className="text-gold"><BellRing className="size-4" /></button>}
      </header>

      {praise && <div className="glass fixed inset-x-4 top-6 z-50 mx-auto max-w-sm animate-in fade-in zoom-in rounded-2xl border border-gold p-4 text-center text-lg font-black text-gold shadow-2xl"><Trophy className="mx-auto mb-1 size-8" />{praise}</div>}

      <section className="glass space-y-3 rounded-2xl p-4">
        <h2 className="flex items-center gap-2 font-bold"><Plus className="size-5 text-gold" />مهمة جديدة</h2>
        <input dir="auto" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} onKeyDown={(e) => e.key === "Enter" && void add()} placeholder="ماذا ستنجز؟ / What will you do?" className="bilingual-text h-11 w-full rounded-xl border border-input bg-background px-3" />
        <textarea dir="auto" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="اكتب ملاحظاتك وتفاصيل يومك هنا… (اختياري)" className="bilingual-text min-h-44 w-full resize-y rounded-xl border border-input bg-background p-3 text-sm" />
        <div className="flex flex-wrap gap-1">{REPEATS.map((r) => <button type="button" key={r.id} onClick={() => setForm({ ...form, repeat: r.id })} className={`rounded-full border px-3 py-1 text-sm ${form.repeat === r.id ? "border-gold bg-gold text-primary-foreground" : "border-border"}`}>{r.label}</button>)}</div>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="text-sm"><Bell className="me-1 inline size-4 text-gold" />وقت التذكير<input type="datetime-local" value={form.remind} onChange={(e) => setForm({ ...form, remind: e.target.value })} className="mt-1 h-10 w-full rounded-xl border border-input bg-background px-2" /></label>
          <label className="text-sm"><Music className="me-1 inline size-4 text-gold" />النغمة
            <div className="mt-1 flex gap-1"><select value={form.tone} onChange={(e) => setForm({ ...form, tone: e.target.value })} className="h-10 flex-1 rounded-xl border border-input bg-background px-2">{TONES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}<option value="custom" disabled={!customTone}>نغمتي المرفوعة</option></select>
              <Button type="button" size="sm" variant="glass" onClick={() => void playTone(form.tone, customTone?.url)}>▶</Button></div>
          </label>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-muted-foreground"><Upload className="size-4 text-gold" />{customTone ? "✓ نغمتك جاهزة" : "ارفع نغمة من جهازك"}
          <input type="file" accept="audio/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; try { const row = await uploadMedia(f, "audio"); setCustomTone({ path: row.storage_path, url: URL.createObjectURL(f) }); setForm((x) => ({ ...x, tone: "custom" })); toast.success("رُفعت النغمة"); } catch (err) { toast.error((err as Error).message); } }} />
        </label>
        <Button variant="gold" className="w-full" onClick={() => void add()}><Plus className="size-4" />أضف المهمة</Button>
      </section>

      <section className="space-y-2">
        <div className="flex flex-wrap gap-1">{[{ id: "all" as const, label: "الكل" }, ...REPEATS].map((r) => <button type="button" key={r.id} onClick={() => setTab(r.id)} className={`rounded-full px-3 py-1 text-sm ${tab === r.id ? "bg-secondary text-gold" : "text-muted-foreground"}`}>{r.label}</button>)}</div>
        {active.length === 0 ? <p className="glass rounded-2xl p-6 text-center text-muted-foreground">لا مهام هنا. أضف مهمة وابدأ يومك بقوة ✨</p> : active.map((t) => (
          <div key={t.id} className={`glass flex items-start gap-3 rounded-2xl p-4 transition-all duration-700 ${leaving === t.id ? "translate-x-[-30%] opacity-0" : ""}`}>
            <button type="button" aria-label="أنجزت المهمة" onClick={() => void complete(t)} className="mt-0.5 text-gold">{leaving === t.id ? <CheckCircle2 className="size-6" /> : <Circle className="size-6" />}</button>
            <div className="min-w-0 flex-1">
              <p dir="auto" className={`font-bold transition-all ${leaving === t.id ? "text-muted-foreground line-through decoration-gold decoration-2" : ""}`}>{t.title}</p>
              {t.notes && <p dir="auto" className="text-sm text-muted-foreground">{t.notes}</p>}
              <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground"><span className="rounded-full bg-secondary px-2">{repLabel(t.repeat)}</span>{t.remind_at && <span className="flex items-center gap-1"><Bell className="size-3" />{new Date(t.remind_at).toLocaleString("ar", { dateStyle: "medium", timeStyle: "short" })}</span>}</div>
              {t.remind_at && <input type="datetime-local" aria-label="تعديل وقت التذكير" defaultValue={toLocalInput(t.remind_at)} onBlur={async (e) => { if (!e.target.value) return; await supabase.from("journal_tasks").update({ remind_at: new Date(e.target.value).toISOString() }).eq("id", t.id); void refresh(); }} className="mt-1 h-8 rounded-lg border border-input bg-background px-2 text-xs" />}
            </div>
            <button type="button" aria-label="حذف" onClick={() => void remove(t)} className="text-muted-foreground"><Trash2 className="size-4" /></button>
          </div>
        ))}
      </section>

      <section className="glass space-y-2 rounded-2xl p-4">
        <h2 className="flex items-center gap-2 font-bold"><Trophy className="size-5 text-gold" />المهام المنجزة ({done.length})</h2>
        {done.length > 0 && <p className="text-sm text-gold">شكرًا لك على كل خطوة أنجزتها — أنت تبني نسخة أفضل من نفسك 🌟</p>}
        {done.map((t) => (
          <div key={t.id} className="flex items-center gap-3 rounded-xl bg-secondary/40 p-3">
            <CheckCircle2 className="size-5 shrink-0 text-gold" />
            <p dir="auto" className="flex-1 text-muted-foreground line-through decoration-gold">{t.title}</p>
            <span className="text-xs text-muted-foreground">{t.done_at && new Date(t.done_at).toLocaleDateString("ar")}</span>
            <button type="button" aria-label="إعادة المهمة" onClick={() => void reopen(t)} className="text-muted-foreground"><RotateCcw className="size-4" /></button>
            <button type="button" aria-label="حذف" onClick={() => void remove(t)} className="text-muted-foreground"><Trash2 className="size-4" /></button>
          </div>
        ))}
      </section>
    </div>
  );
}
