import { useEffect, useRef, useState } from "react";
import { FileDown, FileText, Mic, MicOff, Presentation, X, Volume2, MessagesSquare, NotebookPen, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlabageraPortrait } from "@/components/AlabageraPortrait";
import { supabase } from "@/integrations/supabase/client";
import { VoiceRecorder, transcribeClip } from "@/lib/voice-recorder";
import { exportDocument, type DocFormat } from "@/lib/doc-export";
import { ttsUrl } from "@/lib/abq-voice";
import { VoicePicker, useVoiceChoice } from "@/components/VoicePicker";

type Phase = "idle" | "listening" | "hearing" | "transcribing" | "thinking" | "speaking";
type Line = { who: "me" | "bot"; text: string };
const LABEL: Record<Phase, string> = { idle: "اضغط المايك وابدأ الكلام", listening: "أستمع إليك…", hearing: "أسمعك… تابع", transcribing: "أكتب ما قلته…", thinking: "عبقرينو يفكر…", speaking: "عبقرينو يتحدث…" };
const LANGS = [{ id: "", l: "عربي + English" }, { id: "ar", l: "العربية" }, { id: "en", l: "English" }];

function cleanForSpeech(md: string) {
  return md.replace(/<!--[\s\S]*?-->/g, "").replace(/```[\s\S]*?```/g, " (تجد الكود مكتوبًا في المحادثة) ").replace(/[#*_`>|]/g, " ").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/-{3,}/g, " ").replace(/\s+/g, " ").trim();
}

export function VoiceChat({ onAsk, onClose }: { onAsk: (text: string) => Promise<string>; onClose: () => void }) {
  const [tab, setTab] = useState<"chat" | "dictate">("chat");
  const [lang, setLang] = useState("");
  const voice = useVoiceChoice();
  return <div className="fixed inset-0 z-[90] flex flex-col overflow-hidden bg-background" style={{ background: "radial-gradient(circle at 50% 30%, color-mix(in oklch, var(--gold) 16%, transparent), transparent 55%), var(--background)" }}>
    <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center gap-2 p-3">
      <div className="flex gap-1 rounded-full bg-secondary p-1 text-xs">
        <button type="button" onClick={() => setTab("chat")} className={`flex items-center gap-1 rounded-full px-3 py-1.5 ${tab === "chat" ? "bg-gold text-primary-foreground" : ""}`}><MessagesSquare className="size-3.5" />دردشة صوتية</button>
        <button type="button" onClick={() => setTab("dictate")} className={`flex items-center gap-1 rounded-full px-3 py-1.5 ${tab === "dictate" ? "bg-gold text-primary-foreground" : ""}`}><NotebookPen className="size-3.5" />كلامي إلى مستند</button>
      </div>
      <select value={lang} onChange={(e) => setLang(e.target.value)} aria-label="لغة الكلام" className="rounded-full bg-secondary px-2 py-1.5 text-xs">{LANGS.map((l) => <option key={l.id} value={l.id}>{l.l}</option>)}</select>
      {tab === "chat" && <VoicePicker />}
      <Button variant="ghost" size="icon" className="ms-auto" onClick={onClose} aria-label="إغلاق"><X /></Button>
    </div>
    {tab === "chat" ? <ChatPane key="c" onAsk={onAsk} lang={lang} voice={voice} /> : <DictatePane key="d" lang={lang} />}
  </div>;
}

function useRecorder(lang: string, silenceMs: number, onText: (t: string, gapMs: number) => void) {
  const recRef = useRef<VoiceRecorder | null>(null);
  const [level, setLevel] = useState(0);
  const [hearing, setHearing] = useState(false);
  const [pending, setPending] = useState(0);
  const langRef = useRef(lang); langRef.current = lang;
  const cb = useRef(onText); cb.current = onText;
  async function start() {
    if (recRef.current) return;
    const r = new VoiceRecorder({
      onLevel: setLevel, onSpeaking: setHearing,
      onUtterance: (clip, gap) => { setPending((n) => n + 1); transcribeClip(clip, langRef.current).then((t) => { if (t) cb.current(t, gap); }).catch((e) => toast.error((e as Error).message)).finally(() => setPending((n) => n - 1)); },
    }, silenceMs);
    try { await r.start(); recRef.current = r; } catch { toast.error("لا يمكن الوصول للمايك. اسمح للموقع باستخدام المايك من إعدادات المتصفح."); throw new Error("mic"); }
  }
  function stop() { recRef.current?.stop(); recRef.current = null; setLevel(0); setHearing(false); }
  useEffect(() => () => recRef.current?.stop(), []);
  return { start, stop, level, hearing, pending, active: () => !!recRef.current };
}

function Orb({ level, phase }: { level: number; phase: Phase }) {
  const scale = 1 + (phase === "hearing" ? level * 0.35 : 0);
  return <div className="relative grid size-44 place-items-center sm:size-56">
    {(phase === "listening" || phase === "hearing") && <span className="absolute inset-0 rounded-full bg-gold/20 transition-transform duration-75" style={{ transform: `scale(${scale})` }} />}
    {phase === "speaking" && <span className="absolute inset-0 animate-pulse rounded-full bg-gold/25" />}
    {(phase === "thinking" || phase === "transcribing") && <span className="absolute inset-1 animate-spin rounded-full border-4 border-dashed border-gold/60" />}
    <span className="absolute inset-3 rounded-full border border-gold/40" />
    <AlabageraPortrait className="relative size-36 rounded-full border-4 border-gold shadow-gold sm:size-44" eager />
    {phase === "speaking" && <Volume2 className="absolute bottom-2 end-3 size-7 rounded-full bg-gold p-1 text-primary-foreground" />}
  </div>;
}

function ChatPane({ onAsk, lang, voice }: { onAsk: (t: string) => Promise<string>; lang: string; voice: string }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [log, setLog] = useState<Line[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ctrl = useRef<AbortController | null>(null);
  const busy = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [log, phase]);
  const rec = useRecorder(lang, 1400, (text) => void handle(text));

  const tts = (text: string, signal: AbortSignal) => ttsUrl(text, voice, signal);
  function play(url: string) {
    return new Promise<void>((resolve) => {
      const a = audioRef.current ?? new Audio(); audioRef.current = a;
      a.src = url; a.onended = () => { URL.revokeObjectURL(url); resolve(); }; a.onerror = () => resolve();
      a.play().catch(() => resolve());
    });
  }
  async function speak(text: string) {
    const c = new AbortController(); ctrl.current = c;
    const parts = (cleanForSpeech(text).match(/[^.!?؟\n]{1,400}[.!?؟]?/g) ?? []).map((p) => p.trim()).filter(Boolean).slice(0, 14);
    const chunks: string[] = [];
    for (const p of parts) { const last = chunks[chunks.length - 1]; if (last && last.length + p.length < 280) chunks[chunks.length - 1] = `${last} ${p}`; else chunks.push(p); }
    let next = chunks[0] ? tts(chunks[0], c.signal) : null;
    for (let i = 0; i < chunks.length && !c.signal.aborted; i++) {
      const url = await next!.catch((e: Error) => { if (!c.signal.aborted) toast.error(e.message); return null; });
      if (!url) return;
      next = chunks[i + 1] ? tts(chunks[i + 1]!, c.signal) : null; next?.catch(() => undefined);
      await play(url);
    }
  }
  function silence() { ctrl.current?.abort(); audioRef.current?.pause(); }

  async function handle(text: string) {
    if (busy.current) return;
    busy.current = true; silence();
    setLog((l) => [...l, { who: "me", text }]);
    setPhase("thinking");
    try {
      const answer = await onAsk(text);
      if (!answer) throw new Error("لم يصل رد من المساعد");
      setLog((l) => [...l, { who: "bot", text: answer }]);
      setPhase("speaking");
      await speak(answer);
    } catch (e) { toast.error((e as Error).message); }
    finally { busy.current = false; setPhase(rec.active() ? "listening" : "idle"); }
  }

  async function toggle() {
    if (!audioRef.current) { const a = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA="); a.play().catch(() => undefined); audioRef.current = a; }
    if (rec.active()) { rec.stop(); silence(); setPhase("idle"); return; }
    try { await rec.start(); setPhase("listening"); } catch { /* toast shown */ }
  }
  const shown: Phase = phase === "listening" && rec.pending > 0 ? "transcribing" : phase === "listening" && rec.hearing ? "hearing" : phase;

  return <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col items-center px-4">
    <Orb level={rec.level} phase={shown} />
    <h2 className="mt-3 text-lg font-bold text-gold-gradient">{LABEL[shown]}</h2>
    <div className="mt-3 min-h-0 w-full flex-1 space-y-2 overflow-y-auto pb-3">
      {log.length === 0 && <p className="text-center text-sm text-muted-foreground">تكلّم بشكل طبيعي، وعند توقفك لحظة يُرسل كلامك تلقائيًا ويرد عبقرينو بصوته. كل شيء يُحفظ في المحادثة.</p>}
      {log.map((m, i) => <div key={i} dir="auto" className={`bilingual-text max-w-[85%] rounded-2xl px-4 py-2 text-sm ${m.who === "me" ? "ms-auto bg-secondary" : "me-auto border border-gold/40 bg-background/70"}`}>{m.who === "bot" ? cleanForSpeech(m.text).slice(0, 600) : m.text}</div>)}
      <div ref={endRef} />
    </div>
    <div className="flex flex-col items-center gap-1 pb-5">
      <button type="button" onClick={toggle} aria-label="المايك" className={`grid size-20 place-items-center rounded-full shadow-gold transition active:scale-95 ${rec.active() ? "bg-destructive text-destructive-foreground" : "bg-gold-gradient text-primary-foreground"}`}>{rec.active() ? <MicOff className="size-9" /> : <Mic className="size-9" />}</button>
      <span className="text-xs text-muted-foreground">{rec.active() ? "المايك مفتوح — اضغط لإنهاء المحادثة" : "اضغط لبدء المحادثة"}</span>
      {phase === "speaking" && <button type="button" onClick={silence} className="text-xs text-gold-soft underline">إيقاف الرد</button>}
    </div>
  </div>;
}

function DictatePane({ lang }: { lang: string }) {
  const [paras, setParas] = useState<string[]>([]);
  const [title, setTitle] = useState("مستند عبقرينو");
  const [on, setOn] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [paras]);
  // A pause longer than 7 seconds starts a new paragraph.
  const rec = useRecorder(lang, 1100, (text, gap) => {
    setParas((p) => (!p.length || gap + 1100 > 7000) ? [...p, text] : [...p.slice(0, -1), `${p[p.length - 1]} ${text}`]);
  });

  async function toggle() {
    if (on) { rec.stop(); setOn(false); return; }
    try { await rec.start(); setOn(true); } catch { /* toast */ }
  }
  async function exportAs(f: DocFormat) {
    if (!paras.length) { toast.error("لا يوجد نص بعد"); return; }
    const md = f === "pptx"
      ? `# ${title}\n\n${paras.map((p, i) => `## ${i + 1}\n\n${p.split(/(?<=[.!?؟])\s+/).map((s) => `- ${s}`).join("\n")}`).join("\n\n")}`
      : `<!--theme: primary=#0b1f4b; accent=#c9a227; font=Noto Naskh Arabic-->\n# ${title}\n\n${paras.join("\n\n")}`;
    const t = toast.loading("جارٍ تجهيز المستند…");
    try { await exportDocument(md, f, title); toast.success("تم تنزيل المستند", { id: t }); } catch (e) { toast.error((e as Error).message, { id: t }); }
  }
  return <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col px-4 pb-4">
    <Input dir="auto" value={title} onChange={(e) => setTitle(e.target.value)} className="mb-2 text-center text-lg font-bold" aria-label="عنوان المستند" />
    <div className="glass min-h-0 flex-1 space-y-3 overflow-y-auto rounded-2xl p-4 sm:p-6" style={{ fontFamily: "'Noto Naskh Arabic', 'Noto Sans Arabic', 'Noto Sans', serif" }}>
      {paras.length === 0 && <p className="text-center text-sm text-muted-foreground">اضغط المايك وتكلّم بالعربية أو الإنجليزية أو الاثنين معًا. يظهر كلامك هنا مكتوبًا، وإذا توقفت أكثر من 7 ثوانٍ يبدأ فقرة جديدة. يمكنك تعديل أي فقرة بالضغط عليها.</p>}
      {paras.map((p, i) => <div key={i} className="group flex items-start gap-2"><p dir="auto" contentEditable suppressContentEditableWarning onBlur={(e) => { const v = e.currentTarget.innerText; setParas((all) => all.map((x, j) => (j === i ? v : x))); }} className="bilingual-text flex-1 rounded-md p-1 text-base leading-loose outline-none focus:bg-secondary/50">{p}</p><button type="button" aria-label="حذف الفقرة" onClick={() => setParas((all) => all.filter((_, j) => j !== i))} className="opacity-50 hover:opacity-100"><Trash2 className="size-4" /></button></div>)}
      {rec.pending > 0 && <p className="animate-pulse text-sm text-gold-soft">أكتب…</p>}
      <div ref={endRef} />
    </div>
    <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
      <button type="button" onClick={toggle} aria-label="المايك" className={`grid size-16 place-items-center rounded-full shadow-gold transition active:scale-95 ${on ? "bg-destructive text-destructive-foreground" : "bg-gold-gradient text-primary-foreground"}`} style={on ? { boxShadow: `0 0 0 ${4 + rec.level * 18}px color-mix(in oklch, var(--gold) 30%, transparent)` } : undefined}>{on ? <MicOff className="size-7" /> : <Mic className="size-7" />}</button>
      <Button variant="glass" onClick={() => exportAs("docx")}><FileText />Word</Button>
      <Button variant="glass" onClick={() => exportAs("pdf")}><FileDown />PDF</Button>
      <Button variant="glass" onClick={() => exportAs("pptx")}><Presentation />PowerPoint</Button>
    </div>
  </div>;
}
