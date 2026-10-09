import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Mic, Music, Settings2, Square, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { deleteMedia, signedUrl, uploadMedia } from "@/lib/media";
import { ttsUrl } from "@/lib/abq-voice";
import { VoicePicker, useVoiceChoice } from "@/components/VoicePicker";
import { VoiceRecorder, transcribeClip } from "@/lib/voice-recorder";
import { clickByWords, fieldByWords, findPageText, focusedOrFirstField, setField, setTheme } from "@/lib/voice-dom";
import { createProject } from "@/lib/editor/projects";
import { adsStore } from "@/lib/ads-jobs";
import { AlabageraPortrait } from "@/components/AlabageraPortrait";
import { AudioRecorder } from "@/components/MediaCapture";
import { Button } from "@/components/ui/button";

// Tap the Abqarino icon, speak a command, and it is carried out locally
// (rule-based, no AI credits). Replies use the owner's recorded voice clips.
const KEY = "abq-voice-commander";
type ReplyKey = "ok" | "done" | "working" | "missing";
const REPLIES: { id: ReplyKey; text: string }[] = [{ id: "ok", text: "حاضر" }, { id: "done", text: "تم التنفيذ" }, { id: "working", text: "جاري إتمام المهمة" }, { id: "missing", text: "لم أجد ما طلبته" }];
interface Settings { avatar?: string | undefined; replies: Partial<Record<ReplyKey, string>> }
const load = (): Settings => { try { return { replies: {}, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") } as Settings; } catch { return { replies: {} }; } };
const norm = (s: string) => s.replace(/[\u064B-\u0652\u0640]/g, "").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").toLowerCase();
const SECTIONS: [RegExp, string][] = [
  [/محرر|editor/, "/editor"], [/استوديو|ستوديو|studio/, "/studio"], [/مساعد|assistant/, "/assistant"], [/اعلان|ads/, "/ads"], [/يوميات|يومياتي|مهام|journal/, "/journal"],
  [/مكتبه|library/, "/library"], [/فريق|team/, "/team"], [/نماذج|models/, "/models"], [/هويتي|هويه/, "/profiles"], [/رئيسيه|الرئيسيه|لوحه|home|dashboard/, "/dashboard"],
];
// Text spoken after phrases like "التالي" / "الاتي" / ":".
const STOP = new Set(["شغل", "تشغيل", "افتح", "اغنيه", "اغاني", "مقطع", "فيديو", "ملف", "مستند", "صوت", "احذف", "امسح", "ابحث", "عن", "في", "من", "قسم", "ال", "لي", "play", "the"]);
const keywords = (s: string) => norm(s).split(/\s+/).map((w) => w.replace(/^(و|ال)/, "")).filter((w) => w.length > 1 && !STOP.has(w));
function best<T>(items: T[], text: (x: T) => string, words: string[]) {
  const r = items.map((a) => ({ a, score: words.filter((w) => norm(text(a)).includes(w)).length })).sort((x, y) => y.score - x.score)[0];
  return r && r.score > 0 ? r.a : null;
}
const after = (raw: string) => { const m = raw.match(/(?:التالي|الاتي|الآتي|التاليه|الآتية|الاتية|التالية|:)\s*[:،,]?\s*([\s\S]+)/); return m?.[1]?.trim() ?? ""; };

export function VoiceCommander() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "listening" | "thinking">("idle");
  const [heard, setHeard] = useState("");
  const [level, setLevel] = useState(0);
  const [settings, setSettings] = useState<Settings>({ replies: {} });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const ttsCache = useRef(new Map<string, string>());
  const [player, setPlayer] = useState<{ url: string; name: string; video: boolean } | null>(null);
  const rec = useRef<VoiceRecorder | null>(null);
  const busy = useRef(false);
  const mediaEl = useRef<HTMLMediaElement | null>(null);
  const voice = useVoiceChoice();
  const qc = useQueryClient();
  useEffect(() => { const s = load(); setSettings(s); if (s.avatar) void signedUrl(s.avatar).then(setAvatarUrl); }, []);
  const save = (s: Settings) => { setSettings(s); localStorage.setItem(KEY, JSON.stringify(s)); };

  async function say(k: ReplyKey) {
    const path = settings.replies[k];
    if (path) { const url = await signedUrl(path); if (url) { await new Audio(url).play().catch(() => undefined); return; } }
    try { const ck = `${voice}:${k}`; let url = ttsCache.current.get(ck); if (!url) { url = await ttsUrl(REPLIES.find((r) => r.id === k)!.text, voice); ttsCache.current.set(ck, url); } await new Audio(url).play(); return; } catch { /* fall back to the browser voice */ }
    if ("speechSynthesis" in window) { const u = new SpeechSynthesisUtterance(REPLIES.find((r) => r.id === k)!.text); u.lang = "ar-SA"; u.rate = 1.1; speechSynthesis.cancel(); speechSynthesis.speak(u); }
  }

  async function findTask(raw: string, done: boolean) {
    const { data } = await supabase.from("journal_tasks").select("id,title,notes").eq("done", done).limit(400);
    const w = keywords(raw).filter((x) => !/^(مهمه|مهام|يوميات|يومياتي|صحح|انجز|اشطب|علم|اكمل|تم|انجاز|اعد|ارجع|الغ)$/.test(x));
    return best(data ?? [], (x) => `${x.title} ${x.notes ?? ""}`, w);
  }
  const media = () => mediaEl.current;

  async function execute(raw: string): Promise<boolean | undefined | void> {
    const t = norm(raw).trim();
    const body = after(raw);
    const has = (re: RegExp) => re.test(t);
    const ok = (k: ReplyKey = "done", msg?: string) => { void say(k); if (msg) toast.success(msg); return true; };

    // ---- help ----
    if (has(/^(مساعده|ساعدني|ماذا تستطيع|ايش تقدر|شو تقدر|الاوامر|help)/)) { setShowHelp(true); return ok("ok"); }
    // ---- assistant panel / mic ----
    if (has(/(اغلق|اقفل|سكر|اخف|close).*(المساعد الصوتي|عبقرينو|النافذه|نفسك)/)) { void say("ok"); cancel(); return; }
    if (has(/^(اسكت|توقف عن الاستماع|اوقف المايك|اقفل المايك)/)) { void say("ok"); pauseMic(); return; }
    // ---- theme ----
    if (has(/(نهاري|فاتح|ابيض|light)/) && has(/(وضع|حول|خلي|اجعل|غير|شغل|الموقع|الشاشه|theme|mode)/)) { setTheme(true); return ok("done", "الوضع النهاري"); }
    if (has(/(ليلي|داكن|مظلم|اسود|dark)/) && has(/(وضع|حول|خلي|اجعل|غير|شغل|الموقع|الشاشه|theme|mode)/)) { setTheme(false); return ok("done", "الوضع الليلي"); }
    // ---- navigation in browser ----
    if (has(/^(ارجع|رجوع|للخلف|الصفحه السابقه|back)$/)) { history.back(); return ok("ok"); }
    if (has(/^(للامام|تقدم|الصفحه التاليه|forward)$/)) { history.forward(); return ok("ok"); }
    if (has(/(حدث|اعد تحميل|ريفرش|refresh|reload)/)) { void say("ok"); setTimeout(() => location.reload(), 600); return; }
    if (has(/(انزل|مرر|اسحب).*(تحت|اسفل|الاسفل)|^(تحت|للاسفل)$/)) { window.scrollBy({ top: innerHeight * 0.8, behavior: "smooth" }); return ok("ok"); }
    if (has(/(اطلع|مرر|اسحب).*(فوق|اعلي|الاعلي)|^(فوق|للاعلي)$/)) { window.scrollBy({ top: -innerHeight * 0.8, behavior: "smooth" }); return ok("ok"); }
    if (has(/(اول|بدايه) الصفحه/)) { window.scrollTo({ top: 0, behavior: "smooth" }); return ok("ok"); }
    if (has(/(اخر|نهايه) الصفحه/)) { window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }); return ok("ok"); }
    if (has(/(سجل|تسجيل) (خروج|الخروج)|اخرج من الحساب|logout/)) { void say("ok"); await supabase.auth.signOut(); return; }
    if (has(/(ملء|كامل) الشاشه|fullscreen/) && !has(/اخرج|الغ/)) { await document.documentElement.requestFullscreen?.().catch(() => undefined); return ok("ok"); }
    if (has(/(اخرج من|الغ) (ملء|كامل) الشاشه/)) { if (document.fullscreenElement) await document.exitFullscreen(); return ok("ok"); }

    // ---- journal tasks ----
    if (has(/(صحح|انجز|اشطب|علم|اكمل|تم انجاز|خلصت|انهيت|complete)/) && !has(/^(اكمل التشغيل|كمل)/)) {
      const task = await findTask(raw, false);
      if (task) { await supabase.from("journal_tasks").update({ done: true, done_at: new Date().toISOString() }).eq("id", task.id); await qc.invalidateQueries(); window.dispatchEvent(new Event("abq-journal")); return ok("done", `أُنجزت: ${task.title}`); }
      if (has(/مهمه/)) { void say("missing"); toast.error("لم أجد المهمة"); return; }
    }
    if (has(/(اعد|ارجع|الغ انجاز).*(مهمه)/)) {
      const task = await findTask(raw, true);
      if (!task) { void say("missing"); return; }
      await supabase.from("journal_tasks").update({ done: false, done_at: null }).eq("id", task.id); window.dispatchEvent(new Event("abq-journal")); return ok("done", `أُعيدت: ${task.title}`);
    }
    if (has(/(احذف|امسح).*(مهمه)/)) {
      const task = (await findTask(raw, false)) ?? (await findTask(raw, true));
      if (!task) { void say("missing"); return; }
      if (!confirm(`حذف المهمة «${task.title}»؟`)) return;
      await supabase.from("journal_tasks").delete().eq("id", task.id); window.dispatchEvent(new Event("abq-journal")); return ok("done", "حُذفت المهمة");
    }
    if (has(/(يوميات|مهمه|مهام|ذكرني|تذكير)/) && has(/(سجل|اكتب|اضف|دون|احفظ|ذكرني|ضيف)/)) {
      const text = body || raw.replace(/^.*?(?:ذكرني|ذكّرني)\s*(?:ب|بأن|ان)?\s*/, "");
      void say("working");
      const { error } = await supabase.from("journal_tasks").insert({ title: text.slice(0, 90), notes: text.length > 90 ? text : "", repeat: "daily" });
      if (error) { toast.error(error.message); return; }
      window.dispatchEvent(new Event("abq-journal")); await navigate({ to: "/journal" }); return ok("done", "سُجّلت في يومياتي");
    }
    if (has(/انسخ/) && has(/مهمه/) && !has(/الصق/)) {
      const task = (await findTask(raw, false)) ?? (await findTask(raw, true));
      if (!task) { void say("missing"); return; }
      await navigator.clipboard.writeText([task.title, task.notes].filter(Boolean).join("\n")); return ok("done", "نُسخ نص المهمة");
    }
    if (/اعلان/.test(t) && /اكتب|فكره|نفذ|سجل/.test(t)) { adsStore.setIdea(body || raw); await navigate({ to: "/ads" }); return ok(); }

    // ---- copy / paste / type into fields ----
    const cp = raw.match(/انسخ\s+(?:النص\s+)?(.+?)(?:\s+(?:من|في)\s+(.+?))?\s+(?:و\s*)?(?:الصقه|ألصقه|الصقها|والصقه|والصق|الصق|ضعه|حطه)\s+(?:في|فى|على|الى|إلى)\s+(.+)/);
    if (cp) {
      let text = findPageText(`${cp[1]} ${cp[2] ?? ""}`) ?? findPageText(cp[1]!);
      if (!text) { const tk = await findTask(cp[1]!, false); text = tk ? [tk.title, tk.notes].filter(Boolean).join("\n") : null; }
      const field = fieldByWords(cp[3]!) ?? focusedOrFirstField();
      if (!text || !field) { void say("missing"); toast.error(!text ? "لم أجد النص المطلوب في الصفحة" : "لم أجد مكان اللصق"); return; }
      await navigator.clipboard.writeText(text).catch(() => undefined); setField(field, text, true); return ok("done", "نُسخ ولُصق");
    }
    if (has(/^انسخ/)) {
      const text = findPageText(raw.replace(/^\S+\s*/, ""));
      if (!text) { void say("missing"); toast.error("لم أجد النص في الصفحة"); return; }
      await navigator.clipboard.writeText(text); return ok("done", "نُسخ النص");
    }
    if (has(/^(الصق|ألصق)/)) {
      const clip = await navigator.clipboard.readText().catch(() => "");
      const field = fieldByWords(raw.replace(/^\S+\s*/, "")) ?? focusedOrFirstField();
      if (!clip || !field) { void say("missing"); return; }
      setField(field, clip, true); return ok();
    }
    const typ = raw.match(/^(?:اكتب|أكتب|دون|type)\s+(.+?)\s+(?:في|فى|داخل)\s+(?:خانة|خانه|حقل|مربع|مكان)\s+(.+)$/);
    if (typ) { const f = fieldByWords(typ[2]!); if (!f) { void say("missing"); return; } setField(f, typ[1]!); return ok(); }
    if (has(/^(اكتب|دون)\s/) && !has(/اعلان|يوميات/)) { const f = focusedOrFirstField(); if (f) { setField(f, raw.replace(/^\S+\s*/, ""), true); return ok(); } }
    if (has(/^(امسح|فرغ) (الخانه|الحقل|النص)/)) { const f = focusedOrFirstField(); if (f) { setField(f, ""); return ok(); } }

    // ---- media player ----
    if (has(/^(اوقف|وقف|ايقاف|توقف|بوز|stop|pause)|(اوقف|ايقاف) (الاغنيه|التشغيل|المقطع|الفيديو)/)) { media()?.pause(); document.querySelectorAll("video,audio").forEach((m) => (m as HTMLMediaElement).pause()); return ok(); }
    if (has(/^(كمل|استانف|تابع التشغيل|اكمل التشغيل|resume)/)) { void media()?.play(); return ok("ok"); }
    if (has(/(ارفع|علي|زود|كبر) الصوت|volume up/)) { const m = media(); if (m) m.volume = Math.min(1, m.volume + 0.2); return ok("ok"); }
    if (has(/(اخفض|وطي|قلل|نزل|صغر) الصوت|volume down/)) { const m = media(); if (m) m.volume = Math.max(0, m.volume - 0.2); return ok("ok"); }
    if (has(/^(اكتم|كتم|mute)/)) { const m = media(); if (m) m.muted = true; return ok("ok"); }
    if (has(/(الغ الكتم|شغل الصوت|unmute)/)) { const m = media(); if (m) m.muted = false; return ok("ok"); }
    if (has(/(من البدايه|اعد التشغيل|restart)/)) { const m = media(); if (m) { m.currentTime = 0; void m.play(); } return ok("ok"); }
    if (has(/(قدم|تقديم|للامام) \d+|قدم/) && media()) { const n = Number(t.match(/\d+/)?.[0] ?? 10); media()!.currentTime += n; return ok("ok"); }
    if (has(/(رجع|ارجع|للخلف) \d+/) && media()) { const n = Number(t.match(/\d+/)?.[0] ?? 10); media()!.currentTime -= n; return ok("ok"); }
    if (has(/(اقفل|اغلق|سكر) (الاغنيه|المشغل|الفيديو|المقطع)/)) { setPlayer(null); return ok(); }

    // ---- library: rename / delete / play ----
    const ren = raw.match(/(?:سم[ّيِ]?|غي[ّ]?ر اسم|غير اسم|أعد تسمية|اعد تسميه|إعادة تسمية)\s+(.+?)\s+(?:إلى|الى|باسم|ب)\s+(.+)/);
    if (ren) {
      const { data } = await supabase.from("media_assets").select("id,name").order("created_at", { ascending: false }).limit(500);
      const hit = best(data ?? [], (a) => a.name, keywords(ren[1]!));
      if (!hit) { void say("missing"); toast.error(`لم أجد «${ren[1]}» في المكتبة`); return; }
      const ext = hit.name.match(/\.[a-z0-9]{2,5}$/i)?.[0] ?? "";
      const { error } = await supabase.from("media_assets").update({ name: `${ren[2]!.trim()}${ext}` }).eq("id", hit.id);
      if (error) { toast.error(error.message); return; }
      await qc.invalidateQueries({ queryKey: ["assets"] }); return ok("done", `أصبح اسمه «${ren[2]!.trim()}»`);
    }
    if (has(/^(احذف|امسح|حذف|delete)/)) {
      const { data } = await supabase.from("media_assets").select("id,name,storage_path").order("created_at", { ascending: false }).limit(500);
      const hit = best(data ?? [], (a) => a.name, keywords(raw));
      if (!hit) { void say("missing"); toast.error("لم أجد الملف في المكتبة"); return; }
      if (!confirm(`هل تريد حذف «${hit.name}» نهائيًا؟`)) return;
      try { await deleteMedia(hit.id, hit.storage_path); } catch (e) { toast.error((e as Error).message); return; }
      if (player?.name === hit.name) setPlayer(null);
      await qc.invalidateQueries({ queryKey: ["assets"] }); return ok("done", `حُذف «${hit.name}»`);
    }
    if (has(/شغل|تشغيل|افتح اغنيه|اسمعني|play/) && !has(/(وضع|المايك)/)) {
      const { data } = await supabase.from("media_assets").select("name,kind,storage_path").in("kind", ["audio", "video"]).order("created_at", { ascending: false }).limit(300);
      const hit = best(data ?? [], (a) => a.name, keywords(raw));
      if (!hit) { if (has(/^(شغل|play)$/)) { void media()?.play(); return ok("ok"); } void say("missing"); toast.error("لم أجد المقطع في مكتبتك"); return; }
      const url = await signedUrl(hit.storage_path); if (!url) return;
      setPlayer({ url, name: hit.name, video: hit.kind === "video" }); return ok("ok");
    }
    if (/مشروع/.test(t) && /جديد/.test(t)) { void say("working"); const id = await createProject(); await navigate({ to: "/editor", search: { p: id } }); return ok(); }
    if (/(محادثه|دردشه)/.test(t) && /جديد/.test(t)) { await navigate({ to: "/assistant" }); return ok("ok"); }

    // ---- sections ----
    const sec = SECTIONS.find(([re]) => re.test(t));
    if (sec && has(/^(افتح|روح|اذهب|انتقل|ودني|خذني|اعرض|ورني|open|go)|قسم|صفحه/)) { await navigate({ to: sec[1] as "/dashboard" }); return ok("ok"); }
    if (has(/^(اغلق|اقفل|سكر|close)/)) {
      // Close an open dialog/menu on the page first, otherwise leave the section.
      const x = clickByWords(raw.replace(/^\S+\s*/, "") + " اغلاق") ?? (document.querySelector("[role=dialog] [aria-label*=إغلاق], [role=dialog] button[aria-label*=Close]") as HTMLElement | null)?.click();
      if (x === undefined) document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      if (!x && sec) await navigate({ to: "/dashboard" });
      setPlayer(null); return ok();
    }
    // ---- click any button / link on the page by its name ----
    if (has(/^(اضغط|انقر|دوس|اختار|اختر|فعل|click|press)/)) { const n = clickByWords(raw); if (n) return ok("ok"); }
    if (has(/^(افتح|اعرض|ورني)/)) { const n = clickByWords(raw); if (n) return ok("ok"); }
    if (await searchSite(raw)) return;
    if (sec) { await navigate({ to: sec[1] as "/dashboard" }); return ok("ok"); }
    if (clickByWords(raw)) return ok("ok");
    void say("missing"); toast("لم أفهم الأمر", { description: "قل «مساعدة» لعرض الأوامر" });
  }

  // Searches the whole site (library, journal, editor projects, assistant chats) by name.
  async function searchSite(raw: string) {
    const words = keywords(raw); if (!words.length) return false;
    const [m, j, e, a] = await Promise.all([
      supabase.from("media_assets").select("name,kind,storage_path").order("created_at", { ascending: false }).limit(500),
      supabase.from("journal_tasks").select("title").limit(300),
      supabase.from("editor_projects").select("id,title").limit(200),
      supabase.from("assistant_threads").select("id,title").limit(200),
    ]);
    const need = Math.min(2, words.length);
    const pick = <T,>(xs: T[] | null, f: (x: T) => string) => { const h = best(xs ?? [], f, words); return h && words.filter((w) => norm(f(h)).includes(w)).length >= need ? h : null; };
    const media = pick(m.data, (x) => x.name);
    if (media) {
      const url = await signedUrl(media.storage_path); if (!url) return false;
      if (media.kind === "audio" || media.kind === "video") setPlayer({ url, name: media.name, video: media.kind === "video" });
      else window.open(url, "_blank", "noopener");
      void say("ok"); return true;
    }
    const ep = pick(e.data, (x) => x.title); if (ep) { await navigate({ to: "/editor", search: { p: ep.id } }); void say("ok"); return true; }
    const th = pick(a.data, (x) => x.title); if (th) { await navigate({ to: "/assistant/$threadId", params: { threadId: th.id } }); void say("ok"); return true; }
    const jt = pick(j.data, (x) => x.title); if (jt) { await navigate({ to: "/journal" }); toast(`وجدتها في يومياتي: ${jt.title}`); void say("ok"); return true; }
    return false;
  }

  // Continuous: the mic stays open, every phrase runs as a command, until the panel is closed.
  async function listen() {
    setOpen(true);
    if (rec.current) return;
    setHeard(""); setState("listening");
    const r = new VoiceRecorder({
      onLevel: setLevel,
      onUtterance: async (clip) => {
        if (busy.current) return;
        busy.current = true; setState("thinking");
        try { const text = await transcribeClip(clip); if (text.trim()) { setHeard(text); await execute(text); } }
        catch (e) { toast.error((e as Error).message); } finally { busy.current = false; setState(rec.current ? "listening" : "idle"); }
      },
    }, 900);
    rec.current = r;
    try { await r.start(); } catch { rec.current = null; toast.error("اسمح باستخدام الميكروفون"); setState("idle"); }
  }
  const pauseMic = () => { rec.current?.stop(); rec.current = null; setState("idle"); };
  const cancel = () => { pauseMic(); setOpen(false); };
  useEffect(() => () => rec.current?.stop(), []);

  const icon = (
    <button type="button" onClick={() => void listen()} aria-label="عبقرينو: أعطني أمرًا صوتيًا" className="group flex items-center gap-2">
      <span className={`relative size-10 overflow-hidden rounded-full border-2 border-gold shadow-gold ${state === "listening" ? "ring-4 ring-gold/50" : ""}`}>
        {avatarUrl ? <img src={avatarUrl} alt="عبقرينو" className="size-full object-cover" /> : <AlabageraPortrait className="size-full" eager />}
        <span className="absolute -bottom-0.5 -left-0.5 grid size-4 place-items-center rounded-full bg-gold text-primary-foreground"><Mic className="size-2.5" /></span>
      </span>
      <span className="font-display text-lg font-bold leading-none"><span className="text-gold-gradient">عبقرينو</span> <span className="text-sm text-muted-foreground">AI Studio</span></span>
    </button>
  );

  return (
    <>
      {icon}
      {open && createPortal(
        <div data-voice-panel dir="rtl" className="glass fixed inset-x-3 top-3 z-[150] mx-auto max-w-md space-y-3 rounded-3xl border border-gold/40 p-4 shadow-2xl">
          <div className="flex items-center gap-3">
            <span className="relative size-14 shrink-0 overflow-hidden rounded-full border-2 border-gold" style={{ boxShadow: `0 0 ${8 + level * 40}px var(--gold)` }}>
              {avatarUrl ? <img src={avatarUrl} alt="" className="size-full object-cover" /> : <AlabageraPortrait className="size-full" />}
            </span>
            <div className="min-w-0 flex-1">
              <b className="text-gold">{state === "listening" ? "أسمعك باستمرار… قل أمرك" : state === "thinking" ? "جاري إتمام المهمة…" : "المايك متوقف"}</b>
              <p className="truncate text-sm text-muted-foreground" dir="auto">{heard || "مثال: افتح قسم المحرر / شغّل أغنية …"}</p>
            </div>
            <button type="button" aria-label="الإعدادات" onClick={() => setShowSettings((v) => !v)} className="text-muted-foreground"><Settings2 className="size-5" /></button>
            <button type="button" aria-label="إغلاق" onClick={cancel} className="text-muted-foreground"><X className="size-5" /></button>
          </div>
          <div className="flex items-center gap-2"><Button variant="gold" className="flex-1" onClick={() => (rec.current ? pauseMic() : void listen())}>{rec.current ? <><Square className="size-4" />إيقاف المايك مؤقتًا</> : <><Mic className="size-4" />تشغيل المايك</>}</Button><VoicePicker /></div>
          <p className="text-[11px] text-muted-foreground">المايك يبقى مفتوحًا حتى تغلق النافذة. جرّب: «شغّل أغنية الصباح»، «أوقف»، «احذف ملف …»، «غيّر اسم … إلى …»، «ابحث عن …». <button type="button" className="text-gold underline" onClick={() => setShowHelp((v) => !v)}>كل الأوامر</button></p>
          {showHelp && <div className="max-h-[45dvh] space-y-2 overflow-y-auto rounded-xl bg-secondary/40 p-2 text-xs">{HELP.map(([g, items]) => <div key={g}><b className="text-gold">{g}</b><ul className="mt-0.5 list-inside list-disc text-muted-foreground">{items.map((i) => <li key={i}>{i}</li>)}</ul></div>)}</div>}
          {player && <div className="space-y-1 rounded-xl border border-gold/40 p-2"><p className="truncate text-xs" dir="auto"><Music className="me-1 inline size-3 text-gold" />{player.name}</p>
            {player.video ? <video ref={(el) => { mediaEl.current = el; }} src={player.url} autoPlay controls playsInline className="max-h-56 w-full rounded-lg bg-black" /> : <audio ref={(el) => { mediaEl.current = el; }} src={player.url} autoPlay controls className="w-full" />}</div>}
          {showSettings && <div className="max-h-[55dvh] space-y-3 overflow-y-auto border-t border-border pt-3 text-sm">
            <b>صورة عبقرينو</b>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border p-2"><Upload className="size-4 text-gold" />غيّر صورة الأفاتار
              <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; const row = await uploadMedia(f, "image"); save({ ...settings, avatar: row.storage_path }); setAvatarUrl(URL.createObjectURL(f)); toast.success("تغيّرت الصورة"); }} />
            </label>
            {settings.avatar && <button type="button" className="text-xs text-muted-foreground underline" onClick={() => { save({ ...settings, avatar: undefined }); setAvatarUrl(null); }}>رجوع للصورة الأصلية</button>}
            <b>صوت عبقرينو</b><p className="text-xs text-muted-foreground">اختر صوت الأفاتار من «هويتي» أو صوتًا جاهزًا (القائمة بجانب زر المايك). الاختيار نفسه يُستخدم في الدردشة الصوتية بالمساعد. ويمكنك أيضًا تسجيل كل رد قصير بصوتك ليُستخدم أولًا:</p>
            {REPLIES.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-secondary/40 p-2">
                <span className="flex-1 font-bold">«{r.text}» {settings.replies[r.id] ? "✓" : ""}</span>
                <AudioRecorder label="سجّل" onSave={async (f) => { const row = await uploadMedia(f, "audio"); save({ ...settings, replies: { ...settings.replies, [r.id]: row.storage_path } }); toast.success("حُفظ الرد"); }} />
                <label className="cursor-pointer rounded-md border border-border px-2 py-1 text-xs">رفع<input type="file" accept="audio/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; const row = await uploadMedia(f, "audio"); save({ ...settings, replies: { ...settings.replies, [r.id]: row.storage_path } }); toast.success("حُفظ الرد"); }} /></label>
                <button type="button" className="text-xs text-gold" onClick={() => void say(r.id)}>▶</button>
              </div>
            ))}
            <b>أغانيّ</b>
            <SongUpload />
          </div>}
        </div>, document.body)}
    </>
  );
}

const HELP: [string, string[]][] = [
  ["التنقل", ["افتح قسم المحرر / الاستوديو / المساعد / الإعلانات / يومياتي / المكتبة / الفريق / النماذج / هويتي / الرئيسية", "ارجع / للأمام / حدّث الصفحة", "انزل لتحت / اطلع لفوق / أول الصفحة / آخر الصفحة", "ملء الشاشة / اخرج من ملء الشاشة", "سجّل خروج"]],
  ["الأزرار والنوافذ", ["اضغط على زر … (أي زر في الصفحة باسمه)", "افتح … / اغلق … (قائمة أو نافذة أو قسم)", "اغلق المساعد الصوتي / اوقف المايك"]],
  ["النصوص", ["انسخ النص … من … والصقه في خانة …", "انسخ … (أي نص ظاهر في الصفحة)", "الصق في خانة …", "اكتب … في خانة …", "امسح الخانة"]],
  ["يومياتي", ["سجّل في يومياتي التالي: …", "ذكّرني بـ …", "صحّح / أنجز / اشطب مهمة …", "أعد مهمة … / احذف مهمة …", "انسخ مهمة …"]],
  ["المكتبة والتشغيل", ["شغّل أغنية … / شغّل فيديو …", "أوقف / كمّل / من البداية / قدّم 10 / رجّع 10", "ارفع الصوت / اخفض الصوت / اكتم / شغّل الصوت", "احذف ملف … / غيّر اسم … إلى …", "ابحث عن … (في المكتبة والمشاريع والمحادثات واليوميات)"]],
  ["الإنشاء", ["افتح مشروع فيديو جديد", "افتح الإعلانات واكتب الفكرة التالية: …", "محادثة جديدة"]],
  ["المظهر", ["حوّل الموقع إلى الوضع النهاري / الليلي"]],
];

function SongUpload() {
  const [name, setName] = useState("");
  return (
    <div className="space-y-2 rounded-lg bg-secondary/40 p-2">
      <input dir="auto" value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم الأغنية (مثلًا: أغنية الصباح)" className="h-9 w-full rounded-md border border-input bg-background px-2" />
      <label className="flex cursor-pointer items-center gap-2 text-xs"><Upload className="size-4 text-gold" />اختر ملف صوت أو فيديو ثم يُحفظ بالاسم في المكتبة
        <input type="file" accept="audio/*,video/*" className="hidden" onChange={async (e) => {
          const f = e.target.files?.[0]; if (!f) return; if (!name.trim()) { toast.error("اكتب اسم الأغنية أولًا"); return; }
          const ext = f.name.split(".").pop() ?? "mp3";
          try { await uploadMedia(new File([f], `${name.trim()}.${ext}`, { type: f.type })); toast.success(`حُفظت «${name}». قل: شغّل أغنية ${name}`); setName(""); } catch (err) { toast.error((err as Error).message); }
        }} />
      </label>
    </div>
  );
}
